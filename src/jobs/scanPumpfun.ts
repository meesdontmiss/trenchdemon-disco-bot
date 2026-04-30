import { PumpScanner } from "../pumpfun/pumpScanner.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

export function startFallbackInterval(scanner: PumpScanner): NodeJS.Timeout {
  const handle = setInterval(() => {
    void scanner.scanOnce().catch((error) => {
      logger.error({ err: error }, "fallback pump scan failed");
    });
  }, env.SCAN_INTERVAL_SECONDS * 1000);
  handle.unref();
  return handle;
}
