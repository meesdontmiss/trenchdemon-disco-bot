import OpenAI from "openai";
import { z } from "zod";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { fallbackKeywords, tickerize, uniqueStrings } from "./keywordGenerator.js";
import { NarrativeExtraction } from "./types.js";

const extractionSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(1000),
  entities: z.array(z.string()).default([]),
  meme_angles: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  alternate_keywords: z.array(z.string()).default([]),
  possible_tickers: z.array(z.string()).default([]),
  negative_keywords: z.array(z.string()).default([]),
  time_sensitivity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  confidence: z.number().min(0).max(100).default(60)
});

export async function extractNarrative(input: string): Promise<NarrativeExtraction> {
  const llm = getLlmConfig();
  if (!llm.apiKey && env.LLM_PROVIDER === "openai") {
    return fallbackExtraction(input);
  }

  const client = new OpenAI({
    apiKey: llm.apiKey ?? "openclaw-local",
    baseURL: llm.baseURL
  });

  try {
    const completion = await client.chat.completions.create({
      model: llm.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract memecoin narrative search terms for a Discord research assistant. Return only strict JSON with title, summary, entities, meme_angles, keywords, alternate_keywords, possible_tickers, negative_keywords, time_sensitivity, confidence. Avoid financial advice."
        },
        {
          role: "user",
          content: input.slice(0, 8000)
        }
      ]
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      return fallbackExtraction(input);
    }

    return sanitizeExtraction(extractionSchema.parse(JSON.parse(content)), input);
  } catch (error) {
    logger.warn({ err: error }, "LLM narrative extraction failed, using heuristic fallback");
    return fallbackExtraction(input);
  }
}

function getLlmConfig(): { apiKey?: string; baseURL?: string; model: string } {
  if (env.LLM_PROVIDER === "openclaw") {
    return {
      apiKey: env.OPENCLAW_API_KEY ?? env.OPENAI_API_KEY,
      baseURL: env.OPENCLAW_BASE_URL ?? env.OPENAI_BASE_URL ?? "http://localhost:18789/v1",
      model: env.OPENCLAW_MODEL ?? env.OPENAI_MODEL
    };
  }

  return {
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
    model: env.OPENAI_MODEL
  };
}

function sanitizeExtraction(extraction: NarrativeExtraction, input: string): NarrativeExtraction {
  const keywords = uniqueStrings([...extraction.keywords, ...extraction.alternate_keywords, ...extraction.entities], 35);
  const possibleTickers = uniqueStrings(
    [...extraction.possible_tickers, ...keywords.map(tickerize)].filter((value) => value.length >= 2),
    12
  );

  return {
    ...extraction,
    title: extraction.title.trim() || fallbackTitle(input),
    summary: extraction.summary.trim() || input.slice(0, 500),
    entities: uniqueStrings(extraction.entities, 20),
    meme_angles: uniqueStrings(extraction.meme_angles, 20),
    keywords,
    alternate_keywords: uniqueStrings(extraction.alternate_keywords, 20),
    possible_tickers: possibleTickers,
    negative_keywords: uniqueStrings(extraction.negative_keywords, 20),
    confidence: Math.round(extraction.confidence)
  };
}

function fallbackExtraction(input: string): NarrativeExtraction {
  const keywords = fallbackKeywords(input);
  const title = fallbackTitle(input);
  return {
    title,
    summary: input.trim().slice(0, 700),
    entities: keywords.slice(0, 8),
    meme_angles: keywords.slice(0, 6),
    keywords,
    alternate_keywords: [],
    possible_tickers: uniqueStrings(keywords.map(tickerize).filter((value) => value.length >= 3), 10),
    negative_keywords: [],
    time_sensitivity: "MEDIUM",
    confidence: 55
  };
}

function fallbackTitle(input: string): string {
  const clean = input.replace(/^https?:\/\/\S+/i, "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter(Boolean).slice(0, 6);
  return words.length ? words.map(capitalize).join(" ") : "Untitled Narrative";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
