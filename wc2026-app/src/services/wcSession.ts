// Tiny localStorage-based session for the World Cup mini-app.
// Independent of the main ProGym admin/member auth.

const STORAGE_KEY = 'wc_session_v1'

export interface WcSession {
  clientId: number
  name: string
  mobile: string
  joinedAt: number
}

export function getSession(): WcSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.clientId !== 'number' || parsed.clientId <= 0) return null
    return parsed as WcSession
  } catch {
    return null
  }
}

export function setSession(s: WcSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
