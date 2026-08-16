ALTER TABLE "ProviderProfile"
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "phoneVerificationMethod" TEXT,
ADD COLUMN "phoneVerificationSource" TEXT,
ADD COLUMN "phoneVerificationReference" TEXT;

CREATE TYPE "MobileVerificationPurpose" AS ENUM (
  'PROVIDER_APPLICATION',
  'PROVIDER_SIGN_IN'
);

CREATE TYPE "MobileVerificationStatus" AS ENUM (
  'PENDING',
  'VERIFIED',
  'FAILED',
  'EXPIRED'
);

CREATE TABLE "MobileVerificationChallenge" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "purpose" "MobileVerificationPurpose" NOT NULL,
  "status" "MobileVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "amount" INTEGER NOT NULL DEFAULT 1,
  "accountReference" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "mpesaCheckoutRequestId" TEXT,
  "mpesaMerchantRequestId" TEXT,
  "mpesaReceiptNumber" TEXT,
  "resultCode" INTEGER,
  "resultDescription" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MobileVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderMobileSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "userId" TEXT,
  "verificationChallengeId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProviderMobileSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileVerificationChallenge_tokenHash_key"
ON "MobileVerificationChallenge"("tokenHash");

CREATE UNIQUE INDEX "MobileVerificationChallenge_accountReference_key"
ON "MobileVerificationChallenge"("accountReference");

CREATE UNIQUE INDEX "MobileVerificationChallenge_mpesaCheckoutRequestId_key"
ON "MobileVerificationChallenge"("mpesaCheckoutRequestId");

CREATE UNIQUE INDEX "MobileVerificationChallenge_mpesaReceiptNumber_key"
ON "MobileVerificationChallenge"("mpesaReceiptNumber");

CREATE INDEX "MobileVerificationChallenge_phone_createdAt_idx"
ON "MobileVerificationChallenge"("phone", "createdAt");

CREATE INDEX "MobileVerificationChallenge_requestFingerprint_createdAt_idx"
ON "MobileVerificationChallenge"("requestFingerprint", "createdAt");

CREATE UNIQUE INDEX "ProviderMobileSession_tokenHash_key"
ON "ProviderMobileSession"("tokenHash");

CREATE INDEX "ProviderMobileSession_phone_expiresAt_idx"
ON "ProviderMobileSession"("phone", "expiresAt");

CREATE INDEX "ProviderMobileSession_userId_expiresAt_idx"
ON "ProviderMobileSession"("userId", "expiresAt");
