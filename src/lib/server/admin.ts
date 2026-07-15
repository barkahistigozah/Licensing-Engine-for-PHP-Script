import type { LicenseStatus } from '@prisma/client'

type LicenseLike = {
  id: string
  licenseKey: string
  allowedDomain: string
  allowedPath: string
  telegramChatId: string
  telegramBotTokenHash?: string
  status: LicenseStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export const effectiveLicenseStatus = (
  license: Pick<LicenseLike, 'status' | 'expiresAt'>,
  now = new Date()
) =>
  license.status === 'SUSPENDED'
    ? 'SUSPENDED'
    : license.expiresAt <= now
      ? 'EXPIRED'
      : 'ACTIVE'

export function serializeLicense(license: LicenseLike) {
  return {
    id: license.id,
    license_key: license.licenseKey,
    allowed_domain: license.allowedDomain,
    allowed_path: license.allowedPath,
    telegram_chat_id: license.telegramChatId,
    has_telegram_bot_token: true,
    status: effectiveLicenseStatus(license),
    expires_at: license.expiresAt.toISOString(),
    created_at: license.createdAt.toISOString(),
    updated_at: license.updatedAt.toISOString()
  }
}

export const calculateExtendedExpiry = (
  current: Date,
  days: number,
  now = new Date()
) => {
  const next = new Date(current > now ? current : now)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}
