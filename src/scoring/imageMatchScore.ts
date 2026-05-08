import OpenAI from "openai";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { fallbackKeywords, normalizeText } from "../narratives/keywordGenerator.js";

export type ImageDescription = {
  keywords: string[];
  rawDescription: string;
};

export async function describeImage(imageUrl: string): Promise<ImageDescription> {
  const apiKey = env.OPENAI_API_KEY ?? (env.LLM_PROVIDER === "openclaw" ? env.OPENCLAW_API_KEY : undefined);
  if (!apiKey || !imageUrl) {
    return { keywords: [], rawDescription: "" };
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: env.LLM_PROVIDER === "openclaw" ? env.OPENCLAW_BASE_URL : env.OPENAI_BASE_URL
    });

    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" }
            },
            {
              type: "text",
              text: "Describe this image in 2-3 short sentences focusing on: subject, animals, characters, colors, meme references, pop culture. Then list 10 single-word tags separated by commas."
            }
          ]
        }
      ]
    });

    const raw = completion.choices[0]?.message.content ?? "";
    const tagLine = raw.split("\n").find((line) => line.includes(",")) ?? raw;
    const keywords = tagLine
      .split(",")
      .map((tag) => tag.replace(/[^a-zA-Z0-9 ]/g, "").trim().toLowerCase())
      .filter((tag) => tag.length >= 2 && tag.length <= 40)
      .slice(0, 15);

    return { keywords: keywords.length ? keywords : fallbackKeywords(raw), rawDescription: raw };
  } catch (error) {
    logger.warn({ err: error, imageUrl }, "image description via Vision failed");
    return { keywords: [], rawDescription: "" };
  }
}

export function imageKeywordMatchScore(referenceKeywords: string[], tokenImageDescription: ImageDescription): number {
  if (!referenceKeywords.length || !tokenImageDescription.keywords.length) {
    return 0;
  }

  const refSet = new Set(referenceKeywords.map((k) => normalizeText(k)));
  const hits = tokenImageDescription.keywords.filter((k) => refSet.has(normalizeText(k))).length;
  return Math.min(100, hits * 20);
}
