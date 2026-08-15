import { API_BASE } from '../api/config'

// Contract mirrors the license server's signed payload plus vendor contact info.
export interface LicenseContact {
  name: string
  phone: string
  email: string
}

export type GymFeatureKey =
  | 'members' | 'attendance' | 'admissions' | 'birthdays'
  | 'packages' | 'diet_plans' | 'workouts' | 'weight' | 'before_after' | 'photo_review'
  | 'collection' | 'procoins' | 'reminders' | 'communications'
  | 'roles' | 'referrals' | 'approved_devices'
  | 'worldcup_matches' | 'worldcup_leaderboard' | 'worldcup_banners'

export type LicenseFeatures = Partial<Record<GymFeatureKey, boolean>>

export interface LicensePayload {
  status: 'active' | 'grace' | 'locked'
  reason?: string | null
  source?: string | null
  expiry?: string | null
  grace_until?: string | null
  features?: LicenseFeatures
  contact: LicenseContact
  cached_at?: string | null
  fetch_error?: string | null
}

// Poll response envelope from /api/license/status.php
export interface LicenseStatusResponse {
  ok: boolean
  license: LicensePayload
}

// History proxy response (unsigned; informational only)
export interface LicenseHistoryPayment {
  amount: number
  paid_on: string
  period_start: string
  period_end: string
  method: string
  reference_note: string | null
}
export interface LicenseHistoryResponse {
  ok: boolean
  client_code: string
  shop_name: string
  plan_amount: number
  billing_day: number
  grace_days: number
  current_period_start: string
  current_period_end: string
  created_at: string
  totals: {
    payment_count: number
    total_paid: number
    first_paid_on: string | null
    last_paid_on: string | null
  }
  payments: LicenseHistoryPayment[]
}

export async function fetchLicenseStatus(): Promise<LicensePayload> {
  const res = await fetch(`${API_BASE}/license/status.php`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`status fetch failed (HTTP ${res.status})`)
  const data: LicenseStatusResponse = await res.json()
  return data.license
}

export async function forceRefreshLicense(): Promise<LicensePayload> {
  const res = await fetch(`${API_BASE}/license/refresh.php`, { method: 'POST' })
  if (!res.ok) throw new Error(`refresh failed (HTTP ${res.status})`)
  const data: LicenseStatusResponse = await res.json()
  return data.license
}

export async function fetchLicenseHistory(): Promise<LicenseHistoryResponse> {
  const res = await fetch(`${API_BASE}/license/history.php`)
  if (!res.ok) throw new Error(`history fetch failed (HTTP ${res.status})`)
  return res.json()
}
