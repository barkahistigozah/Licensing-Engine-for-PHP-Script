import { randomUUID } from 'node:crypto'

const sensitive = /password|token|secret|private[_-]?key|authorization|cookie/i

export const requestId = () => `req_${randomUUID()}`

export const apiError = (
  errorCode: string,
  message: string,
  id = requestId()
) => ({
  error_code: errorCode,
  message,
  request_id: id
})

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitive.test(key) ? '[REDACTED]' : redact(item)
    ])
  )
}

export const logEvent = (event: Record<string, unknown>) =>
  console.error(JSON.stringify(redact(event)))
