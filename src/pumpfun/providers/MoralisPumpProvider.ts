import { env } from "../../utils/env.js";
import { normalizeProviderToken } from "../tokenNormalizer.js";
import {
  BondingStatus,
  NormalizedPumpToken,
  ProviderConfigurationError,
  PumpFunProvider
} from "./ProviderInterface.js";
import { extractArray, fetchJson, withLimit, withMint } from "./http.js";

export class MoralisPumpProvider implements PumpFunProvider {
  name = "moralis";

  async getNewTokens(limit: number): Promise<NormalizedPumpToken[]> {
    const url = env.MORALIS_NEW_TOKENS_URL;
    if (!url) {
      throw new ProviderConfigurationError(this.name, "set MORALIS_NEW_TOKENS_URL");
    }
    return this.fetchTokenList(withLimit(url, limit));
  }

  async getBondingTokens(limit: number): Promise<NormalizedPumpToken[]> {
    const url = env.MORALIS_BONDING_TOKENS_URL;
    if (!url) {
      throw new ProviderConfigurationError(this.name, "set MORALIS_BONDING_TOKENS_URL");
    }
    return this.fetchTokenList(withLimit(url, limit));
  }

  async getTokenByMint(mint: string): Promise<NormalizedPumpToken | null> {
    const url = env.MORALIS_TOKEN_BY_MINT_URL;
    if (!url) {
      throw new ProviderConfigurationError(this.name, "set MORALIS_TOKEN_BY_MINT_URL with {mint}");
    }
    const json = await fetchJson<unknown>(withMint(url, mint), { headers: this.headers() });
    return normalizeProviderToken(json, this.name);
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

  private async fetchTokenList(url: string): Promise<NormalizedPumpToken[]> {
    const json = await fetchJson<unknown>(url, { headers: this.headers() });
    return extractArray(json)
      .map((item) => normalizeProviderToken(item, this.name))
      .filter((token): token is NormalizedPumpToken => Boolean(token));
  }

  private headers(): HeadersInit {
    if (!env.MORALIS_API_KEY) {
      throw new ProviderConfigurationError(this.name, "set MORALIS_API_KEY");
    }
    return { "X-API-Key": env.MORALIS_API_KEY };
  }
}
