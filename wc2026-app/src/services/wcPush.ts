// Web push registration helpers.
//
// Flow on signup completion:
//   1. ensurePushPermissionAndRegister(clientId) is called from SignupPage
//      right after the user verifies OTP successfully.
//   2. We register the service worker, then call requestPermission().
//      Chrome shows its own native dialog — we cannot bypass it.
//   3. On grant: fetch the FCM token and POST it to /api/wc_fcm/registerToken.
//      Token is also cached to localStorage so we can later POST an
//      unregister call on logout.
//   4. On deny: silently no-op. The browser remembers the denial and won't
//      re-prompt; we just don't send pushes.
//
// All work happens in the background after the user is already navigating
// into /matches — no blocking UI from us.

import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'
import app from '../firebase'
import { API_BASE } from '../api/config'

const VAPID_KEY = 'BLkO6YNZvTN9uFTBcrI1SBYMLrrJWCVbudsYBbz0mBCcFGDGenaLgGbh6K5xuRQ6KXJzbBLEmSTCuO8OEySxP5E'
const SW_URL = '/wc2026/firebase-messaging-sw.js'
const SW_SCOPE = '/wc2026/'
const LS_TOKEN_KEY = 'wc_fcm_token_v1'

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  )
}

async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE)
  if (existing) return existing
  return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
}

export async function ensurePushPermissionAndRegister(clientId: number): Promise<void> {
  // Verbose diagnostic — leave these in for now so mobile debugging is easy.
  console.log('[wcPush] ensure() called, clientId=', clientId,
              'supported=', isSupported(),
              'NotifPerm=', typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
              'UA=', navigator.userAgent.slice(0, 80))

  if (!isSupported()) { console.warn('[wcPush] not supported on this browser'); return }
  if (clientId <= 0) return

  try {
    const swReg = await getOrRegisterServiceWorker()
    console.log('[wcPush] service worker ready, scope=', swReg.scope)

    let perm = Notification.permission
    if (perm === 'default') {
      console.log('[wcPush] requesting permission…')
      perm = await Notification.requestPermission()
      console.log('[wcPush] permission result=', perm)
    } else {
      console.log('[wcPush] permission already=', perm)
    }
    if (perm !== 'granted') return

    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })
    if (!token) { console.warn('[wcPush] getToken returned empty'); return }
    console.log('[wcPush] got token (first 12 chars)=', token.slice(0, 12), 'length=', token.length)

    localStorage.setItem(LS_TOKEN_KEY, token)

    const resp = await fetch(`${API_BASE}/wc_fcm/registerToken.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        token,
        user_agent: navigator.userAgent.slice(0, 240),
      }),
    }).catch(e => { console.warn('[wcPush] register POST failed:', e); return null })
    console.log('[wcPush] registerToken.php status=', resp?.status)

    onMessage(messaging, () => { /* foreground msg — Firebase doesn't show by default */ })
  } catch (e) {
    console.warn('[wcPush] register failed:', e)
  }
}

export async function unregisterPushForClient(clientId: number): Promise<void> {
  if (!isSupported()) return
  const token = localStorage.getItem(LS_TOKEN_KEY)
  if (!token || clientId <= 0) return

  try {
    await fetch(`${API_BASE}/wc_fcm/unregisterToken.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, token }),
    }).catch(() => {})
  } finally {
    try {
      const messaging = getMessaging(app)
      await deleteToken(messaging)
    } catch { /* ignore */ }
    localStorage.removeItem(LS_TOKEN_KEY)
  }
}
