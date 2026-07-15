import { Elysia } from 'elysia'
import { auth } from '$lib/server/auth'
import { readServerEnv } from '$lib/server/env'

const unavailable = () =>
  new Response(JSON.stringify({ code: 'AUTH_UNAVAILABLE' }), {
    status: 503,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8'
    }
  })

export const authApi = new Elysia().all('/auth/*', async ({ request, set }) => {
  if (request.method !== 'GET' && request.method !== 'POST') {
    set.status = 405
    return { code: 'METHOD_NOT_ALLOWED' }
  }

  if (process.env.NODE_ENV === 'production') readServerEnv()

  try {
    const response = await auth.handler(request)
    return response.status >= 500 ? unavailable() : response
  } catch {
    return unavailable()
  }
})
