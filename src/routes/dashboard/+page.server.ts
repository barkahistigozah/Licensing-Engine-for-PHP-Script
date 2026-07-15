import { error, redirect } from '@sveltejs/kit'
import { getServerApi } from '$lib/eden'
import type { PageServerLoad } from './$types'

type Stats = {
  active_licenses: number
  expiring_soon: number
  verification_total_24h: number
  verification_failed_24h: number
  recent_licenses: {
    id: string
    license_key: string
    allowed_domain: string
    status: string
  }[]
  recent_verifications: {
    id: string
    request_host: string
    request_path: string
    status_result: string
    created_at: string
  }[]
}

export const load: PageServerLoad = async ({ request }) => {
  const result = await getServerApi(request.headers).admin.stats.get()
  if (result.error?.status === 401) redirect(303, '/login')
  if (result.error || !result.data)
    error(503, { message: 'Data dashboard tidak tersedia.' })
  return { stats: result.data as unknown as Stats }
}
