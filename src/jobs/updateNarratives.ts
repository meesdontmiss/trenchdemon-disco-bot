import { prisma } from "../db/prisma.js";

export async function activeNarrativeCount(): Promise<number> {
  return prisma.narrativeWatch.count({ where: { status: "ACTIVE" } });
}
