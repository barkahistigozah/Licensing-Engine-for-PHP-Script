import { Elysia } from 'elysia'
import type { Prisma, PrismaClient } from '@prisma/client'
import { hashTelegramToken } from '$lib/server/crypto'
import { apiError, requestId } from '$lib/server/http'
import {
  generateLicenseKey,
  normalizeDomain,
  normalizePath
} from '$lib/server/license'
import { calculateExtendedExpiry, serializeLicense } from '$lib/server/admin'

type Admin = { user: { id: string; email?: string; name?: string } }
type AdminOptions = {
  getAdmin: (headers: Headers) => Promise<Admin | null>
  db?: PrismaClient
  bindingSecret?: string | (() => string)
}

const licenseSelect = {
  id: true,
  licenseKey: true,
  allowedDomain: true,
  allowedPath: true,
  telegramChatId: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true
} as const

const body = async (request: Request, allowed: string[]) => {
  const value = await request.json()
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_BODY')
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('INVALID_BODY')
  return value as Record<string, unknown>
}

const positive = (value: string | null, fallback: number) => {
  if (value === null) return fallback
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

const onlyQuery = (url: URL, allowed: string[]) =>
  [...url.searchParams.keys()].every((key) => allowed.includes(key))

const auditStatuses = new Set([
  'SUCCESS',
  'ERR_LICENSE_NOT_FOUND',
  'ERR_LICENSE_REVOKED',
  'ERR_LICENSE_EXPIRED',
  'ERR_DOMAIN_PATH_MISMATCH',
  'ERR_TELEGRAM_BINDING_MISMATCH',
  'ERR_RATE_LIMITED',
  'ERR_LICENSE_STORE_UNAVAILABLE',
  'ERR_RATE_LIMITER_UNAVAILABLE'
])

const validationError = (error: unknown) =>
  error instanceof Error &&
  (error.message === 'INVALID_BODY' ||
    error.message === 'Domain must be a hostname.' ||
    error.message ===
      'Path must be an absolute path without query or fragment.')

export function createAdminApi({
  getAdmin,
  db,
  bindingSecret = process.env.LICENSE_BINDING_SECRET ?? ''
}: AdminOptions) {
  const storage = db as PrismaClient
  const guarded = async (request: Request) => {
    const id = requestId()
    try {
      const admin = await getAdmin(request.headers)
      return admin
        ? { admin, id }
        : {
            response: Response.json(
              apiError('UNAUTHORIZED', 'Admin session is required.', id),
              { status: 401, headers: { 'cache-control': 'no-store' } }
            )
          }
    } catch {
      return {
        response: Response.json(
          apiError('UNAVAILABLE', 'Admin service is unavailable.', id),
          { status: 503, headers: { 'cache-control': 'no-store' } }
        )
      }
    }
  }
  const notFound = (id: string) =>
    Response.json(apiError('NOT_FOUND', 'License was not found.', id), {
      status: 404
    })
  const unavailable = (id: string) =>
    Response.json(
      apiError('UNAVAILABLE', 'Admin service is unavailable.', id),
      {
        status: 503,
        headers: { 'cache-control': 'no-store' }
      }
    )
  const tokenHash = (token: string) => {
    const secret =
      typeof bindingSecret === 'function' ? bindingSecret() : bindingSecret
    if (!secret) throw new Error('CONFIG_UNAVAILABLE')
    return hashTelegramToken(secret, token)
  }

  return new Elysia()
    .onError(() => unavailable(requestId()))
    .get('/admin/auth/me', async ({ request }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      return { user: guard.admin.user }
    })
    .get('/admin/stats', async ({ request }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      const now = new Date()
      const soon = new Date(now)
      soon.setUTCDate(soon.getUTCDate() + 14)
      const since = new Date(now)
      since.setUTCHours(since.getUTCHours() - 24)
      const [active, expiring, total, failed, recent, recentLicenses] =
        await Promise.all([
          storage.license.count({
            where: { status: 'ACTIVE', expiresAt: { gt: now } }
          }),
          storage.license.count({
            where: { status: 'ACTIVE', expiresAt: { gt: now, lte: soon } }
          }),
          storage.verificationLog.count({
            where: { createdAt: { gte: since } }
          }),
          storage.verificationLog.count({
            where: {
              createdAt: { gte: since },
              statusResult: { not: 'SUCCESS' }
            }
          }),
          storage.verificationLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
          }),
          storage.license.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: licenseSelect
          })
        ])
      return {
        active_licenses: active,
        expiring_soon: expiring,
        verification_total_24h: total,
        verification_failed_24h: failed,
        recent_licenses: recentLicenses.map(serializeLicense),
        recent_verifications: recent.map((log) => ({
          id: log.id,
          license_id: log.licenseId,
          license_key_fingerprint: log.licenseKeyFingerprint,
          request_ip: log.requestIp,
          request_host: log.requestHost,
          request_path: log.requestPath,
          status_result: log.statusResult,
          created_at: log.createdAt.toISOString()
        }))
      }
    })
    .get('/admin/licenses', async ({ request }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      const url = new URL(request.url)
      const page = positive(url.searchParams.get('page'), 1)
      const limit = positive(url.searchParams.get('limit'), 20)
      const search = url.searchParams.get('search')?.trim() ?? ''
      const status = url.searchParams.get('status') ?? ''
      const sort = url.searchParams.get('sort') ?? 'created_at_desc'
      if (
        !onlyQuery(url, ['page', 'limit', 'search', 'status', 'sort']) ||
        !page ||
        page > 1000 ||
        !limit ||
        limit > 100 ||
        search.length > 200 ||
        !['', 'ACTIVE', 'SUSPENDED', 'EXPIRED'].includes(status) ||
        ![
          'created_at_desc',
          'created_at_asc',
          'expires_at_asc',
          'expires_at_desc'
        ].includes(sort)
      )
        return Response.json(
          apiError(
            'VALIDATION_ERROR',
            'Invalid pagination or filter.',
            guard.id
          ),
          { status: 400 }
        )
      const now = new Date()
      const where = {
        ...(search
          ? {
              OR: [
                {
                  licenseKey: { contains: search, mode: 'insensitive' as const }
                },
                {
                  allowedDomain: {
                    contains: search,
                    mode: 'insensitive' as const
                  }
                }
              ]
            }
          : {}),
        ...(status === 'ACTIVE'
          ? { status: 'ACTIVE' as const, expiresAt: { gt: now } }
          : status === 'SUSPENDED'
            ? { status: 'SUSPENDED' as const }
            : status === 'EXPIRED'
              ? { status: 'ACTIVE' as const, expiresAt: { lte: now } }
              : {})
      }
      const orderBy =
        sort === 'created_at_asc'
          ? [{ createdAt: 'asc' as const }, { id: 'asc' as const }]
          : sort === 'expires_at_asc'
            ? [{ expiresAt: 'asc' as const }, { id: 'asc' as const }]
            : sort === 'expires_at_desc'
              ? [{ expiresAt: 'desc' as const }, { id: 'asc' as const }]
              : [{ createdAt: 'desc' as const }, { id: 'asc' as const }]
      const [items, total] = await Promise.all([
        storage.license.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          select: licenseSelect
        }),
        storage.license.count({ where })
      ])
      return {
        items: items.map(serializeLicense),
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    })
    .get('/admin/licenses/:id', async ({ request, params }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      const license = await storage.license.findUnique({
        where: { id: params.id }
      })
      return license ? serializeLicense(license) : notFound(guard.id)
    })
    .get('/admin/audit-logs', async ({ request }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      const url = new URL(request.url)
      const page = positive(url.searchParams.get('page'), 1)
      const limit = positive(url.searchParams.get('limit'), 50)
      const status = url.searchParams.get('status')?.trim()
      const domain = url.searchParams.get('domain')?.trim()
      const from = url.searchParams.get('date_from')
      const to = url.searchParams.get('date_to')
      const dateFrom = from ? new Date(from) : null
      const dateTo = to ? new Date(to) : null
      if (
        !onlyQuery(url, [
          'page',
          'limit',
          'status',
          'domain',
          'date_from',
          'date_to'
        ]) ||
        !page ||
        page > 1000 ||
        !limit ||
        limit > 100 ||
        (domain?.length ?? 0) > 253 ||
        (status && !auditStatuses.has(status)) ||
        (from && Number.isNaN(dateFrom?.valueOf())) ||
        (to && Number.isNaN(dateTo?.valueOf())) ||
        (dateFrom && dateTo && dateTo < dateFrom)
      )
        return Response.json(
          apiError(
            'VALIDATION_ERROR',
            'Invalid pagination or filter.',
            guard.id
          ),
          { status: 400 }
        )
      const dateToExclusive = dateTo && new Date(dateTo)
      dateToExclusive?.setUTCDate(dateToExclusive.getUTCDate() + 1)
      const where = {
        ...(status ? { statusResult: status } : {}),
        ...(domain
          ? { requestHost: { contains: domain, mode: 'insensitive' as const } }
          : {}),
        ...(dateFrom || dateToExclusive
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateToExclusive ? { lt: dateToExclusive } : {})
              }
            }
          : {})
      }
      const [items, total] = await Promise.all([
        storage.verificationLog.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * limit,
          take: limit
        }),
        storage.verificationLog.count({ where })
      ])
      return {
        items: items.map((log) => ({
          id: log.id,
          license_id: log.licenseId,
          license_key_fingerprint: log.licenseKeyFingerprint,
          request_ip: log.requestIp,
          request_host: log.requestHost,
          request_path: log.requestPath,
          status_result: log.statusResult,
          created_at: log.createdAt.toISOString()
        })),
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    })
    .post('/admin/licenses', async ({ request }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      try {
        const value = await body(request, [
          'allowed_domain',
          'allowed_path',
          'telegram_bot_token',
          'telegram_chat_id',
          'status',
          'expires_at'
        ])
        if (
          typeof value.allowed_domain !== 'string' ||
          typeof value.allowed_path !== 'string' ||
          typeof value.telegram_bot_token !== 'string' ||
          !value.telegram_bot_token ||
          value.telegram_bot_token.length > 512 ||
          typeof value.telegram_chat_id !== 'string' ||
          !value.telegram_chat_id ||
          value.telegram_chat_id.length > 128
        )
          throw new Error('INVALID_BODY')
        const status = value.status === undefined ? 'ACTIVE' : value.status
        if (status !== 'ACTIVE' && status !== 'SUSPENDED')
          throw new Error('INVALID_BODY')
        const expiresAt = value.expires_at
          ? new Date(String(value.expires_at))
          : new Date(Date.now() + 14 * 86400000)
        if (
          Number.isNaN(expiresAt.valueOf()) ||
          (status === 'ACTIVE' && expiresAt <= new Date())
        )
          throw new Error('INVALID_BODY')
        const license = await storage.license.create({
          data: {
            licenseKey: generateLicenseKey(),
            allowedDomain: normalizeDomain(value.allowed_domain),
            allowedPath: normalizePath(value.allowed_path),
            telegramBotTokenHash: tokenHash(value.telegram_bot_token),
            telegramChatId: value.telegram_chat_id,
            status,
            expiresAt
          }
        })
        return new Response(JSON.stringify(serializeLicense(license)), {
          status: 201,
          headers: { 'content-type': 'application/json; charset=utf-8' }
        })
      } catch (error) {
        return validationError(error)
          ? Response.json(
              apiError('VALIDATION_ERROR', 'Invalid license input.', guard.id),
              { status: 400 }
            )
          : unavailable(guard.id)
      }
    })
    .patch('/admin/licenses/:id', async ({ request, params }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      try {
        const value = await body(request, [
          'allowed_domain',
          'allowed_path',
          'telegram_bot_token',
          'telegram_chat_id',
          'status',
          'expires_at'
        ])
        if (
          !Object.keys(value).length ||
          [
            'allowed_domain',
            'allowed_path',
            'telegram_bot_token',
            'telegram_chat_id',
            'expires_at'
          ].some(
            (key) => value[key] !== undefined && typeof value[key] !== 'string'
          ) ||
          (value.telegram_bot_token !== undefined &&
            (!value.telegram_bot_token ||
              (value.telegram_bot_token as string).length > 512)) ||
          (value.telegram_chat_id !== undefined &&
            (!value.telegram_chat_id ||
              (value.telegram_chat_id as string).length > 128))
        )
          throw new Error('INVALID_BODY')
        const existing = await storage.license.findUnique({
          where: { id: params.id }
        })
        if (!existing) return notFound(guard.id)
        const expiresAt =
          value.expires_at === undefined
            ? existing.expiresAt
            : new Date(value.expires_at as string)
        if (
          Number.isNaN(expiresAt.valueOf()) ||
          ((value.status ?? existing.status) === 'ACTIVE' &&
            expiresAt <= new Date())
        )
          throw new Error('INVALID_BODY')
        const data: Prisma.LicenseUpdateInput = {
          ...(typeof value.allowed_domain === 'string'
            ? { allowedDomain: normalizeDomain(value.allowed_domain) }
            : {}),
          ...(typeof value.allowed_path === 'string'
            ? { allowedPath: normalizePath(value.allowed_path) }
            : {}),
          ...(typeof value.telegram_chat_id === 'string'
            ? { telegramChatId: value.telegram_chat_id }
            : {}),
          ...(typeof value.telegram_bot_token === 'string'
            ? { telegramBotTokenHash: tokenHash(value.telegram_bot_token) }
            : {}),
          ...(value.status === 'ACTIVE' || value.status === 'SUSPENDED'
            ? { status: value.status as 'ACTIVE' | 'SUSPENDED' }
            : value.status === undefined
              ? {}
              : (() => {
                  throw new Error('INVALID_BODY')
                })()),
          ...(value.expires_at === undefined ? {} : { expiresAt })
        }
        const license = await storage.license.update({
          where: { id: params.id },
          data
        })
        return serializeLicense(license)
      } catch (error) {
        return validationError(error)
          ? Response.json(
              apiError('VALIDATION_ERROR', 'Invalid license input.', guard.id),
              { status: 400 }
            )
          : unavailable(guard.id)
      }
    })
    .post('/admin/licenses/:id/extend', async ({ request, params }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      try {
        const value = await body(request, ['days'])
        if (
          !Number.isInteger(value.days) ||
          (value.days as number) < 1 ||
          (value.days as number) > 365
        )
          throw new Error('INVALID_BODY')
        const existing = await storage.license.findUnique({
          where: { id: params.id }
        })
        if (!existing) return notFound(guard.id)
        const license = await storage.license.update({
          where: { id: params.id },
          data: {
            expiresAt: calculateExtendedExpiry(
              existing.expiresAt,
              value.days as number
            )
          }
        })
        return serializeLicense(license)
      } catch (error) {
        return validationError(error)
          ? Response.json(
              apiError(
                'VALIDATION_ERROR',
                'Invalid extension input.',
                guard.id
              ),
              { status: 400 }
            )
          : unavailable(guard.id)
      }
    })
    .delete('/admin/licenses/:id', async ({ request, params }) => {
      const guard = await guarded(request)
      if ('response' in guard) return guard.response
      const license = await storage.license.findUnique({
        where: { id: params.id },
        select: { id: true }
      })
      if (!license) return notFound(guard.id)
      await storage.license.delete({ where: { id: params.id } })
      return new Response(null, { status: 204 })
    })
}
