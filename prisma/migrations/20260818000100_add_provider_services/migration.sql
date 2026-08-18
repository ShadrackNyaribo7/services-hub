-- Approved providers confirm an itemized service menu before becoming bookable.
ALTER TABLE "ProviderProfile"
ADD COLUMN "servicesConfirmedAt" TIMESTAMP(3);

CREATE TABLE "ProviderService" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceKes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking"
ADD COLUMN "providerServiceId" TEXT,
ADD COLUMN "serviceName" TEXT;

CREATE UNIQUE INDEX "ProviderService_providerProfileId_name_key"
ON "ProviderService"("providerProfileId", "name");

CREATE INDEX "ProviderService_providerProfileId_idx"
ON "ProviderService"("providerProfileId");

CREATE INDEX "Booking_providerServiceId_idx"
ON "Booking"("providerServiceId");

ALTER TABLE "ProviderService"
ADD CONSTRAINT "ProviderService_providerProfileId_fkey"
FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_providerServiceId_fkey"
FOREIGN KEY ("providerServiceId") REFERENCES "ProviderService"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
