import { randomUUID } from 'node:crypto'
import { safeHashEqual } from './crypto'

export type StoredStatus = 'ACTIVE' | 'SUSPENDED'
export type EffectiveStatus = StoredStatus | 'EXPIRED'
export type Evaluation =
  | 'SUCCESS'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'MISMATCH_DOMAIN'
  | 'MISMATCH_PATH'
  | 'MISMATCH_TELEGRAM'

export function normalizeDomain(input: string) {
  const domain = input.trim().toLowerCase().replace(/\.$/, '')
  if (
    !domain ||
    domain.length > 253 ||
    /[/:?#@\s]/.test(domain) ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
      domain
    )
  )
    throw new Error('Domain must be a hostname.')
  return domain
}

export function normalizePath(input: string) {
  const path = input.trim()
  if (path.length > 1024 || !path.startsWith('/') || /[?#\\\s]/.test(path))
    throw new Error('Path must be an absolute path without query or fragment.')
  return path === '/' ? path : path.replace(/\/+$/, '')
}

export const generateLicenseKey = () =>
  `lic_${randomUUID().replaceAll('-', '').slice(0, 24)}`

export function effectiveStatus(
  record: { status: StoredStatus; expiresAt: Date },
  now = new Date()
): EffectiveStatus {
  if (record.status === 'SUSPENDED') return 'SUSPENDED'
  return record.expiresAt <= now ? 'EXPIRED' : 'ACTIVE'
}

export function evaluateLicense(
  record: {
    status: StoredStatus
    expiresAt: Date
    allowedDomain: string
    allowedPath: string
    telegramBotTokenHash: string
    telegramChatId: string
  },
  input: {
    domain: string
    requestPath: string
    telegramBotTokenHash: string
    telegramChatId: string
  },
  now = new Date()
): Evaluation {
  const status = effectiveStatus(record, now)
  if (status !== 'ACTIVE') return status
  if (record.allowedDomain !== input.domain) return 'MISMATCH_DOMAIN'
  if (record.allowedPath !== input.requestPath) return 'MISMATCH_PATH'
  if (
    !safeHashEqual(record.telegramBotTokenHash, input.telegramBotTokenHash) ||
    record.telegramChatId !== input.telegramChatId
  )
    return 'MISMATCH_TELEGRAM'
  return 'SUCCESS'
}
