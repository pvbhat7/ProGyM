import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import TeamFlag from '../components/TeamFlag'
import { getSession } from '../services/wcSession'

interface Pick {
  id: string
  match_id: string
  pred_winner: string | null
  pred_both_score: string | null
  pred_total_goals_range: string | null
  pred_first_scorer_id: string | null
  pred_first_scorer_name: string | null
  pred_motm_id: string | null
  pred_motm_name: string | null
  pred_score_a: string | null
  pred_score_b: string | null
  coins_awarded: string
  is_settled: string
  submitted_at: string | null
  // joined
  match_status: string
  stage: string
  multiplier: string
  kickoff_at: string
  winner: string | null
  actual_score_a: string | null
  actual_score_b: string | null
  team_a_name: string
  team_a_code: string
  team_b_name: string
  team_b_code: string
}

function formatKickoff(dt: string) {
  if (!dt) return ''
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} · ${m[4]}:${m[5]}`
}

function formatSubmittedAt(dt: string | null) {
  if (!dt) return ''
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const h24 = parseInt(m[4], 10)
  const h12 = ((h24 + 11) % 12) + 1
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} · ${String(h12).padStart(2,'0')}:${m[5]} ${ampm}`
}

function winnerText(p: Pick): string {
  if (p.pred_winner === 'A') return p.team_a_code
  if (p.pred_winner === 'B') return p.team_b_code
  if (p.pred_winner === 'DRAW') return 'Draw'
  return '—'
}

function actualWinnerText(p: Pick): string {
  if (p.winner === 'A') return p.team_a_code
  if (p.winner === 'B') return p.team_b_code
  if (p.winner === 'DRAW') return 'Draw'
  return '—'
}

export default function MyPicksPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [picks, setPicks] = useState<Pick[]>([])
  const [coins, setCoins] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'settled'>('pending')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (!session?.clientId) { navigate('/signup'); return }
    fetch(`${API_BASE}/wc_predictions/myPredictions.php?client_id=${session.clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j) return
        setPicks(Array.isArray(j.predictions) ? j.predictions : [])
        setCoins(Number(j.total_coins_earned) || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.clientId, navigate])

  const pending = picks.filter(p => p.is_settled !== 'yes')
  const settled = picks.filter(p => p.is_settled === 'yes')
  const list = tab === 'pending' ? pending : settled

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader title="My Picks" subtitle={session?.name || ''} rightCoins={coins} />

      <main className="max-w-md mx-auto px-3 py-3">
        {/* Tournament Major Awards entry */}
        <button
          onClick={() => navigate('/awards')}
          className="w-full text-left mb-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-white px-4 py-3 shadow-md active:scale-[0.99] transition-transform flex items-center gap-3"
        >
          <span className="text-3xl drop-shadow">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight">Tournament Major Awards</p>
            <p className="text-amber-50 text-[11px] leading-tight">Lock in your end-of-tournament picks · Earn up to 250 football coins</p>
          </div>
          <span className="text-white font-black text-lg">→</span>
        </button>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3 flex">
          <button
            onClick={() => setTab('pending')}
            className={`flex-1 py-2 text-xs font-semibold ${tab === 'pending' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Pending · {pending.length}
          </button>
          <button
            onClick={() => setTab('settled')}
            className={`flex-1 py-2 text-xs font-semibold ${tab === 'settled' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Settled · {settled.length}
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">{tab === 'pending' ? '🎯' : '🏁'}</p>
            <p className="font-semibold text-gray-600">
              {tab === 'pending' ? 'No active predictions' : 'No settled matches yet'}
            </p>
            <p className="text-sm mt-1">
              {tab === 'pending' ? 'Tap "Matches" to start predicting.' : 'Footballs will land here after matches finish.'}
            </p>
            {tab === 'pending' && (
              <button onClick={() => navigate('/matches')} className="mt-4 py-2 px-5 bg-blue-600 text-white font-semibold rounded-xl shadow">
                See Matches
              </button>
            )}
          </div>
        )}

        {!loading && list.map(p => {
          const settledRow = p.is_settled === 'yes'
          const won = settledRow && Number(p.coins_awarded) > 0
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-gray-500">{formatKickoff(p.kickoff_at)}</p>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 text-center">
                  <div className="flex justify-center mb-1">
                    <TeamFlag code={p.team_a_code} size={80} className="w-9 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 truncate">{p.team_a_name}</p>
                </div>
                <div className="px-2">
                  {settledRow && p.actual_score_a !== null
                    ? <p className="text-base font-black text-gray-900">{p.actual_score_a}–{p.actual_score_b}</p>
                    : <p className="text-xs text-gray-400">VS</p>
                  }
                </div>
                <div className="flex-1 text-center">
                  <div className="flex justify-center mb-1">
                    <TeamFlag code={p.team_b_code} size={80} className="w-9 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 truncate">{p.team_b_name}</p>
                </div>
              </div>

              {(() => {
                type Line = { icon: string; label: string; value: string; coins: number; tint: string; correct: boolean | null }
                const lines: Line[] = []
                const hasActuals = settledRow && p.actual_score_a !== null && p.actual_score_b !== null
                const sa = hasActuals ? Number(p.actual_score_a) : 0
                const sb = hasActuals ? Number(p.actual_score_b) : 0

                lines.push({
                  icon: '🏆', label: 'Winner', value: winnerText(p), coins: 5, tint: 'text-blue-700',
                  correct: settledRow && p.winner ? p.pred_winner === p.winner : null,
                })
                if (p.pred_score_a !== null && p.pred_score_b !== null) {
                  lines.push({
                    icon: '🎯', label: 'Exact Score', value: `${p.pred_score_a}–${p.pred_score_b}`, coins: 8, tint: 'text-amber-700',
                    correct: hasActuals ? (String(p.pred_score_a) === String(p.actual_score_a) && String(p.pred_score_b) === String(p.actual_score_b)) : null,
                  })
                }
                if (p.pred_both_score) {
                  const actualBtts = sa > 0 && sb > 0
                  lines.push({
                    icon: '⚽', label: 'Both Teams to Score', value: p.pred_both_score === 'YES' ? 'Yes' : 'No', coins: 2, tint: 'text-sky-700',
                    correct: hasActuals ? ((p.pred_both_score === 'YES') === actualBtts) : null,
                  })
                }
                if (p.pred_total_goals_range) {
                  const v = p.pred_total_goals_range === 'UNDER_2_5' ? '0-2 goals' : p.pred_total_goals_range === 'MID' ? '3-4 goals' : '5+ goals'
                  const total = sa + sb
                  const actualRange = total <= 2 ? 'UNDER_2_5' : total <= 4 ? 'MID' : 'OVER_4_5'
                  lines.push({
                    icon: '📊', label: 'Total Goals', value: v, coins: 4, tint: 'text-purple-700',
                    correct: hasActuals ? p.pred_total_goals_range === actualRange : null,
                  })
                }
                if (p.pred_first_scorer_id) {
                  lines.push({ icon: '⚡', label: 'First Goal Scorer', value: p.pred_first_scorer_name || 'Picked', coins: 8, tint: 'text-orange-700', correct: null })
                }
                if (p.pred_motm_id) {
                  lines.push({ icon: '🌟', label: 'Man of the Match', value: p.pred_motm_name || 'Picked', coins: 5, tint: 'text-rose-700', correct: null })
                }

                // Deduce first scorer / MoTM correctness from coins_awarded vs deterministic sum
                if (settledRow) {
                  const deterministicAwarded = lines
                    .filter(l => l.correct === true)
                    .reduce((sum, l) => sum + l.coins, 0)
                  let remaining = Number(p.coins_awarded) - deterministicAwarded
                  const ambiguousLines = lines.filter(l => l.correct === null && (l.label === 'First Goal Scorer' || l.label === 'Man of the Match'))
                  if (ambiguousLines.length === 1) {
                    ambiguousLines[0].correct = remaining >= ambiguousLines[0].coins
                  } else if (ambiguousLines.length === 2) {
                    if (remaining <= 0) ambiguousLines.forEach(l => (l.correct = false))
                    else if (remaining >= 16) ambiguousLines.forEach(l => (l.correct = true))
                    // else 8 awarded → cannot tell which one
                  }
                }
                const isOpen = expanded.has(p.id)
                return (
                  <div className="relative bg-gradient-to-br from-blue-50 via-white to-amber-50 border border-blue-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="relative w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left"
                    >
                      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                        <span>🎯</span> Your Predictions
                        <span className="ml-1 font-bold text-blue-700 normal-case tracking-normal text-[10px] bg-blue-100 px-1.5 py-0.5 rounded-full">{lines.length}</span>
                      </p>
                      <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                        {isOpen ? 'Hide' : 'Show'}
                        <span className={`inline-block transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="relative px-2.5 pb-2.5">
                        <div className="bg-white/70 rounded-lg divide-y divide-blue-50 border border-blue-100/70">
                          {lines.map((ln, i) => {
                            const showResult = settledRow && ln.correct !== null
                            const badgeCls = !showResult
                              ? 'text-indigo-800 bg-blue-50 border-blue-200'
                              : ln.correct
                                ? 'text-indigo-800 bg-blue-100 border-blue-300'
                                : 'text-red-700 bg-red-50 border-red-200'
                            const badgeText = !showResult
                              ? `+${ln.coins} ⚽`
                              : ln.correct
                                ? `✓ +${ln.coins} ⚽`
                                : `✗ 0 ⚽`
                            return (
                              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5">
                                <span className="text-sm">{ln.icon}</span>
                                <span className="text-[11px] text-gray-500 flex-shrink-0">{ln.label}</span>
                                <span className={`text-[11px] font-bold ${ln.tint} truncate`}>{ln.value}</span>
                                <span className={`ml-auto text-[10px] font-black border px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgeCls}`}>{badgeText}</span>
                              </div>
                            )
                          })}
                        </div>
                        {p.submitted_at && (
                          <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                            <span>🕒</span> Prediction submitted on <span className="font-semibold text-gray-600">{formatSubmittedAt(p.submitted_at)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {settledRow && (
                <div className={`mt-2 flex items-center justify-between text-xs ${won ? 'text-amber-700' : 'text-gray-400'}`}>
                  <span className="font-semibold">
                    Result: {actualWinnerText(p)} {p.actual_score_a !== null ? `${p.actual_score_a}–${p.actual_score_b}` : ''}
                  </span>
                  <span className="font-black text-base">{won ? `+${Math.round(Number(p.coins_awarded))}` : '0'} ⚽</span>
                </div>
              )}
            </div>
          )
        })}
      </main>

      <BottomNav />
    </div>
  )
}
