-- CreateEnum
CREATE TYPE "RankingTier" AS ENUM ('NEW', 'EMERGING', 'ESTABLISHED', 'TOP_RATED', 'ELITE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "ratingEligibleAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "averageRating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "rankingTier" "RankingTier" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "totalFiveStar" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalFourStar" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalOneStar" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRatings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalThreeStar" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTwoStar" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ratingLegitimacyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "automatedFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ratingEligibleAt" TIMESTAMP(3) NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_bookingId_key" ON "Rating"("bookingId");

-- CreateIndex
CREATE INDEX "Rating_providerProfileId_idx" ON "Rating"("providerProfileId");

-- CreateIndex
CREATE INDEX "Rating_bookingId_idx" ON "Rating"("bookingId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
