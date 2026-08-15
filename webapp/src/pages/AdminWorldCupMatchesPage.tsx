import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import TeamFlag from '../components/TeamFlag'

interface Team {
  id: string
  name: string
  short_code: string
  group_name: string
  flag: string | null
}

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
  winner: string | null
  score_a: string | null
  score_b: string | null
  first_scorer_id?: string | null
  first_scorer_name?: string | null
  motm_id?: string | null
  motm_name?: string | null
  settled_at: string | null
  result_source?: 'pending' | 'espn_partial' | 'complete' | string
}

const BONANZA_MATCH_IDS = new Set(['101', '102', '103', '104'])
const isBonanza = (m: Pick<Match, 'id'>) => BONANZA_MATCH_IDS.has(String(m.id))

type StageCode = 'group' | 'r16' | 'qf' | 'sf' | 'final'

interface FormData {
  team_a_id: string
  team_b_id: string
  stage: StageCode
  kickoff_at: string  // ISO local "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
}

interface Player {
  id: string
  team_id: string
  name: string
  position: string | null
  jersey_number: string | null
}

interface SettleForm {
  winner: 'A' | 'B' | 'DRAW' | ''
  score_a: string
  score_b: string
  first_scorer_id: string  // '' = "none"
  motm_id: string          // '' = "none"
}

interface SettleResult {
  message: string
  match: string
  winner: string
  score: string
  multiplier: number
  predictions_settled: number
  users_awarded: number
  coins_distributed: number
}

const STAGE_LABEL: Record<StageCode, string> = {
  group:  'Group',
  r16:    'Round of 16',
  qf:     'Quarter-final',
  sf:     'Semi-final',
  final:  'Final',
}

const STAGE_MULTIPLIER: Record<StageCode, number> = {
  group: 1, r16: 1.5, qf: 2, sf: 3, final: 5,
}

const STAGE_BADGE_BG: Record<string, string> = {
  group: 'bg-gray-100 text-gray-600',
  r16:   'bg-blue-100 text-blue-700',
  qf:    'bg-purple-100 text-purple-700',
  sf:    'bg-pink-100 text-pink-700',
  final: 'bg-amber-100 text-amber-700',
}

const EMPTY_FORM: FormData = {
  team_a_id: '',
  team_b_id: '',
  stage: 'group',
  kickoff_at: '',
}

type StatusFilter = 'all' | 'upcoming' | 'settled'

function formatKickoff(dt: string) {
  // dt is "YYYY-MM-DD HH:MM:SS" (stored as IST text in DB).
  if (!dt) return '—'
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]}, ${m[4]}:${m[5]} IST`
}

// "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM" for <input type="datetime-local">
function toLocalInput(dt: string) {
  if (!dt) return ''
  return dt.replace(' ', 'T').slice(0, 16)
}

// "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DD HH:MM:00"
function fromLocalInput(s: string) {
  if (!s) return ''
  const v = s.replace('T', ' ')
  return v.length === 16 ? v + ':00' : v
}

export default function AdminWorldCupMatchesPage() {
  const navigate = useNavigate()
  const [teams, setTeams]     = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [form, setForm]           = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Match | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Settle modal state
  const [settleMatch, setSettleMatch] = useState<Match | null>(null)
  const [settleForm, setSettleForm]   = useState<SettleForm>({ winner: '', score_a: '', score_b: '', first_scorer_id: '', motm_id: '' })
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([])
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [settling, setSettling]       = useState(false)
  const [settleError, setSettleError] = useState('')
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null)

  // MOTM top-up modal state
  const [motmMatch, setMotmMatch]     = useState<Match | null>(null)
  const [motmPlayerId, setMotmPlayerId] = useState<string>('')
  const [motmTeamA, setMotmTeamA]     = useState<Player[]>([])
  const [motmTeamB, setMotmTeamB]     = useState<Player[]>([])
  const [motmLoadingPlayers, setMotmLoadingPlayers] = useState(false)
  const [motmSaving, setMotmSaving]   = useState(false)
  const [motmError, setMotmError]     = useState('')
  const [motmResult, setMotmResult]   = useState<{ users_topped_up: number; per_user_bonus: number } | null>(null)

  // First-scorer (Bonanza-only) modal state
  const [fsMatch, setFsMatch]           = useState<Match | null>(null)
  const [fsPlayerId, setFsPlayerId]     = useState<string>('')
  const [fsTeamA, setFsTeamA]           = useState<Player[]>([])
  const [fsTeamB, setFsTeamB]           = useState<Player[]>([])
  const [fsLoadingPlayers, setFsLoadingPlayers] = useState(false)
  const [fsSaving, setFsSaving]         = useState(false)
  const [fsError, setFsError]           = useState('')
  const [fsResult, setFsResult]         = useState<{ bonanza_winners: number; per_user_bonus: number } | null>(null)

  function loadAll() {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/wc_teams/all.php`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/wc_matches/all.php`).then(r => r.ok ? r.json() : []),
    ])
      .then(([t, m]) => {
        setTeams(Array.isArray(t) ? t : [])
        setMatches(Array.isArray(m) ? m : [])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { loadAll() }, [])

  const teamById = useMemo(() => {
    const map: Record<string, Team> = {}
    for (const t of teams) map[t.id] = t
    return map
  }, [teams])

  const filtered = useMemo(() => {
    const list = statusFilter === 'all' ? matches : matches.filter(m => m.status === statusFilter)
    return [...list].sort((a, b) => {
      const ta = new Date(a.kickoff_at).getTime()
      const tb = new Date(b.kickoff_at).getTime()
      return sortOrder === 'desc' ? tb - ta : ta - tb
    })
  }, [matches, statusFilter, sortOrder])

  function openAdd() {
    setEditMatch(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setShowModal(true)
  }

  function openEdit(mt: Match) {
    setEditMatch(mt)
    setForm({
      team_a_id:  mt.team_a_id,
      team_b_id:  mt.team_b_id,
      stage:      (mt.stage as StageCode),
      kickoff_at: toLocalInput(mt.kickoff_at),
    })
    setSaveError('')
    setShowModal(true)
  }

  function closeModal() {
    if (saving) return
    setShowModal(false)
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.team_a_id || !form.team_b_id) {
      setSaveError('Pick both teams.')
      return
    }
    if (form.team_a_id === form.team_b_id) {
      setSaveError('Team A and Team B must be different.')
      return
    }
    if (!form.kickoff_at) {
      setSaveError('Kickoff date/time is required.')
      return
    }

    setSaving(true)
    setSaveError('')
    try {
      const body = {
        ...(editMatch ? { id: Number(editMatch.id) } : {}),
        team_a_id:  Number(form.team_a_id),
        team_b_id:  Number(form.team_b_id),
        stage:      form.stage,
        multiplier: STAGE_MULTIPLIER[form.stage],
        kickoff_at: fromLocalInput(form.kickoff_at),
      }
      const url = editMatch ? `${API_BASE}/wc_matches/update.php` : `${API_BASE}/wc_matches/create.php`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message || 'Failed to save.')
      }
      setShowModal(false)
      loadAll()
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/wc_matches/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(deleteTarget.id) }),
      })
      if (!res.ok) throw new Error('delete failed')
      setDeleteTarget(null)
      loadAll()
    } catch {
      // ignore for now; soft fail
    } finally {
      setDeleting(false)
    }
  }

  async function openSettle(mt: Match) {
    setSettleMatch(mt)
    setSettleResult(null)
    setSettleError('')
    setSettleForm({ winner: '', score_a: '', score_b: '', first_scorer_id: '', motm_id: '' })
    setLoadingPlayers(true)
    try {
      const res = await fetch(`${API_BASE}/wc_players/forMatch.php?team_a_id=${mt.team_a_id}&team_b_id=${mt.team_b_id}`)
      const j = await res.json()
      setTeamAPlayers(Array.isArray(j.team_a_players) ? j.team_a_players : [])
      setTeamBPlayers(Array.isArray(j.team_b_players) ? j.team_b_players : [])
    } catch {
      setTeamAPlayers([])
      setTeamBPlayers([])
    } finally {
      setLoadingPlayers(false)
    }
  }

  function handleSettleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setSettleForm(f => {
      const next = { ...f, [name]: value } as SettleForm
      // Auto-derive winner from scores when both scores are entered
      if (name === 'score_a' || name === 'score_b') {
        const a = Number(name === 'score_a' ? value : next.score_a)
        const b = Number(name === 'score_b' ? value : next.score_b)
        if (next.score_a !== '' && next.score_b !== '' && !isNaN(a) && !isNaN(b)) {
          next.winner = a > b ? 'A' : a < b ? 'B' : 'DRAW'
        }
      }
      return next
    })
  }

  async function handleSettle(e: React.FormEvent) {
    e.preventDefault()
    if (!settleMatch) return
    if (settleForm.score_a === '' || settleForm.score_b === '') {
      setSettleError('Both scores are required.')
      return
    }
    if (!settleForm.winner) {
      setSettleError('Winner could not be determined from scores.')
      return
    }
    setSettling(true)
    setSettleError('')
    try {
      const body: Record<string, any> = {
        id:      Number(settleMatch.id),
        winner:  settleForm.winner,
        score_a: Number(settleForm.score_a),
        score_b: Number(settleForm.score_b),
      }
      if (settleForm.first_scorer_id) body.first_scorer_id = Number(settleForm.first_scorer_id)
      if (settleForm.motm_id)         body.motm_id         = Number(settleForm.motm_id)

      const res = await fetch(`${API_BASE}/wc_matches/settle.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || 'Failed to settle match.')
      setSettleResult({
        message:             j.message,
        match:               j.match,
        winner:              j.winner,
        score:               j.score,
        multiplier:          Number(j.multiplier),
        predictions_settled: Number(j.predictions_settled) || 0,
        users_awarded:       Number(j.users_awarded) || 0,
        coins_distributed:   Number(j.coins_distributed) || 0,
      })
      loadAll()
    } catch (err: any) {
      setSettleError(err?.message || 'Failed to settle match.')
    } finally {
      setSettling(false)
    }
  }

  function closeSettle() {
    if (settling) return
    setSettleMatch(null)
    setSettleResult(null)
  }

  // ----- MOTM top-up -----
  async function openMotm(mt: Match) {
    setMotmMatch(mt)
    setMotmPlayerId('')
    setMotmError('')
    setMotmResult(null)
    setMotmLoadingPlayers(true)
    try {
      const res = await fetch(`${API_BASE}/wc_players/forMatch.php?team_a_id=${mt.team_a_id}&team_b_id=${mt.team_b_id}`)
      const j = await res.json()
      setMotmTeamA(Array.isArray(j.team_a_players) ? j.team_a_players : [])
      setMotmTeamB(Array.isArray(j.team_b_players) ? j.team_b_players : [])
    } catch {
      setMotmTeamA([]); setMotmTeamB([])
    } finally {
      setMotmLoadingPlayers(false)
    }
  }

  function closeMotm() {
    if (motmSaving) return
    setMotmMatch(null)
    setMotmResult(null)
  }

  async function handleMotmAward() {
    if (!motmMatch) return
    if (!motmPlayerId) { setMotmError('Pick a MOTM.'); return }
    setMotmSaving(true)
    setMotmError('')
    try {
      const res = await fetch(`${API_BASE}/wc_matches/topUpMotm.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(motmMatch.id), motm_id: Number(motmPlayerId) }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || 'Top-up failed.')
      setMotmResult({ users_topped_up: Number(j.users_topped_up) || 0, per_user_bonus: Number(j.per_user_bonus) || 0 })
      loadAll()
    } catch (err: any) {
      setMotmError(err?.message || 'Top-up failed.')
    } finally {
      setMotmSaving(false)
    }
  }

  // ----- First-scorer (Bonanza only) -----
  async function openFs(mt: Match) {
    setFsMatch(mt)
    setFsPlayerId('')
    setFsError('')
    setFsResult(null)
    setFsLoadingPlayers(true)
    try {
      const res = await fetch(`${API_BASE}/wc_players/forMatch.php?team_a_id=${mt.team_a_id}&team_b_id=${mt.team_b_id}`)
      const j = await res.json()
      setFsTeamA(Array.isArray(j.team_a_players) ? j.team_a_players : [])
      setFsTeamB(Array.isArray(j.team_b_players) ? j.team_b_players : [])
    } catch {
      setFsTeamA([]); setFsTeamB([])
    } finally {
      setFsLoadingPlayers(false)
    }
  }

  function closeFs() {
    if (fsSaving) return
    setFsMatch(null)
    setFsResult(null)
  }

  async function handleFsAward() {
    if (!fsMatch) return
    if (!fsPlayerId) { setFsError('Pick the first goalscorer.'); return }
    setFsSaving(true)
    setFsError('')
    try {
      const res = await fetch(`${API_BASE}/wc_matches/setFirstScorer.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(fsMatch.id), first_scorer_id: Number(fsPlayerId) }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || 'Set failed.')
      setFsResult({ bonanza_winners: Number(j.bonanza_winners) || 0, per_user_bonus: Number(j.per_user_bonus) || 0 })
      loadAll()
    } catch (err: any) {
      setFsError(err?.message || 'Set failed.')
    } finally {
      setFsSaving(false)
    }
  }

  const statusCounts = useMemo(() => {
    return {
      all:      matches.length,
      upcoming: matches.filter(m => m.status === 'upcoming').length,
      settled:  matches.filter(m => m.status === 'settled').length,
    }
  }, [matches])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">World Cup Matches</h1>
            {!loading && <p className="text-xs text-gray-400">{filtered.length} of {matches.length} matches</p>}
          </div>
          <button
            onClick={() => navigate('/admin-worldcup-awards')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
            title="Settle tournament awards (Winner, Golden Ball / Boot / Glove)"
          >
            🏆 Awards
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === 'upcoming' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Upcoming · {statusCounts.upcoming}
            </button>
            <button
              onClick={() => setStatusFilter('settled')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === 'settled' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Settled · {statusCounts.settled}
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              All · {statusCounts.all}
            </button>
          </div>
          <button
            onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Toggle sort order"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sortOrder === 'desc'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V4" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />}
            </svg>
            {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-4 pb-8">
        {/* MOTM-pending queue (auto-settled matches awaiting MOTM bonus) */}
        {!loading && (() => {
          const queue = matches.filter(m => m.result_source === 'espn_partial')
          if (queue.length === 0) return null
          return (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🤖</span>
                <p className="text-sm font-bold text-amber-800">
                  {queue.length} match{queue.length === 1 ? '' : 'es'} auto-settled overnight — MOTM bonus pending
                </p>
              </div>
              <p className="text-[11px] text-amber-700 mb-2">
                Cron awarded winner/score/etc. footballs already. Pick the MOTM to release the deferred +8 ⚽ × multiplier to users who guessed right.
              </p>
              <div className="space-y-1.5">
                {queue.map(mt => (
                  <div key={mt.id} className="bg-white rounded-lg border border-amber-200 px-3 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <TeamFlag code={mt.team_a_code} size={40} className="w-5 h-3.5" />
                        <span className="truncate">{mt.team_a_name}</span>
                        <span className="text-gray-400 font-normal text-xs">vs</span>
                        <TeamFlag code={mt.team_b_code} size={40} className="w-5 h-3.5" />
                        <span className="truncate">{mt.team_b_name}</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {mt.score_a}–{mt.score_b} · {formatKickoff(mt.kickoff_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openMotm(mt)}
                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        Pick MOTM
                      </button>
                      {isBonanza(mt) && !mt.first_scorer_id && Number(mt.score_a || 0) + Number(mt.score_b || 0) > 0 && (
                        <button
                          onClick={() => openFs(mt)}
                          className="px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600 transition-colors"
                          title="Bonanza only — 25 pts to correct guesses"
                        >
                          Pick 1st Scorer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Bonanza first-scorer pending — for M101-M104 already past the MOTM queue
            (result_source = 'complete') but still missing first_scorer_id. */}
        {!loading && (() => {
          const bonanzaFsPending = matches.filter(m =>
            isBonanza(m) &&
            m.status === 'settled' &&
            !m.first_scorer_id &&
            Number(m.score_a || 0) + Number(m.score_b || 0) > 0
          )
          if (bonanzaFsPending.length === 0) return null
          return (
            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🏆</span>
                <p className="text-sm font-bold text-purple-800">
                  {bonanzaFsPending.length} Bonanza match{bonanzaFsPending.length === 1 ? '' : 'es'} missing First Scorer
                </p>
              </div>
              <p className="text-[11px] text-purple-700 mb-2">
                Bonanza players get <b>+25 pts</b> each when the first goalscorer is set. Regular football scoring is unaffected.
              </p>
              <div className="space-y-1.5">
                {bonanzaFsPending.map(mt => (
                  <div key={mt.id} className="bg-white rounded-lg border border-purple-200 px-3 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <TeamFlag code={mt.team_a_code} size={40} className="w-5 h-3.5" />
                        <span className="truncate">{mt.team_a_name}</span>
                        <span className="text-gray-400 font-normal text-xs">vs</span>
                        <TeamFlag code={mt.team_b_code} size={40} className="w-5 h-3.5" />
                        <span className="truncate">{mt.team_b_name}</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {mt.score_a}–{mt.score_b} · {formatKickoff(mt.kickoff_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => openFs(mt)}
                      className="px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600 transition-colors shrink-0"
                    >
                      Pick 1st Scorer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {loading && (
          <div className="grid grid-cols-1 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">😕</p>
            <p className="font-semibold text-gray-600">Could not load matches</p>
            <p className="text-sm mt-1">Check that the wc_ APIs are deployed.</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">⚽</p>
            <p className="font-semibold text-gray-600">No matches in this filter</p>
            <p className="text-sm mt-1">Add a match using the button above.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            {filtered.map(mt => {
              const isSettled = mt.status === 'settled'
              const stageKey  = mt.stage
              const stageBadge = STAGE_BADGE_BG[stageKey] || 'bg-gray-100 text-gray-600'
              return (
                <div key={mt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${stageBadge}`}>
                            {STAGE_LABEL[stageKey as StageCode] || stageKey}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold">
                            ×{mt.multiplier}
                          </span>
                          {isSettled
                            ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">Settled</span>
                            : <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">Upcoming</span>
                          }
                          {mt.result_source === 'espn_partial' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">🤖 Auto · MOTM pending</span>
                          )}
                          {mt.result_source === 'complete' && isSettled && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✓ Complete</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <TeamFlag code={mt.team_a_code} size={40} className="w-6 h-4 flex-shrink-0" />
                          <span className="truncate">{mt.team_a_name}</span>
                          <span className="text-gray-400 font-normal">vs</span>
                          <TeamFlag code={mt.team_b_code} size={40} className="w-6 h-4 flex-shrink-0" />
                          <span className="truncate">{mt.team_b_name}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatKickoff(mt.kickoff_at)}</p>
                        {isSettled && mt.score_a !== null && mt.score_b !== null && (
                          <p className="text-xs mt-1 flex items-center gap-1 flex-wrap">
                            <span className="text-gray-500">Result:</span>
                            <span className="font-semibold text-gray-700">{mt.score_a}–{mt.score_b}</span>
                            {mt.winner && mt.winner !== 'DRAW' && (
                              <span className="text-gray-500 inline-flex items-center gap-1">
                                (<TeamFlag code={mt.winner === 'A' ? mt.team_a_code : mt.team_b_code} size={40} className="w-4 h-3" />
                                {mt.winner === 'A' ? mt.team_a_code : mt.team_b_code} won)
                              </span>
                            )}
                            {mt.winner === 'DRAW' && <span className="text-gray-500">(Draw)</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isSettled && (
                    <div className="border-t border-gray-100 flex">
                      <button
                        onClick={() => openSettle(mt)}
                        className="flex-1 py-2.5 text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Settle
                      </button>
                      <div className="w-px bg-gray-100" />
                      <button
                        onClick={() => openEdit(mt)}
                        className="flex-1 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Edit
                      </button>
                      <div className="w-px bg-gray-100" />
                      <button
                        onClick={() => setDeleteTarget(mt)}
                        className="flex-1 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-base">{editMatch ? 'Edit Match' : 'Add Match'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Team A</label>
                  <select
                    name="team_a_id"
                    value={form.team_a_id}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors bg-white"
                  >
                    <option value="">Select…</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.short_code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Team B</label>
                  <select
                    name="team_b_id"
                    value={form.team_b_id}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors bg-white"
                  >
                    <option value="">Select…</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.short_code})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Stage</label>
                <select
                  name="stage"
                  value={form.stage}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="group">Group (×1)</option>
                  <option value="r16">Round of 16 (×1.5)</option>
                  <option value="qf">Quarter-final (×2)</option>
                  <option value="sf">Semi-final (×3)</option>
                  <option value="final">Final (×5)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Kickoff (IST)
                </label>
                <input
                  type="datetime-local"
                  name="kickoff_at"
                  value={form.kickoff_at}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                />
                <p className="text-[10px] text-gray-400 mt-1">Enter in Indian Standard Time. Predictions lock at this time.</p>
              </div>

              {form.team_a_id && form.team_b_id && form.team_a_id !== form.team_b_id && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 text-xs text-orange-700 flex items-center gap-1.5 flex-wrap">
                  <TeamFlag code={teamById[form.team_a_id]?.short_code} size={40} className="w-5 h-3.5" />
                  <span className="font-semibold">{teamById[form.team_a_id]?.name}</span>
                  <span className="opacity-60">vs</span>
                  <TeamFlag code={teamById[form.team_b_id]?.short_code} size={40} className="w-5 h-3.5" />
                  <span className="font-semibold">{teamById[form.team_b_id]?.name}</span>
                  <span className="ml-1 opacity-70">· {STAGE_LABEL[form.stage]} · ×{STAGE_MULTIPLIER[form.stage]}</span>
                </div>
              )}

              {saveError && <p className="text-xs text-red-500">{saveError}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60 mt-1"
              >
                {saving ? 'Saving…' : editMatch ? 'Save Changes' : 'Add Match'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm">
            <p className="font-bold text-gray-800 text-base mb-1">Delete match?</p>
            <p className="text-sm text-gray-500 mb-4">
              "{deleteTarget.team_a_name} vs {deleteTarget.team_b_name}" will be hidden.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOTM top-up modal */}
      {motmMatch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeMotm} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-800 text-base">Award MOTM Bonus</h2>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                  <TeamFlag code={motmMatch.team_a_code} size={40} className="w-4 h-3" />
                  <span>{motmMatch.team_a_name}</span>
                  <span className="opacity-60">{motmMatch.score_a}–{motmMatch.score_b}</span>
                  <TeamFlag code={motmMatch.team_b_code} size={40} className="w-4 h-3" />
                  <span>{motmMatch.team_b_name}</span>
                  <span className="opacity-60">· ×{motmMatch.multiplier}</span>
                </p>
              </div>
              <button onClick={closeMotm} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {motmResult ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-3xl mb-1">🌟</p>
                  <p className="text-sm font-bold text-emerald-800">MOTM bonus awarded</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    {motmResult.users_topped_up} user{motmResult.users_topped_up === 1 ? '' : 's'} got +{Math.round(motmResult.per_user_bonus)} ⚽ each
                  </p>
                </div>
                <button
                  onClick={closeMotm}
                  className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-2">
                  Pick the Man of the Match. Every user who predicted this exact player will receive <b>+{Math.round(8 * Number(motmMatch.multiplier))} ⚽</b>.
                </p>
                <select
                  value={motmPlayerId}
                  onChange={e => setMotmPlayerId(e.target.value)}
                  disabled={motmLoadingPlayers}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors bg-white mb-3"
                >
                  <option value="">{motmLoadingPlayers ? 'Loading squads…' : 'Select MOTM'}</option>
                  <optgroup label={motmMatch.team_a_name}>
                    {motmTeamA.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                  </optgroup>
                  <optgroup label={motmMatch.team_b_name}>
                    {motmTeamB.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                  </optgroup>
                </select>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-[11px] text-amber-800 mb-3">
                  <p className="font-semibold mb-0.5">One-shot action</p>
                  <p>This can only be done once per match. After awarding, the match flips to "Complete" and the queue clears.</p>
                </div>

                {motmError && <p className="text-xs text-red-500 mb-2">{motmError}</p>}

                <button
                  onClick={handleMotmAward}
                  disabled={motmSaving}
                  className="w-full py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  {motmSaving ? 'Awarding…' : 'Award MOTM Bonus'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* First-scorer modal (Bonanza only) */}
      {fsMatch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeFs} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-800 text-base">Set First Scorer <span className="text-purple-600">· Bonanza</span></h2>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                  <TeamFlag code={fsMatch.team_a_code} size={40} className="w-4 h-3" />
                  <span>{fsMatch.team_a_name}</span>
                  <span className="opacity-60">{fsMatch.score_a}–{fsMatch.score_b}</span>
                  <TeamFlag code={fsMatch.team_b_code} size={40} className="w-4 h-3" />
                  <span>{fsMatch.team_b_name}</span>
                </p>
              </div>
              <button onClick={closeFs} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {fsResult ? (
              <div className="space-y-3">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                  <p className="text-3xl mb-1">⚽</p>
                  <p className="text-sm font-bold text-purple-800">First scorer set — Bonanza re-graded</p>
                  <p className="text-xs text-purple-700 mt-1">
                    {fsResult.bonanza_winners} bonanza player{fsResult.bonanza_winners === 1 ? '' : 's'} got +{fsResult.per_user_bonus} pts each
                  </p>
                </div>
                <button
                  onClick={closeFs}
                  className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-2">
                  Pick who scored the <b>opening goal</b>. Every Bonanza prediction naming this exact player earns <b>+25 pts</b>. Regular football scoring is unaffected.
                </p>
                <select
                  value={fsPlayerId}
                  onChange={e => setFsPlayerId(e.target.value)}
                  disabled={fsLoadingPlayers}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 transition-colors bg-white mb-3"
                >
                  <option value="">{fsLoadingPlayers ? 'Loading squads…' : 'Select first scorer'}</option>
                  <optgroup label={fsMatch.team_a_name}>
                    {fsTeamA.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                  </optgroup>
                  <optgroup label={fsMatch.team_b_name}>
                    {fsTeamB.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                  </optgroup>
                </select>

                <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 text-[11px] text-purple-800 mb-3">
                  <p className="font-semibold mb-0.5">Safe to re-run</p>
                  <p>Bonanza rows are re-graded from scratch. Existing MOTM points (if already picked) are preserved.</p>
                </div>

                {fsError && <p className="text-xs text-red-500 mb-2">{fsError}</p>}

                <button
                  onClick={handleFsAward}
                  disabled={fsSaving}
                  className="w-full py-2.5 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-60"
                >
                  {fsSaving ? 'Saving…' : 'Set First Scorer'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Settle match modal */}
      {settleMatch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeSettle} />
          <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-800 text-base">Settle Match</h2>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                  <TeamFlag code={settleMatch.team_a_code} size={40} className="w-4 h-3" />
                  <span>{settleMatch.team_a_name}</span>
                  <span className="opacity-60">vs</span>
                  <TeamFlag code={settleMatch.team_b_code} size={40} className="w-4 h-3" />
                  <span>{settleMatch.team_b_name}</span>
                  <span className="opacity-60">·</span>
                  <span className="text-orange-600 font-semibold">×{settleMatch.multiplier}</span>
                </p>
              </div>
              <button onClick={closeSettle} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Success view after settle */}
            {settleResult ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-sm font-bold text-green-800 mb-1">✓ {settleResult.message}</p>
                  <p className="text-xs text-green-700">{settleResult.match} · {settleResult.winner === 'DRAW' ? 'Draw' : settleResult.winner === 'A' ? settleMatch.team_a_code : settleMatch.team_b_code} won {settleResult.score}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Predictions</p>
                    <p className="text-lg font-bold text-gray-800">{settleResult.predictions_settled}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Users Won</p>
                    <p className="text-lg font-bold text-gray-800">{settleResult.users_awarded}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">ProCoins</p>
                    <p className="text-lg font-bold text-orange-600">{settleResult.coins_distributed}</p>
                  </div>
                </div>
                <button
                  onClick={closeSettle}
                  className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors mt-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSettle} className="space-y-3">
                {/* Scores */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Final Score</label>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1 truncate flex items-center gap-1">
                        <TeamFlag code={settleMatch.team_a_code} size={40} className="w-4 h-3" />
                        <span className="truncate">{settleMatch.team_a_name}</span>
                      </p>
                      <input
                        type="number"
                        min="0"
                        name="score_a"
                        value={settleForm.score_a}
                        onChange={handleSettleFormChange}
                        placeholder="0"
                        className="w-full px-3 py-2 text-center text-lg font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                    <div className="text-gray-400 font-bold text-lg pt-4">–</div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1 truncate flex items-center gap-1">
                        <TeamFlag code={settleMatch.team_b_code} size={40} className="w-4 h-3" />
                        <span className="truncate">{settleMatch.team_b_name}</span>
                      </p>
                      <input
                        type="number"
                        min="0"
                        name="score_b"
                        value={settleForm.score_b}
                        onChange={handleSettleFormChange}
                        placeholder="0"
                        className="w-full px-3 py-2 text-center text-lg font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                  </div>
                  {settleForm.winner && (
                    <p className="text-[11px] text-orange-600 font-medium mt-1.5">
                      Winner: {settleForm.winner === 'DRAW' ? 'Draw' : settleForm.winner === 'A' ? settleMatch.team_a_name : settleMatch.team_b_name} (auto-detected from scores)
                    </p>
                  )}
                </div>

                {/* First scorer */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">First Goal Scorer <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    name="first_scorer_id"
                    value={settleForm.first_scorer_id}
                    onChange={handleSettleFormChange}
                    disabled={loadingPlayers}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors bg-white"
                  >
                    <option value="">{loadingPlayers ? 'Loading squads…' : 'Select scorer (or skip)'}</option>
                    <optgroup label={settleMatch.team_a_name}>
                      {teamAPlayers.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                    </optgroup>
                    <optgroup label={settleMatch.team_b_name}>
                      {teamBPlayers.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                    </optgroup>
                  </select>
                </div>

                {/* MOTM */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Man of the Match <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    name="motm_id"
                    value={settleForm.motm_id}
                    onChange={handleSettleFormChange}
                    disabled={loadingPlayers}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors bg-white"
                  >
                    <option value="">{loadingPlayers ? 'Loading squads…' : 'Select MOTM (or skip)'}</option>
                    <optgroup label={settleMatch.team_a_name}>
                      {teamAPlayers.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                    </optgroup>
                    <optgroup label={settleMatch.team_b_name}>
                      {teamBPlayers.map(p => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}</option>)}
                    </optgroup>
                  </select>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-[11px] text-amber-800">
                  <p className="font-semibold mb-0.5">Heads up</p>
                  <p>Settling is permanent. All users who predicted this match get their ProCoins immediately (multiplied by ×{settleMatch.multiplier} stage bonus + any streak bonus).</p>
                </div>

                {settleError && <p className="text-xs text-red-500">{settleError}</p>}

                <button
                  type="submit"
                  disabled={settling}
                  className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 mt-1"
                >
                  {settling ? 'Settling & awarding coins…' : 'Settle Match & Award Coins'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
