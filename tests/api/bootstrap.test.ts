import { expect, test } from 'bun:test'
import { treaty } from '@elysia/eden'
import { app } from '../../src/lib/api/app'
import { fallback } from '../../src/routes/api/[...slugs]/+server'

test('mounts Elysia under /api', async () => {
  const api = treaty(app).api
  const { data, error, status } = await api.health.get()

  expect(error).toBeNull()
  expect(status).toBe(200)
  expect(data).toEqual({ status: 'BOOTSTRAPPED' })
})

test('bridges SvelteKit API requests with safe response headers', async () => {
  const response = await fallback({
    request: new Request('http://localhost/api/health')
  } as Parameters<typeof fallback>[0])

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ status: 'BOOTSTRAPPED' })
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
})
