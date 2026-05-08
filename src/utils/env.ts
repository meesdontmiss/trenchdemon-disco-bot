import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

for (const file of ["env.local", ".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) {
    dotenv.config({ path });
  }
}

process.env.DISCORD_TOKEN ??= process.env.DISCORD_BOT_TOKEN;
process.env.DISCORD_CLIENT_ID ??= process.env.DISCORD_APPLICATION_ID;

const schema = z.object({
  LLM_PROVIDER: z.enum(["openai", "openclaw"]).default("openai"),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENCLAW_API_KEY: z.string().optional(),
  OPENCLAW_BASE_URL: z.string().optional(),
  OPENCLAW_MODEL: z.string().optional(),
  PUMP_PROVIDER: z.enum(["pumpfun", "pumpportal", "moralis", "bitquery"]).default("pumpfun"),
  PUMPFUN_FRONTEND_BASE_URL: z.string().default("https://frontend-api-v3.pump.fun"),
  PUMPPORTAL_API_KEY: z.string().optional(),
  PUMPPORTAL_REST_BASE_URL: z.string().optional(),
  PUMPPORTAL_WS_URL: z.string().optional(),
  PUMPPORTAL_NEW_TOKENS_URL: z.string().optional(),
  PUMPPORTAL_BONDING_TOKENS_URL: z.string().optional(),
  PUMPPORTAL_TOKEN_BY_MINT_URL: z.string().optional(),
  PUMPPORTAL_TRADE_URL: z.string().default("https://pumpportal.fun/api/trade-local"),
  SOLANA_RPC_URL: z.string().default("https://api.mainnet-beta.solana.com"),
  SNIPE_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  SNIPE_WALLET_PRIVATE_KEY: z.string().optional(),
  SNIPE_AMOUNT_SOL: z.coerce.number().positive().default(0.1),
  SNIPE_MIN_SCORE: z.coerce.number().min(1).max(100).default(75),
  SNIPE_SLIPPAGE: z.coerce.number().min(1).max(100).default(10),
  SNIPE_PRIORITY_FEE: z.coerce.number().min(0).default(0.0005),
  SNIPE_MAX_PER_WATCH: z.coerce.number().int().min(1).default(1),
  MORALIS_API_KEY: z.string().optional(),
  MORALIS_SOLANA_BASE_URL: z.string().optional(),
  MORALIS_NEW_TOKENS_URL: z.string().optional(),
  MORALIS_BONDING_TOKENS_URL: z.string().optional(),
  MORALIS_TOKEN_BY_MINT_URL: z.string().optional(),
  BITQUERY_API_KEY: z.string().optional(),
  BITQUERY_GRAPHQL_URL: z.string().optional(),
  SCAN_INTERVAL_SECONDS: z.coerce.number().int().min(15).max(300).default(30),
  MIN_ALERT_SCORE: z.coerce.number().min(1).max(100).default(70),
  MAX_ACTIVE_WATCHES: z.coerce.number().int().min(1).max(1000).default(100),
  DEFAULT_LOOKBACK_MINUTES: z.coerce.number().int().min(1).default(60),
  COMMAND_RATE_LIMIT_SECONDS: z.coerce.number().int().min(1).default(5),
  ADMIN_ONLY_CONCLUDE_ARCHIVE: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_PASSWORD: z.string().default("77th"),
  DASHBOARD_SESSION_SECRET: z.string().optional()
});

export const env = schema.parse(process.env);
