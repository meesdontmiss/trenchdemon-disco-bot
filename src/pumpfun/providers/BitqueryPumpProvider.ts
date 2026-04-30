import { env } from "../../utils/env.js";
import { normalizeProviderToken } from "../tokenNormalizer.js";
import {
  BondingStatus,
  NormalizedPumpToken,
  ProviderConfigurationError,
  PumpFunProvider
} from "./ProviderInterface.js";
import { fetchJson } from "./http.js";

type GraphQLResponse = {
  data?: Record<string, unknown>;
  errors?: unknown[];
};

export class BitqueryPumpProvider implements PumpFunProvider {
  name = "bitquery";

  async getNewTokens(limit: number): Promise<NormalizedPumpToken[]> {
    return this.queryTokens(
      `query NewPumpTokens($limit: Int!) {
        Solana {
          DEXTrades(
            limit: {count: $limit}
            orderBy: {descending: Block_Time}
            where: {Trade: {Dex: {ProtocolName: {is: "pump"}}}}
          ) {
            Trade { Currency { MintAddress Name Symbol Uri } }
            Block { Time }
          }
        }
      }`,
      { limit }
    );
  }

  async getBondingTokens(limit: number): Promise<NormalizedPumpToken[]> {
    return this.getNewTokens(limit);
  }

  async getTokenByMint(mint: string): Promise<NormalizedPumpToken | null> {
    const tokens = await this.queryTokens(
      `query PumpTokenByMint($mint: String!) {
        Solana {
          DEXTrades(
            limit: {count: 1}
            where: {Trade: {Currency: {MintAddress: {is: $mint}}, Dex: {ProtocolName: {is: "pump"}}}}
          ) {
            Trade { Currency { MintAddress Name Symbol Uri } }
            Block { Time }
          }
        }
      }`,
      { mint }
    );
    return tokens[0] ?? null;
  }

  async getBondingStatus(mint: string): Promise<BondingStatus | null> {
    const token = await this.getTokenByMint(mint);
    if (!token) {
      return null;
    }
    return {
      mintAddress: mint,
      bondingCurveProgress: token.bondingCurveProgress,
      isGraduated: Boolean(token.isGraduated),
      marketCapUsd: token.marketCapUsd,
      raw: token.raw
    };
  }

  supportsRealtime(): boolean {
    return false;
  }

  private async queryTokens(query: string, variables: Record<string, unknown>): Promise<NormalizedPumpToken[]> {
    if (!env.BITQUERY_GRAPHQL_URL) {
      throw new ProviderConfigurationError(this.name, "set BITQUERY_GRAPHQL_URL");
    }
    if (!env.BITQUERY_API_KEY) {
      throw new ProviderConfigurationError(this.name, "set BITQUERY_API_KEY");
    }

    const json = await fetchJson<GraphQLResponse>(env.BITQUERY_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.BITQUERY_API_KEY}`
      },
      body: JSON.stringify({ query, variables })
    });

    if (json.errors?.length) {
      throw new Error(`Bitquery GraphQL errors: ${JSON.stringify(json.errors).slice(0, 500)}`);
    }

    const trades = (((json.data?.Solana as Record<string, unknown> | undefined)?.DEXTrades as unknown[]) ?? []);
    return trades
      .map((trade) => this.fromTrade(trade))
      .filter((token): token is NormalizedPumpToken => Boolean(token));
  }

  private fromTrade(trade: unknown): NormalizedPumpToken | null {
    const object = trade as Record<string, unknown>;
    const tradeData = object.Trade as Record<string, unknown> | undefined;
    const currency = tradeData?.Currency as Record<string, unknown> | undefined;
    const block = object.Block as Record<string, unknown> | undefined;
    if (!currency) {
      return null;
    }

    return normalizeProviderToken(
      {
        mintAddress: currency.MintAddress,
        name: currency.Name,
        symbol: currency.Symbol,
        imageUrl: currency.Uri,
        createdAt: block?.Time
      },
      this.name
    );
  }
}
