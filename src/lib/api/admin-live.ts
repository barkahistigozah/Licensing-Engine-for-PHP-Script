import { createAdminApi } from './admin'
import { prisma } from '$lib/server/prisma'
import { readServerEnv } from '$lib/server/env'

export const adminApi = createAdminApi({
  db: prisma,
  bindingSecret: () => readServerEnv().bindingSecret,
  getAdmin: async (headers) =>
    (await import('$lib/server/auth')).getAdminSession(headers)
})
