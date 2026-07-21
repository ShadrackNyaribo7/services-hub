-- Track gateway reconciliation ids and separate gross marketplace take from net platform profit.
ALTER TABLE "Booking"
ADD COLUMN     "mpesaCheckoutRequestId" TEXT,
ADD COLUMN     "mpesaMerchantRequestId" TEXT,
ADD COLUMN     "grossPlatformFee" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "paymentProcessingFee" DOUBLE PRECISION DEFAULT 0;

CREATE UNIQUE INDEX "Booking_mpesaCheckoutRequestId_key" ON "Booking"("mpesaCheckoutRequestId");
