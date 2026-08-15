import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import TeamFlag from '../components/TeamFlag'
import { getSession } from '../services/wcSession'
import { toast } from '../components/Toast'

interface TeamSide {
  id: number | null
  name: string | null
  code: string | null
  flag: string | null
  label: string | null
}
interface MyPrediction {
  match_id: number
  pred_winner: 'A' | 'B'
  pred_score_a: number
  pred_score_b: number
  pred_first_scorer_id: number | null
  pred_motm_id: number
  points_winner?: number | null
  points_score?: number | null
  points_first_scorer?: number | null
  points_motm?: number | null
  points_total?: number | null
  settled_at?: string | null
}
interface Match {
  id: number
  stage: string
  kickoff_at: string
  status: string
  predictions_open: boolean
  team_a: TeamSide
  team_b: TeamSide
  winner: string | null
  score_a: number | null
  score_b: number | null
  first_scorer_name: string | null
  motm_name: string | null
  my_prediction?: MyPrediction
}
interface ApiResponse {
  ok: boolean
  matches: Match[]
  is_eliminated?: boolean
  tiebreaker: { open: boolean; locks_at: string | null; my_estimate: { total_goals_estimate: number } | null }
  scoring: { winner: number; exact_score: number; first_scorer: number; motm: number; perfect_bracket_bonus: number; max_per_match: number; max_total: number }
}
interface Player { id: number; name: string; position: string; jersey_number: number }
interface PlayersResp { team_a_players: Player[]; team_b_players: Player[] }

const STAGE_LABEL: Record<string, string> = { sf: 'Semi-final', '3rd': 'Third Place', final: 'Final' }

// Parse "YYYY-MM-DD HH:MM:SS" as IST and return UTC ms.
function kickoffMs(dt: string): number | null {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):?(\d{2})?/)
  if (!m) return null
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
  return utc - 5.5 * 3600 * 1000
}
function formatIst(dt: string): string {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  let h = +m[4]; const mn = m[5]
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${+m[3]} ${months[+m[2]-1]} · ${h}:${mn} ${ampm}`
}
function formatCountdown(diff: number): string {
  if (diff <= 0) return 'Locked'
  const s = Math.floor(diff / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function KnockoutBonanzaPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [data, setData]       = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow]         = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  function reload() {
    const url = `${API_BASE}/wc_special/matches.php${session ? '?client_id=' + session.clientId : ''}`
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(reload, [])

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <AppHeader title="Knockout Bonanza" showBack />
        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <p className="text-3xl mb-3">💎</p>
          <h1 className="text-xl font-black text-purple-900">Knockout Bonanza</h1>
          <p className="text-sm text-gray-600 mt-2">Sign in to play. Top 3 win a special reward.</p>
          <button onClick={() => navigate('/signup')} className="mt-5 px-6 py-2.5 rounded-full bg-purple-600 text-white font-semibold">Sign in / Sign up</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white pb-24">
      <AppHeader title="Knockout Bonanza" showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-700 via-fuchsia-600 to-rose-500 text-white p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💎</span>
            <h1 className="text-lg font-black tracking-tight">Knockout Bonanza</h1>
          </div>
          <p className="text-[12px] text-purple-100 leading-snug">
            A separate contest for the <b>last 4 matches</b> (SFs · 3rd Place · Final). <b>Top 3 win a special reward.</b> Everyone starts at zero.
          </p>
          {data && (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
              <div className="bg-white/15 rounded-lg py-1.5"><p className="font-black text-base">{data.scoring.winner}</p><p className="text-purple-100">Winner</p></div>
              <div className="bg-white/15 rounded-lg py-1.5"><p className="font-black text-base">{data.scoring.exact_score}</p><p className="text-purple-100">Exact score</p></div>
              <div className="bg-white/15 rounded-lg py-1.5"><p className="font-black text-base">{data.scoring.first_scorer}</p><p className="text-purple-100">1st scorer</p></div>
              <div className="bg-white/15 rounded-lg py-1.5"><p className="font-black text-base">{data.scoring.motm}</p><p className="text-purple-100">MOTM</p></div>
            </div>
          )}
          {data && (
            <p className="text-[10px] text-purple-100 mt-2 text-center">
              + {data.scoring.perfect_bracket_bonus}pt bonus for predicting all 4 winners correctly · max {data.scoring.max_total}pts
            </p>
          )}
        </div>

        {/* Leaderboard link */}
        <button
          onClick={() => navigate('/knockout-bonanza/leaderboard')}
          className="mt-3 w-full bg-white rounded-xl border border-purple-200 px-4 py-2.5 flex items-center justify-between hover:bg-purple-50 transition-colors"
        >
          <span className="text-sm font-bold text-purple-900 flex items-center gap-2"><span>🏆</span> Bonanza Leaderboard</span>
          <span className="text-purple-600 font-bold">→</span>
        </button>

        {!loading && data?.is_eliminated && (
          <div className="mt-4 rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 text-center">
            <p className="text-2xl">🚪</p>
            <p className="text-sm font-bold text-rose-800 mt-1">You have left the tournament</p>
            <p className="text-[12px] text-rose-700 mt-1">You can no longer submit predictions or a tiebreaker. This decision is permanent.</p>
          </div>
        )}

        {loading && (
          <div className="mt-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        )}

        {/* Tiebreaker */}
        {!loading && data && !data.is_eliminated && (
          <TiebreakerCard data={data} clientId={session.clientId} now={now} onSaved={reload} />
        )}

        {/* Match cards */}
        {!loading && data && !data.is_eliminated && (
          <div className="mt-4 space-y-3">
            {data.matches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                clientId={session.clientId}
                now={now}
                onSaved={reload}
                scoring={data.scoring}
              />
            ))}
          </div>
        )}

        {!loading && data && data.matches.every(m => !m.team_a.id || !m.team_b.id) && (
          <p className="text-center text-xs text-gray-500 mt-6">
            Predictions open once Semi-final teams are confirmed. Check back after the Quarter-finals settle.
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  )
}

// ============================== TIEBREAKER ==============================

function TiebreakerCard({ data, clientId, now, onSaved }: { data: ApiResponse; clientId: number; now: number; onSaved: () => void }) {
  const open = data.tiebreaker.open
  const locksAt = data.tiebreaker.locks_at
  const lockMs = locksAt ? kickoffMs(locksAt) : null
  const lockDiff = lockMs !== null ? (lockMs - 15 * 60 * 1000) - now : 0

  const [val, setVal]       = useState<string>(data.tiebreaker.my_estimate ? String(data.tiebreaker.my_estimate.total_goals_estimate) : '')
  const [saving, setSaving] = useState(false)

  async function save() {
    const n = parseInt(val, 10)
    if (isNaN(n) || n < 0 || n > 40) { toast('Enter a number between 0 and 40'); return }
    setSaving(true)
    try {
      const r = await fetch(`${API_BASE}/wc_special/tiebreaker.php`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ client_id: clientId, total_goals: n })
      })
      const j = await r.json()
      if (!j.ok) { toast(j.error || 'Could not save'); return }
      toast('Tiebreaker saved')
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white border border-purple-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🎯</span>
        <h2 className="text-sm font-black text-purple-900">Tiebreaker: Total Goals (all 4 matches)</h2>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">Closest guess wins if total points tie. {open ? `Locks in ${formatCountdown(lockDiff)}` : 'Locked'}</p>
      <div className="flex items-center gap-2">
        <input
          type="number" min={0} max={40} disabled={!open || saving || !!data.tiebreaker.my_estimate}
          value={val} onChange={e => setVal(e.target.value)}
          placeholder="e.g. 11"
          className="flex-1 text-center text-2xl font-black tabular-nums px-3 py-2 rounded-lg border-2 border-purple-200 focus:border-purple-500 outline-none disabled:opacity-50"
        />
        {open && !data.tiebreaker.my_estimate && (
          <button onClick={save} disabled={saving || val === ''} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
        )}
      </div>
      {data.tiebreaker.my_estimate && <p className="text-[11px] text-purple-700 mt-2">Your guess: <b>{data.tiebreaker.my_estimate.total_goals_estimate}</b> goals</p>}
    </div>
  )
}

// ============================== MATCH CARD ==============================

function MatchCard({ match, clientId, now, onSaved, scoring }: { match: Match; clientId: number; now: number; onSaved: () => void; scoring: ApiResponse['scoring'] }) {
  const isReady    = !!match.team_a.id && !!match.team_b.id
  const isSettled  = match.status === 'settled'
  const t          = kickoffMs(match.kickoff_at)
  const lockT      = t !== null ? t - 15 * 60 * 1000 : null
  const isOpen     = isReady && !isSettled && match.predictions_open && lockT !== null && now < lockT
  const lockDiff   = lockT !== null ? lockT - now : 0

  const [open, setOpen] = useState(false)
  const my = match.my_prediction

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold tracking-wider uppercase">{STAGE_LABEL[match.stage] || match.stage}</span>
          <span className="ml-auto text-[11px] text-gray-500 font-medium">{formatIst(match.kickoff_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-center">
            <div className="flex justify-center mb-1">{match.team_a.code ? <TeamFlag code={match.team_a.code} size={80} className="w-10 h-7" /> : <span className="w-10 h-7 inline-flex items-center justify-center bg-gray-100 rounded-sm" aria-hidden>🛡</span>}</div>
            <p className={`text-xs font-bold ${match.team_a.name ? 'text-gray-800' : 'text-gray-400'}`}>{match.team_a.name || match.team_a.label || 'TBD'}</p>
          </div>
          {isSettled ? (
            <div className="text-center px-1">
              <p className="text-xl font-black tabular-nums">{match.score_a}<span className="text-gray-300 mx-1">–</span>{match.score_b}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Final</p>
            </div>
          ) : (
            <div className="text-gray-300 font-bold text-xs px-2">VS</div>
          )}
          <div className="flex-1 text-center">
            <div className="flex justify-center mb-1">{match.team_b.code ? <TeamFlag code={match.team_b.code} size={80} className="w-10 h-7" /> : <span className="w-10 h-7 inline-flex items-center justify-center bg-gray-100 rounded-sm" aria-hidden>🛡</span>}</div>
            <p className={`text-xs font-bold ${match.team_b.name ? 'text-gray-800' : 'text-gray-400'}`}>{match.team_b.name || match.team_b.label || 'TBD'}</p>
          </div>
        </div>

        {/* Status line */}
        <div className="mt-3 border-t border-gray-100 pt-2 flex items-center justify-between text-[11px]">
          {isSettled ? (
            my && my.points_total != null ? (
              <>
                <span className="text-emerald-700 font-bold">✓ You scored {my.points_total} pts</span>
                <button onClick={() => setOpen(!open)} className="text-blue-600 font-bold">{open ? 'Hide' : 'See details'}</button>
              </>
            ) : (
              <>
                <span className="text-gray-500">Match settled · you didn't predict</span>
                <button onClick={() => setOpen(!open)} className="text-blue-600 font-bold">{open ? 'Hide' : 'See result'}</button>
              </>
            )
          ) : !isReady ? (
            <span className="text-gray-500">Awaiting teams</span>
          ) : !isOpen && lockDiff <= 0 ? (
            <>
              <span className="text-gray-400 font-semibold">🔒 Locked</span>
              {my ? <span className="text-emerald-700 font-bold">✓ Submitted</span> : <span className="text-rose-500 font-bold">No prediction</span>}
            </>
          ) : my ? (
            <>
              <span className="text-gray-500">Locks in <span className="font-bold text-gray-700">{formatCountdown(lockDiff)}</span></span>
              <button onClick={() => setOpen(!open)} className="text-emerald-700 font-bold">
                {open ? 'Hide' : '✓ See your prediction'}
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-500">Locks in <span className="font-bold text-gray-700">{formatCountdown(lockDiff)}</span></span>
              <button onClick={() => setOpen(!open)} className="px-3 py-1 rounded-md bg-purple-600 text-white font-bold text-[11px]">
                Predict →
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <PredictionForm
          match={match}
          clientId={clientId}
          isOpen={isOpen}
          existing={my || null}
          scoring={scoring}
          onSaved={() => { setOpen(false); onSaved() }}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ============================== PREDICTION FORM ==============================

function PredictionForm({ match, clientId, isOpen, existing, scoring, onSaved, onCancel }: {
  match: Match; clientId: number; isOpen: boolean; existing: MyPrediction | null;
  scoring: ApiResponse['scoring']; onSaved: () => void; onCancel: () => void;
}) {
  const [winner, setWinner]   = useState<'A'|'B'|''>(existing?.pred_winner || '')
  const [scoreA, setScoreA]   = useState<string>(existing ? String(existing.pred_score_a) : '')
  const [scoreB, setScoreB]   = useState<string>(existing ? String(existing.pred_score_b) : '')
  const [firstSc, setFirstSc] = useState<string>(existing?.pred_first_scorer_id ? String(existing.pred_first_scorer_id) : '')
  const [motm, setMotm]       = useState<string>(existing?.pred_motm_id ? String(existing.pred_motm_id) : '')
  const [players, setPlayers] = useState<PlayersResp | null>(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!match.team_a.id || !match.team_b.id) return
    fetch(`${API_BASE}/wc_players/forMatch.php?team_a_id=${match.team_a.id}&team_b_id=${match.team_b.id}`)
      .then(r => r.json()).then(setPlayers)
  }, [match.team_a.id, match.team_b.id])

  const allPlayers = useMemo<Player[]>(() => {
    if (!players) return []
    return [...players.team_a_players, ...players.team_b_players].sort((a,b) => a.name.localeCompare(b.name))
  }, [players])

  const sa = parseInt(scoreA, 10); const sb = parseInt(scoreB, 10)
  const isCleanSheet = !isNaN(sa) && !isNaN(sb) && sa + sb === 0
  const winnerInconsistent = !isNaN(sa) && !isNaN(sb) && ((sa > sb && winner === 'B') || (sb > sa && winner === 'A'))

  async function submit() {
    if (!isOpen) return
    if (!winner) return toast('Pick winner')
    if (isNaN(sa) || isNaN(sb) || sa < 0 || sb < 0) return toast('Enter scores')
    if (winnerInconsistent) return toast('Winner does not match score')
    if (!motm) return toast('Pick Player of the Match')
    if (!isCleanSheet && !firstSc) return toast('Pick first scorer')

    setSaving(true)
    try {
      const r = await fetch(`${API_BASE}/wc_special/submit.php`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          client_id: clientId, match_id: match.id, pred_winner: winner,
          score_a: sa, score_b: sb,
          first_scorer_id: isCleanSheet ? null : parseInt(firstSc, 10),
          motm_id: parseInt(motm, 10),
        })
      })
      const j = await r.json()
      if (!j.ok) { toast(j.error || 'Save failed'); return }
      toast('Prediction saved')
      onSaved()
    } finally { setSaving(false) }
  }

  const isSettled = match.status === 'settled'

  if (!isSettled && existing) {
    const firstScorerName = allPlayers.find(p => p.id === existing.pred_first_scorer_id)?.name
    const motmName        = allPlayers.find(p => p.id === existing.pred_motm_id)?.name
    return (
      <div className="border-t border-gray-100 px-4 py-3 bg-emerald-50/40 text-[11px]">
        <p className="text-gray-500 mb-2 font-semibold uppercase tracking-wider text-[10px]">Your prediction (locked)</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="text-gray-500">Winner</div>
          <div className="font-semibold text-gray-800">{existing.pred_winner === 'A' ? match.team_a.name : match.team_b.name}</div>
          <div className="text-gray-500">Exact score</div>
          <div className="font-semibold text-gray-800">{existing.pred_score_a}–{existing.pred_score_b}</div>
          <div className="text-gray-500">First scorer</div>
          <div className="font-semibold text-gray-800 truncate">{firstScorerName || (existing.pred_first_scorer_id ? '…' : '(0-0)')}</div>
          <div className="text-gray-500">MOTM</div>
          <div className="font-semibold text-gray-800 truncate">{motmName || '…'}</div>
        </div>
        <div className="mt-3">
          <button onClick={onCancel} className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold">Close</button>
        </div>
      </div>
    )
  }

  if (isSettled) {
    return (
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 text-[11px] space-y-1">
        <div className="grid grid-cols-2 gap-x-3">
          <div className="text-gray-500">Actual winner</div>
          <div className="font-semibold text-gray-800">{match.winner === 'A' ? match.team_a.name : match.winner === 'B' ? match.team_b.name : '—'}</div>
          <div className="text-gray-500">Actual score</div>
          <div className="font-semibold text-gray-800">{match.score_a}–{match.score_b}</div>
          <div className="text-gray-500">First scorer</div>
          <div className="font-semibold text-gray-800">{match.first_scorer_name || '—'}</div>
          <div className="text-gray-500">MOTM</div>
          <div className="font-semibold text-gray-800">{match.motm_name || '—'}</div>
        </div>
        {existing && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-gray-500 mb-1 font-semibold">Your prediction</p>
            <div className="grid grid-cols-2 gap-x-3">
              <div className="text-gray-500">Winner</div>
              <div>{existing.pred_winner === 'A' ? match.team_a.name : match.team_b.name} <span className="text-purple-700 font-bold">{existing.points_winner ? `+${existing.points_winner}` : ''}</span></div>
              <div className="text-gray-500">Score</div>
              <div>{existing.pred_score_a}–{existing.pred_score_b} <span className="text-purple-700 font-bold">{existing.points_score ? `+${existing.points_score}` : ''}</span></div>
              <div className="text-gray-500">First scorer</div>
              <div className="truncate">{allPlayers.find(p => p.id === existing.pred_first_scorer_id)?.name || '(0-0)'} <span className="text-purple-700 font-bold">{existing.points_first_scorer ? `+${existing.points_first_scorer}` : ''}</span></div>
              <div className="text-gray-500">MOTM</div>
              <div className="truncate">{allPlayers.find(p => p.id === existing.pred_motm_id)?.name || '?'} <span className="text-purple-700 font-bold">{existing.points_motm ? `+${existing.points_motm}` : ''}</span></div>
            </div>
            <p className="mt-2 font-black text-purple-900">Total: {existing.points_total} pts</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-purple-50/50 space-y-3">
      {/* Winner */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Winner · +{scoring.winner}pts</p>
        <div className="grid grid-cols-2 gap-2">
          {(['A','B'] as const).map(side => {
            const team = side === 'A' ? match.team_a : match.team_b
            const isSel = winner === side
            return (
              <button key={side} onClick={() => setWinner(side)} disabled={!isOpen}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all ${isSel ? 'border-purple-600 bg-purple-100' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                {team.code && <TeamFlag code={team.code} size={40} className="w-5 h-3.5" />}
                <span className="text-[12px] font-bold truncate">{team.name || 'TBD'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Score */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Exact score (FT+ET, no penalties) · +{scoring.exact_score}pts</p>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={20} value={scoreA} onChange={e => setScoreA(e.target.value)} disabled={!isOpen}
            className="w-16 text-center text-xl font-black tabular-nums px-2 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none disabled:opacity-50" placeholder="0" />
          <span className="text-gray-400 font-bold">–</span>
          <input type="number" min={0} max={20} value={scoreB} onChange={e => setScoreB(e.target.value)} disabled={!isOpen}
            className="w-16 text-center text-xl font-black tabular-nums px-2 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none disabled:opacity-50" placeholder="0" />
          <span className="text-[10px] text-gray-500 ml-2">{match.team_a.code} vs {match.team_b.code}</span>
        </div>
        {winnerInconsistent && <p className="text-[10px] text-rose-500 mt-1">Winner does not match the score</p>}
      </div>

      {/* First scorer */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">First goalscorer · +{scoring.first_scorer}pts {isCleanSheet && <span className="text-purple-600 normal-case font-medium">(skipped for 0-0)</span>}</p>
        <select value={firstSc} onChange={e => setFirstSc(e.target.value)} disabled={!isOpen || isCleanSheet}
          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none text-sm bg-white disabled:opacity-50">
          <option value="">— select player —</option>
          {players?.team_a_players.map(p => <option key={p.id} value={p.id}>{match.team_a.code} · #{p.jersey_number || '?'} {p.name}</option>)}
          {players?.team_b_players.map(p => <option key={p.id} value={p.id}>{match.team_b.code} · #{p.jersey_number || '?'} {p.name}</option>)}
        </select>
      </div>

      {/* MOTM */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Player of the Match · +{scoring.motm}pts</p>
        <select value={motm} onChange={e => setMotm(e.target.value)} disabled={!isOpen}
          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none text-sm bg-white disabled:opacity-50">
          <option value="">— select player —</option>
          {players?.team_a_players.map(p => <option key={p.id} value={p.id}>{match.team_a.code} · #{p.jersey_number || '?'} {p.name}</option>)}
          {players?.team_b_players.map(p => <option key={p.id} value={p.id}>{match.team_b.code} · #{p.jersey_number || '?'} {p.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold">Cancel</button>
        <button onClick={submit} disabled={!isOpen || saving} className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-bold disabled:opacity-50">
          {saving ? 'Saving…' : (existing ? 'Update prediction' : 'Submit prediction')}
        </button>
      </div>
    </div>
  )
}
