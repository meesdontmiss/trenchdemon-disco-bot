import { env } from "./env.js";

type Bucket = {
  lastUsedAt: number;
};

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing) {
    buckets.set(key, { lastUsedAt: now });
    return false;
  }

  const waitMs = env.COMMAND_RATE_LIMIT_SECONDS * 1000;
  if (now - existing.lastUsedAt < waitMs) {
    return true;
  }

  existing.lastUsedAt = now;
  return false;
}
