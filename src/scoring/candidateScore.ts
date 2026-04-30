import { CoinCandidate } from "@prisma/client";
import { semanticSimilarity } from "../narratives/semanticMatcher.js";
import { normalizeText, tickerize } from "../narratives/keywordGenerator.js";
import { NarrativeTerms } from "../narratives/types.js";
import { NormalizedPumpToken } from "../pumpfun/providers/ProviderInterface.js";
import { bondingScore } from "./bondingScore.js";
import { cloneRiskFlags, cloneRiskScore } from "./cloneDetection.js";
import { creatorRiskScore } from "./creatorReputation.js";
import { freshnessScore } from "./freshnessScore.js";
import { socialMatchScore } from "./socialMatchScore.js";

export type CandidateScoreResult = {
  matched: boolean;
  matchKeywords: string[];
  matchExplanation: string;
  riskFlags: string[];
  confidenceScore: number;
  freshnessScore: number;
  bondingScore: number;
  socialScore: number;
  cloneRiskScore: number;
  finalScore: number;
};

export function scoreCandidate(
  narrative: NarrativeTerms,
  token: NormalizedPumpToken,
  narrativeCreatedAt: Date,
  existingCandidates: CoinCandidate[]
): CandidateScoreResult {
  const tokenText = normalizeText([token.name, token.symbol, token.description ?? "", ...(token.socialLinks ?? [])].join(" "));
  const symbol = tickerize(token.symbol);
  const keywordHits = narrative.keywords.filter((keyword) => {
    const normalized = normalizeText(keyword);
    return normalized.length > 0 && tokenText.includes(normalized);
  });
  const tickerHits = narrative.possibleTickers.filter((ticker) => {
    const normalized = tickerize(ticker);
    return normalized.length > 0 && (symbol === normalized || symbol.includes(normalized) || normalized.includes(symbol));
  });

  const exactNameHit = normalizeText(token.name) === normalizeText(narrative.title);
  const keywordScore = Math.min(100, keywordHits.length * 22 + tickerHits.length * 30 + (exactNameHit ? 35 : 0));
  const semanticScore = semanticSimilarity(narrative, token);
  const fresh = freshnessScore(token.createdAt, narrativeCreatedAt);
  const bond = bondingScore(token.bondingCurveProgress, token.isGraduated);
  const tickerScore = Math.min(100, tickerHits.length * 45 + (exactNameHit ? 25 : 0));
  const social = socialMatchScore(narrative, token);
  const clone = Math.max(cloneRiskScore(token, existingCandidates), creatorRiskScore(token.creatorWallet, existingCandidates));
  const cloneSafety = 100 - clone;

  const finalScore = clamp(
    keywordScore * 0.3 +
      semanticScore * 0.2 +
      fresh * 0.15 +
      bond * 0.15 +
      tickerScore * 0.1 +
      social * 0.05 +
      cloneSafety * 0.05
  );

  const matchKeywords = [...new Set([...keywordHits, ...tickerHits])];
  const meaningfulMetadata = Boolean(token.description && token.description.trim().length >= 12);
  const matched = finalScore >= 35 && (matchKeywords.length > 0 || exactNameHit || semanticScore >= 35);
  const riskFlags = riskFlagsFor(token, finalScore, meaningfulMetadata, clone, existingCandidates);
  const explanation = buildExplanation(token, narrative, matchKeywords, finalScore, riskFlags);

  return {
    matched,
    matchKeywords,
    matchExplanation: explanation,
    riskFlags,
    confidenceScore: Math.round(Math.max(keywordScore, semanticScore)),
    freshnessScore: Math.round(fresh),
    bondingScore: Math.round(bond),
    socialScore: Math.round(social),
    cloneRiskScore: Math.round(clone),
    finalScore: Math.round(finalScore)
  };
}

function riskFlagsFor(
  token: NormalizedPumpToken,
  finalScore: number,
  meaningfulMetadata: boolean,
  clone: number,
  existing: CoinCandidate[]
): string[] {
  const flags: string[] = [];
  if (!meaningfulMetadata) {
    flags.push("Low metadata quality");
  }
  if (token.isGraduated) {
    flags.push("Already graduated");
  }
  if (finalScore < 55) {
    flags.push("Needs human review");
  }
  if (token.symbol && !token.description) {
    flags.push("Exact ticker may be stronger than description");
  }
  return [...flags, ...cloneRiskFlags(clone, existing)];
}

function buildExplanation(
  token: NormalizedPumpToken,
  narrative: NarrativeTerms,
  matchKeywords: string[],
  finalScore: number,
  riskFlags: string[]
): string {
  const hits = matchKeywords.length ? `Matched terms: ${matchKeywords.join(", ")}.` : "Matched by semantic overlap.";
  const risks = riskFlags.length ? ` Risk flags: ${riskFlags.join("; ")}.` : "";
  return `${hits} ${token.symbol} / ${token.name} overlaps with "${narrative.title}" and scored ${Math.round(
    finalScore
  )}/100 for narrative relevance.${risks}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
