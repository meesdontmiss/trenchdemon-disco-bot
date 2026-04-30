import { env } from "../utils/env.js";

export function freshnessScore(tokenCreatedAt: Date | undefined, narrativeCreatedAt: Date): number {
  if (!tokenCreatedAt) {
    return 65;
  }

  const ageMinutes = (Date.now() - tokenCreatedAt.valueOf()) / 60000;
  const relativeMinutes = (tokenCreatedAt.valueOf() - narrativeCreatedAt.valueOf()) / 60000;

  if (relativeMinutes < -env.DEFAULT_LOOKBACK_MINUTES) {
    return 0;
  }
  if (ageMinutes <= 10) {
    return 100;
  }
  if (ageMinutes <= 30) {
    return 90;
  }
  if (ageMinutes <= 60) {
    return 75;
  }
  if (ageMinutes <= 180) {
    return 55;
  }
  return 30;
}
