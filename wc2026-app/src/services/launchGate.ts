import { useEffect, useState } from 'react'
import { API_BASE } from '../api/config'
import { getSession } from './wcSession'

export interface LaunchGateState {
  loading: boolean
  isLive: boolean          // no gate OR gate has passed OR current user is admin-bypass
  isAdminBypass: boolean
  launchAtMs: number | null
  launchAtLabel: string    // e.g. "20 Jun · 6:00 PM"
}

let cached: { features: Record<string, unknown>; fetchedAt: number } | null = null

export async function fetchFeatures(): Promise<Record<string, unknown>> {
  if (cached && Date.now() - cached.fetchedAt < 60_000) return cached.features
  const res = await fetch(`${API_BASE}/features/get.php`)
  const d = await res.json()
  cached = { features: d, fetchedAt: Date.now() }
  return d
}

export function parseIstToMs(s: string): number | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+05:30`
  const ms = Date.parse(iso)
  return isNaN(ms) ? null : ms
}

function formatLaunchLabel(ms: number): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Calcutta',
    day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }
  return new Intl.DateTimeFormat('en-IN', opts).format(new Date(ms)).replace(', ', ' · ')
}

export function useLaunchGate(): LaunchGateState {
  const [state, setState] = useState<LaunchGateState>({
    loading: true,
    isLive: true,
    isAdminBypass: false,
    launchAtMs: null,
    launchAtLabel: '',
  })

  useEffect(() => {
    let cancelled = false
    fetchFeatures()
      .then(d => {
        if (cancelled) return
        const launchStr = typeof d.predictions_launch_at === 'string' ? d.predictions_launch_at.trim() : ''
        const adminStr  = typeof d.predictions_admin_client_ids === 'string' ? d.predictions_admin_client_ids : ''
        const adminIds  = adminStr.split(/[\s,]+/).map(s => parseInt(s, 10)).filter(n => n > 0)
        const session   = getSession()
        const isAdminBypass = !!session && adminIds.includes(session.clientId)
        const ms = launchStr ? parseIstToMs(launchStr) : null
        const launchPassed = ms == null || Date.now() >= ms
        setState({
          loading: false,
          isLive: launchPassed || isAdminBypass,
          isAdminBypass,
          launchAtMs: ms,
          launchAtLabel: ms ? formatLaunchLabel(ms) : '',
        })
      })
      .catch(() => {
        // Fail open on network error — don't block users on a transient API failure.
        if (!cancelled) setState(s => ({ ...s, loading: false, isLive: true }))
      })
    return () => { cancelled = true }
  }, [])

  // Auto-flip to live the moment the countdown hits zero.
  useEffect(() => {
    if (state.isLive || state.launchAtMs == null) return
    const delay = state.launchAtMs - Date.now()
    if (delay <= 0) {
      setState(s => ({ ...s, isLive: true }))
      return
    }
    const t = setTimeout(() => setState(s => ({ ...s, isLive: true })), delay + 500)
    return () => clearTimeout(t)
  }, [state.isLive, state.launchAtMs])

  return state
}

export function launchToastMessage(label: string): string {
  return label
    ? `Predictions go live on ${label}. Sit tight!`
    : `Predictions are not open yet. Please check back soon.`
}
