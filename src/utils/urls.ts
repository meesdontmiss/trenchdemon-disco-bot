import { SourceType } from "@prisma/client";

export function sanitizeUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function inferSource(input: string): { sourceType: SourceType; sourceUrl?: string } {
  const sourceUrl = sanitizeUrl(input);
  if (!sourceUrl) {
    return { sourceType: SourceType.TEXT };
  }

  const host = new URL(sourceUrl).hostname.toLowerCase();
  if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) {
    return { sourceType: SourceType.TWEET, sourceUrl };
  }

  return { sourceType: SourceType.URL, sourceUrl };
}

export async function extractReadableInput(input: string): Promise<string> {
  const sourceUrl = sanitizeUrl(input);
  if (!sourceUrl) {
    return input.trim();
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "NarrativeCoinScout/0.1 (+research bot)"
    },
    signal: AbortSignal.timeout(8000)
  });

  const html = await response.text();
  const title = matchMeta(html, /<title[^>]*>(.*?)<\/title>/is);
  const description =
    matchMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/is) ??
    matchMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/is);

  return [sourceUrl, title, description].filter(Boolean).join("\n").slice(0, 6000);
}

function matchMeta(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern)?.[1];
  if (!match) {
    return null;
  }

  return decodeHtml(match.replace(/\s+/g, " ").trim());
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
