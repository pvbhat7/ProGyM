import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../api/config'
import TeamFlag from './TeamFlag'
import MatchPredictionModal from './MatchPredictionModal'

interface LiveEvent {
  espn_id: string
  match_id: number | null
  state: 'in' | 'pre' | 'post'
  description: string
  display_clock: string
  kickoff_at: string
  venue: string
  home_code: string
  home_name: string
  home_score: string
  home_logo: string
  away_code: string
  away_name: string
  away_score: string
  away_logo: string
}

interface LiveResponse {
  fetched_at: string
  cache_age_s: number | null
  live: LiveEvent[]
  recently_completed: LiveEvent[]
  upcoming_today: LiveEvent[]
}

interface Props {
  onLiveChange?: (count: number) => void
}

const POLL_MS = 30 * 1000

export default function LiveStrip({ onLiveChange }: Props) {
  const [data, setData] = useState<LiveResponse | null>(null)
  const [tick, setTick] = useState(0)
  const [openEvent, setOpenEvent] = useState<LiveEvent | null>(null)
  const inFlight = useRef(false)
  const lastCount = useRef<number>(-1)

  useEffect(() => {
    let cancelled = false

    function load() {
      if (inFlight.current) return
      inFlight.current = true
      fetch(`${API_BASE}/wc_live/getLive.php`)
        .then(r => r.ok ? r.json() : null)
        .then(j => { if (!cancelled && j) setData(j) })
        .catch(() => {})
        .finally(() => { inFlight.current = false })
    }

    load()
    const t = setInterval(() => { load(); setTick(n => n + 1) }, POLL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // Bubble the live count up to MatchesPage so it can compact "Next Match".
  useEffect(() => {
    const count = data?.live?.length ?? 0
    if (count !== lastCount.current) {
      lastCount.current = count
      onLiveChange?.(count)
    }
  }, [data, onLiveChange])

  // Keep the modal's live data fresh — whenever LiveStrip's polled data refreshes,
  // bump the open event to the latest values (same espn_id) so the score/minute
  // shown inside the modal updates without the user having to close & reopen.
  // NOTE: must come BEFORE any early return so the hook count is stable across renders.
  useEffect(() => {
    if (!openEvent || !data) return
    const latest = data.live.find(e => e.espn_id === openEvent.espn_id)
    if (latest && (
      latest.home_score    !== openEvent.home_score    ||
      latest.away_score    !== openEvent.away_score    ||
      latest.display_clock !== openEvent.display_clock ||
      latest.description   !== openEvent.description
    )) {
      setOpenEvent(latest)
    }
  }, [data, openEvent])

  void tick

  if (!data) return null
  const events = data.live
  if (events.length === 0) return null

  function open(ev: LiveEvent) {
    if (ev.match_id != null) setOpenEvent(ev)
  }

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <p className="text-[11px] font-black uppercase tracking-wider text-red-600 flex items-center gap-2">
          <span className="relative inline-flex w-2.5 h-2.5">
            <span className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-red-600" />
          </span>
          Live Now · {events.length} {events.length === 1 ? 'match' : 'matches'}
        </p>
        <p className="text-[10px] text-gray-400">via ESPN</p>
      </div>

      {openEvent && openEvent.match_id != null && (
        <MatchPredictionModal
          matchId={openEvent.match_id}
          teamACode={openEvent.home_code}
          teamAName={openEvent.home_name}
          teamBCode={openEvent.away_code}
          teamBName={openEvent.away_name}
          kickoffAt={openEvent.kickoff_at}
          liveEvent={openEvent}
          onClose={() => setOpenEvent(null)}
        />
      )}

      <div className="space-y-3">
        {events.map(ev => {
          const minute    = ev.display_clock || ev.description
          const clickable = ev.match_id != null
          return (
            <button
              key={ev.espn_id}
              type="button"
              onClick={() => open(ev)}
              disabled={!clickable}
              className={`w-full text-left relative bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 text-white rounded-2xl p-5 shadow-md shadow-slate-900/20 overflow-hidden ring-1 ring-white/5 ${
                clickable ? 'active:scale-[0.99] transition-transform cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-red-600 text-white px-2 py-0.5 rounded-sm inline-flex items-center gap-1.5">
                  <span className="relative inline-flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-white opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-white" />
                  </span>
                  LIVE
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-slate-300 tracking-wider">
                  {minute}
                </span>
              </div>

              <div className="relative flex items-center gap-2">
                <div className="flex-1 text-center min-w-0">
                  <div className="flex justify-center mb-2">
                    <TeamFlag code={ev.home_code} size={160} className="w-20 h-14 ring-1 ring-white/10 shadow" />
                  </div>
                  <p className="text-sm font-bold truncate text-white">{ev.home_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 tracking-wider">{ev.home_code}</p>
                </div>
                <div className="px-2 text-center">
                  <p className="text-5xl font-bold tabular-nums leading-none text-white">
                    {ev.home_score}<span className="text-slate-500 mx-2 font-light">–</span>{ev.away_score}
                  </p>
                </div>
                <div className="flex-1 text-center min-w-0">
                  <div className="flex justify-center mb-2">
                    <TeamFlag code={ev.away_code} size={160} className="w-20 h-14 ring-1 ring-white/10 shadow" />
                  </div>
                  <p className="text-sm font-bold truncate text-white">{ev.away_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 tracking-wider">{ev.away_code}</p>
                </div>
              </div>

              <div className="relative mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 truncate">
                  {ev.venue || 'World Cup 2026'}
                </div>
                {clickable && (
                  <div className="text-[11px] font-semibold text-slate-200">
                    See your prediction →
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
