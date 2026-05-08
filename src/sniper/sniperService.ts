import { prisma } from "../db/prisma.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { buildKeypairFromEnv, buyTokenViaPumpPortal, getWalletBalanceSol } from "./pumpPortalTrade.js";

export class SniperService {
  private keypair = buildKeypairFromEnv();

  isEnabled(): boolean {
    return env.SNIPE_ENABLED && Boolean(this.keypair);
  }

  async maybeSnipe(params: {
    mintAddress: string;
    narrativeWatchId: string;
    candidateId: string;
    finalScore: number;
  }): Promise<void> {
    if (!this.isEnabled() || !this.keypair) return;
    if (params.finalScore < env.SNIPE_MIN_SCORE) return;

    const alreadySniped = await prisma.snipeOrder.count({
      where: { narrativeWatchId: params.narrativeWatchId, status: { in: ["SUBMITTED", "CONFIRMED"] } }
    });
    if (alreadySniped >= env.SNIPE_MAX_PER_WATCH) {
      logger.info({ mint: params.mintAddress }, "snipe skipped: max per watch reached");
      return;
    }

    const order = await prisma.snipeOrder.create({
      data: {
        narrativeWatchId: params.narrativeWatchId,
        mintAddress: params.mintAddress,
        candidateId: params.candidateId,
        amountSol: env.SNIPE_AMOUNT_SOL,
        finalScore: params.finalScore,
        status: "PENDING"
      }
    });

    const result = await buyTokenViaPumpPortal(params.mintAddress, env.SNIPE_AMOUNT_SOL, this.keypair);

    await prisma.snipeOrder.update({
      where: { id: order.id },
      data: {
        status: result.success ? "SUBMITTED" : "FAILED",
        txSignature: result.signature,
        errorMessage: result.error,
        confirmedAt: result.success ? new Date() : null
      }
    });

    logger.info({ mint: params.mintAddress, success: result.success, sig: result.signature }, "snipe order settled");
  }

  async getWalletInfo(): Promise<{ address: string; balanceSol: number } | null> {
    if (!this.keypair) return null;
    const balanceSol = await getWalletBalanceSol(this.keypair);
    return { address: this.keypair.publicKey.toBase58(), balanceSol };
  }
}

export const sniper = new SniperService();
