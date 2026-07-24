ALTER TABLE "ProviderProfile"
ADD COLUMN "verificationConsentAt" TIMESTAMP(3),
ADD COLUMN "identityVerificationLevel" TEXT,
ADD COLUMN "identityVerificationMethod" TEXT,
ADD COLUMN "identityVerificationSource" TEXT,
ADD COLUMN "identityVerifiedAt" TIMESTAMP(3),
ADD COLUMN "identityVerifiedBy" TEXT,
ADD COLUMN "policeVerificationLevel" TEXT,
ADD COLUMN "policeVerificationMethod" TEXT,
ADD COLUMN "policeVerificationSource" TEXT,
ADD COLUMN "policeVerifiedAt" TIMESTAMP(3),
ADD COLUMN "policeVerifiedBy" TEXT;
