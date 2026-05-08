-- CreateEnum
CREATE TYPE "SnipeStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "CoinCandidate" ADD COLUMN     "imageScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "NarrativeWatch" ADD COLUMN     "imageMatchUrl" TEXT;

-- CreateTable
CREATE TABLE "SnipeOrder" (
    "id" TEXT NOT NULL,
    "narrativeWatchId" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "candidateId" TEXT,
    "status" "SnipeStatus" NOT NULL DEFAULT 'PENDING',
    "amountSol" DOUBLE PRECISION NOT NULL,
    "txSignature" TEXT,
    "errorMessage" TEXT,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "SnipeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnipeOrder_narrativeWatchId_status_idx" ON "SnipeOrder"("narrativeWatchId", "status");

-- CreateIndex
CREATE INDEX "SnipeOrder_mintAddress_idx" ON "SnipeOrder"("mintAddress");

-- AddForeignKey
ALTER TABLE "SnipeOrder" ADD CONSTRAINT "SnipeOrder_narrativeWatchId_fkey" FOREIGN KEY ("narrativeWatchId") REFERENCES "NarrativeWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
