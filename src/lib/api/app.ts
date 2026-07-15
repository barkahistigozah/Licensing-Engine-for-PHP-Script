import { Elysia } from 'elysia'
import { authApi } from './auth'
import { healthApi } from './health'
import { verifyApi } from './verify'
import { adminApi } from './admin-live'

export const app = new Elysia({ prefix: '/api' })
  .use(authApi)
  .use(healthApi)
  .use(verifyApi)
  .use(adminApi)

export type App = typeof app
