# Narrative Coin Scout

Discord intelligence bot for Solana memecoin narrative discovery. It tracks user-submitted stories, extracts narrative terms, watches configured Pump.fun data providers, ranks still-bonding candidates, and lets the group manually conclude a search.

This bot does not buy, sell, sign transactions, store private keys, or provide trading instructions.

## Stack

- Node.js / TypeScript
- Discord.js slash commands
- PostgreSQL with Prisma
- Redis with BullMQ
- OpenAI-compatible LLM extraction
- Configurable Pump.fun provider layer
- Docker-ready runtime

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in Discord, database, Redis, LLM, and provider settings.

Local development may also use `env.local` or `.env.local`; these are ignored by git.

3. Apply the database schema:

```bash
npm run prisma:deploy
```

For local schema iteration use:

```bash
npm run prisma:migrate
```

4. Register Discord commands:

```bash
npm run discord:register
```

5. Start the bot:

```bash
npm run dev
```

## Docker

```bash
docker compose up --build
```

The `bot` service runs `prisma migrate deploy` before starting.

## Deployment

This project is a persistent Discord worker. It needs a runtime that keeps `node dist/index.js`
running continuously so the Discord gateway, scanner loop, Redis queue, and provider connections stay alive.

Recommended targets:

- Render worker using `render.yaml`
- Railway worker
- Fly.io machine
- VPS or Docker host

Vercel is not the production runtime for this bot. The repository includes `vercel.json` and a small
static dashboard shell only so accidental Vercel builds do not fail with a missing output directory.
That Vercel deployment will not run the Discord bot or dashboard API.

For Render:

1. Create a Blueprint from this GitHub repo.
2. Fill the `sync: false` environment variables in the Render dashboard.
3. Use a managed Redis URL for `REDIS_URL`.
4. Use your Neon connection string for `DATABASE_URL`.
5. Deploy the worker.

## Dashboard

The bot process serves a private dashboard on `PORT`:

- `/` renders the dashboard UI.
- `/api/login` accepts the dashboard password.
- `/api/dashboard` returns aggregate watch, candidate, alert, and scan data.

Set:

```bash
DASHBOARD_PASSWORD=77th
DASHBOARD_SESSION_SECRET=<long-random-string>
PORT=3000
```

On Render, `PORT` is injected automatically. The `render.yaml` blueprint provisions the dashboard password and generates a session secret.

## Provider Configuration

Provider endpoints are intentionally environment-configured. Insert the current URLs from your Pump.fun data vendor rather than relying on fixed code constants.

Direct Pump.fun frontend provider:

- `PUMP_PROVIDER=pumpfun`
- `PUMPFUN_FRONTEND_BASE_URL=https://frontend-api-v3.pump.fun`

This uses the public frontend data API and does not require a PumpPortal account. It is useful for polling latest/new Pump.fun coins, but it is unofficial, may be rate-limited, and can change without notice.

PumpPortal:

- `PUMPPORTAL_NEW_TOKENS_URL`
- `PUMPPORTAL_BONDING_TOKENS_URL`
- `PUMPPORTAL_TOKEN_BY_MINT_URL` with `{mint}`
- `PUMPPORTAL_WS_URL` for realtime token creation events
- `PUMPPORTAL_API_KEY` if required

Moralis:

- `MORALIS_NEW_TOKENS_URL`
- `MORALIS_BONDING_TOKENS_URL`
- `MORALIS_TOKEN_BY_MINT_URL` with `{mint}`
- `MORALIS_API_KEY`

Bitquery:

- `BITQUERY_GRAPHQL_URL`
- `BITQUERY_API_KEY`

The normalizer accepts common field aliases for mint, name, symbol, metadata, market cap, bonding progress, creator, and social links. Adjust `src/pumpfun/tokenNormalizer.ts` if your provider schema differs.

## LLM Configuration

The narrative extractor uses an OpenAI-compatible client. Set `LLM_PROVIDER=openai` for OpenAI, or `LLM_PROVIDER=openclaw` to route extraction through an OpenClaw-compatible local gateway.

For OpenClaw/local use:

```bash
LLM_PROVIDER=openclaw
OPENCLAW_BASE_URL=http://localhost:18789/v1
OPENCLAW_MODEL=<your-openclaw-model>
OPENCLAW_API_KEY=
```

If OpenClaw does not require an API key, leave `OPENCLAW_API_KEY` empty. If the gateway uses a different port or path, update `OPENCLAW_BASE_URL`.

## Commands

- `/track input:<url_or_text>` creates a narrative watch.
- `/watchlist` lists active watches.
- `/candidates watch_id:<id>` shows ranked candidates with action buttons for the top candidate.
- `/best watch_id:<id>` shows the current strongest match.
- `/explain watch_id:<id> mint:<mint>` explains score and risk flags.
- `/ignore watch_id:<id> mint:<mint>` hides a candidate.
- `/pin watch_id:<id> mint:<mint>` pins a candidate.
- `/conclude watch_id:<id> mint:<mint>` manually selects a final candidate and stops scanning that watch.
- `/archive watch_id:<id>` archives without a final selection.
- `/status watch_id:<id>` shows candidate count, best candidate, and last scan time.

## Scoring

Candidates are scored 0-100 using:

- 30% narrative keyword match
- 20% semantic overlap
- 15% freshness
- 15% bonding curve activity while still ungraduated
- 10% ticker/name quality
- 5% social metadata match
- 5% clone/creator risk adjustment

Graduated tokens are excluded by default. Negative keyword matches, stale launches, and weak metadata matches are filtered before alerting.

## Safety Notes

- No wallet private keys are requested or stored.
- No transaction signing or automated buying/selling exists in this codebase.
- Discord output uses research language: candidate, match, watch, confidence, rank, and human review.
- API keys are read only from environment variables and are never rendered in Discord.
- Provider failures are logged and alert active channels after persistent failures.
