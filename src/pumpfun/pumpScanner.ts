import { CandidateState, CoinCandidate, NarrativeWatch, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DiscordAlertService } from "../discord/alertDiscord.js";
import { termsFromWatch } from "../narratives/narrativeScorer.js";
import { hasNegativeKeyword } from "../narratives/semanticMatcher.js";
import { scoreCandidate } from "../scoring/candidateScore.js";
import { env } from "../utils/env.js";
import { toJson } from "../utils/json.js";
import { logger } from "../utils/logger.js";
import { isStillBonding } from "./bondingStatus.js";
import { NormalizedPumpToken, PumpFunProvider } from "./providers/ProviderInterface.js";

export class PumpScanner {
  private providerErrorSince: Date | null = null;

  constructor(
    private readonly provider: PumpFunProvider,
    private readonly alerts?: DiscordAlertService
  ) {}

  async scanOnce(): Promise<void> {
    try {
      const [newTokens, bondingTokens] = await Promise.all([
        this.provider.getNewTokens(100),
        this.provider.getBondingTokens(100)
      ]);
      const unique = dedupeTokens([...newTokens, ...bondingTokens]);
      logger.info({ count: unique.length, provider: this.provider.name }, "scanned pump provider tokens");
      this.providerErrorSince = null;

      for (const token of unique) {
        await this.processToken(token);
      }

      await prisma.narrativeWatch.updateMany({
        where: { status: "ACTIVE" },
        data: { lastScannedAt: new Date() }
      });
    } catch (error) {
      await this.handleProviderError(error);
    }
  }

  async startRealtime(): Promise<void> {
    if (!this.provider.supportsRealtime() || !this.provider.subscribeNewTokens) {
      logger.info({ provider: this.provider.name }, "provider does not support realtime stream");
      return;
    }

    await this.provider.subscribeNewTokens((token) => {
      void this.processToken(token).catch((error) => {
        logger.error({ err: error, mint: token.mintAddress }, "failed to process realtime token");
      });
    });
  }

  async processToken(token: NormalizedPumpToken): Promise<void> {
    await this.storeSnapshot(token);

    const watches = await prisma.narrativeWatch.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: env.MAX_ACTIVE_WATCHES
    });

    for (const watch of watches) {
      await this.matchTokenToWatch(watch, token);
    }
  }

  private async matchTokenToWatch(watch: NarrativeWatch, token: NormalizedPumpToken): Promise<void> {
    const terms = termsFromWatch(watch);
    if (!isStillBonding(token)) {
      await this.markGraduatedIfKnown(watch, token);
      return;
    }

    if (hasNegativeKeyword(terms, token)) {
      return;
    }

    if (token.createdAt && token.createdAt.valueOf() < watch.createdAt.valueOf() - env.DEFAULT_LOOKBACK_MINUTES * 60000) {
      const title = terms.title.toLowerCase();
      const exactStoryName = token.name.toLowerCase() === title || token.symbol.toLowerCase() === title;
      if (!exactStoryName) {
        return;
      }
    }

    const existing = await prisma.coinCandidate.findMany({
      where: { narrativeWatchId: watch.id }
    });
    const previousTop = getTopCandidate(existing);
    const previousCandidate = existing.find((candidate) => candidate.mintAddress === token.mintAddress);
    const score = scoreCandidate(terms, token, watch.createdAt, existing);

    if (!score.matched) {
      return;
    }

    const state = candidateState(score.finalScore, token.isGraduated, previousCandidate);
    const candidate = await prisma.coinCandidate.upsert({
      where: {
        narrativeWatchId_mintAddress: {
          narrativeWatchId: watch.id,
          mintAddress: token.mintAddress
        }
      },
      update: {
        pumpUrl: token.pumpUrl,
        name: token.name,
        symbol: token.symbol,
        description: token.description,
        imageUrl: token.imageUrl,
        creatorWallet: token.creatorWallet,
        createdAtOnchain: token.createdAt,
        marketCapUsd: token.marketCapUsd,
        bondingCurveProgress: token.bondingCurveProgress,
        isGraduated: Boolean(token.isGraduated),
        state,
        matchKeywords: toJson(score.matchKeywords),
        matchExplanation: score.matchExplanation,
        riskFlags: toJson(score.riskFlags),
        confidenceScore: score.confidenceScore,
        freshnessScore: score.freshnessScore,
        bondingScore: score.bondingScore,
        socialScore: score.socialScore,
        cloneRiskScore: score.cloneRiskScore,
        finalScore: score.finalScore,
        rawProviderData: toJson(token.raw)
      },
      create: {
        narrativeWatchId: watch.id,
        mintAddress: token.mintAddress,
        pumpUrl: token.pumpUrl,
        name: token.name,
        symbol: token.symbol,
        description: token.description,
        imageUrl: token.imageUrl,
        creatorWallet: token.creatorWallet,
        createdAtOnchain: token.createdAt,
        marketCapUsd: token.marketCapUsd,
        bondingCurveProgress: token.bondingCurveProgress,
        isGraduated: Boolean(token.isGraduated),
        state,
        matchKeywords: toJson(score.matchKeywords),
        matchExplanation: score.matchExplanation,
        riskFlags: toJson(score.riskFlags),
        confidenceScore: score.confidenceScore,
        freshnessScore: score.freshnessScore,
        bondingScore: score.bondingScore,
        socialScore: score.socialScore,
        cloneRiskScore: score.cloneRiskScore,
        finalScore: score.finalScore,
        rawProviderData: toJson(token.raw)
      }
    });

    await this.maybeAlert(watch, candidate, previousTop, previousCandidate);
  }

  private async maybeAlert(
    watch: NarrativeWatch,
    candidate: CoinCandidate,
    previousTop: CoinCandidate | null,
    previousCandidate?: CoinCandidate
  ): Promise<void> {
    if (!this.alerts || candidate.isIgnored) {
      return;
    }

    const isNew = !previousCandidate;
    const isNewTop = !previousTop || candidate.finalScore > previousTop.finalScore;
    const progressJump =
      previousCandidate?.bondingCurveProgress !== null &&
      previousCandidate?.bondingCurveProgress !== undefined &&
      candidate.bondingCurveProgress !== null &&
      candidate.bondingCurveProgress !== undefined &&
      candidate.bondingCurveProgress - previousCandidate.bondingCurveProgress >= 10;

    const exactTicker = termsFromWatch(watch).possibleTickers.some(
      (ticker) => ticker.toUpperCase() === candidate.symbol.toUpperCase()
    );
    const exactName = candidate.name.toLowerCase() === watch.title.toLowerCase();

    if (isNew && (candidate.finalScore >= env.MIN_ALERT_SCORE || exactTicker || exactName)) {
      await this.alerts.sendCandidateAlert({
        channelId: watch.discordChannelId,
        narrativeWatchId: watch.id,
        candidateId: candidate.id,
        type: "NEW_STRONG_CANDIDATE",
        message: `New strong candidate for ${watch.title}: ${candidate.symbol} - ${Math.round(
          candidate.finalScore
        )}/100 confidence. Human review recommended.`
      });
    } else if (isNewTop && candidate.finalScore >= 60) {
      await this.alerts.sendCandidateAlert({
        channelId: watch.discordChannelId,
        narrativeWatchId: watch.id,
        candidateId: candidate.id,
        type: "NEW_TOP_CANDIDATE",
        message: `New top-ranked candidate for ${watch.title}: ${candidate.symbol} - ${Math.round(
          candidate.finalScore
        )}/100 narrative relevance.`
      });
    } else if (progressJump) {
      await this.alerts.sendCandidateAlert({
        channelId: watch.discordChannelId,
        narrativeWatchId: watch.id,
        candidateId: candidate.id,
        type: "BONDING_PROGRESS",
        message: `${candidate.symbol} gained meaningful bonding-curve progress for ${watch.title}.`
      });
    }

    const competingCount = await prisma.coinCandidate.count({
      where: {
        narrativeWatchId: watch.id,
        isIgnored: false
      }
    });
    if (competingCount >= 3) {
      await this.alerts.sendWatchAlert({
        channelId: watch.discordChannelId,
        narrativeWatchId: watch.id,
        type: "COMPETING_LAUNCHES",
        message: `${watch.title} now has ${competingCount} competing candidate launches.`
      });
    }
  }

  private async markGraduatedIfKnown(watch: NarrativeWatch, token: NormalizedPumpToken): Promise<void> {
    const candidate = await prisma.coinCandidate.findUnique({
      where: {
        narrativeWatchId_mintAddress: {
          narrativeWatchId: watch.id,
          mintAddress: token.mintAddress
        }
      }
    });

    if (!candidate || candidate.isGraduated) {
      return;
    }

    const updated = await prisma.coinCandidate.update({
      where: { id: candidate.id },
      data: {
        isGraduated: true,
        state: CandidateState.GRADUATED,
        bondingCurveProgress: token.bondingCurveProgress ?? candidate.bondingCurveProgress,
        rawProviderData: toJson(token.raw)
      }
    });

    if (this.alerts) {
      await this.alerts.sendCandidateAlert({
        channelId: watch.discordChannelId,
        narrativeWatchId: watch.id,
        candidateId: updated.id,
        type: "CANDIDATE_GRADUATED",
        message: `${updated.symbol} appears to have graduated and is no longer a default bonding-curve candidate for ${watch.title}.`
      });
    }
  }

  private async storeSnapshot(token: NormalizedPumpToken): Promise<void> {
    await prisma.pumpTokenSnapshot.create({
      data: {
        mintAddress: token.mintAddress,
        name: token.name,
        symbol: token.symbol,
        description: token.description,
        imageUrl: token.imageUrl,
        creatorWallet: token.creatorWallet,
        marketCapUsd: token.marketCapUsd,
        bondingCurveProgress: token.bondingCurveProgress,
        isGraduated: Boolean(token.isGraduated),
        provider: this.provider.name,
        rawData: toJson(token.raw)
      }
    });
  }

  private async handleProviderError(error: unknown): Promise<void> {
    logger.error({ err: error, provider: this.provider.name }, "pump provider scan failed");
    this.providerErrorSince ??= new Date();
    if (!this.alerts || Date.now() - this.providerErrorSince.valueOf() < 5 * 60 * 1000) {
      return;
    }

    const watches = await prisma.narrativeWatch.findMany({
      where: { status: "ACTIVE" },
      take: 10
    });

    for (const watch of watches) {
      await this.alerts.sendWatchAlert({
        channelId: watch.discordChannelId,
        narrativeWatchId: watch.id,
        type: "PROVIDER_ERROR",
        message: `Pump.fun provider ${this.provider.name} has been failing for more than 5 minutes. Active watches remain stored, but scanning may be delayed.`
      });
    }
  }
}

function dedupeTokens(tokens: NormalizedPumpToken[]): NormalizedPumpToken[] {
  const byMint = new Map<string, NormalizedPumpToken>();
  for (const token of tokens) {
    byMint.set(token.mintAddress, token);
  }
  return [...byMint.values()];
}

function getTopCandidate(candidates: CoinCandidate[]): CoinCandidate | null {
  return candidates
    .filter((candidate) => !candidate.isIgnored && !candidate.isGraduated)
    .sort((a, b) => b.finalScore - a.finalScore)[0] ?? null;
}

function candidateState(
  score: number,
  isGraduated: boolean | undefined,
  previousCandidate?: CoinCandidate
): CandidateState {
  if (previousCandidate?.isPinned) {
    return CandidateState.PINNED;
  }
  if (previousCandidate?.isIgnored) {
    return CandidateState.IGNORED;
  }
  if (isGraduated) {
    return CandidateState.GRADUATED;
  }
  return score >= 70 ? CandidateState.STRONG_CANDIDATE : CandidateState.WATCHING;
}
