export type RateLimitResult =
  | { state: 'ok'; allowed: boolean; remaining: number }
  | { state: 'unavailable' }

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

type RedisOptions = {
  url?: string
  token?: string
  fetcher?: Fetcher
  production?: boolean
}

const localLimits = new Map<string, { count: number; expiresAt: number }>()
const RATE_LIMIT_SCRIPT =
  "local count=redis.call('INCR',KEYS[1]); if count==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return count"

export function createRedisClient({
  url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
  fetcher = fetch,
  production = process.env.NODE_ENV === 'production'
}: RedisOptions = {}) {
  const command = async (...parts: string[]) => {
    if (!url || !token) return { available: false as const }
    try {
      const response = await fetcher(
        `${url.replace(/\/$/, '')}/${parts.map(encodeURIComponent).join('/')}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000)
        }
      )
      if (!response.ok) return { available: false as const }
      return {
        available: true as const,
        result: (await response.json()).result
      }
    } catch {
      return { available: false as const }
    }
  }

  return {
    async rateLimit(
      key: string,
      limit: number,
      windowSeconds: number
    ): Promise<RateLimitResult> {
      if (!url || !token) {
        if (production) return { state: 'unavailable' }
        const now = Date.now()
        for (const [localKey, entry] of localLimits) {
          if (entry.expiresAt <= now) localLimits.delete(localKey)
        }
        // ponytail: process-local fallback is development only; Redis owns production rate limiting.
        if (localLimits.size >= 10_000)
          localLimits.delete(localLimits.keys().next().value!)
        const current = localLimits.get(key)
        const entry =
          !current || current.expiresAt <= now
            ? { count: 0, expiresAt: now + windowSeconds * 1000 }
            : current
        entry.count += 1
        localLimits.set(key, entry)
        return {
          state: 'ok',
          allowed: entry.count <= limit,
          remaining: Math.max(0, limit - entry.count)
        }
      }
      const response = await command(
        'EVAL',
        RATE_LIMIT_SCRIPT,
        '1',
        key,
        String(windowSeconds)
      )
      if (!response.available || typeof response.result !== 'number')
        return { state: 'unavailable' }
      const count = response.result
      return {
        state: 'ok',
        allowed: count <= limit,
        remaining: Math.max(0, limit - count)
      }
    },
    async pingRedis() {
      const response = await command('PING')
      return response.available && response.result === 'PONG'
    }
  }
}
