import { NormalizedPumpToken } from "../pumpfun/providers/ProviderInterface.js";
import { searchableTokenText } from "../pumpfun/tokenNormalizer.js";
import { normalizeText, tokenize } from "./keywordGenerator.js";
import { NarrativeTerms } from "./types.js";

export function semanticSimilarity(narrative: NarrativeTerms, token: NormalizedPumpToken): number {
  const narrativeTokens = new Set(tokenize([narrative.title, narrative.summary, ...narrative.keywords].join(" ")));
  const tokenTokens = new Set(tokenize(searchableTokenText(token)));
  if (!narrativeTokens.size || !tokenTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const value of tokenTokens) {
    if (narrativeTokens.has(value)) {
      overlap += 1;
    }
  }

  const union = new Set([...narrativeTokens, ...tokenTokens]).size;
  const jaccard = union > 0 ? overlap / union : 0;
  return Math.min(100, Math.round(jaccard * 180));
}

export function hasNegativeKeyword(narrative: NarrativeTerms, token: NormalizedPumpToken): boolean {
  const text = normalizeText(searchableTokenText(token));
  return narrative.negativeKeywords.some((keyword) => {
    const normalized = normalizeText(keyword);
    return normalized.length > 0 && text.includes(normalized);
  });
}
