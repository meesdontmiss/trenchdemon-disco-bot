-- CreateEnum
CREATE TYPE "NarrativeStatus" AS ENUM ('ACTIVE', 'CONCLUDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('URL', 'TEXT', 'ARTICLE', 'TWEET');

-- CreateEnum
CREATE TYPE "CandidateState" AS ENUM ('NEW_MATCH', 'WATCHING', 'STRONG_CANDIDATE', 'PINNED', 'IGNORED', 'GRADUATED', 'FINAL_SELECTED');

-- CreateTable
CREATE TABLE "NarrativeWatch" (
    "id" TEXT NOT NULL,
    "discordGuildId" TEXT NOT NULL,
    "discordChannelId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "NarrativeStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "rawInput" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "entities" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "possibleTickers" JSONB NOT NULL,
    "negativeKeywords" JSONB NOT NULL,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "concludedAt" TIMESTAMP(3),
    "finalMintAddress" TEXT,

    CONSTRAINT "NarrativeWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinCandidate" (
    "id" TEXT NOT NULL,
    "narrativeWatchId" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "pumpUrl" TEXT,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "creatorWallet" TEXT,
    "createdAtOnchain" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "marketCapUsd" DOUBLE PRECISION,
    "bondingCurveProgress" DOUBLE PRECISION,
    "isGraduated" BOOLEAN NOT NULL DEFAULT false,
    "isIgnored" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "state" "CandidateState" NOT NULL DEFAULT 'NEW_MATCH',
    "matchKeywords" JSONB NOT NULL,
    "matchExplanation" TEXT NOT NULL,
    "riskFlags" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "freshnessScore" DOUBLE PRECISION NOT NULL,
    "bondingScore" DOUBLE PRECISION NOT NULL,
    "socialScore" DOUBLE PRECISION NOT NULL,
    "cloneRiskScore" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "rawProviderData" JSONB NOT NULL,

    CONSTRAINT "CoinCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PumpTokenSnapshot" (
    "id" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "creatorWallet" TEXT,
    "marketCapUsd" DOUBLE PRECISION,
    "bondingCurveProgress" DOUBLE PRECISION,
    "isGraduated" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PumpTokenSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "narrativeWatchId" TEXT NOT NULL,
    "candidateId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NarrativeWatch_status_createdAt_idx" ON "NarrativeWatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NarrativeWatch_discordGuildId_discordChannelId_idx" ON "NarrativeWatch"("discordGuildId", "discordChannelId");

-- CreateIndex
CREATE INDEX "CoinCandidate_mintAddress_idx" ON "CoinCandidate"("mintAddress");

-- CreateIndex
CREATE INDEX "CoinCandidate_narrativeWatchId_finalScore_idx" ON "CoinCandidate"("narrativeWatchId", "finalScore");

-- CreateIndex
CREATE INDEX "CoinCandidate_isIgnored_isGraduated_idx" ON "CoinCandidate"("isIgnored", "isGraduated");

-- CreateIndex
CREATE UNIQUE INDEX "CoinCandidate_narrativeWatchId_mintAddress_key" ON "CoinCandidate"("narrativeWatchId", "mintAddress");

-- CreateIndex
CREATE INDEX "PumpTokenSnapshot_mintAddress_observedAt_idx" ON "PumpTokenSnapshot"("mintAddress", "observedAt");

-- CreateIndex
CREATE INDEX "PumpTokenSnapshot_provider_observedAt_idx" ON "PumpTokenSnapshot"("provider", "observedAt");

-- CreateIndex
CREATE INDEX "AlertLog_narrativeWatchId_type_sentAt_idx" ON "AlertLog"("narrativeWatchId", "type", "sentAt");

-- AddForeignKey
ALTER TABLE "CoinCandidate" ADD CONSTRAINT "CoinCandidate_narrativeWatchId_fkey" FOREIGN KEY ("narrativeWatchId") REFERENCES "NarrativeWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_narrativeWatchId_fkey" FOREIGN KEY ("narrativeWatchId") REFERENCES "NarrativeWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
