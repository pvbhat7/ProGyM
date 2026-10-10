import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLicense } from '../context/LicenseContext'
import { useAuth } from '../context/AuthContext'
import { isTabDashboardMobile } from '../constants/tabDashboard'

export const VENDOR_NAME = 'Tavros Tech Software Solutions'
export const RENEW_URL   = 'https://tavrostechinfo.com/portal/login'

/**
 * Persistent status banner shown when license is not active — ADMIN ONLY.
 *
 * Behaviour (admin):
 *   - active           → nothing
 *   - grace            → amber banner (payment overdue, will lock soon) + Renew button
 *   - locked / unknown → red banner (read-only mode; writes will be rejected
 *                        by the backend with HTTP 423) + Renew button
 *
 * Gym members, trainers, the tab dashboard and public visitors never see the
 * subscription state. If they try to save something while locked, they get a
 * neutral "server is busy" popup instead.
 *
 * The banner is `fixed top-0`, so we measure its height with a ResizeObserver
 * and push the app content down by exactly that much — no content is hidden
 * underneath, regardless of text wrapping on smaller screens.
 */
export function LicenseLockOverlay({ children }: { children: ReactNode }) {
  const { state, refresh } = useLicense()
  const { user } = useAuth()
  const [retrying, setRetrying] = useState(false)

  const isAdmin  = user?.role === 'admin' && !isTabDashboardMobile(user.mobile)
  const isLocked = state.status === 'locked' || state.status === 'unknown'
  const isGrace  = state.status === 'grace'
  const showBanner = isAdmin && (isLocked || isGrace)

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

  // Blocked-action popup — fires on HTTP 423 responses (see api/config.ts).
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const handler = () => setBlocked(true)
    window.addEventListener('license:write-blocked', handler)
    return () => window.removeEventListener('license:write-blocked', handler)
  }, [])
  useEffect(() => {
    if (!blocked) return
    const id = window.setTimeout(() => setBlocked(false), isAdmin ? 6000 : 4000)
    return () => window.clearTimeout(id)
  }, [blocked, isAdmin])

  const handleRetry = async () => {
    setRetrying(true)
    try { await refresh({ force: true }) }
    finally { setRetrying(false) }
  }

  const lic = state.data
  const phone = lic?.contact?.phone ?? ''

  const renewBtn = (cls: string) => (
    <a href={RENEW_URL} target="_blank" rel="noopener noreferrer"
      className={`shrink-0 px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap ${cls}`}>
      Renew subscription →
    </a>
  )

  return (
    <>
      <div style={{ paddingTop: showBanner ? bannerH : 0 }}>
        {children}
      </div>

      {showBanner && isGrace ? (
        <div ref={bannerRef} className="fixed top-0 inset-x-0 z-[9998] bg-amber-500 text-white shadow-md">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm text-center">
            <span>
              Subscription payment is overdue. Please contact <strong>{VENDOR_NAME}</strong>
              {phone ? <> at <a href={`tel:${phone}`} className="font-bold underline">{phone}</a></> : null} to renew
              before {lic?.grace_until ?? 'shortly'} — the app will move to read-only after that.
            </span>
            {renewBtn('bg-white text-amber-700 hover:bg-amber-50')}
          </div>
        </div>
      ) : null}

      {showBanner && isLocked ? (
        <div ref={bannerRef} className="fixed top-0 inset-x-0 z-[9998] bg-red-600 text-white shadow-md" role="alert" aria-live="polite">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                className="shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                <strong>Read-only mode.</strong> Subscription expired — contact <strong>{VENDOR_NAME}</strong>
                {phone ? <> at <a href={`tel:${phone}`} className="underline font-semibold">{phone}</a></> : null} to renew.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {renewBtn('bg-white text-red-700 hover:bg-red-50')}
              <button
                type="button" onClick={handleRetry} disabled={retrying}
                className="shrink-0 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold disabled:opacity-60">
                {retrying ? 'Checking…' : 'Try again'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {blocked ? (
        <div
          role="alert" aria-live="assertive"
          className="fixed right-4 left-4 sm:left-auto z-[9999] sm:max-w-sm bg-white rounded-lg shadow-lg border border-red-200 overflow-hidden"
          style={{ top: 'calc(var(--license-banner-h, 0px) + 1rem)' }}
        >
          <div className="flex items-start gap-3 p-3 pr-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 text-base">
              {isAdmin ? '🔒' : '⚠️'}
            </div>
            <div className="flex-1 min-w-0">
              {isAdmin ? (
                <>
                  <p className="text-sm font-semibold text-slate-900">Cannot save — subscription expired</p>
                  <a href={RENEW_URL} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-red-600 hover:text-red-700 font-medium underline">
                    Renew subscription →
                  </a>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">Server issue</p>
                  <p className="text-xs text-slate-500 mt-0.5">We couldn't save this right now. Please try again after some time.</p>
                </>
              )}
            </div>
            <button
              type="button" onClick={() => setBlocked(false)} aria-label="Dismiss"
              className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
