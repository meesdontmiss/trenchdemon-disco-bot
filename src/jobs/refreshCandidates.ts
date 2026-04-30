import { prisma } from "../db/prisma.js";
import { PumpFunProvider } from "../pumpfun/providers/ProviderInterface.js";
import { PumpScanner } from "../pumpfun/pumpScanner.js";
import { logger } from "../utils/logger.js";

export async function refreshKnownCandidates(provider: PumpFunProvider, scanner: PumpScanner): Promise<void> {
  const candidates = await prisma.coinCandidate.findMany({
    where: {
      isIgnored: false,
      isGraduated: false,
      narrativeWatch: { status: "ACTIVE" }
    },
    take: 250,
    orderBy: { lastUpdatedAt: "asc" }
  });

  for (const candidate of candidates) {
    try {
      const token = await provider.getTokenByMint(candidate.mintAddress);
      if (token) {
        await scanner.processToken(token);
      }
    } catch (error) {
      logger.warn({ err: error, mint: candidate.mintAddress }, "failed to refresh candidate");
    }
  }
}
