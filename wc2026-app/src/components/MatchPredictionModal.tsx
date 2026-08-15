import { useEffect, useState } from 'react'
import { API_BASE } from '../api/config'
import { getSession } from '../services/wcSession'
import TeamFlag from './TeamFlag'

interface LiveEvent {
  espn_id: string
  match_id: number | null
  description: string
  display_clock: string
  home_code: string
  home_name: string
  home_score: string
  away_code: string
  away_name: string
  away_score: string
}

interface Prediction {
  pred_winner: string | null
  pred_both_score: string | null
  pred_total_goals_range: string | null
  pred_motm_id: string | null
  pred_score_a: string | null
  pred_score_b: string | null
}

interface Player {
  id: string
  name: string
  jersey_number: string | null
}

interface Props {
  matchId: number
  teamACode: string
  teamAName: string
  teamBCode: string
  teamBName: string
  kickoffAt: string                  // "YYYY-MM-DD HH:MM:SS" (IST) from DB
  liveEvent?: LiveEvent | null       // optional — if caller already has live data
  onClose: () => void
}

// Parse "YYYY-MM-DD HH:MM:SS" as IST → UTC ms
function kickoffMsIst(dt: string): number | null {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):?(\d{2})?/)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - 5.5 * 3600 * 1000
}

function formatCountdown(diff: number): string {
  if (diff <= 0) return 'now'
  const s = Math.floor(diff / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function MatchPredictionModal({
  matchId, teamACode, teamAName, teamBCode, teamBName, kickoffAt, liveEvent, onClose,
}: Props) {
  const session = getSession()
  const [loading, setLoading]   = useState(true)
  const [pred, setPred]         = useState<Prediction | null>(null)
  const [motmName, setMotmName] = useState<string>('')
  const [now, setNow]           = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!session?.clientId) { setLoading(false); return }
    let cancelled = false
    fetch(`${API_BASE}/wc_predictions/forMatch.php?client_id=${session.clientId}&match_id=${matchId}`)
      .then(r => r.ok ? r.json() : null)
      .then(async (prRes) => {
        if (cancelled) return
        const p: Prediction | null = prRes?.prediction || null
        setPred(p)
        try {
          const mt = await fetch(`${API_BASE}/wc_matches/byId.php?id=${matchId}`).then(r => r.ok ? r.json() : null)
          if (!cancelled && mt) {
            if (p?.pred_motm_id && mt.team_a_id && mt.team_b_id) {
              const sq = await fetch(`${API_BASE}/wc_players/forMatch.php?team_a_id=${mt.team_a_id}&team_b_id=${mt.team_b_id}`).then(r => r.ok ? r.json() : null)
              if (!cancelled && sq) {
                const all: Player[] = [...(sq.team_a_players || []), ...(sq.team_b_players || [])]
                const found = all.find(pl => String(pl.id) === String(p.pred_motm_id))
                if (found) setMotmName(found.name)
              }
            }
          }
        } catch { /* fall back to "Picked" */ }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [matchId, session?.clientId])

  const kickoffMs = kickoffMsIst(kickoffAt)
  const kickoffPassed = kickoffMs !== null && now >= kickoffMs
  const isLive = !!liveEvent

  // Determine hero variant
  // - live → red with ESPN score/minute
  // - kickoff passed, no live → "match in progress" amber tone, no score yet
  // - kickoff in future → green, countdown
  const heroVariant: 'live' | 'in_progress' | 'locked' =
    isLive ? 'live' : kickoffPassed ? 'in_progress' : 'locked'

  // Predictions render in neutral tone while the match is in progress —
  // comparing against a still-running live score is misleading (a "wrong" pick
  // at minute 60 might come true at FT). Results show on the settled-match page.

  function winnerLabel(): string {
    if (!pred?.pred_winner) return '—'
    if (pred.pred_winner === 'A') return teamACode
    if (pred.pred_winner === 'B') return teamBCode
    return 'Draw'
  }

  const heroBg = {
    live:        'from-slate-900 via-slate-800 to-zinc-900',
    in_progress: 'from-amber-500 via-orange-600 to-amber-800',
    locked:      'from-blue-600 via-indigo-700 to-indigo-900',
  }[heroVariant]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Hero */}
        <div className={`relative bg-gradient-to-br ${heroBg} text-white p-4 rounded-t-3xl sm:rounded-t-3xl overflow-hidden`}>
          {heroVariant !== 'live' && (
            <>
              <div className="absolute inset-0 opacity-[0.10] pointer-events-none"
                   style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(255,255,255,0.5) 22px, rgba(255,255,255,0.5) 23px)' }} />
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />
            </>
          )}
          {heroVariant === 'live' && (
            <div className="absolute -top-20 -right-20 w-56 h-56 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          )}

          <div className="relative flex items-center justify-between mb-3">
            {heroVariant === 'live' && (
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-red-600 text-white px-2 py-0.5 rounded-sm inline-flex items-center gap-1.5">
                <span className="relative inline-flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-white opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-white" />
                </span>
                LIVE · {liveEvent!.description || 'In Progress'}
              </span>
            )}
            {heroVariant === 'in_progress' && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 backdrop-blur px-2.5 py-1 rounded-full">⏱ In Progress</span>
            )}
            {heroVariant === 'locked' && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 backdrop-blur px-2.5 py-1 rounded-full">🔒 Predictions Locked</span>
            )}

            {heroVariant === 'live' && (
              <span className="text-[11px] font-semibold tabular-nums text-slate-300 tracking-wider">
                {liveEvent!.display_clock || ''}
              </span>
            )}
            {heroVariant === 'locked' && kickoffMs !== null && (
              <span className="text-[10px] font-bold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
                Starts in {formatCountdown(kickoffMs - now)}
              </span>
            )}

            <button onClick={onClose} className="ml-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors" aria-label="Close">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="flex-1 text-center min-w-0">
              <div className="flex justify-center mb-1.5">
                <TeamFlag code={teamACode} size={160} className="w-16 h-11 ring-2 ring-white/40 shadow" />
              </div>
              <p className="text-xs font-extrabold truncate">{teamAName}</p>
            </div>
            <div className="px-2 text-center">
              {heroVariant === 'live' ? (
                <>
                  <p className="text-4xl font-bold tabular-nums leading-none text-white">
                    {liveEvent!.home_score}<span className="text-slate-500 mx-1.5 font-light">–</span>{liveEvent!.away_score}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">Live Score</p>
                </>
              ) : (
                <p className="text-2xl font-black opacity-80 leading-none">VS</p>
              )}
            </div>
            <div className="flex-1 text-center min-w-0">
              <div className="flex justify-center mb-1.5">
                <TeamFlag code={teamBCode} size={160} className="w-16 h-11 ring-2 ring-white/40 shadow" />
              </div>
              <p className="text-xs font-extrabold truncate">{teamBName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 mb-3 flex items-center gap-1.5">
            <span>🎯</span> Your Prediction
          </p>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !session?.clientId ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-3xl mb-2">🔒</p>
              <p className="font-semibold text-gray-600">Sign in to see your prediction</p>
            </div>
          ) : !pred ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🤷</p>
              <p className="font-semibold text-gray-700">No prediction submitted</p>
              <p className="text-xs text-gray-500 mt-1">
                {kickoffPassed
                  ? "You didn't predict this match. Footballs locked when match started — no points possible this round."
                  : 'Predictions are still open. Tap "Predict now" to submit your picks.'}
              </p>
            </div>
          ) : (() => {
            const baseWinner = pred.pred_winner ? 5 : 0
            const baseExact  = (pred.pred_score_a != null && pred.pred_score_b != null) ? 8 : 0
            const baseBoth   = pred.pred_both_score ? 2 : 0
            const baseMotm   = pred.pred_motm_id ? 5 : 0
            const maxWin     = baseWinner + baseExact + baseBoth + baseMotm
            const c = (n: number) => n
            return (
              <>
                <div className="space-y-1.5">
                  <PredictionRow icon="🏆" label="Winner" value={winnerLabel()} coins={c(baseWinner)} />
                  {pred.pred_score_a != null && pred.pred_score_b != null && (
                    <PredictionRow icon="🎯" label="Exact Score" value={`${pred.pred_score_a}–${pred.pred_score_b}`} coins={c(baseExact)} />
                  )}
                  {pred.pred_both_score && (
                    <PredictionRow icon="⚽" label="Both Teams Score" value={pred.pred_both_score === 'YES' ? 'Yes' : 'No'} coins={c(baseBoth)} />
                  )}
                  {pred.pred_motm_id && (
                    <PredictionRow icon="🌟" label="Man of the Match" value={motmName || 'Picked'} coins={c(baseMotm)} />
                  )}
                </div>

                {/* Potential winnings summary */}
                <div className="mt-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Earn up to</p>
                      <p className="text-xs text-amber-700/70">if all picks are correct</p>
                    </div>
                    <p className="text-2xl font-black text-amber-700 tabular-nums">+{maxWin} ⚽</p>
                  </div>
                </div>
              </>
            )
          })()}

          <button
            onClick={onClose}
            className="mt-4 w-full py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function PredictionRow({ icon, label, value, coins }: { icon: string; label: string; value: string; coins?: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-white">
      <span className="text-base">{icon}</span>
      <span className="text-[11px] text-gray-500 flex-shrink-0">{label}</span>
      <span className="ml-auto text-sm font-bold text-gray-800 truncate">{value}</span>
      {typeof coins === 'number' && coins > 0 && (
        <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex-shrink-0">+{coins} ⚽</span>
      )}
    </div>
  )
}
