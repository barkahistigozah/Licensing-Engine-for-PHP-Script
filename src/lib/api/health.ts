import { Elysia } from 'elysia'
import { prisma } from '$lib/server/prisma'
import { createRedisClient } from '$lib/server/redis'
import { apiError, requestId } from '$lib/server/http'
import { readServerEnv } from '$lib/server/env'

export function createHealthApi({
  configReady = async () => {
    try {
      readServerEnv()
      return true
    } catch {
      return false
    }
  },
  databaseReady = async () => {
    await prisma.$queryRaw`SELECT 1`
    return true
  },
  redisReady = () => createRedisClient().pingRedis(),
  production = process.env.NODE_ENV === 'production'
}: {
  configReady?: () => Promise<boolean>
  databaseReady?: () => Promise<boolean>
  redisReady?: () => Promise<boolean>
  production?: boolean
} = {}) {
  return new Elysia().get('/health', async () => {
    const [config, database, redis] = await Promise.allSettled([
      configReady(),
      databaseReady(),
      redisReady()
    ])
    const configOk = config.status === 'fulfilled' && config.value
    const databaseOk = database.status === 'fulfilled' && database.value
    const redisOk = redis.status === 'fulfilled' && redis.value
    if (configOk && databaseOk && (redisOk || !production))
      return {
        status: 'READY',
        database: 'AVAILABLE',
        redis: redisOk ? 'AVAILABLE' : 'UNAVAILABLE'
      }
    const id = requestId()
    const errorCode = !configOk
      ? 'ERR_CONFIGURATION_UNAVAILABLE'
      : databaseOk
        ? 'ERR_REDIS_UNAVAILABLE'
        : 'ERR_DATABASE_CONNECTION_FAILED'
    const message = !configOk
      ? 'Required configuration is unavailable.'
      : databaseOk
        ? 'Redis connection failed.'
        : 'Database connection failed.'
    return new Response(JSON.stringify(apiError(errorCode, message, id)), {
      status: 503,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
        'x-request-id': id
      }
    })
  })
}

export const healthApi = createHealthApi()
