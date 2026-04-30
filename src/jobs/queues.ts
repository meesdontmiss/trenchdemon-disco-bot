import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { PumpScanner } from "../pumpfun/pumpScanner.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

export const SCAN_QUEUE = "pump-scan";

export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });
}

export async function startScanQueue(scanner: PumpScanner): Promise<() => Promise<void>> {
  const connection = createRedisConnection();
  const queue = new Queue(SCAN_QUEUE, { connection });
  const worker = new Worker(
    SCAN_QUEUE,
    async () => {
      await scanner.scanOnce();
    },
    { connection, concurrency: 1 }
  );

  worker.on("failed", (job, error) => {
    logger.error({ err: error, jobId: job?.id }, "scan job failed");
  });

  await queue.upsertJobScheduler(
    "poll-pumpfun",
    { every: env.SCAN_INTERVAL_SECONDS * 1000 },
    { name: "scan", data: {} }
  );

  logger.info({ queue: SCAN_QUEUE, interval: env.SCAN_INTERVAL_SECONDS }, "scan queue started");

  return async () => {
    await worker.close();
    await queue.close();
    await connection.quit();
  };
}
