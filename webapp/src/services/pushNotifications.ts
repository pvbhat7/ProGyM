// Browser push notifications for members (admin broadcasts).
//
// Flow:
//   1. Member taps "Turn on" → enablePush(clientId)
//   2. We register the push-only service worker (scope "<base>push/"),
//      ask for permission (browser's own dialog — needs a user tap),
//      fetch the FCM token and POST it to /push/registerToken.php.
//   3. On every later app load, syncPushToken(clientId) silently refreshes the
//      token if permission is already granted (tokens can rotate, and this
//      re-binds a shared device to whoever is logged in now).
//   4. On logout, disablePush(clientId) deactivates the token server-side.

import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging'
import app from '../firebase'
import { API_BASE } from '../api/config'

// Same Web Push certificate (VAPID) as wc2026 — both apps use the progym-web Firebase project.
const VAPID_KEY = 'BLkO6YNZvTN9uFTBcrI1SBYMLrrJWCVbudsYBbz0mBCcFGDGenaLgGbh6K5xuRQ6KXJzbBLEmSTCuO8OEySxP5E'
const SW_SCOPE = `${import.meta.env.BASE_URL}push/`
// Bump ?v= whenever the worker changes — the Hostinger CDN caches .js for 7 days.
const SW_URL = `${SW_SCOPE}firebase-messaging-sw.js?v=3`
const LS_TOKEN_KEY = 'progym_push_token_v1'

export type PushStatus =
  | 'unsupported'        // browser can't do web push
  | 'ios-needs-install'  // iPhone/iPad Safari: only works after "Add to Home Screen"
  | 'default'            // not asked yet
  | 'denied'             // user blocked notifications
  | 'granted'

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export async function getPushStatus(): Promise<PushStatus> {
  const basicSupport = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window
  if (!basicSupport) return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported'
  if (!(await isSupported().catch(() => false))) return 'unsupported'
  return Notification.permission as PushStatus
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // register() is idempotent; with a new SW_URL it swaps in the new worker.
  // No page navigates inside push/, so also ask for an explicit update check.
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
  reg.update().catch(() => {})
  // A fresh registration isn't active yet — pushManager.subscribe() would fail.
  const pending = reg.installing ?? reg.waiting
  if (!reg.active && pending) {
    await new Promise<void>(resolve => {
      pending.addEventListener('statechange', () => { if (pending.state === 'activated') resolve() })
    })
  }
  return reg
}

async function fetchAndRegisterToken(clientId: number): Promise<boolean> {
  const swReg = await getRegistration()
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  })
  if (!token) return false

  const res = await fetch(`${API_BASE}/push/registerToken.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, token, userAgent: navigator.userAgent.slice(0, 240) }),
  })
  if (!res.ok) return false
  localStorage.setItem(LS_TOKEN_KEY, token)
  return true
}

/** Ask permission (must be called from a click/tap) and register this device. */
export async function enablePush(clientId: number): Promise<PushStatus> {
  const status = await getPushStatus()
  if (status === 'unsupported' || status === 'ios-needs-install' || status === 'denied') return status

  const perm = status === 'granted' ? 'granted' : await Notification.requestPermission()
  if (perm !== 'granted') return perm as PushStatus

  await fetchAndRegisterToken(clientId)
  return 'granted'
}

/** Silent refresh on app load — never prompts. */
export async function syncPushToken(clientId: number): Promise<void> {
  if (clientId <= 0) return
  try {
    if ((await getPushStatus()) !== 'granted') return
    await fetchAndRegisterToken(clientId)
  } catch { /* best effort */ }
}

/** Called on logout so the next person on this device doesn't get our pushes. */
export async function disablePush(clientId: number): Promise<void> {
  const token = localStorage.getItem(LS_TOKEN_KEY)
  if (!token || clientId <= 0) return
  localStorage.removeItem(LS_TOKEN_KEY)
  await fetch(`${API_BASE}/push/unregisterToken.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, token }),
  }).catch(() => {})
  try { await deleteToken(getMessaging(app)) } catch { /* ignore */ }
}

export const PUSH_RECEIVED_EVENT = 'progym:push-received'

/**
 * Messages from the push service worker:
 *   progym-push      → a notification arrived; NotificationBell refetches.
 *   progym-navigate  → user clicked a notification while this tab was open.
 */
export function installPushMessageListener(): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  const onMessage = (e: MessageEvent) => {
    const msg = e.data as { type?: string; url?: string } | null
    if (msg?.type === 'progym-push') {
      window.dispatchEvent(new CustomEvent(PUSH_RECEIVED_EVENT))
    } else if (msg?.type === 'progym-navigate' && msg.url) {
      if (msg.url !== window.location.href) window.location.assign(msg.url)
    }
  }
  navigator.serviceWorker.addEventListener('message', onMessage)
  return () => navigator.serviceWorker.removeEventListener('message', onMessage)
}
