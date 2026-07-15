import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

type Audit = {
  id: string
  license_key_fingerprint: string
  request_host: string
  request_path: string
  request_ip: string
  status_result: string
  created_at: string
}
type AuditPage = { items: Audit[]; page: number; total_pages: number }

export const load: PageServerLoad = async ({ fetch, url }) => {
  const params = new URLSearchParams()
  for (const key of ['page', 'status', 'domain', 'date_from', 'date_to']) {
    const value = url.searchParams.get(key)
    if (value) params.set(key, value)
  }
  const response = await fetch(`/api/admin/audit-logs?${params}`)
  if (!response.ok)
    error(response.status, { message: 'Audit log tidak tersedia.' })
  return {
    logs: (await response.json()) as AuditPage,
    filters: Object.fromEntries(params)
  }
}
