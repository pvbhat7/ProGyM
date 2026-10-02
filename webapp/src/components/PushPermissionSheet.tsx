import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isTabDashboardMobile } from '../constants/tabDashboard'
import { enablePush, getPushStatus } from '../services/pushNotifications'
import type { PushStatus } from '../services/pushNotifications'

// Mandatory notification gate for members/trainers.
//
// Browsers only show the permission dialog from a user tap, so the member must
// tap "Allow notifications" — until then the app is covered by this screen.
//   'default'            → one big Allow button
//   'denied'             → browser won't ask again: show how to re-enable in
//                          settings + "Check again" (also re-checks on return)
//   'ios-needs-install'  → iPhone Safari can't push: Add-to-Home-Screen guide
//   'unsupported'        → let through — nothing the member could do
//   'granted'            → let through

function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat/i.test(navigator.userAgent)
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function ShareIcon() {
  return (
    <svg className="inline w-4 h-4 -mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0-12l-4 4m4-4l4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  )
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-5 space-y-3 rounded-2xl bg-orange-50 p-4 text-sm text-gray-700 text-left">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

export default function PushPermissionSheet() {
  const { user, logout } = useAuth()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState(false)

  const isMember = !!user && (user.role === 'member' || user.role === 'trainer') && !isTabDashboardMobile(user.mobile)

  // Initial check + re-check whenever the member comes back from Settings.
  const lastStatus = useRef<PushStatus | null>(null)
  useEffect(() => {
    if (!isMember) return
    const recheck = () => getPushStatus().then(s => {
      // Register the token when permission flips to granted in Settings
      // (on first load App's syncPushToken already handles it).
      if (s === 'granted' && lastStatus.current && lastStatus.current !== 'granted' && user) {
        enablePush(user.userId).catch(() => {})
      }
      lastStatus.current = s
      setStatus(s)
    }).catch(() => setStatus('unsupported'))
    recheck()
    document.addEventListener('visibilitychange', recheck)
    return () => document.removeEventListener('visibilitychange', recheck)
  }, [isMember, user])

  if (!isMember || status === null || status === 'granted' || status === 'unsupported') return null

  async function allow() {
    if (!user) return
    setBusy(true)
    const s = await enablePush(user.userId).catch(() => 'unsupported' as const)
    lastStatus.current = s
    setStatus(s)
    setBusy(false)
  }

  async function checkAgain() {
    setChecked(true)
    const s = await getPushStatus().catch(() => 'unsupported' as const)
    if (s === 'granted' && user) await enablePush(user.userId).catch(() => {})
    lastStatus.current = s
    setStatus(s)
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-orange-50 to-white">
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-orange-100 flex items-center justify-center text-4xl">🔔</div>
          <h2 className="mt-5 text-2xl font-bold text-gray-800">Turn on notifications</h2>
          <p className="mt-2 text-sm text-gray-500 leading-snug">
            ProGym sends holiday timings, batch changes, offers and ProCoin rewards as notifications.
            Please turn them on to continue.
          </p>

          {status === 'default' && (
            <button
              onClick={allow}
              disabled={busy}
              className="mt-7 w-full rounded-2xl bg-orange-600 py-4 text-base font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-700 disabled:opacity-60"
            >
              {busy ? 'Enabling…' : 'Allow notifications'}
            </button>
          )}

          {status === 'denied' && (
            <>
              <p className="mt-5 text-sm font-semibold text-red-600">Notifications are blocked for ProGym.</p>
              {isIos() ? (
                <Steps items={[
                  <>Open the iPhone <b>Settings</b> app</>,
                  <>Tap <b>Notifications</b> → <b>ProGym</b></>,
                  <>Turn on <b>Allow Notifications</b></>,
                  <>Come back here and tap <b>Check again</b></>,
                ]} />
              ) : (
                <Steps items={[
                  <>Tap the <b>🔒 lock</b> (or <b>⋮</b>) icon next to the website address</>,
                  <>Open <b>Permissions</b> / <b>Site settings</b> → <b>Notifications</b></>,
                  <>Choose <b>Allow</b></>,
                  <>Come back here and tap <b>Check again</b></>,
                ]} />
              )}
              <button
                onClick={checkAgain}
                className="mt-5 w-full rounded-2xl bg-orange-600 py-3.5 text-base font-bold text-white hover:bg-orange-700"
              >
                Check again
              </button>
              {checked && <p className="mt-2 text-xs text-gray-400">Still blocked — follow the steps above, then try again.</p>}
            </>
          )}

          {status === 'ios-needs-install' && (
            isInAppBrowser() ? (
              <div className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-gray-700 leading-snug">
                You're inside another app's browser. Tap <b>⋯</b> and choose <b>Open in Safari</b>, then follow the steps shown there.
              </div>
            ) : (
              <>
                <p className="mt-5 text-sm text-gray-600">On iPhone, notifications work only from the Home Screen app:</p>
                <Steps items={[
                  <>Tap the <b>Share</b> button <ShareIcon /> in Safari's toolbar</>,
                  <>Scroll down and tap <b>Add to Home Screen</b> ➕</>,
                  <>Open <b>ProGym</b> from your home screen and <b>log in again</b></>,
                  <>Tap <b>Allow notifications</b> when asked</>,
                ]} />
              </>
            )
          )}

          <button onClick={logout} className="mt-6 text-sm font-medium text-gray-400 hover:text-gray-600">
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
