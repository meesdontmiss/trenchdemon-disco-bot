export type BondingStatus = {
  mintAddress: string;
  bondingCurveProgress?: number;
  isGraduated: boolean;
  marketCapUsd?: number;
  raw?: unknown;
};

export type NormalizedPumpToken = {
  mintAddress: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  creatorWallet?: string;
  pumpUrl?: string;
  createdAt?: Date;
  marketCapUsd?: number;
  bondingCurveProgress?: number;
  isGraduated?: boolean;
  socialLinks?: string[];
  raw: unknown;
};

export interface PumpFunProvider {
  name: string;
  getNewTokens(limit: number): Promise<NormalizedPumpToken[]>;
  getBondingTokens(limit: number): Promise<NormalizedPumpToken[]>;
  getTokenByMint(mint: string): Promise<NormalizedPumpToken | null>;
  getBondingStatus(mint: string): Promise<BondingStatus | null>;
  supportsRealtime(): boolean;
  subscribeNewTokens?(callback: (token: NormalizedPumpToken) => void): Promise<void>;
}

export class ProviderConfigurationError extends Error {
  constructor(provider: string, message: string) {
    super(`${provider} provider is not configured: ${message}`);
  }
}
