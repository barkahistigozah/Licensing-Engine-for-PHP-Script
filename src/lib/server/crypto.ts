import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual
} from 'node:crypto'

const hmac = (secret: string, purpose: string, value: string) =>
  createHmac('sha256', secret)
    .update(`${purpose}${value}`, 'utf8')
    .digest('base64url')

export const hashTelegramToken = (secret: string, token: string) =>
  hmac(secret, 'telegram-token:v1:', token)

export const fingerprintLicenseKey = (secret: string, key: string) =>
  Buffer.from(hmac(secret, 'license-key-fingerprint:v1:', key), 'base64url')
    .subarray(0, 16)
    .toString('base64url')

export const safeHashEqual = (left: string, right: string) => {
  const a = Buffer.from(left, 'base64url')
  const b = Buffer.from(right, 'base64url')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function buildSignedPayload(value: Record<string, string | number>) {
  const bytes = Buffer.from(JSON.stringify(value), 'utf8')
  return { bytes, encoded: bytes.toString('base64url') }
}

export function signPayload(privateKeyBase64: string, payload: Uint8Array) {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8'
  })
  return sign(null, payload, key).toString('base64url')
}

export function validateEd25519KeyPair(
  privateKeyBase64: string,
  publicKeyBase64: string
) {
  try {
    const privateKey = createPrivateKey({
      key: Buffer.from(privateKeyBase64, 'base64'),
      format: 'der',
      type: 'pkcs8'
    })
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki'
    })
    if (
      privateKey.asymmetricKeyType !== 'ed25519' ||
      publicKey.asymmetricKeyType !== 'ed25519'
    )
      throw new Error('wrong key type')
    const derived = createPublicKey(privateKey).export({
      format: 'der',
      type: 'spki'
    })
    const configured = publicKey.export({ format: 'der', type: 'spki' })
    if (
      derived.length !== configured.length ||
      !timingSafeEqual(derived, configured)
    )
      throw new Error('mismatched key pair')
  } catch {
    throw new Error('LICENSE_SIGNING_KEY_PAIR is invalid.')
  }
}
