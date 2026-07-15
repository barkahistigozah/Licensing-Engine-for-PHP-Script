-- Preserve existing migration history because this checkout is not an isolated rewrite branch.
CREATE TYPE "LicenseStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "License"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "LicenseStatus_new" USING (
    CASE WHEN "status"::text = 'EXPIRED' THEN 'ACTIVE' ELSE "status"::text END
  )::"LicenseStatus_new",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "LicenseStatus";
ALTER TYPE "LicenseStatus_new" RENAME TO "LicenseStatus";

ALTER TABLE "License" RENAME COLUMN "telegramBotToken" TO "telegramBotTokenHash";
DROP INDEX "License_licenseKey_idx";
DROP INDEX "License_status_idx";
CREATE INDEX "License_status_expiresAt_idx" ON "License"("status", "expiresAt");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "VerificationLog") THEN
    RAISE EXCEPTION 'Fresh database required: legacy verification logs cannot be fingerprinted safely.';
  END IF;
END $$;

ALTER TABLE "VerificationLog"
  ALTER COLUMN "licenseId" DROP NOT NULL,
  ADD COLUMN "licenseKeyFingerprint" TEXT NOT NULL;
ALTER TABLE "VerificationLog" DROP CONSTRAINT "VerificationLog_licenseId_fkey";
ALTER TABLE "VerificationLog"
  ADD CONSTRAINT "VerificationLog_licenseId_fkey"
  FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;
DROP INDEX "VerificationLog_statusResult_idx";
CREATE INDEX "VerificationLog_licenseKeyFingerprint_idx" ON "VerificationLog"("licenseKeyFingerprint");
CREATE INDEX "VerificationLog_statusResult_createdAt_idx" ON "VerificationLog"("statusResult", "createdAt");

CREATE TABLE "rateLimit" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL,
  CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");
