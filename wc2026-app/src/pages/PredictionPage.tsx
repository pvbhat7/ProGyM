import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import TeamFlag from '../components/TeamFlag'
import { getSession } from '../services/wcSession'
import { useLaunchGate, launchToastMessage } from '../services/launchGate'
import { toast } from '../components/Toast'
import LaunchCountdown from '../components/LaunchCountdown'

interface Match {
  id: string
  team_a_id: string
  team_b_id: string
  team_a_name: string
  team_a_code: string
  team_b_name: string
  team_b_code: string
  stage: string
  multiplier: string
  kickoff_at: string
  status: string
  winner?: string | null
  score_a?: string | null
  score_b?: string | null
  first_scorer_name?: string | null
  motm_name?: string | null
  settled_at?: string | null
}

interface ExistingPrediction {
  pred_winner: string | null
  pred_both_score: string | null
  pred_total_goals_range: string | null
  pred_first_scorer_id: string | null
  pred_motm_id: string | null
  pred_score_a: string | number | null
  pred_score_b: string | number | null
  coins_awarded?: string | null
  is_settled?: string | null
  submitted_at?: string | null
}
interface Player {
  id: string
  team_id: string
  name: string
  position: string | null
  jersey_number: string | null
}

interface EspnGoal {
  minute: string
  side: 'A' | 'B' | ''
  scorer: string
  type: string
}
interface EspnTeamStats { [label: string]: string | null }
interface EspnStatsResponse {
  has_stats: boolean
  has_goals: boolean
  team_a_code: string
  team_b_code: string
  stats: { team_a: EspnTeamStats; team_b: EspnTeamStats } | null
  goals: EspnGoal[] | null
  fetched_at: string | null
}

interface Form {
  pred_winner: 'A' | 'B' | 'DRAW' | ''
  pred_both_score: 'YES' | 'NO' | ''
  pred_total_goals_range: 'UNDER_2_5' | 'MID' | 'OVER_4_5' | ''
  pred_first_scorer_id: string
  pred_motm_id: string
  pred_score_a: string
  pred_score_b: string
}

const EMPTY_FORM: Form = {
  pred_winner: '', pred_both_score: '', pred_total_goals_range: '',
  pred_first_scorer_id: '', pred_motm_id: '',
  pred_score_a: '', pred_score_b: ''
}

function formatKickoff(dt: string) {
  if (!dt) return ''
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} · ${m[4]}:${m[5]} IST`
}

function formatSubmittedAt(dt: string | null | undefined) {
  if (!dt) return ''
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const h24 = parseInt(m[4], 10)
  const h12 = ((h24 + 11) % 12) + 1
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} · ${String(h12).padStart(2,'0')}:${m[5]} ${ampm}`
}

function kickoffMs(dt: string): number | null {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):?(\d{2})?/)
  if (!m) return null
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
  return utc - 5.5 * 3600 * 1000
}

function formatTimeIst(ms: number): string {
  const ist = new Date(ms + 5.5 * 3600 * 1000)
  let h = ist.getUTCHours()
  const m = ist.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDateTimeIst(ms: number): string {
  const ist = new Date(ms + 5.5 * 3600 * 1000)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const d = ist.getUTCDate()
  const mo = months[ist.getUTCMonth()]
  let h = ist.getUTCHours()
  const mi = ist.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${d} ${mo} · ${h}:${String(mi).padStart(2, '0')} ${ampm} IST`
}

function countdownParts(ms: number): { d: number; h: number; m: number; s: number } {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 }
  const total = Math.floor(ms / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return { d, h, m, s }
}

const PREDICTION_WINDOW_MS = 24 * 60 * 60 * 1000

// Launch-day exception: matches on these days have the prediction window open from now,
// ignoring the usual 24h-before rule. Keep in sync with api/wc_predictions/submit.php.
const OPEN_NOW_DAYS = new Set<string>(['2026-06-17'])
function isOpenNowDay(dt: string): boolean {
  const m = (dt || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? OPEN_NOW_DAYS.has(`${m[1]}-${m[2]}-${m[3]}`) : false
}

function Section({ icon, title, coins, selected, children }: { icon: string; title: string; coins: number; selected: boolean; children: React.ReactNode }) {
  return (
    <div className={`relative rounded-2xl p-3 mb-2.5 transition-all border ${
      selected
        ? 'border-blue-200 bg-gradient-to-br from-blue-50/60 to-white'
        : 'border-gray-100 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <span>{icon}</span> {title}
          {selected && (
            <span className="ml-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-black rounded-full inline-flex items-center justify-center">✓</span>
          )}
        </p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
          selected
            ? 'text-blue-700 bg-blue-50 border-blue-200'
            : 'text-amber-700 bg-amber-50 border-amber-200'
        }`}>+{coins} ⚽</span>
      </div>
      {children}
    </div>
  )
}

export default function PredictionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const session = getSession()

  const [match, setMatch] = useState<Match | null>(null)
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([])
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([])
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successCoinsPreview, setSuccessCoinsPreview] = useState<number | null>(null)
  const [existingPrediction, setExistingPrediction] = useState<ExistingPrediction | null>(null)
  const [picksExpanded, setPicksExpanded] = useState<boolean>(true)
  const [espnStats, setEspnStats] = useState<EspnStatsResponse | null>(null)
  const [lockMinutes, setLockMinutes] = useState<number>(0)
  const [now, setNow] = useState<number>(Date.now())
  const launch = useLaunchGate()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/features/get.php`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        const n = Math.max(0, parseInt(d.prediction_lock_minutes, 10) || 0)
        setLockMinutes(n)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id || !session?.clientId) { navigate('/matches'); return }
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/wc_matches/byId.php?id=${id}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/wc_predictions/forMatch.php?client_id=${session.clientId}&match_id=${id}`).then(r => r.ok ? r.json() : null),
    ]).then(async ([mt, pr]) => {
      setMatch(mt)
      if (mt) {
        const sq = await fetch(`${API_BASE}/wc_players/forMatch.php?team_a_id=${mt.team_a_id}&team_b_id=${mt.team_b_id}`).then(r => r.ok ? r.json() : null)
        setTeamAPlayers(Array.isArray(sq?.team_a_players) ? sq.team_a_players : [])
        setTeamBPlayers(Array.isArray(sq?.team_b_players) ? sq.team_b_players : [])
      }
      const existing = pr?.prediction
      if (existing) setExistingPrediction(existing)
      if (existing && mt) {
        let base = 0
        if (existing.pred_winner)                base += 5
        if (existing.pred_both_score)            base += 2
        if (existing.pred_motm_id)               base += 5
        if (existing.pred_score_a !== null && existing.pred_score_b !== null) base += 8
        setSuccessCoinsPreview(base)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id, session?.clientId, navigate])

  useEffect(() => {
    if (!id || !match || match.status !== 'settled') { setEspnStats(null); return }
    fetch(`${API_BASE}/wc_matches/getEspnStats.php?id=${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => setEspnStats(j as EspnStatsResponse))
      .catch(() => setEspnStats(null))
  }, [id, match?.status])

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function updateScore(side: 'A' | 'B', v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 2)
    setForm(f => {
      const next = { ...f, [side === 'A' ? 'pred_score_a' : 'pred_score_b']: clean } as Form
      // Auto-derive winner if both scores present
      if (next.pred_score_a !== '' && next.pred_score_b !== '') {
        const a = Number(next.pred_score_a), b = Number(next.pred_score_b)
        next.pred_winner = a > b ? 'A' : a < b ? 'B' : 'DRAW'
      }
      return next
    })
  }

  function previewCoins(): number {
    let base = 0
    if (form.pred_winner)                base += 5
    if (form.pred_both_score)            base += 2
    if (form.pred_motm_id)               base += 5
    if (form.pred_score_a !== '' && form.pred_score_b !== '') base += 8
    return base
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!match || !session) return
    if (!launch.isLive) {
      toast(launchToastMessage(launch.launchAtLabel))
      return
    }
    const missing: string[] = []
    if (!form.pred_winner)                                              missing.push('Match Winner')
    if (!form.pred_both_score)                                          missing.push('Both Teams to Score')
    if (form.pred_score_a === '' || form.pred_score_b === '')           missing.push('Exact Final Score')
    if (!form.pred_motm_id)                                             missing.push('Man of the Match')
    if (missing.length) {
      setError(`Please fill all 4 predictions. Missing: ${missing.join(', ')}.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      const body: Record<string, any> = {
        client_id: session.clientId,
        match_id:  Number(match.id),
      }
      if (form.pred_winner)                  body.pred_winner            = form.pred_winner
      if (form.pred_both_score)              body.pred_both_score        = form.pred_both_score
      if (form.pred_total_goals_range)       body.pred_total_goals_range = form.pred_total_goals_range
      if (form.pred_first_scorer_id)         body.pred_first_scorer_id   = Number(form.pred_first_scorer_id)
      if (form.pred_motm_id)                 body.pred_motm_id           = Number(form.pred_motm_id)
      if (form.pred_score_a !== '')          body.pred_score_a           = Number(form.pred_score_a)
      if (form.pred_score_b !== '')          body.pred_score_b           = Number(form.pred_score_b)

      const res = await fetch(`${API_BASE}/wc_predictions/submit.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || 'Failed to save prediction.')
      setSuccessCoinsPreview(previewCoins())
    } catch (err: any) {
      setError(err?.message || 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Prediction" showBack />
        <div className="p-6 text-center text-gray-400">Loading…</div>
      </div>
    )
  }

  // Settled view — match has finished, show result + user's picks recap
  if (match.status === 'settled' || (match.score_a != null && match.score_b != null)) {
    const winnerName =
      match.winner === 'A'    ? match.team_a_name
    : match.winner === 'B'    ? match.team_b_name
    : match.winner === 'DRAW' ? 'Draw'
    : null
    const ep = existingPrediction
    const myWinnerText =
      ep?.pred_winner === 'A'    ? match.team_a_code
    : ep?.pred_winner === 'B'    ? match.team_b_code
    : ep?.pred_winner === 'DRAW' ? 'Draw'
    : null
    const earned = ep?.coins_awarded != null ? Math.round(Number(ep.coins_awarded)) : null

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 pb-12">
        <AppHeader title="Match Result" subtitle={formatKickoff(match.kickoff_at)} showBack />
        <main className="max-w-md mx-auto px-3 py-3">
          {/* Final score card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-4 mb-3 shadow-md relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-center gap-2 mb-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">🏁 Full Time</span>
            </div>
            <div className="relative flex items-center gap-2 mb-3">
              <div className="flex-1 text-center">
                <div className="flex justify-center mb-1.5">
                  <TeamFlag code={match.team_a_code} size={160} className={`w-14 h-10 ring-2 ring-white/30 ${match.winner === 'A' ? '' : 'opacity-60 grayscale'}`} />
                </div>
                <p className={`text-sm font-extrabold truncate ${match.winner === 'A' ? '' : 'opacity-70'}`}>{match.team_a_name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 tracking-wider">{match.team_a_code}</p>
              </div>
              <div className="px-1 text-center">
                <p className="text-3xl font-black tabular-nums leading-none bg-clip-text text-transparent bg-gradient-to-b from-amber-200 to-yellow-100">
                  {match.score_a ?? '?'}<span className="text-white/40 mx-1">–</span>{match.score_b ?? '?'}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-300 font-semibold mt-1">Final</p>
              </div>
              <div className="flex-1 text-center">
                <div className="flex justify-center mb-1.5">
                  <TeamFlag code={match.team_b_code} size={160} className={`w-14 h-10 ring-2 ring-white/30 ${match.winner === 'B' ? '' : 'opacity-60 grayscale'}`} />
                </div>
                <p className={`text-sm font-extrabold truncate ${match.winner === 'B' ? '' : 'opacity-70'}`}>{match.team_b_name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 tracking-wider">{match.team_b_code}</p>
              </div>
            </div>
            <div className="relative text-center text-[12px] font-bold">
              {winnerName ? <>🏆 <span className="text-amber-200">{winnerName}</span></> : <span className="text-gray-300">Result pending</span>}
            </div>
          </div>

          {/* Your picks recap — per-line correct/incorrect (mirrors My Picks screen) */}
          {ep ? (() => {
            const hasActuals = match.score_a != null && match.score_b != null
            const sa = hasActuals ? Number(match.score_a) : 0
            const sb = hasActuals ? Number(match.score_b) : 0
            const isSettled = match.status === 'settled'
            const playerName = (id: string | number | null | undefined): string | null => {
              if (id == null || id === '') return null
              const sid = String(id)
              const a = teamAPlayers.find(p => String(p.id) === sid)
              if (a) return a.name
              const b = teamBPlayers.find(p => String(p.id) === sid)
              if (b) return b.name
              return null
            }

            type Line = { icon: string; label: string; value: string; coins: number; tint: string; correct: boolean | null }
            const lines: Line[] = []

            lines.push({
              icon: '🏆', label: 'Winner', value: myWinnerText || '—', coins: 5, tint: 'text-blue-700',
              correct: isSettled && match.winner ? ep.pred_winner === match.winner : null,
            })
            if (ep.pred_score_a != null && ep.pred_score_b != null) {
              lines.push({
                icon: '🎯', label: 'Exact Score', value: `${ep.pred_score_a}–${ep.pred_score_b}`, coins: 8, tint: 'text-amber-700',
                correct: hasActuals
                  ? (String(ep.pred_score_a) === String(match.score_a) && String(ep.pred_score_b) === String(match.score_b))
                  : null,
              })
            }
            if (ep.pred_both_score) {
              const actualBtts = sa > 0 && sb > 0
              lines.push({
                icon: '⚽', label: 'Both Teams to Score', value: ep.pred_both_score === 'YES' ? 'Yes' : 'No', coins: 2, tint: 'text-sky-700',
                correct: hasActuals ? ((ep.pred_both_score === 'YES') === actualBtts) : null,
              })
            }
            if (ep.pred_total_goals_range) {
              const v = ep.pred_total_goals_range === 'UNDER_2_5' ? '0-2 goals' : ep.pred_total_goals_range === 'MID' ? '3-4 goals' : '5+ goals'
              const total = sa + sb
              const actualRange = total <= 2 ? 'UNDER_2_5' : total <= 4 ? 'MID' : 'OVER_4_5'
              lines.push({
                icon: '📊', label: 'Total Goals', value: v, coins: 4, tint: 'text-purple-700',
                correct: hasActuals ? ep.pred_total_goals_range === actualRange : null,
              })
            }
            if (ep.pred_first_scorer_id) {
              const name = playerName(ep.pred_first_scorer_id)
              const fsCorrect = isSettled && match.first_scorer_name && name
                ? name === match.first_scorer_name
                : null
              lines.push({
                icon: '⚡', label: 'First Goal Scorer', value: name || 'Picked', coins: 8, tint: 'text-orange-700',
                correct: fsCorrect,
              })
            }
            if (ep.pred_motm_id) {
              const name = playerName(ep.pred_motm_id)
              const motmCorrect = isSettled && match.motm_name && name
                ? name === match.motm_name
                : null
              lines.push({
                icon: '🌟', label: 'Man of the Match', value: name || 'Picked', coins: 5, tint: 'text-rose-700',
                correct: motmCorrect,
              })
            }

            return (
              <div className="relative bg-gradient-to-br from-blue-50 via-white to-amber-50 border border-blue-100 rounded-2xl overflow-hidden shadow-sm mb-3">
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setPicksExpanded(v => !v)}
                  className="relative w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                    <span>🎯</span> Your Predictions
                    <span className="ml-1 font-bold text-blue-700 normal-case tracking-normal text-[10px] bg-blue-100 px-1.5 py-0.5 rounded-full">{lines.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {earned !== null && (
                      <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        +{earned} ⚽
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                      {picksExpanded ? 'Hide' : 'Show'}
                      <span className={`inline-block transition-transform ${picksExpanded ? 'rotate-180' : ''}`}>▾</span>
                    </span>
                  </div>
                </button>
                {picksExpanded && (
                  <div className="relative px-3 pb-3">
                    <div className="bg-white/70 rounded-lg divide-y divide-blue-50 border border-blue-100/70">
                      {lines.map((ln, i) => {
                        const showResult = isSettled && ln.correct !== null
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
                    {ep.submitted_at && (
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span>🕒</span> Prediction submitted on <span className="font-semibold text-gray-600">{formatSubmittedAt(ep.submitted_at)}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })() : (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 text-center">
              <p className="text-3xl mb-1">🤷</p>
              <p className="text-sm font-bold text-gray-700">You didn't make a prediction for this match.</p>
              <p className="text-[11px] text-gray-400 mt-1">No footballs earned.</p>
            </div>
          )}

          {/* Goal-scorer timeline + team stats from ESPN */}
          <EspnStatsSection
            data={espnStats}
            teamACode={match.team_a_code}
            teamBCode={match.team_b_code}
          />

          <button
            onClick={() => navigate('/matches')}
            className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-md"
          >
            Back to matches
          </button>
        </main>
      </div>
    )
  }

  // Prediction window not open yet (more than 24h before kickoff)
  {
    const kt = kickoffMs(match.kickoff_at)
    if (kt !== null && !isOpenNowDay(match.kickoff_at)) {
      const windowOpensAt = kt - PREDICTION_WINDOW_MS
      if (now < windowOpensAt && successCoinsPreview === null) {
        const { d, h, m, s } = countdownParts(windowOpensAt - now)
        const showDays = d > 0
        const cells: { label: string; value: string }[] = showDays
          ? [
              { label: 'Days',    value: String(d) },
              { label: 'Hours',   value: String(h).padStart(2, '0') },
              { label: 'Minutes', value: String(m).padStart(2, '0') },
            ]
          : [
              { label: 'Hours',   value: String(h).padStart(2, '0') },
              { label: 'Minutes', value: String(m).padStart(2, '0') },
              { label: 'Seconds', value: String(s).padStart(2, '0') },
            ]
        return (
          <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
            <AppHeader title="Prediction" subtitle={formatKickoff(match.kickoff_at)} showBack />
            <main className="max-w-md mx-auto px-4 py-8 text-center">
              <div className="text-6xl mb-3">⏳</div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Prediction window opens soon</h2>
              <p className="text-sm text-gray-600 mb-5">
                Predictions for <b>{match.team_a_name} vs {match.team_b_name}</b> open 24 hours before the match starts.
              </p>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 mb-4 shadow-md">
                <p className="text-[11px] uppercase tracking-wider text-blue-300 mb-3">Opens in</p>
                <div className="grid grid-cols-3 gap-2">
                  {cells.map(c => (
                    <div key={c.label} className="bg-white/10 rounded-xl py-3">
                      <p className="text-3xl font-black tabular-nums leading-none bg-clip-text text-transparent bg-gradient-to-b from-amber-200 to-yellow-100">{c.value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-300 mt-1">{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Window opens at</p>
                <p className="text-base font-bold text-blue-700">{formatDateTimeIst(windowOpensAt)}</p>
              </div>

              <button
                onClick={() => navigate('/matches')}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-md"
              >
                Back to matches
              </button>
            </main>
          </div>
        )
      }
    }
  }

  // Success view after save
  if (successCoinsPreview !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-amber-50">
        <AppHeader title="Prediction Saved" />
        <main className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="text-6xl mb-3">🎯</div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">You're in!</h2>
          <p className="text-sm text-gray-600 mb-5">Your picks are locked in for {match.team_a_name} vs {match.team_b_name}.</p>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Max Footballs You Can Earn</p>
            <p className="text-4xl font-black text-blue-700">{successCoinsPreview} ⚽</p>
            <p className="text-[11px] text-gray-400 mt-1">excludes streak bonus</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/matches')}
              className="py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl"
            >
              More matches
            </button>
            <button
              onClick={() => navigate('/my-picks')}
              className="py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-md"
            >
              My Picks →
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <AppHeader title="Make Your Prediction" subtitle={formatKickoff(match.kickoff_at)} showBack />

      <main className="max-w-md mx-auto px-3 py-3">
        <div className="mb-3 -mx-3"><LaunchCountdown variant="banner" /></div>

        {/* Match summary card */}
        <div className="relative bg-gradient-to-br from-blue-700 via-indigo-800 to-gray-900 text-white rounded-2xl p-4 mb-3 shadow-md overflow-hidden">
          {/* Mowed pitch stripes */}
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(255,255,255,0.5) 22px, rgba(255,255,255,0.5) 23px)' }}
          />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-200/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-center gap-2 mb-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-bold bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">
              📅 {formatKickoff(match.kickoff_at)}
            </span>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 text-center">
              <div className="flex justify-center mb-2">
                <TeamFlag code={match.team_a_code} size={160} className="w-20 h-14 ring-2 ring-white/40 shadow-md" />
              </div>
              <p className="text-base font-extrabold truncate">{match.team_a_name}</p>
              <p className="text-[10px] text-gray-300 mt-0.5 tracking-wider">{match.team_a_code}</p>
            </div>
            <div className="text-white/70 font-black text-sm px-1">VS</div>
            <div className="flex-1 text-center">
              <div className="flex justify-center mb-2">
                <TeamFlag code={match.team_b_code} size={160} className="w-20 h-14 ring-2 ring-white/40 shadow-md" />
              </div>
              <p className="text-base font-extrabold truncate">{match.team_b_name}</p>
              <p className="text-[10px] text-gray-300 mt-0.5 tracking-wider">{match.team_b_code}</p>
            </div>
          </div>

          {(() => {
            const t = kickoffMs(match.kickoff_at)
            if (t === null || lockMinutes <= 0) return null
            const deadlineT = t - lockMinutes * 60 * 1000
            return (
              <p className="relative text-center text-[11px] font-bold mt-3 opacity-95">
                ⏰ Predict before <span className="bg-white/25 backdrop-blur px-1.5 py-0.5 rounded">{formatTimeIst(deadlineT)} IST</span>
              </p>
            )
          })()}
        </div>

        {/* Live progress strip */}
        {(() => {
          const total = 4
          const made =
            (form.pred_winner ? 1 : 0) +
            (form.pred_both_score ? 1 : 0) +
            (form.pred_score_a !== '' && form.pred_score_b !== '' ? 1 : 0) +
            (form.pred_motm_id ? 1 : 0)
          const pct = Math.round((made / total) * 100)
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-3 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-bold text-gray-700">
                  {made === 0 ? 'Tap a card to start predicting' : made === total ? '🔥 All predictions selected!' : `${made} of ${total} predictions made`}
                </p>
                <p className="text-[11px] font-black text-blue-700">+{previewCoins()} ⚽</p>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-blue-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })()}

        <form onSubmit={handleSubmit}>
          {/* 1. Match winner — team-branded pills */}
          <Section icon="🏆" title="Match Winner" coins={5} selected={!!form.pred_winner}>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'A',    code: match.team_a_code, label: match.team_a_code, sub: 'wins' },
                { v: 'DRAW', code: null,              label: 'Draw',            sub: '' },
                { v: 'B',    code: match.team_b_code, label: match.team_b_code, sub: 'wins' },
              ] as const).map(o => {
                const active = form.pred_winner === o.v
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => update('pred_winner', (active ? '' : o.v) as any)}
                    className={`py-2 px-2 rounded-xl border-2 text-center transition-all ${
                      active
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-amber-50 text-indigo-800 shadow-sm scale-[1.02]'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-center mb-1 h-5 items-center">
                      {o.code ? <TeamFlag code={o.code} size={80} className="w-7 h-5 rounded-sm" /> : <span className="text-base">🤝</span>}
                    </div>
                    <p className="text-xs font-bold leading-tight">{o.label}</p>
                    {o.sub && <p className="text-[10px] mt-0.5 opacity-70">{o.sub}</p>}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* 2. Both teams to score */}
          <Section icon="⚽" title="Both Teams to Score?" coins={2} selected={!!form.pred_both_score}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'YES', label: 'Yes', icon: '✅', activeBg: 'from-blue-100 to-blue-50 border-blue-500 text-indigo-800' },
                { v: 'NO',  label: 'No',  icon: '🚫', activeBg: 'from-rose-100 to-rose-50 border-rose-500 text-rose-800' },
              ].map(o => {
                const active = form.pred_both_score === o.v
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => update('pred_both_score', (active ? '' : o.v) as any)}
                    className={`py-3 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-1 ${
                      active ? `bg-gradient-to-br ${o.activeBg} shadow-sm scale-[1.02]` : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <span className="text-lg leading-none">{o.icon}</span>
                    <span className="text-xs font-bold">{o.label}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* 3. Exact score — stepper */}
          <Section icon="🎯" title="Exact Final Score" coins={8} selected={form.pred_score_a !== '' && form.pred_score_b !== ''}>
            <div className="grid grid-cols-2 gap-3">
              {(['A', 'B'] as const).map(side => {
                const code = side === 'A' ? match.team_a_code : match.team_b_code
                const value = side === 'A' ? form.pred_score_a : form.pred_score_b
                const empty = value === ''
                const n = empty ? 0 : Number(value)
                return (
                  <div key={side} className={`rounded-xl p-2 border ${empty ? 'bg-amber-50/40 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <TeamFlag code={code} size={80} className="w-5 h-3.5" />
                      <p className="text-[11px] font-bold text-gray-600">{code}</p>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => updateScore(side, empty ? '0' : String(Math.max(0, n - 1)))}
                        className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 font-black text-lg flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="decrease"
                      >−</button>
                      <p className={`text-2xl font-black tabular-nums min-w-[2ch] text-center ${empty ? 'text-amber-500' : 'text-gray-900'}`}>{empty ? '—' : value}</p>
                      <button
                        type="button"
                        onClick={() => updateScore(side, empty ? '1' : String(Math.min(99, n + 1)))}
                        className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                        aria-label="increase"
                      >+</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2">Tap + or − to set <span className="font-semibold">each</span> team's score — winner is set automatically.</p>
          </Section>

          {/* 4. MOTM */}
          <Section icon="🌟" title="Man of the Match" coins={5} selected={!!form.pred_motm_id}>
            <div className="relative">
              <select
                value={form.pred_motm_id}
                onChange={e => update('pred_motm_id', e.target.value)}
                className={`w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 rounded-xl outline-none transition-all font-semibold ${
                  form.pred_motm_id
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : 'border-gray-200 bg-white text-gray-700 focus:border-blue-500'
                }`}
              >
                <option value="">🤔 Pick a player</option>
                <optgroup label={match.team_a_name}>
                  {teamAPlayers.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                </optgroup>
                <optgroup label={match.team_b_name}>
                  {teamBPlayers.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                </optgroup>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▾</span>
            </div>
          </Section>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 mb-2 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>{error}
            </div>
          )}
        </form>
      </main>

      {/* Sticky submit footer */}
      {(() => {
        const allPicked =
          !!form.pred_winner &&
          !!form.pred_both_score &&
          form.pred_score_a !== '' && form.pred_score_b !== '' &&
          !!form.pred_motm_id
        return (
          <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_18px_-8px_rgba(0,0,0,0.1)]">
            <div className="max-w-md mx-auto flex items-center gap-3">
              <div className="flex-shrink-0">
                <p className="text-[10px] text-gray-500 leading-none uppercase tracking-wider font-bold">Max ⚽</p>
                <p className="text-lg font-black text-blue-700 leading-tight">+{previewCoins()} ⚽</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving || !launch.isLive || !allPicked}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-60 active:scale-[0.99] transition-transform"
              >
                {saving
                  ? 'Saving…'
                  : !launch.isLive
                    ? `🔒 Opens ${launch.launchAtLabel || 'soon'}`
                    : !allPicked
                      ? 'Fill all 4 to submit'
                      : '🎯 Submit Prediction'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ----- Match Result: ESPN stats section -----

function EspnStatsSection({ data, teamACode, teamBCode }: {
  data: EspnStatsResponse | null
  teamACode: string
  teamBCode: string
}) {
  if (!data || (!data.has_stats && !data.has_goals)) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-5 text-center">
        <p className="text-3xl mb-2">📊</p>
        <p className="text-sm font-bold text-gray-800">Match stats not available yet</p>
        <p className="text-[11px] text-gray-500 mt-1">ESPN hasn't published the detailed boxscore for this match yet — check back in a bit.</p>
      </div>
    )
  }

  const scorerTallies = data.has_goals && data.goals ? buildScorerTallies(data.goals) : null

  return (
    <div className="space-y-3">
      {scorerTallies && (scorerTallies.A.length > 0 || scorerTallies.B.length > 0) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1 mb-3">
            <span>⚽</span> Goal Scorers
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(['A', 'B'] as const).map(side => {
              const list = scorerTallies[side]
              const code = side === 'A' ? teamACode : teamBCode
              const tint = side === 'A' ? 'text-blue-800 bg-blue-50 border-blue-200' : 'text-rose-800 bg-rose-50 border-rose-200'
              return (
                <div key={side}>
                  <p className={`text-[10px] font-black uppercase tracking-wider mb-1.5 px-1.5 py-0.5 rounded inline-block border ${tint}`}>{code}</p>
                  {list.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">No goals</p>
                  ) : (
                    <ul className="space-y-1">
                      {list.map((s, i) => (
                        <li key={i} className="flex items-baseline justify-between gap-2 text-[12px]">
                          <span className="font-semibold text-gray-800 truncate flex-1">
                            {s.name}{s.ownGoal && <span className="ml-1 text-[9px] font-bold text-gray-500 uppercase">(OG)</span>}
                          </span>
                          <span className="font-black text-emerald-700 tabular-nums">×{s.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data.has_goals && data.goals && data.goals.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1 mb-3">
            <span>⚽</span> Goal Timeline
          </p>
          <ul className="space-y-2">
            {data.goals.map((g, i) => {
              const isA = g.side === 'A'
              return (
                <li key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="w-10 flex-shrink-0 text-right font-bold text-gray-700 tabular-nums">{g.minute || '—'}</span>
                  <span className={`w-10 flex-shrink-0 text-center text-[10px] font-bold px-1.5 py-0.5 rounded ${isA ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                    {isA ? teamACode : g.side === 'B' ? teamBCode : '?'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 truncate block">{g.scorer || 'Unknown'}</span>
                    {g.type && <span className="text-[10px] text-gray-500">{g.type}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {data.has_stats && data.stats && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1 mb-3">
            <span>📊</span> Team Stats
          </p>
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
            <span className="text-blue-700">{teamACode}</span>
            <span>&nbsp;</span>
            <span className="text-rose-700">{teamBCode}</span>
          </div>
          <ul className="space-y-2.5">
            {Object.keys(data.stats.team_a).map(label => {
              const a = data.stats!.team_a[label]
              const b = data.stats!.team_b[label]
              if (a == null && b == null) return null
              const { pctA, pctB } = computeBarSplit(a, b)
              return (
                <li key={label}>
                  <div className="flex justify-between items-baseline text-[11px] mb-1">
                    <span className="font-bold text-gray-800 tabular-nums">{a ?? '—'}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{label}</span>
                    <span className="font-bold text-gray-800 tabular-nums">{b ?? '—'}</span>
                  </div>
                  <div className="flex h-1.5 bg-gray-100 rounded overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${pctA}%` }} />
                    <div className="bg-rose-500 h-full ml-auto" style={{ width: `${pctB}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function buildScorerTallies(goals: EspnGoal[]): { A: { name: string; count: number; ownGoal: boolean }[]; B: { name: string; count: number; ownGoal: boolean }[] } {
  const result = { A: new Map<string, { count: number; ownGoal: boolean }>(), B: new Map<string, { count: number; ownGoal: boolean }>() }
  for (const g of goals) {
    if (g.side !== 'A' && g.side !== 'B') continue
    const name = (g.scorer || 'Unknown').trim()
    if (!name) continue
    const isOG = /own[\s-]*goal/i.test(g.type || '')
    const bucket = result[g.side]
    const cur = bucket.get(name)
    if (cur) {
      cur.count += 1
      if (isOG) cur.ownGoal = true
    } else {
      bucket.set(name, { count: 1, ownGoal: isOG })
    }
  }
  const toList = (m: Map<string, { count: number; ownGoal: boolean }>) =>
    Array.from(m.entries())
      .map(([name, v]) => ({ name, count: v.count, ownGoal: v.ownGoal }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return { A: toList(result.A), B: toList(result.B) }
}

function toNumber(v: string | null | undefined): number | null {
  if (v == null) return null
  const s = String(v).replace(/[^0-9.]/g, '')
  if (!s) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function computeBarSplit(a: string | null, b: string | null): { pctA: number; pctB: number } {
  const na = toNumber(a)
  const nb = toNumber(b)
  if (na == null && nb == null) return { pctA: 0, pctB: 0 }
  const total = (na ?? 0) + (nb ?? 0)
  if (total <= 0) return { pctA: 0, pctB: 0 }
  const pctA = Math.round(((na ?? 0) / total) * 100)
  return { pctA, pctB: 100 - pctA }
}
