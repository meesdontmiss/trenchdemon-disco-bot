import { env } from "../../utils/env.js";
import { BondingStatus, NormalizedPumpToken, PumpFunProvider } from "./ProviderInterface.js";
import { extractArray, fetchJson, withMint } from "./http.js";

export class PumpFunFrontendProvider implements PumpFunProvider {
  name = "pumpfun";

  async getNewTokens(limit: number): Promise<NormalizedPumpToken[]> {
    const url = new URL("/coins", env.PUMPFUN_FRONTEND_BASE_URL);
    url.searchParams.set("offset", "0");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("sort", "created_timestamp");
    url.searchParams.set("order", "DESC");
    url.searchParams.set("includeNsfw", "true");

    const json = await fetchJson<unknown>(url.toString(), {
      headers: this.headers()
    });

    return extractArray(json)
      .map((item) => this.normalize(item))
      .filter((token): token is NormalizedPumpToken => Boolean(token));
  }

  async getBondingTokens(limit: number): Promise<NormalizedPumpToken[]> {
    const tokens = await this.getNewTokens(limit);
    return tokens.filter((token) => !token.isGraduated);
  }

  async getTokenByMint(mint: string): Promise<NormalizedPumpToken | null> {
    const url = withMint(new URL("/coins/{mint}", env.PUMPFUN_FRONTEND_BASE_URL).toString(), mint);
    const json = await fetchJson<unknown>(url, {
      headers: this.headers()
    });
    return this.normalize(json);
  }

  async getBondingStatus(mint: string): Promise<BondingStatus | null> {
    const token = await this.getTokenByMint(mint);
    if (!token) {
      return null;
    }
    return {
      mintAddress: token.mintAddress,
      bondingCurveProgress: token.bondingCurveProgress,
      isGraduated: Boolean(token.isGraduated),
      marketCapUsd: token.marketCapUsd,
      raw: token.raw
    };
  }

  supportsRealtime(): boolean {
    return false;
  }

  private normalize(raw: unknown): NormalizedPumpToken | null {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const value = raw as Record<string, unknown>;
    const mintAddress = stringValue(value.mint);
    const name = stringValue(value.name);
    const symbol = stringValue(value.symbol);
    if (!mintAddress || !name || !symbol) {
      return null;
    }

    const createdTimestamp = numberValue(value.created_timestamp);
    const marketCapSol = numberValue(value.usd_market_cap) ?? numberValue(value.market_cap);
    const progress = estimateBondingProgress(value);

    return {
      mintAddress,
      name,
      symbol,
      description: stringValue(value.description),
      imageUrl: stringValue(value.image_uri),
      creatorWallet: stringValue(value.creator),
      pumpUrl: `https://pump.fun/coin/${mintAddress}`,
      createdAt: createdTimestamp ? new Date(createdTimestamp) : undefined,
      marketCapUsd: marketCapSol,
      bondingCurveProgress: progress,
      isGraduated: booleanValue(value.complete),
      socialLinks: [stringValue(value.twitter), stringValue(value.telegram), stringValue(value.website)].filter(
        (item): item is string => Boolean(item)
      ),
      raw: {
        provider: this.name,
        payload: raw
      }
    };
  }

  private headers(): HeadersInit {
    return {
      "user-agent": "NarrativeCoinScout/0.1",
      accept: "application/json"
    };
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["true", "1", "yes"].includes(value.toLowerCase());
  }
  return undefined;
}

function estimateBondingProgress(value: Record<string, unknown>): number | undefined {
  const explicit = numberValue(value.bonding_curve_progress);
  if (explicit !== undefined) {
    return explicit;
  }

  const marketCap = numberValue(value.usd_market_cap) ?? numberValue(value.market_cap);
  if (marketCap === undefined) {
    return undefined;
  }

  // Pump.fun graduation thresholds have changed over time. This is only a rough activity indicator
  // when the frontend payload does not expose explicit bonding progress.
  return Math.max(0, Math.min(99, (marketCap / 90_000) * 100));
}
