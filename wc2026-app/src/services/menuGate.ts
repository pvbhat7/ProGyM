import { API_BASE } from '../api/config'

// Gating rule: if a client's regular-contest football points are <= threshold
// (from /config.json), hide Matches, My Picks, Ranking tabs — show only
// Bonanza + Profile. Freshly joined users (0 pts) are naturally gated in.
//
// Cache lives in module memory only (resets on every page load) so that
// tuning /config.json takes effect on the user's next refresh instead of
// being pinned to a stale sessionStorage entry. Fail-open on network error
// so we never lock out legitimate users.

interface GateState { ready: boolean; gated: boolean; points: number; threshold: number }

let state: GateState = { ready: false, gated: false, points: 0, threshold: 0 }
let inflight: Promise<GateState> | null = null
let loadedForClient = 0
const listeners = new Set<() => void>()

export function getMenuGate(): GateState {
  return state
}

export function subscribeMenuGate(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setState(next: GateState) {
  state = next
  listeners.forEach(fn => fn())
}

export async function loadMenuGate(clientId: number): Promise<GateState> {
  if (!clientId) return state
  if (loadedForClient === clientId && state.ready) return state
  if (inflight) return inflight

  loadedForClient = clientId
  inflight = (async () => {
    try {
      const cfgUrl = `${API_BASE}/wc_config/get.php?t=${Date.now()}`
      const [cfgRes, ptsRes] = await Promise.all([
        fetch(cfgUrl, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/wc_predictions/myPredictions.php?client_id=${clientId}`).then(r => r.ok ? r.json() : null),
      ])
      const threshold = Number(cfgRes?.menuGate?.minFootballPoints ?? 0)
      const points    = Number(ptsRes?.total_coins_earned ?? 0)
      const gated     = points <= threshold
      const next: GateState = { ready: true, gated, points, threshold }
      setState(next)
      return next
    } catch {
      const next: GateState = { ready: true, gated: false, points: 0, threshold: 0 }
      setState(next)
      return next
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export function clearMenuGate() {
  loadedForClient = 0
  setState({ ready: false, gated: false, points: 0, threshold: 0 })
}
