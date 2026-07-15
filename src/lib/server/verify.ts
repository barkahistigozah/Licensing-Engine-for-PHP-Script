import { buildSignedPayload } from './crypto'
import {
  evaluateLicense,
  normalizeDomain,
  normalizePath,
  type StoredStatus
} from './license'
import type { RateLimitResult } from './redis'

type LicenseRecord = {
  id: string
  licenseKey: string
  allowedDomain: string
  allowedPath: string
  telegramBotTokenHash: string
  telegramChatId: string
  status: StoredStatus
  expiresAt: Date | string
}

type VerifyInput = {
  license_key: string
  domain: string
  request_path: string
  telegram_bot_token: string
  telegram_chat_id: string
}

export function validateVerifyInput(input: VerifyInput) {
  if (
    !/^lic_[a-f0-9]{24}$/.test(input.license_key) ||
    input.telegram_bot_token.length > 512 ||
    !input.telegram_bot_token ||
    input.telegram_chat_id.length > 128 ||
    !input.telegram_chat_id ||
    input.request_path.length > 1024
  )
    throw new Error('Invalid verification input.')
  return {
    ...input,
    domain: normalizeDomain(input.domain),
    request_path: normalizePath(input.request_path)
  }
}

type AuditEntry = {
  licenseId: string | null
  licenseKeyFingerprint: string
  requestIp: string
  requestHost: string
  requestPath: string
  statusResult: string
}

type VerifyDeps = {
  now: () => Date
  rateLimit: (key: string) => Promise<RateLimitResult>
  findLicense: (key: string) => Promise<LicenseRecord | null>
  writeAudit: (entry: AuditEntry) => Promise<unknown>
  hashToken: (token: string) => string
  sign: (payload: Uint8Array) => string
  fingerprint?: (key: string) => string
}

type ErrorBody = { status: 'INVALID'; error_code: string; message: string }
type ValidBody = {
  version: 1
  status: 'VALID'
  message: string
  license_key: string
  domain: string
  request_path: string
  expires_at: string
  issued_at: string
  signature_algorithm: 'Ed25519'
  signed_payload: string
  signature: string
  cache: 'BYPASS'
}

export type VerifyResult = {
  httpStatus: number
  body: ErrorBody | ValidBody
  cacheStatus: 'BYPASS'
  rateLimitRemaining: number
}

const errors = {
  VALIDATION_ERROR: 'Invalid verification request.',
  ERR_LICENSE_NOT_FOUND: 'License was not found.',
  ERR_LICENSE_REVOKED: 'License has been suspended.',
  ERR_LICENSE_EXPIRED: 'License has expired.',
  ERR_DOMAIN_PATH_MISMATCH:
    'The license binding does not match this installation.',
  ERR_TELEGRAM_BINDING_MISMATCH:
    'The Telegram binding does not match this installation.',
  ERR_RATE_LIMITED: 'Too many verification requests.',
  ERR_LICENSE_STORE_UNAVAILABLE: 'License store is unavailable.',
  ERR_RATE_LIMITER_UNAVAILABLE: 'Rate limiter is unavailable.'
} as const

const error = (
  errorCode: keyof typeof errors,
  httpStatus: number,
  cacheStatus: VerifyResult['cacheStatus'],
  rateLimitRemaining: number
): VerifyResult => ({
  httpStatus,
  body: {
    status: 'INVALID',
    error_code: errorCode,
    message: errors[errorCode]
  },
  cacheStatus,
  rateLimitRemaining
})

const asRecord = (
  record: LicenseRecord
): Omit<LicenseRecord, 'expiresAt'> & { expiresAt: Date } => ({
  ...record,
  expiresAt: new Date(record.expiresAt)
})

export async function verifyLicense(
  deps: VerifyDeps,
  input: VerifyInput,
  context: { clientIp: string }
): Promise<VerifyResult> {
  let validated: VerifyInput
  try {
    validated = validateVerifyInput(input)
  } catch {
    return error('VALIDATION_ERROR', 400, 'BYPASS', 0)
  }
  const rate = await deps.rateLimit(`rl:verify:${context.clientIp}`)
  if (rate.state === 'unavailable')
    return error('ERR_RATE_LIMITER_UNAVAILABLE', 503, 'BYPASS', 0)
  if (!rate.allowed)
    return error('ERR_RATE_LIMITED', 429, 'BYPASS', rate.remaining)

  const cacheStatus: VerifyResult['cacheStatus'] = 'BYPASS'
  let license: LicenseRecord | null
  try {
    license = await deps.findLicense(validated.license_key)
  } catch {
    return error(
      'ERR_LICENSE_STORE_UNAVAILABLE',
      503,
      cacheStatus,
      rate.remaining
    )
  }

  let result: VerifyResult
  if (!license)
    result = error('ERR_LICENSE_NOT_FOUND', 403, cacheStatus, rate.remaining)
  else {
    const normalized = {
      domain: validated.domain,
      requestPath: validated.request_path,
      telegramBotTokenHash: deps.hashToken(validated.telegram_bot_token),
      telegramChatId: validated.telegram_chat_id
    }
    const evaluation = evaluateLicense(
      asRecord(license),
      normalized,
      deps.now()
    )
    const evaluationError = {
      SUSPENDED: 'ERR_LICENSE_REVOKED',
      EXPIRED: 'ERR_LICENSE_EXPIRED',
      MISMATCH_DOMAIN: 'ERR_DOMAIN_PATH_MISMATCH',
      MISMATCH_PATH: 'ERR_DOMAIN_PATH_MISMATCH',
      MISMATCH_TELEGRAM: 'ERR_TELEGRAM_BINDING_MISMATCH'
    } as const
    if (evaluation !== 'SUCCESS')
      result = error(
        evaluationError[evaluation],
        403,
        cacheStatus,
        rate.remaining
      )
    else {
      const issuedAt = deps.now().toISOString()
      const payload = buildSignedPayload({
        version: 1,
        status: 'VALID',
        license_key: license.licenseKey,
        domain: normalized.domain,
        request_path: normalized.requestPath,
        expires_at: new Date(license.expiresAt).toISOString(),
        issued_at: issuedAt
      })
      result = {
        httpStatus: 200,
        body: {
          version: 1,
          status: 'VALID',
          message: 'Authorization granted.',
          license_key: license.licenseKey,
          domain: normalized.domain,
          request_path: normalized.requestPath,
          expires_at: new Date(license.expiresAt).toISOString(),
          issued_at: issuedAt,
          signature_algorithm: 'Ed25519',
          signed_payload: payload.encoded,
          signature: deps.sign(payload.bytes),
          cache: cacheStatus
        },
        cacheStatus,
        rateLimitRemaining: rate.remaining
      }
    }
  }

  try {
    await deps.writeAudit({
      licenseId: license?.id ?? null,
      licenseKeyFingerprint:
        deps.fingerprint?.(validated.license_key) ?? 'unavailable',
      requestIp: context.clientIp,
      requestHost: validated.domain,
      requestPath: validated.request_path,
      statusResult:
        result.body.status === 'VALID' ? 'SUCCESS' : result.body.error_code
    })
  } catch {
    // ponytail: audit is observability, not an authorization dependency.
  }
  return result
}
