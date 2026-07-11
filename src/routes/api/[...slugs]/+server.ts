import { app } from '$lib/api/app'
import type { RequestHandler } from './$types'

export const fallback: RequestHandler = ({ request }) => app.handle(request)
