import { useState, useEffect } from 'react'
import { checkDeviceStatus, requestDeviceAccess } from '../services/deviceAccess'
import type { DeviceStatus } from '../services/deviceAccess'

const DEVICE_CACHE_KEY = 'progym_device_approved'

function getCachedApproved(): boolean {
  try { return sessionStorage.getItem(DEVICE_CACHE_KEY) === '1' } catch { return false }
}
function setCachedApproved() {
  try { sessionStorage.setItem(DEVICE_CACHE_KEY, '1') } catch {}
}
function clearCachedApproved() {
  try { sessionStorage.removeItem(DEVICE_CACHE_KEY) } catch {}
}

interface Props {
  children: React.ReactNode
}

export default function DeviceAccessGate({ children }: Props) {
  const isCached = getCachedApproved()
  const [status, setStatus] = useState<DeviceStatus | 'loading' | 'requesting'>(
    isCached ? 'approved' : 'loading'
  )
  const [ticketId, setTicketId] = useState<string>('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    // Always check in background — catches revocations even when cache says approved.
    // If cached, no loader is shown; the page renders immediately and disappears only if revoked.
    checkDeviceStatus()
      .then(result => {
        if (result.status === 'approved') {
          setCachedApproved()
        } else {
          clearCachedApproved()
        }
        setStatus(result.status)
        if (result.ticket_id) setTicketId(result.ticket_id)
      })
      .catch(() => {
        // On network error: trust the cache if available, otherwise block
        if (!isCached) setStatus('not_found')
      })
  }, [])

  async function handleRequestAccess() {
    setSubmitError('')
    setStatus('requesting')
    try {
      const result = await requestDeviceAccess('')
      setStatus(result.status)
      if (result.ticket_id) setTicketId(result.ticket_id)
      if (result.status === 'approved') setCachedApproved()
    } catch {
      setStatus('not_found')
      setSubmitError('Network error. Please try again.')
    }
  }

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Checking device access...</p>
        </div>
      </div>
    )
  }

  if (status === 'approved') {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
            alt="ProGym"
            className="w-20 h-20 rounded-2xl object-cover shadow-2xl border border-white/10 mb-4"
          />
          <h1 className="text-white font-bold text-xl">ProGym</h1>
          <p className="text-white/40 text-xs mt-1">Gym Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-7 backdrop-blur-sm">

          {/* NOT FOUND — first visit, request access */}
          {(status === 'not_found' || status === 'requesting') && (
            <>
              <div className="flex items-center justify-center w-14 h-14 bg-orange-500/20 rounded-2xl mx-auto mb-5">
                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7m0 0a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold text-lg text-center mb-1">Device Access Required</h2>
              <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
                This page is restricted to authorized devices. Request access and wait for admin approval.
              </p>

              {submitError && (
                <p className="text-red-400 text-xs text-center mb-4">{submitError}</p>
              )}

              <button
                onClick={handleRequestAccess}
                disabled={status === 'requesting'}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20"
              >
                {status === 'requesting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending Request...
                  </span>
                ) : 'Request Access'}
              </button>
            </>
          )}

          {/* PENDING */}
          {status === 'pending' && (
            <>
              <div className="flex items-center justify-center w-14 h-14 bg-amber-500/20 rounded-2xl mx-auto mb-5">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold text-lg text-center mb-1">Request Pending</h2>
              <p className="text-white/50 text-sm text-center leading-relaxed">
                Your access request has been sent to the admin. Please wait for approval.
              </p>
              {ticketId && (
                <div className="mt-5 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Ticket ID</p>
                  <p className="text-white font-mono font-bold text-3xl tracking-widest">#{ticketId}</p>
                  <p className="text-white/30 text-xs mt-1">Share this with your admin</p>
                </div>
              )}
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-amber-400/80 text-xs text-center">
                  Refresh this page to check your latest approval status.
                </p>
              </div>
            </>
          )}

          {/* REJECTED */}
          {status === 'rejected' && (
            <>
              <div className="flex items-center justify-center w-14 h-14 bg-red-500/20 rounded-2xl mx-auto mb-5">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              {isCached ? (
                <>
                  <h2 className="text-white font-semibold text-lg text-center mb-1">Access Revoked</h2>
                  <p className="text-white/50 text-sm text-center leading-relaxed">
                    Your device access has been revoked by the admin.
                  </p>
                  <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-red-400/80 text-xs text-center">
                      Contact your gym admin to restore access.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-white font-semibold text-lg text-center mb-1">Device Unauthorized</h2>
                  <p className="text-white/50 text-sm text-center leading-relaxed">
                    Your access request was rejected by the admin. This device is not authorized to view this page.
                  </p>
                  <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-red-400/80 text-xs text-center">
                      Contact your gym admin if you believe this is a mistake.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
