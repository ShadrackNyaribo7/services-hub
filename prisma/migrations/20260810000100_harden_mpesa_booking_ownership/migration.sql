ALTER TABLE "Booking"
ADD COLUMN "clientUserId" TEXT,
ADD COLUMN "mpesaAccountReference" TEXT,
ADD COLUMN "mpesaInitiationToken" TEXT,
ADD COLUMN "mpesaInitiatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Booking_mpesaReceiptNumber_key"
ON "Booking"("mpesaReceiptNumber");

CREATE UNIQUE INDEX "Booking_mpesaAccountReference_key"
ON "Booking"("mpesaAccountReference");

CREATE UNIQUE INDEX "Booking_mpesaInitiationToken_key"
ON "Booking"("mpesaInitiationToken");

CREATE INDEX "Booking_clientUserId_idx"
ON "Booking"("clientUserId");
