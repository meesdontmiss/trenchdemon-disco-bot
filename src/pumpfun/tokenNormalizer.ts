import { NormalizedPumpToken } from "./providers/ProviderInterface.js";

type RawToken = Record<string, unknown>;

export function normalizeProviderToken(raw: unknown, provider: string): NormalizedPumpToken | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = unwrapToken(raw as RawToken);
  const mintAddress = firstString(value, ["mintAddress", "mint", "address", "tokenAddress", "token_address"]);
  const name = firstString(value, ["name", "tokenName", "token_name", "metadataName"]);
  const symbol = firstString(value, ["symbol", "ticker", "tokenSymbol", "token_symbol"]);

  if (!mintAddress || !name || !symbol) {
    return null;
  }

  const createdAtRaw = firstString(value, ["createdAt", "created_at", "timestamp", "blockTimestamp", "created_timestamp"]);
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : undefined;
  const socialLinks = collectSocialLinks(value);

  return {
    mintAddress,
    name,
    symbol,
    description: firstString(value, ["description", "metadataDescription", "tokenDescription"]),
    imageUrl: firstString(value, ["imageUrl", "image_uri", "image", "uri", "metadataUri"]),
    creatorWallet: firstString(value, ["creatorWallet", "creator", "deployer", "owner", "creatorAddress"]),
    pumpUrl:
      firstString(value, ["pumpUrl", "pump_fun_url", "url"]) ??
      `https://pump.fun/coin/${encodeURIComponent(mintAddress)}`,
    createdAt: createdAt && !Number.isNaN(createdAt.valueOf()) ? createdAt : undefined,
    marketCapUsd: firstNumber(value, ["marketCapUsd", "market_cap_usd", "usdMarketCap", "marketCap"]),
    bondingCurveProgress: firstNumber(value, ["bondingCurveProgress", "bonding_curve_progress", "progress"]),
    isGraduated: firstBoolean(value, ["isGraduated", "graduated", "complete", "migrated"]),
    socialLinks,
    raw: {
      provider,
      payload: raw
    }
  };
}

function unwrapToken(value: RawToken): RawToken {
  for (const key of ["token", "data", "coin", "result"]) {
    const nested = value[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const object = nested as RawToken;
      if (firstString(object, ["mintAddress", "mint", "address", "tokenAddress", "token_address"])) {
        return object;
      }
    }
  }

  return value;
}

export function searchableTokenText(token: NormalizedPumpToken): string {
  return [
    token.name,
    token.symbol,
    token.description,
    token.creatorWallet,
    ...(token.socialLinks ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

function firstString(value: RawToken, keys: string[]): string | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
    if (typeof candidate === "number") {
      return String(candidate);
    }
  }

  return undefined;
}

function firstNumber(value: RawToken, keys: string[]): number | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function firstBoolean(value: RawToken, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
    if (typeof candidate === "string") {
      if (["true", "yes", "1"].includes(candidate.toLowerCase())) {
        return true;
      }
      if (["false", "no", "0"].includes(candidate.toLowerCase())) {
        return false;
      }
    }
  }

  return undefined;
}

function collectSocialLinks(value: RawToken): string[] {
  const links = new Set<string>();
  for (const key of ["twitter", "x", "telegram", "website", "socialLinks", "socials"]) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      links.add(candidate);
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === "string") {
          links.add(item);
        }
      }
    }
    if (candidate && typeof candidate === "object") {
      for (const item of Object.values(candidate as Record<string, unknown>)) {
        if (typeof item === "string") {
          links.add(item);
        }
      }
    }
  }

  return [...links];
}
