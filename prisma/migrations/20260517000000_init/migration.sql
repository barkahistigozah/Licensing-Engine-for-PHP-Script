-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "License" (
  "id" TEXT NOT NULL,
  "licenseKey" TEXT NOT NULL,
  "allowedDomain" TEXT NOT NULL,
  "allowedPath" TEXT NOT NULL,
  "telegramBotToken" TEXT NOT NULL,
  "telegramChatId" TEXT NOT NULL,
  "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
  "id" TEXT NOT NULL,
  "licenseId" TEXT NOT NULL,
  "requestIp" TEXT NOT NULL,
  "requestHost" TEXT NOT NULL,
  "requestPath" TEXT NOT NULL,
  "statusResult" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");

-- CreateIndex
CREATE INDEX "License_licenseKey_idx" ON "License"("licenseKey");

-- CreateIndex
CREATE INDEX "License_allowedDomain_idx" ON "License"("allowedDomain");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "VerificationLog_licenseId_idx" ON "VerificationLog"("licenseId");

-- CreateIndex
CREATE INDEX "VerificationLog_statusResult_idx" ON "VerificationLog"("statusResult");

-- CreateIndex
CREATE INDEX "VerificationLog_createdAt_idx" ON "VerificationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "VerificationLog"
  ADD CONSTRAINT "VerificationLog_licenseId_fkey"
  FOREIGN KEY ("licenseId")
  REFERENCES "License"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
