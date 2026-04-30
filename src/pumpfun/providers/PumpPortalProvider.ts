import WebSocket from "ws";
import { env } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";
import { normalizeProviderToken } from "../tokenNormalizer.js";
import {
  BondingStatus,
  NormalizedPumpToken,
  ProviderConfigurationError,
  PumpFunProvider
} from "./ProviderInterface.js";
import { extractArray, fetchJson, withLimit, withMint } from "./http.js";

export class PumpPortalProvider implements PumpFunProvider {
  name = "pumpportal";

  async getNewTokens(limit: number): Promise<NormalizedPumpToken[]> {
    const url = env.PUMPPORTAL_NEW_TOKENS_URL;
    if (!url) {
      throw new ProviderConfigurationError(this.name, "set PUMPPORTAL_NEW_TOKENS_URL");
    }
    return this.fetchTokenList(withLimit(url, limit));
  }

  async getBondingTokens(limit: number): Promise<NormalizedPumpToken[]> {
    const url = env.PUMPPORTAL_BONDING_TOKENS_URL;
    if (!url) {
      throw new ProviderConfigurationError(this.name, "set PUMPPORTAL_BONDING_TOKENS_URL");
    }
    return this.fetchTokenList(withLimit(url, limit));
  }

  async getTokenByMint(mint: string): Promise<NormalizedPumpToken | null> {
    const url = env.PUMPPORTAL_TOKEN_BY_MINT_URL;
    if (!url) {
      throw new ProviderConfigurationError(this.name, "set PUMPPORTAL_TOKEN_BY_MINT_URL with {mint}");
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
    return Boolean(env.PUMPPORTAL_WS_URL);
  }

  async subscribeNewTokens(callback: (token: NormalizedPumpToken) => void): Promise<void> {
    if (!env.PUMPPORTAL_WS_URL) {
      throw new ProviderConfigurationError(this.name, "set PUMPPORTAL_WS_URL");
    }

    const ws = new WebSocket(env.PUMPPORTAL_WS_URL, {
      headers: this.headers()
    });

    ws.on("open", () => {
      logger.info({ provider: this.name }, "realtime provider connected");
      ws.send(JSON.stringify({ method: "subscribeNewToken" }));
    });

    ws.on("message", (message) => {
      try {
        const parsed = JSON.parse(message.toString()) as unknown;
        const token = normalizeProviderToken(parsed, this.name);
        if (token) {
          callback(token);
        }
      } catch (error) {
        logger.warn({ err: error, provider: this.name }, "failed to parse realtime token message");
      }
    });

    ws.on("error", (error) => {
      logger.error({ err: error, provider: this.name }, "realtime provider websocket error");
    });

    ws.on("close", (code, reason) => {
      logger.warn({ provider: this.name, code, reason: reason.toString() }, "realtime provider disconnected");
    });
  }

  private async fetchTokenList(url: string): Promise<NormalizedPumpToken[]> {
    const json = await fetchJson<unknown>(url, { headers: this.headers() });
    return extractArray(json)
      .map((item) => normalizeProviderToken(item, this.name))
      .filter((token): token is NormalizedPumpToken => Boolean(token));
  }

  private headers(): Record<string, string> {
    return env.PUMPPORTAL_API_KEY ? { authorization: `Bearer ${env.PUMPPORTAL_API_KEY}` } : {};
  }
}
