import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLicense } from '../context/LicenseContext'

/**
 * Persistent status banner shown when license is not active.
 *
 * Behaviour:
 *   - active           → nothing
 *   - grace            → amber banner (payment overdue, will lock soon)
 *   - locked / unknown → red banner (read-only mode; writes will be rejected
 *                        by the backend with HTTP 423)
 *
 * The banner is `fixed top-0`, so we measure its height with a ResizeObserver
 * and push the app content down by exactly that much — no content is hidden
 * underneath, regardless of text wrapping on smaller screens.
 *
 * We deliberately do NOT block the whole UI. The owner should still be able
 * to view existing data, run reports, and reach the License page. Any write
 * attempt (create/update/delete/etc.) is refused by the API gate.
 */
export function LicenseLockOverlay({ children }: { children: ReactNode }) {
  const { state, refresh } = useLicense()
  const [retrying, setRetrying] = useState(false)

  const isLocked = state.status === 'locked' || state.status === 'unknown'
  const isGrace  = state.status === 'grace'
  const showBanner = isLocked || isGrace

  const bannerRef = useRef<HTMLDivElement>(null)
  const [bannerH, setBannerH] = useState(0)

  useEffect(() => {
    if (!showBanner || !bannerRef.current) { setBannerH(0); return }
    const el = bannerRef.current
    const update = () => setBannerH(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [showBanner, isLocked, isGrace])

  // Expose banner height as a CSS variable so any `fixed` / `sticky` chrome
  // in the layout can offset itself (`style={{ top: 'var(--license-banner-h)' }}`)
  // and stay out from under the banner.
  useEffect(() => {
    document.documentElement.style.setProperty('--license-banner-h', `${showBanner ? bannerH : 0}px`)
    return () => { document.documentElement.style.setProperty('--license-banner-h', '0px') }
  }, [showBanner, bannerH])

  // Blocked-action modal — fires on HTTP 423 responses (see api/config.ts).
  // Auto-dismisses so the user isn't stuck if the modal is annoying, but
  // stays long enough (7s) to actually read the message and hit Renew.
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      setBlockedMsg(detail?.message ?? 'Subscription expired — this action requires an active subscription.')
    }
    window.addEventListener('license:write-blocked', handler as EventListener)
    return () => window.removeEventListener('license:write-blocked', handler as EventListener)
  }, [])
  useEffect(() => {
    if (!blockedMsg) return
    const id = window.setTimeout(() => setBlockedMsg(null), 3000)
    return () => window.clearTimeout(id)
  }, [blockedMsg])

  const handleRetry = async () => {
    setRetrying(true)
    try { await refresh({ force: true }) }
    finally { setRetrying(false) }
  }

  const lic = state.data
  const contact = lic?.contact ?? { name: 'Support', phone: '', email: '' }

  return (
    <>
      <div style={{ paddingTop: showBanner ? bannerH : 0 }}>
        {children}
      </div>

      {isGrace ? (
        <div
          ref={bannerRef}
          className="fixed top-0 inset-x-0 z-[9998] bg-amber-500 text-white text-sm text-center py-2 px-4 shadow-md"
        >
          Subscription payment is overdue. Please contact{' '}
          <strong>{contact.name}</strong>
          {contact.phone ? <> at <strong>{contact.phone}</strong></> : null} to renew
          before {lic?.grace_until ?? 'shortly'} — the app will move to read-only after that.
        </div>
      ) : null}

      {blockedMsg ? (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed right-4 z-[9999] max-w-sm bg-white rounded-lg shadow-lg border border-red-200 overflow-hidden"
          style={{ top: 'calc(var(--license-banner-h, 0px) + 1rem)' }}
        >
          <div className="flex items-start gap-3 p-3 pr-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Cannot save — subscription expired</p>
              <a
                href="https://tavrostechinfo.com/portal/login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 hover:text-red-700 font-medium underline"
              >
                Renew subscription →
              </a>
            </div>
            <button
              type="button"
              onClick={() => setBlockedMsg(null)}
              aria-label="Dismiss"
              className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      {isLocked ? (
        <div
          ref={bannerRef}
          className="fixed top-0 inset-x-0 z-[9998] bg-red-600 text-white shadow-md"
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                className="shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                <strong>Read-only mode.</strong>{' '}
                <a
                  href="https://tavrostechinfo.com/portal/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  Renew your subscription
                </a>
                {contact.phone ? (
                  <> or call <a href={`tel:${contact.phone}`} className="underline font-semibold">{contact.phone}</a></>
                ) : null}
                .
              </span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="shrink-0 px-3 py-1 rounded bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold disabled:opacity-60"
            >
              {retrying ? 'Checking…' : 'Try again'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

