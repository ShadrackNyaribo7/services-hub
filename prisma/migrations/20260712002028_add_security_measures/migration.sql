-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "clientConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clientConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "escrowReleased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "securityFlag" TEXT,
ADD COLUMN     "serviceConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "suspiciousActivity" BOOLEAN NOT NULL DEFAULT false;
