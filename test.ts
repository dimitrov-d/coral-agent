import {
  clusterApiUrl,
  Connection,
  MessageAccountKeys,
  PublicKey,
  VersionedTransactionResponse,
} from "@solana/web3.js";

function extractRelevantTxData(
  tx: VersionedTransactionResponse,
  walletAddress: string
) {
  if (!tx) return null;

  const { slot, blockTime, transaction, meta } = tx;
  const signature = tx.transaction.signatures[0];
  const solscanUrl = `https://solscan.io/tx/${signature}`;
  const date = blockTime ? new Date(blockTime * 1000).toISOString() : null;

  let preTokenBalance: any = null;
  let postTokenBalance: any = null;
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

  let preBalance: any = null;
  let postBalance: any = null;
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

  let sender: any = null;
  let receiver: any = null;
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

  let amount: any = null;
  let tokenMint: any = null;
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
    sender: sender ? sender.toBase58() : null,
    receiver: receiver ? receiver.toBase58() : null,
    amount,
    tokenMint,
    slot,
  };
}

async function main() {
  try {
    const connection = new Connection(
      process.env.RPC_URL || clusterApiUrl("mainnet-beta")
    );
    const walletAddress = "wallet-here";
    const pubkey = new PublicKey(walletAddress);

    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 100,
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
      .map((tx) =>
        extractRelevantTxData(tx as VersionedTransactionResponse, walletAddress)
      )
      .filter(Boolean);

    return {
      content: [
        {
          type: "json",
          json: relevantTxs,
        },
        {
          type: "text",
          text: `Fetched ${relevantTxs.length} transactions for wallet ${walletAddress}.`,
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

main().then((txs) => console.log(JSON.stringify(txs, null, 2)));
