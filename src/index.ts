#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  Connection,
  MessageAccountKeys,
  PublicKey,
  VersionedTransactionResponse,
  clusterApiUrl,
} from "@solana/web3.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const FetchSolanaTransactionsArgsSchema = z.object({
  walletAddress: z
    .string()
    .min(42, "Invalid Solana address")
    .max(44, "Invalid Solana address"),
  limit: z.number().optional().default(100),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

export const solanaTools = [
  {
    name: "fetch_solana_transactions",
    description:
      "Fetches the recent Solana transaction history for a given wallet address. Only show relevant details to the user, such as the transaction amount, the sender and receiver addresses, link to tx on solscan and the transaction date.",
    inputSchema: zodToJsonSchema(
      FetchSolanaTransactionsArgsSchema
    ) as ToolInput,
  },
];

function extractRelevantTxData(
  tx: VersionedTransactionResponse,
  walletAddress: string
) {
  if (!tx) return null;

  const { slot, blockTime, transaction, meta } = tx;
  const signature = tx.transaction.signatures[0];
  const solscanUrl = `https://solscan.io/tx/${signature}`;
  const date = blockTime ? new Date(blockTime * 1000).toISOString() : null;

  let preTokenBalance = null;
  let postTokenBalance = null;
  if (meta && meta.preTokenBalances && meta.postTokenBalances) {
    preTokenBalance = meta.preTokenBalances.find(
      (b: any) => b.owner === walletAddress
    );
    postTokenBalance = meta.postTokenBalances.find(
      (b: any) => b.owner === walletAddress
    );
  }

  let accountKeys: MessageAccountKeys;
  try {
    accountKeys =
      transaction.message?.getAccountKeys() || new MessageAccountKeys([]);
  } catch (error) {
    // Fallback for transactions with unresolved address lookup tables
    accountKeys = new MessageAccountKeys(
      transaction.message?.staticAccountKeys || []
    );
  }

  let preBalance = null;
  let postBalance = null;
  if (meta && accountKeys) {
    let accountIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys.get(i);
      if (key && key.toBase58() === walletAddress) {
        accountIndex = i;
        break;
      }
    }
    if (accountIndex !== -1 && meta.preBalances && meta.postBalances) {
      preBalance = meta.preBalances[accountIndex];
      postBalance = meta.postBalances[accountIndex];
    }
  }

  let sender = null;
  let receiver = null;
  if (transaction?.message && accountKeys) {
    sender = accountKeys.get(0);
    const compiledInstructions = transaction.message.compiledInstructions || [];
    for (const ix of compiledInstructions) {
      if (ix.accountKeyIndexes && ix.accountKeyIndexes.length > 1) {
        receiver = accountKeys.get(ix.accountKeyIndexes[1]);
        break;
      }
    }
  }

  let amount = null;
  let tokenMint = null;
  if (preTokenBalance && postTokenBalance) {
    const pre = Number(preTokenBalance.uiTokenAmount?.amount || "0");
    const post = Number(postTokenBalance.uiTokenAmount?.amount || "0");
    amount =
      (post - pre) / 10 ** (preTokenBalance.uiTokenAmount?.decimals || 0);
    tokenMint = preTokenBalance.mint;
  } else if (preBalance !== null && postBalance !== null) {
    amount = (postBalance - preBalance) / 1e9;
    tokenMint = "SOL";
  }

  return {
    signature,
    solscanUrl,
    date,
    sender,
    receiver,
    amount,
    tokenMint,
    slot,
  };
}

export async function handleSolanaTool(name: string, args: any) {
  switch (name) {
    case "fetch_solana_transactions": {
      const parsed = FetchSolanaTransactionsArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for fetch_solana_transactions: ${parsed.error}`
        );
      }
      const { walletAddress, limit } = parsed.data;
      try {
        const connection = new Connection(
          process.env.RPC_URL || clusterApiUrl("mainnet-beta")
        );
        const pubkey = new PublicKey(walletAddress);

        const signatures = await connection.getSignaturesForAddress(pubkey, {
          limit,
        });

        const transactions = (
          await Promise.all(
            signatures.map((sig) =>
              connection.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
                commitment: "confirmed",
              })
            )
          )
        ).filter((tx) => tx);

        const relevantTxs = transactions
          .map((tx) => extractRelevantTxData(tx, walletAddress))
          .filter(Boolean);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(relevantTxs, null, 2),
            },
          ],
          transactions: relevantTxs,
        };
      } catch (error) {
        throw new Error(
          `Failed to fetch Solana transactions: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    default:
      throw new Error(`Unknown Solana tool: ${name}`);
  }
}

const server = new Server(
  { name: "explainer-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: solanaTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    // Solana tools
    if (solanaTools.some((tool) => tool.name === name)) {
      return await handleSolanaTool(name, args);
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Error so it doesn't interfere with the MCP server stdio output
  console.error(
    `Explainer MCP Server v${
      require("../package.json").version
    } running on stdio`
  );
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
