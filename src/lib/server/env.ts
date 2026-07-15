import { validateEd25519KeyPair } from './crypto'

type Source = Record<string, string | undefined>

const requireValue = (source: Source, key: string) => {
  const value = source[key]?.trim()
  if (!value) throw new Error(`${key} is required.`)
  return value
}

export function readServerEnv(source: Source = process.env) {
  const production = source.NODE_ENV === 'production'
  const databaseUrl = requireValue(source, 'DATABASE_URL')
  const bindingSecret = requireValue(source, 'LICENSE_BINDING_SECRET')
  const authSecret = requireValue(source, 'BETTER_AUTH_SECRET')
  const adminEmail = requireValue(source, 'ADMIN_EMAIL')
  const signingPrivateKey = requireValue(source, 'LICENSE_SIGNING_PRIVATE_KEY')
  const signingPublicKey = requireValue(source, 'LICENSE_SIGNING_PUBLIC_KEY')

  if (bindingSecret.length < 32)
    throw new Error(
      'LICENSE_BINDING_SECRET must contain at least 32 characters.'
    )
  if (authSecret.length < 32)
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.')

  const redisUrl = source.KV_REST_API_URL ?? source.UPSTASH_REDIS_REST_URL
  const redisToken = source.KV_REST_API_TOKEN ?? source.UPSTASH_REDIS_REST_TOKEN

  if (production && (!redisUrl || !redisToken))
    throw new Error('Production Redis configuration is required.')
  validateEd25519KeyPair(signingPrivateKey, signingPublicKey)

  return {
    production,
    databaseUrl,
    authSecret,
    authUrl: requireValue(source, 'BETTER_AUTH_URL'),
    adminEmail,
    bindingSecret,
    signingPrivateKey,
    signingPublicKey,
    redisUrl,
    redisToken
  }
}
