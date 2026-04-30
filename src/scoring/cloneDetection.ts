import { CoinCandidate } from "@prisma/client";
import { NormalizedPumpToken } from "../pumpfun/providers/ProviderInterface.js";
import { normalizeText } from "../narratives/keywordGenerator.js";

export function cloneRiskScore(token: NormalizedPumpToken, existing: CoinCandidate[]): number {
  const sameTicker = existing.filter((candidate) => normalizeText(candidate.symbol) === normalizeText(token.symbol)).length;
  const sameName = existing.filter((candidate) => normalizeText(candidate.name) === normalizeText(token.name)).length;
  const lowMetadata = !token.description || token.description.trim().length < 12;
  return Math.min(100, sameTicker * 20 + sameName * 20 + (lowMetadata ? 20 : 0));
}

export function cloneRiskFlags(score: number, existing: CoinCandidate[]): string[] {
  const flags: string[] = [];
  if (score >= 60) {
    flags.push("Possible clone or duplicate launch");
  } else if (score >= 30) {
    flags.push("Multiple similar coins competing");
  }
  if (existing.length >= 3) {
    flags.push("Crowded narrative with competing launches");
  }
  return flags;
}
