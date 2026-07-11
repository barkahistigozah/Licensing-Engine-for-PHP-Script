import { Elysia } from 'elysia'

export const app = new Elysia({ prefix: '/api' }).get('/health', () => ({
  status: 'BOOTSTRAPPED' as const
}))

export type App = typeof app
