import { CoinCandidate } from "@prisma/client";

export function creatorRiskScore(creatorWallet: string | undefined, existing: CoinCandidate[]): number {
  if (!creatorWallet) {
    return 10;
  }

  const launches = existing.filter((candidate) => candidate.creatorWallet === creatorWallet).length;
  return Math.min(100, launches * 15);
}
