import { NormalizedPumpToken } from "../pumpfun/providers/ProviderInterface.js";
import { normalizeText } from "../narratives/keywordGenerator.js";
import { NarrativeTerms } from "../narratives/types.js";

export function socialMatchScore(narrative: NarrativeTerms, token: NormalizedPumpToken): number {
  const links = token.socialLinks ?? [];
  if (!links.length) {
    return 20;
  }

  const text = normalizeText(links.join(" "));
  const hits = narrative.keywords.filter((keyword) => text.includes(normalizeText(keyword))).length;
  return Math.min(100, 40 + hits * 20);
}
