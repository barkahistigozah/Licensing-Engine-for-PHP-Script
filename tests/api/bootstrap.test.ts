import { expect, test } from 'bun:test'
import { treaty } from '@elysia/eden'
import { app } from '../../src/lib/api/app'

test('mounts Elysia under /api', async () => {
  const api = treaty(app).api
  const { data, error, status } = await api.health.get()

  expect(error).toBeNull()
  expect(status).toBe(200)
  expect(data).toEqual({ status: 'BOOTSTRAPPED' })
})
