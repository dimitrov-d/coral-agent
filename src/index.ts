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

// Coral Protocol integration based on official docs
interface CoralSession {
  id: string;
  status: string;
  participants: CoralActor[];
  threads: CoralThread[];
  created_at: string;
}

interface CoralActor {
  id: string;
  name: string;
  type: 'agent' | 'application';
  capabilities: string[];
  framework?: string;
}

interface CoralThread {
  id: string;
  session_id: string;
  participants: string[];
  messages: CoralMessage[];
  status: 'active' | 'completed' | 'failed';
}

interface CoralMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: any;
  timestamp: string;
  message_type: 'request' | 'response' | 'notification';
}

interface CoralAgentAdvertisement {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  framework: string;
  pricing?: {
    model: 'per_use' | 'subscription';
    amount?: number;
  };
  metadata: {
    version: string;
    author: string;
    tags: string[];
  };
}

class CoralProtocolClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = process.env.CORAL_SERVER_URL || "http://localhost:5555", apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.CORAL_API_KEY;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`Coral Protocol API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Session Management
  async createSession(name?: string, description?: string): Promise<CoralSession> {
    return this.makeRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        name: name || 'Solana Transaction Analysis Session',
        description: description || 'AI-powered Solana blockchain transaction analysis using MCP',
        privacy_level: 'application_controlled',
        max_participants: 10
      })
    });
  }

  async getSessions(): Promise<CoralSession[]> {
    return this.makeRequest('/sessions');
  }

  async getSession(sessionId: string): Promise<CoralSession> {
    return this.makeRequest(`/sessions/${sessionId}`);
  }

  // Thread-based Communication
  async createThread(sessionId: string, participants: string[]): Promise<CoralThread> {
    return this.makeRequest('/threads', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        participants,
        thread_type: 'collaboration'
      })
    });
  }

  async sendMessage(threadId: string, content: any, messageType: 'request' | 'response' | 'notification' = 'request'): Promise<CoralMessage> {
    return this.makeRequest('/messages', {
      method: 'POST',
      body: JSON.stringify({
        thread_id: threadId,
        content,
        message_type: messageType,
        sender_id: 'solana-mcp-agent'
      })
    });
  }

  async getThreadMessages(threadId: string): Promise<CoralMessage[]> {
    return this.makeRequest(`/threads/${threadId}/messages`);
  }

  // Agent Discovery
  async discoverAgents(capabilities?: string[]): Promise<CoralAgentAdvertisement[]> {
    const params = capabilities ? `?capabilities=${capabilities.join(',')}` : '';
    return this.makeRequest(`/agents/discover${params}`);
  }

  async getAgentDetails(agentId: string): Promise<CoralAgentAdvertisement> {
    return this.makeRequest(`/agents/${agentId}`);
  }

  // Agent Advertisement (for publishing this MCP server as an agent)
  async advertiseAgent(advertisement: Partial<CoralAgentAdvertisement>): Promise<CoralAgentAdvertisement> {
    const fullAdvertisement: CoralAgentAdvertisement = {
      id: 'solana-mcp-agent',
      name: 'Solana MCP Agent',
      description: 'Solana blockchain transaction analysis and wallet insights',
      capabilities: [
        'solana_transaction_analysis',
        'wallet_history',
        'blockchain_data',
        'defi_insights'
      ],
      framework: 'mcp',
      pricing: {
        model: 'per_use',
        amount: 0 // Free for hackathon
      },
      metadata: {
        version: '1.0.0',
        author: 'Coral Agent Team',
        tags: ['solana', 'blockchain', 'defi', 'mcp']
      },
      ...advertisement
    };

    return this.makeRequest('/agents/advertise', {
      method: 'POST',
      body: JSON.stringify(fullAdvertisement)
    });
  }
}

export const FetchSolanaTransactionsArgsSchema = z.object({
  walletAddress: z
    .string()
    .min(42, "Invalid Solana address")
    .max(44, "Invalid Solana address"),
  limit: z.number().optional().default(100),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Initialize Coral Protocol client
const coralClient = new CoralProtocolClient();

// Coral Protocol Schemas
export const CoralSessionArgsSchema = z.object({
  sessionName: z.string().optional(),
  description: z.string().optional(),
});

export const CoralThreadArgsSchema = z.object({
  sessionId: z.string(),
  participants: z.array(z.string()).optional(),
});

export const CoralMessageArgsSchema = z.object({
  threadId: z.string(),
  content: z.any(),
  messageType: z.enum(['request', 'response', 'notification']).optional(),
});

export const CoralDiscoverArgsSchema = z.object({
  capabilities: z.array(z.string()).optional(),
});

export const solanaTools = [
  {
    name: "fetch_solana_transactions",
    description:
      "Fetches the recent Solana transaction history for a given wallet address. Returns transaction amounts, sender/receiver addresses, and Solscan links.",
    inputSchema: zodToJsonSchema(FetchSolanaTransactionsArgsSchema) as ToolInput,
  },
  {
    name: "create_coral_session",
    description:
      "Creates a new Coral Protocol session for multi-agent collaboration on Solana analysis. Sessions enable thread-based communication between AI agents.",
    inputSchema: zodToJsonSchema(CoralSessionArgsSchema) as ToolInput,
  },
  {
    name: "list_coral_sessions",
    description:
      "Lists all active Coral Protocol sessions with participants and thread information.",
    inputSchema: zodToJsonSchema(z.object({})) as ToolInput,
  },
  {
    name: "create_coral_thread",
    description:
      "Creates a communication thread within a Coral session for focused agent collaboration on specific analysis tasks.",
    inputSchema: zodToJsonSchema(CoralThreadArgsSchema) as ToolInput,
  },
  {
    name: "send_coral_message",
    description:
      "Sends a message to a Coral thread, enabling communication between agents for collaborative Solana analysis.",
    inputSchema: zodToJsonSchema(CoralMessageArgsSchema) as ToolInput,
  },
  {
    name: "discover_coral_agents",
    description:
      "Discovers available AI agents in the Coral Protocol network that can assist with specific capabilities like DeFi analysis, trading insights, or risk assessment.",
    inputSchema: zodToJsonSchema(CoralDiscoverArgsSchema) as ToolInput,
  },
  {
    name: "advertise_solana_agent",
    description:
      "Advertises this Solana MCP agent in the Coral Protocol network, making it discoverable by other agents and applications.",
    inputSchema: zodToJsonSchema(z.object({})) as ToolInput,
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

export async function handleCoralTool(name: string, args: any) {
  switch (name) {
    case "create_coral_session": {
      const parsed = CoralSessionArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for create_coral_session: ${parsed.error}`);
      }
      
      try {
        const { sessionName, description } = parsed.data;
        const session = await coralClient.createSession(sessionName, description);
        return {
          content: [
            {
              type: "text",
              text: `✅ Created Coral Protocol session "${session.id}" for multi-agent Solana analysis collaboration.`,
            },
          ],
          session,
        };
      } catch (error) {
        throw new Error(`Failed to create Coral session: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    case "list_coral_sessions": {
      try {
        const sessions = await coralClient.getSessions();
        const sessionSummary = sessions.map(s => ({
          id: s.id,
          status: s.status,
          participants: s.participants.length,
          threads: s.threads.length,
          created_at: s.created_at
        }));
        
        return {
          content: [
            {
              type: "text",
              text: `📋 Found ${sessions.length} active Coral Protocol sessions:\n\n${JSON.stringify(sessionSummary, null, 2)}`,
            },
          ],
          sessions,
        };
      } catch (error) {
        throw new Error(`Failed to list Coral sessions: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    case "create_coral_thread": {
      const parsed = CoralThreadArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for create_coral_thread: ${parsed.error}`);
      }
      
      try {
        const { sessionId, participants = ['solana-mcp-agent'] } = parsed.data;
        const thread = await coralClient.createThread(sessionId, participants);
        return {
          content: [
            {
              type: "text",
              text: `🧵 Created communication thread "${thread.id}" in session "${sessionId}" with ${participants.length} participants.`,
            },
          ],
          thread,
        };
      } catch (error) {
        throw new Error(`Failed to create Coral thread: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    case "send_coral_message": {
      const parsed = CoralMessageArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for send_coral_message: ${parsed.error}`);
      }
      
      try {
        const { threadId, content, messageType = 'request' } = parsed.data;
        const message = await coralClient.sendMessage(threadId, content, messageType);
        return {
          content: [
            {
              type: "text",
              text: `💬 Sent ${messageType} message to thread "${threadId}". Message ID: ${message.id}`,
            },
          ],
          message,
        };
      } catch (error) {
        throw new Error(`Failed to send Coral message: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    case "discover_coral_agents": {
      const parsed = CoralDiscoverArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for discover_coral_agents: ${parsed.error}`);
      }
      
      try {
        const { capabilities } = parsed.data;
        const agents = await coralClient.discoverAgents(capabilities);
        const agentSummary = agents.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          capabilities: a.capabilities,
          framework: a.framework,
          pricing: a.pricing
        }));
        
        return {
          content: [
            {
              type: "text",
              text: `🔍 Discovered ${agents.length} AI agents in Coral Protocol network${capabilities ? ` with capabilities: ${capabilities.join(', ')}` : ''}:\n\n${JSON.stringify(agentSummary, null, 2)}`,
            },
          ],
          agents,
        };
      } catch (error) {
        throw new Error(`Failed to discover Coral agents: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    case "advertise_solana_agent": {
      try {
        const advertisement = await coralClient.advertiseAgent({});
        return {
          content: [
            {
              type: "text",
              text: `📢 Successfully advertised Solana MCP Agent in Coral Protocol network!\n\nAgent ID: ${advertisement.id}\nCapabilities: ${advertisement.capabilities.join(', ')}\nFramework: ${advertisement.framework}`,
            },
          ],
          advertisement,
        };
      } catch (error) {
        throw new Error(`Failed to advertise Solana agent: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    default:
      throw new Error(`Unknown Coral tool: ${name}`);
  }
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
    if (name === "fetch_solana_transactions") {
      return await handleSolanaTool(name, args);
    }

    // Coral Protocol tools
    const coralTools = [
      "create_coral_session",
      "list_coral_sessions", 
      "create_coral_thread",
      "send_coral_message",
      "discover_coral_agents",
      "advertise_solana_agent"
    ];
    
    if (coralTools.includes(name)) {
      return await handleCoralTool(name, args);
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `❌ Error: ${errorMessage}` }],
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
