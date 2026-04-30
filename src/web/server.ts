import { createHmac, timingSafeEqual } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { prisma } from "../db/prisma.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../../public");
const sessionCookie = "ncs_session";

export function startDashboardServer(): Promise<() => Promise<void>> {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(express.static(publicDir, { extensions: ["html"] }));

  app.post("/api/login", (request, response) => {
    const password = String(request.body?.password ?? "");
    if (!safeCompare(password, env.DASHBOARD_PASSWORD)) {
      response.status(401).json({ error: "Invalid password" });
      return;
    }

    response.cookie(sessionCookie, makeSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 12,
      path: "/"
    });
    response.json({ ok: true });
  });

  app.post("/api/logout", (_request, response) => {
    response.clearCookie(sessionCookie, { path: "/" });
    response.json({ ok: true });
  });

  app.get("/api/dashboard", requireDashboardAuth, async (_request, response) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeWatches,
      totalCandidates,
      strongCandidates,
      graduatedCandidates,
      snapshots24h,
      recentAlerts,
      recentWatches,
      topCandidates,
      latestSnapshot
    ] = await Promise.all([
      prisma.narrativeWatch.count({ where: { status: "ACTIVE" } }),
      prisma.coinCandidate.count(),
      prisma.coinCandidate.count({ where: { finalScore: { gte: env.MIN_ALERT_SCORE }, isIgnored: false } }),
      prisma.coinCandidate.count({ where: { isGraduated: true } }),
      prisma.pumpTokenSnapshot.count({ where: { observedAt: { gte: since } } }),
      prisma.alertLog.findMany({
        orderBy: { sentAt: "desc" },
        take: 8,
        include: { narrativeWatch: true }
      }),
      prisma.narrativeWatch.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: {
          candidates: {
            where: { isIgnored: false },
            orderBy: [{ isPinned: "desc" }, { finalScore: "desc" }],
            take: 3
          },
          _count: { select: { candidates: true } }
        }
      }),
      prisma.coinCandidate.findMany({
        where: { isIgnored: false },
        orderBy: [{ isPinned: "desc" }, { finalScore: "desc" }],
        take: 12,
        include: { narrativeWatch: true }
      }),
      prisma.pumpTokenSnapshot.findFirst({ orderBy: { observedAt: "desc" } })
    ]);

    response.json({
      generatedAt: new Date().toISOString(),
      provider: {
        active: env.PUMP_PROVIDER,
        source:
          env.PUMP_PROVIDER === "pumpfun"
            ? env.PUMPFUN_FRONTEND_BASE_URL
            : env.PUMP_PROVIDER === "pumpportal"
              ? env.PUMPPORTAL_WS_URL || env.PUMPPORTAL_REST_BASE_URL
              : env.PUMP_PROVIDER,
        lastSnapshotAt: latestSnapshot?.observedAt.toISOString() ?? null
      },
      stats: {
        activeWatches,
        totalCandidates,
        strongCandidates,
        graduatedCandidates,
        snapshots24h
      },
      watches: recentWatches.map((watch) => ({
        id: watch.id,
        title: watch.title,
        summary: watch.summary,
        status: watch.status,
        createdAt: watch.createdAt,
        updatedAt: watch.updatedAt,
        lastScannedAt: watch.lastScannedAt,
        candidateCount: watch._count.candidates,
        bestCandidates: watch.candidates.map((candidate) => candidateSummary(candidate))
      })),
      topCandidates: topCandidates.map((candidate) => ({
        ...candidateSummary(candidate),
        watchId: candidate.narrativeWatchId,
        watchTitle: candidate.narrativeWatch.title
      })),
      alerts: recentAlerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        message: alert.message,
        sentAt: alert.sentAt,
        watchTitle: alert.narrativeWatch.title
      }))
    });
  });

  return new Promise((resolve) => {
    const server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, "dashboard server listening");
      resolve(
        () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }
              closeResolve();
            });
          })
      );
    });
  });
}

function requireDashboardAuth(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  const cookie = parseCookies(request.headers.cookie ?? "")[sessionCookie];
  if (!cookie || !safeCompare(cookie, makeSessionToken())) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function candidateSummary(candidate: {
  id: string;
  mintAddress: string;
  name: string;
  symbol: string;
  pumpUrl: string | null;
  marketCapUsd: number | null;
  bondingCurveProgress: number | null;
  isGraduated: boolean;
  isPinned: boolean;
  finalScore: number;
  confidenceScore: number;
  matchExplanation: string;
  riskFlags: unknown;
  lastUpdatedAt: Date;
}) {
  return {
    id: candidate.id,
    mintAddress: candidate.mintAddress,
    name: candidate.name,
    symbol: candidate.symbol,
    pumpUrl: candidate.pumpUrl,
    marketCapUsd: candidate.marketCapUsd,
    bondingCurveProgress: candidate.bondingCurveProgress,
    isGraduated: candidate.isGraduated,
    isPinned: candidate.isPinned,
    finalScore: candidate.finalScore,
    confidenceScore: candidate.confidenceScore,
    matchExplanation: candidate.matchExplanation,
    riskFlags: Array.isArray(candidate.riskFlags) ? candidate.riskFlags : [],
    lastUpdatedAt: candidate.lastUpdatedAt
  };
}

function makeSessionToken(): string {
  const secret = env.DASHBOARD_SESSION_SECRET?.trim() || env.DASHBOARD_PASSWORD;
  return createHmac("sha256", secret).update("narrative-coin-scout-dashboard").digest("hex");
}

function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (!key || !value.length) {
      continue;
    }
    cookies[key] = decodeURIComponent(value.join("="));
  }
  return cookies;
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
