import { app } from '$lib/api/app'
import type { RequestHandler } from './$types'

const API_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
}

export const fallback: RequestHandler = async ({ request }) => {
  const response = await app.handle(request)

  for (const [name, value] of Object.entries(API_HEADERS)) {
    response.headers.set(name, value)
  }

  return response
}
