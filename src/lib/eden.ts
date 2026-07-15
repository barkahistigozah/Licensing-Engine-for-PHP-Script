import { treaty } from '@elysia/eden'
import { app } from '$lib/api/app'

export const getServerApi = (headers: Headers) =>
  treaty(app, { headers: Object.fromEntries(headers.entries()) }).api
