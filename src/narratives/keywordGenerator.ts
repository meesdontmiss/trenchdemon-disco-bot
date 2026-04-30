export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

export function uniqueStrings(values: string[], limit = 40): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    const key = normalizeText(cleaned);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(cleaned);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
}

export function tickerize(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
}

export function fallbackKeywords(input: string): string[] {
  const words = tokenize(input).filter((word) => !STOP_WORDS.has(word));
  const phrases = new Set<string>();
  for (let i = 0; i < words.length; i += 1) {
    phrases.add(words[i] ?? "");
    if (words[i + 1]) {
      phrases.add(`${words[i]} ${words[i + 1]}`);
    }
  }
  return uniqueStrings([...phrases].filter(Boolean), 15);
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "are",
  "for",
  "from",
  "has",
  "into",
  "new",
  "that",
  "the",
  "this",
  "viral",
  "with"
]);
