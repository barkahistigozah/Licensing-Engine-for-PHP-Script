import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

type License = {
  id: string
  license_key: string
  allowed_domain: string
  allowed_path: string
  telegram_chat_id: string
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
  expires_at: string
}
type LicensePage = { items: License[]; page: number; total_pages: number }

export const load: PageServerLoad = async ({ fetch, url }) => {
  const params = new URLSearchParams()
  for (const key of ['page', 'search', 'status']) {
    const value = url.searchParams.get(key)
    if (value) params.set(key, value)
  }
  const response = await fetch(`/api/admin/licenses?${params}`)
  if (!response.ok)
    error(response.status, { message: 'Daftar license tidak tersedia.' })
  return {
    licenses: (await response.json()) as LicensePage,
    filters: Object.fromEntries(params)
  }
}
