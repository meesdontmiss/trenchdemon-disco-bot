import { NarrativeWatch } from "@prisma/client";
import { NarrativeTerms } from "./types.js";

export function termsFromWatch(watch: NarrativeWatch): NarrativeTerms {
  return {
    title: watch.title,
    summary: watch.summary,
    entities: jsonArray(watch.entities),
    keywords: jsonArray(watch.keywords),
    possibleTickers: jsonArray(watch.possibleTickers),
    negativeKeywords: jsonArray(watch.negativeKeywords)
  };
}

export function jsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
