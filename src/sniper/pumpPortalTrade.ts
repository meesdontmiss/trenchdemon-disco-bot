import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

export type TradeResult = {
  success: boolean;
  signature?: string;
  error?: string;
};

export function buildKeypairFromEnv(): Keypair | null {
  const raw = env.SNIPE_WALLET_PRIVATE_KEY;
  if (!raw) {
    return null;
  }
  try {
    return Keypair.fromSecretKey(bs58.decode(raw));
  } catch {
    logger.error("SNIPE_WALLET_PRIVATE_KEY is not a valid bs58 private key");
    return null;
  }
}

export async function buyTokenViaPumpPortal(
  mintAddress: string,
  amountSol: number,
  keypair: Keypair
): Promise<TradeResult> {
  const tradeUrl = env.PUMPPORTAL_TRADE_URL;

  try {
    const response = await fetch(tradeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        publicKey: keypair.publicKey.toBase58(),
        action: "buy",
        mint: mintAddress,
        amount: amountSol,
        denominatedInSol: "true",
        slippage: env.SNIPE_SLIPPAGE,
        priorityFee: env.SNIPE_PRIORITY_FEE,
        pool: "pump"
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, error: `PumpPortal trade-local HTTP ${response.status}: ${body.slice(0, 200)}` };
    }

    const txBuffer = Buffer.from(await response.arrayBuffer());
    const tx = VersionedTransaction.deserialize(txBuffer);
    tx.sign([keypair]);

    const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed"
    });

    logger.info({ mint: mintAddress, signature, amountSol }, "snipe transaction submitted");
    return { success: true, signature };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ err: error, mint: mintAddress }, "snipe transaction failed");
    return { success: false, error: message };
  }
}

export async function getWalletBalanceSol(keypair: Keypair): Promise<number> {
  try {
    const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
    const lamports = await connection.getBalance(keypair.publicKey);
    return lamports / 1e9;
  } catch {
    return 0;
  }
}
