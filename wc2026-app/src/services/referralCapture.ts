// Captures a `?ref=ABCDEF` URL param when the app first loads and stashes it
// in localStorage so it survives OTP / page reloads on the way to register.
// Cleared once a session is established (i.e. signup completed). Also exposes
// helpers used by the Signup screen and the Refer & Earn page.

const REF_KEY = 'wc2026_ref_code'

function normalize(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase()
}

function isPlausibleCode(code: string): boolean {
  // 6-char alphanumeric, alphabet excludes 0/O/1/I/L. Don't enforce that
  // strictly here — server is the source of truth — just rough sanity.
  return /^[A-Z0-9]{4,12}$/.test(code)
}

// Read ?ref=... from the current URL, persist it to localStorage if present,
// and then strip the param from the URL so reloads don't keep re-applying it.
export function captureRefFromUrl(): void {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    const raw = url.searchParams.get('ref')
    if (!raw) return
    const code = normalize(raw)
    if (!isPlausibleCode(code)) return
    localStorage.setItem(REF_KEY, code)
    url.searchParams.delete('ref')
    const newUrl = url.pathname + (url.search ? url.search : '') + url.hash
    window.history.replaceState({}, '', newUrl)
  } catch { /* ignore — bad URL or storage unavailable */ }
}

export function getStoredRefCode(): string | null {
  try {
    const v = localStorage.getItem(REF_KEY)
    if (!v) return null
    return normalize(v)
  } catch { return null }
}

export function clearStoredRefCode(): void {
  try { localStorage.removeItem(REF_KEY) } catch { /* ignore */ }
}
