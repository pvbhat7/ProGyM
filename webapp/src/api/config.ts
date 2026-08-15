export const API_BASE = import.meta.env.DEV
  ? '/progym-api'
  : 'https://tavrostechinfo.com/PROGYM/ggs/api'

export const MEDIA_BASE = import.meta.env.DEV
  ? '/progym-media'
  : 'https://tavrostechinfo.com/PROGYM/ggs'
export const ACTIVITY_KEY = 'progym_last_activity'

export function touchActivity(): void {
  localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
}

// Stamp last-activity timestamp for every call to our API (used by admin session timeout).
// Also intercept HTTP 423 responses — those are license-locked write attempts
// (Piece 4.5 read-only mode). Fire a global event so LicenseLockOverlay can
// surface a modal, otherwise the click silently fails in the network tab.
const _fetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input instanceof Request ? input.url
            : input instanceof URL    ? input.href
            : String(input)
  const isOurApi = url.startsWith(API_BASE)
  if (isOurApi) touchActivity()
  const res = await _fetch(input, init)
  if (isOurApi && res.status === 423) {
    // Clone so downstream consumers can still read the body.
    try {
      const data = await res.clone().json()
      const msg = typeof data?.message === 'string'
        ? data.message
        : 'Subscription expired — this action requires an active subscription.'
      window.dispatchEvent(new CustomEvent('license:write-blocked', { detail: { message: msg } }))
    } catch {
      window.dispatchEvent(new CustomEvent('license:write-blocked', {
        detail: { message: 'Subscription expired — this action requires an active subscription.' },
      }))
    }
  }
  return res
}
