import { API_BASE } from '../api/config'

export interface AppControlStatus {
  locked: boolean
  locked_at: string | null
}

export async function fetchAppLockStatus(): Promise<AppControlStatus> {
  const res = await fetch(`${API_BASE}/appcontrol/get.php`, { cache: 'no-store' })
  if (!res.ok) throw new Error('status fetch failed')
  return res.json()
}

export interface VerifyResult {
  success: boolean
  token?: string
  locked?: boolean
}

export async function verifyPasscode(passcode: string): Promise<VerifyResult> {
  const res = await fetch(`${API_BASE}/appcontrol/verify.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode })
  })
  if (res.status === 401) return { success: false }
  if (!res.ok) throw new Error('verify failed')
  return res.json()
}

export async function toggleAppLock(token: string, locked: boolean): Promise<AppControlStatus> {
  const res = await fetch(`${API_BASE}/appcontrol/toggle.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, locked })
  })
  if (!res.ok) throw new Error('toggle failed')
  const data = await res.json()
  return { locked: data.locked, locked_at: data.locked_at }
}
