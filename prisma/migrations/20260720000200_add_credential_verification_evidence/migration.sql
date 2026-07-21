-- Store the claimed credential context and the evidence used to approve it.
ALTER TABLE "ProviderProfile"
ADD COLUMN "certificationIssuer" TEXT,
ADD COLUMN "certificationName" TEXT,
ADD COLUMN "credentialVerificationLevel" TEXT,
ADD COLUMN "credentialVerificationMethod" TEXT,
ADD COLUMN "credentialVerificationSource" TEXT,
ADD COLUMN "credentialVerifiedAt" TIMESTAMP(3),
ADD COLUMN "credentialManualReference" TEXT;
