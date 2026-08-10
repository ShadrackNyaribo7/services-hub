-- Provider location is collected only while a paid booking is actively being
-- performed. Exact coordinates are encrypted by the application before they
-- reach PostgreSQL; only freshness and risk metadata remain queryable.

ALTER TYPE "BookingStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_CLIENT_CONFIRMATION';

ALTER TABLE "Booking"
ADD COLUMN "operationStartedAt" TIMESTAMP(3),
ADD COLUMN "operationEndedAt" TIMESTAMP(3),
ADD COLUMN "providerLocationConsentAt" TIMESTAMP(3),
ADD COLUMN "providerLocationLastSeenAt" TIMESTAMP(3),
ADD COLUMN "providerLocationCapturedAt" TIMESTAMP(3),
ADD COLUMN "providerLocationAccuracyM" DOUBLE PRECISION,
ADD COLUMN "providerLocationRiskFlag" TEXT,
ADD COLUMN "providerLocationGapCount" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "LocationEventType" AS ENUM ('START', 'HEARTBEAT', 'REJECTED');

CREATE TABLE "ProviderLocationEvent" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accuracyM" DOUBLE PRECISION NOT NULL,
  "encryptedCoordinates" TEXT NOT NULL,
  "eventType" "LocationEventType" NOT NULL DEFAULT 'HEARTBEAT',
  "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],

  CONSTRAINT "ProviderLocationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_providerProfileId_status_idx"
ON "Booking"("providerProfileId", "status");

CREATE UNIQUE INDEX "Booking_one_active_operation_per_provider_idx"
ON "Booking"("providerProfileId")
WHERE "operationStartedAt" IS NOT NULL AND "operationEndedAt" IS NULL;

CREATE INDEX "ProviderLocationEvent_bookingId_receivedAt_idx"
ON "ProviderLocationEvent"("bookingId", "receivedAt");

CREATE INDEX "ProviderLocationEvent_providerProfileId_receivedAt_idx"
ON "ProviderLocationEvent"("providerProfileId", "receivedAt");

ALTER TABLE "ProviderLocationEvent"
ADD CONSTRAINT "ProviderLocationEvent_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProviderLocationEvent"
ADD CONSTRAINT "ProviderLocationEvent_providerProfileId_fkey"
FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
