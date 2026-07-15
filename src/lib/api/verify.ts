import { Elysia } from 'elysia'
import {
  fingerprintLicenseKey,
  hashTelegramToken,
  signPayload
} from '$lib/server/crypto'
import { readServerEnv } from '$lib/server/env'
import { apiError, logEvent, requestId } from '$lib/server/http'
import { prisma } from '$lib/server/prisma'
import { createRedisClient } from '$lib/server/redis'
import { verifyLicense } from '$lib/server/verify'

const inputKeys = [
  'license_key',
  'domain',
  'request_path',
  'telegram_bot_token',
  'telegram_chat_id'
] as const

type Input = Record<(typeof inputKeys)[number], string>

const headers = (id: string, cache = 'BYPASS', remaining = '0') => ({
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-leps-cache': cache,
  'x-ratelimit-remaining': remaining,
  'x-request-id': id
})

const validationError = (
  id: string,
  message = 'Invalid verification request.'
) =>
  new Response(JSON.stringify(apiError('VALIDATION_ERROR', message, id)), {
    status: 400,
    headers: headers(id)
  })

async function parseInput(request: Request): Promise<Input> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new Error('Content type must be application/json.')
  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > 4096)
    throw new Error('Request body is too large.')
  const value: unknown = JSON.parse(text)
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('JSON object required.')
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).length !== inputKeys.length ||
    Object.keys(record).some(
      (key) => !inputKeys.includes(key as (typeof inputKeys)[number])
    ) ||
    inputKeys.some((key) => typeof record[key] !== 'string')
  )
    throw new Error('Invalid verification fields.')
  return record as Input
}

export const verifyApi = new Elysia().post(
  '/v1/license/verify',
  async ({ request }) => {
    const id = requestId()
    let input: Input
    try {
      input = await parseInput(request)
    } catch {
      return validationError(id)
    }

    const env = readServerEnv()
    const redis = createRedisClient({
      url: env.redisUrl,
      token: env.redisToken,
      production: env.production
    })
    const result = await verifyLicense(
      {
        now: () => new Date(),
        rateLimit: (key) => redis.rateLimit(key, 60, 60),
        findLicense: (licenseKey) =>
          prisma.license.findUnique({ where: { licenseKey } }),
        writeAudit: (entry) => prisma.verificationLog.create({ data: entry }),
        hashToken: (token) => hashTelegramToken(env.bindingSecret, token),
        fingerprint: (key) => fingerprintLicenseKey(env.bindingSecret, key),
        sign: (payload) => signPayload(env.signingPrivateKey, payload)
      },
      input,
      {
        clientIp:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          'unknown'
      }
    )
    const body =
      result.body.status === 'VALID'
        ? result.body
        : { ...result.body, request_id: id }
    if (result.httpStatus >= 400)
      logEvent({
        event: 'license_verification_failed',
        request_id: id,
        error_code:
          result.body.status === 'VALID' ? undefined : result.body.error_code
      })
    return new Response(JSON.stringify(body), {
      status: result.httpStatus,
      headers: headers(
        id,
        result.cacheStatus,
        String(result.rateLimitRemaining)
      )
    })
  }
)
