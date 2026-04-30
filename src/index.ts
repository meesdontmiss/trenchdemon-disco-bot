import { prisma } from "./db/prisma.js";
import { createDiscordClient } from "./bot/client.js";
import { DiscordAlertService } from "./discord/alertDiscord.js";
import { startScanQueue } from "./jobs/queues.js";
import { startFallbackInterval } from "./jobs/scanPumpfun.js";
import { createPumpProvider } from "./pumpfun/providers/index.js";
import { PumpScanner } from "./pumpfun/pumpScanner.js";
import { env } from "./utils/env.js";
import { logger } from "./utils/logger.js";

const client = createDiscordClient();
const provider = createPumpProvider();
const alerts = new DiscordAlertService(client);
const scanner = new PumpScanner(provider, alerts);

let closeQueue: (() => Promise<void>) | undefined;
let fallbackInterval: NodeJS.Timeout | undefined;

async function main(): Promise<void> {
  await client.login(env.DISCORD_TOKEN);

  await scanner.startRealtime().catch((error) => {
    logger.warn({ err: error }, "realtime scanning unavailable");
  });

  try {
    closeQueue = await startScanQueue(scanner);
  } catch (error) {
    logger.error({ err: error }, "redis scan queue unavailable, using in-process interval");
    fallbackInterval = startFallbackInterval(scanner);
  }

  await scanner.scanOnce();
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting down");
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
  }
  if (closeQueue) {
    await closeQueue().catch((error) => logger.warn({ err: error }, "failed to close queue"));
  }
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

main().catch(async (error) => {
  logger.fatal({ err: error }, "bot crashed during startup");
  await prisma.$disconnect();
  process.exit(1);
});
