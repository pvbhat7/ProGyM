import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchLicenseStatus, forceRefreshLicense, type LicensePayload } from '../services/license'

export type LicenseStatus = 'active' | 'grace' | 'locked' | 'loading' | 'unknown'

interface LicenseState {
  status: LicenseStatus
  data: LicensePayload | null
  lastCheckedAt: number | null
}

interface LicenseCtx {
  state: LicenseState
  refresh: (opts?: { force?: boolean }) => Promise<void>
}

const Ctx = createContext<LicenseCtx | null>(null)

// Poll every 10 s in both states so admin lock/unlock propagates within ~10 s.
// status.php force-refreshes on the server so each poll = one fresh signed
// check against the license server. Cheap at 1-N gym installs.
const POLL_MS = 10 * 1000

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>({
    status: 'loading',
    data: null,
    lastCheckedAt: null,
  })
  const pollTimer = useRef<number | null>(null)
  const prevStatus = useRef<LicenseStatus | null>(null)

  // On locked → active/grace transition, hard-reload so any components that
  // cached HTTP 423 errors during the lock period refetch cleanly.
  useEffect(() => {
    if (prevStatus.current === 'locked' && (state.status === 'active' || state.status === 'grace')) {
      window.location.reload()
    }
    prevStatus.current = state.status
  }, [state.status])

  const refresh = useCallback(async (opts?: { force?: boolean }) => {
    try {
      const lic = opts?.force ? await forceRefreshLicense() : await fetchLicenseStatus()
      const status: LicenseStatus =
        lic.status === 'active' || lic.status === 'grace' || lic.status === 'locked'
          ? lic.status
          : 'unknown'
      setState({ status, data: lic, lastCheckedAt: Date.now() })
    } catch (err) {
      // Fail-closed on the client: if we can't reach status.php at all, show
      // the lock overlay. Server-side already fails open on gate errors so
      // any real 500 here is a genuine connectivity problem.
      setState({
        status: 'locked',
        data: {
          status: 'locked',
          reason: 'status_endpoint_error',
          contact: { name: 'Support', phone: '', email: '' },
          fetch_error: err instanceof Error ? err.message : String(err),
        },
        lastCheckedAt: Date.now(),
      })
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current)
    }
    pollTimer.current = window.setInterval(() => { void refresh() }, POLL_MS)
    return () => {
      if (pollTimer.current !== null) {
        window.clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [refresh])

  return <Ctx.Provider value={{ state, refresh }}>{children}</Ctx.Provider>
}

export function useLicense(): LicenseCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useLicense must be used inside <LicenseProvider>')
  return c
}
