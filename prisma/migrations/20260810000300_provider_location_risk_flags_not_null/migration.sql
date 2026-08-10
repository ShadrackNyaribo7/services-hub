UPDATE "ProviderLocationEvent"
SET "riskFlags" = ARRAY[]::TEXT[]
WHERE "riskFlags" IS NULL;

ALTER TABLE "ProviderLocationEvent"
ALTER COLUMN "riskFlags" SET NOT NULL;
