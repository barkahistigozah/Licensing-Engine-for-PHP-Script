import type { Handle } from '@sveltejs/kit'
import { building } from '$app/environment'
import { getAdminSession } from '$lib/server/auth'
import { readServerEnv } from '$lib/server/env'

export const handle: Handle = async ({ event, resolve }) => {
  if (process.env.NODE_ENV === 'production' && !building) readServerEnv()

  if (
    event.url.pathname.startsWith('/dashboard') ||
    event.url.pathname === '/login'
  ) {
    const authSession = await getAdminSession(event.request.headers)
    event.locals.session = authSession?.session ?? null
    event.locals.user = authSession?.user ?? null
  }

  const response = await resolve(event)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}
