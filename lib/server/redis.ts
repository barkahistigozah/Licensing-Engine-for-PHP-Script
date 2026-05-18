type RedisResult<T> = {
  result?: T;
  error?: string;
};

const fallbackBuckets = new Map<string, { count: number; resetAt: number }>();

function redisConfig() {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return {
    url,
    token,
  };
}

async function redisCommand<T>(command: unknown[]) {
  const config = redisConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis command failed with ${response.status}`);
  }

  const data = (await response.json()) as RedisResult<T>;

  if (data.error) {
    throw new Error(data.error);
  }

  return data.result ?? null;
}

export async function getCache<T>(key: string) {
  try {
    const value = await redisCommand<string>(["GET", key]);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number) {
  try {
    await redisCommand(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
  } catch {
    // Redis is an acceleration layer; database truth should continue to work.
  }
}

export async function deleteCache(key: string) {
  try {
    await redisCommand(["DEL", key]);
  } catch {
    // Purge failures should not break admin mutations in local/dev mode.
  }
}

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const redisKey = `rl:${key}`;

  try {
    const count = Number(await redisCommand<number>(["INCR", redisKey]));

    if (count === 1) {
      await redisCommand(["EXPIRE", redisKey, windowSeconds]);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(limit - count, 0),
    };
  } catch {
    const now = Date.now();
    const existing = fallbackBuckets.get(redisKey);

    if (!existing || existing.resetAt <= now) {
      fallbackBuckets.set(redisKey, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });

      return {
        allowed: true,
        remaining: limit - 1,
      };
    }

    existing.count += 1;

    return {
      allowed: existing.count <= limit,
      remaining: Math.max(limit - existing.count, 0),
    };
  }
}
