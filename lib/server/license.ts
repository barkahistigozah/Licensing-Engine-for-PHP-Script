import type { License } from "@prisma/client";

export type LicenseCacheRecord = Pick<
  License,
  | "id"
  | "licenseKey"
  | "allowedDomain"
  | "allowedPath"
  | "telegramBotToken"
  | "telegramChatId"
  | "status"
  | "expiresAt"
>;

export function generateLicenseKey() {
  return `lic_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function getLicenseCacheKey(licenseKey: string) {
  return `lic:${licenseKey}`;
}

export function toCacheRecord(license: License): LicenseCacheRecord {
  return {
    id: license.id,
    licenseKey: license.licenseKey,
    allowedDomain: license.allowedDomain,
    allowedPath: license.allowedPath,
    telegramBotToken: license.telegramBotToken,
    telegramChatId: license.telegramChatId,
    status: license.status,
    expiresAt: license.expiresAt,
  };
}

export function hydrateCacheRecord(record: LicenseCacheRecord) {
  return {
    ...record,
    expiresAt: new Date(record.expiresAt),
  };
}

export async function createLicenseSignature(record: LicenseCacheRecord) {
  const payload = [
    record.licenseKey,
    record.allowedDomain,
    record.allowedPath,
    record.telegramBotToken,
    record.telegramChatId,
    new Date(record.expiresAt).toISOString(),
  ].join("|");

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function evaluateLicense(
  record: LicenseCacheRecord,
  input: {
    domain: string;
    request_path: string;
    telegram_bot_token: string;
    telegram_chat_id: string;
  },
) {
  if (record.status === "SUSPENDED") {
    return "SUSPENDED";
  }

  if (record.status === "EXPIRED" || new Date(record.expiresAt) <= new Date()) {
    return "EXPIRED";
  }

  if (record.allowedDomain !== input.domain) {
    return "MISMATCH_DOMAIN";
  }

  if (record.allowedPath !== input.request_path) {
    return "MISMATCH_PATH";
  }

  if (
    record.telegramBotToken !== input.telegram_bot_token ||
    record.telegramChatId !== input.telegram_chat_id
  ) {
    return "MISMATCH_TELEGRAM";
  }

  return "SUCCESS";
}
