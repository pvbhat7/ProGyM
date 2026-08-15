import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

interface Team {
  id: string
  name: string
  short_code: string
  flag: string | null
}

interface Player {
  id: string
  team_id: string
  name: string
  position: string | null
  jersey_number: string | null
}

interface SettleResponse {
  message: string
  users_awarded?: number
  coins_distributed?: number
}

// Two-step picker used for Golden Ball / Boot / Glove: admin picks a team first
// (usually the finalists or a top-scoring team), then picks a player from that team.
function PlayerPicker({ label, teams, playersByTeam, teamId, setTeamId, playerId, setPlayerId, onLoadTeam }:{
  label: string
  teams: Team[]
  playersByTeam: Record<string, Player[]>
  teamId: string
  setTeamId: (v: string) => void
  playerId: string
  setPlayerId: (v: string) => void
  onLoadTeam: (teamId: string) => void
}) {
  const roster = teamId ? playersByTeam[teamId] : undefined
  const loading = Boolean(teamId) && roster === undefined
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <select
          value={teamId}
          onChange={e => {
            const v = e.target.value
            setTeamId(v)
            setPlayerId('')
            if (v) onLoadTeam(v)
          }}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 bg-white"
        >
          <option value="">Team…</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.short_code} · {t.name}</option>)}
        </select>
        <select
          value={playerId}
          onChange={e => setPlayerId(e.target.value)}
          disabled={!teamId || loading}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 bg-white disabled:bg-gray-50"
        >
          <option value="">{!teamId ? 'Pick team first' : loading ? 'Loading…' : 'Player…'}</option>
          {roster && roster.map(p => (
            <option key={p.id} value={p.id}>
              {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}{p.position ? ` · ${p.position}` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function AdminWorldCupAwardsPage() {
  const navigate = useNavigate()

  const [teams, setTeams] = useState<Team[]>([])
  const [playersByTeam, setPlayersByTeam] = useState<Record<string, Player[]>>({})
  const [loadingTeams, setLoadingTeams] = useState(true)

  const [winnerTeamId, setWinnerTeamId] = useState('')

  const [ballTeamId, setBallTeamId] = useState('')
  const [ballPlayerId, setBallPlayerId] = useState('')
  const [bootTeamId, setBootTeamId] = useState('')
  const [bootPlayerId, setBootPlayerId] = useState('')
  const [gloveTeamId, setGloveTeamId] = useState('')
  const [glovePlayerId, setGlovePlayerId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<SettleResponse | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/wc_teams/all.php`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(list => setTeams(Array.isArray(list) ? list : []))
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false))
  }, [])

  function loadTeamRoster(teamId: string) {
    if (playersByTeam[teamId]) return
    fetch(`${API_BASE}/wc_players/byTeamId.php?team_id=${teamId}`)
      .then(r => r.ok ? r.json() : [])
      .then((list: Player[]) => setPlayersByTeam(prev => ({ ...prev, [teamId]: Array.isArray(list) ? list : [] })))
      .catch(() => setPlayersByTeam(prev => ({ ...prev, [teamId]: [] })))
  }

  const allFilled = useMemo(() =>
    !!winnerTeamId && !!ballPlayerId && !!bootPlayerId && !!glovePlayerId,
    [winnerTeamId, ballPlayerId, bootPlayerId, glovePlayerId]
  )

  function pickTeamName(id: string): string {
    const t = teams.find(x => x.id === id)
    return t ? `${t.short_code} · ${t.name}` : id
  }
  function pickPlayerName(teamId: string, playerId: string): string {
    const p = playersByTeam[teamId]?.find(x => x.id === playerId)
    return p ? p.name : playerId
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const body = {
        actual_winner_team_id:         Number(winnerTeamId),
        actual_golden_ball_player_id:  Number(ballPlayerId),
        actual_golden_boot_player_id:  Number(bootPlayerId),
        actual_golden_glove_player_id: Number(glovePlayerId),
      }
      const r = await fetch(`${API_BASE}/wc_tournament_predictions/settle.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`)
      setResult(j)
      setShowConfirm(false)
    } catch (e: any) {
      setError(e?.message || 'Settle failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/admin-worldcup-matches')} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Tournament Awards</h1>
            <p className="text-xs text-gray-400">Settle Major Awards (Winner + Golden Ball / Boot / Glove) after the final</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 pb-8 space-y-4">
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
            <p className="font-bold">✅ {result.message}</p>
            {typeof result.users_awarded === 'number' && (
              <p className="mt-1 text-xs">
                {result.users_awarded} user{result.users_awarded === 1 ? '' : 's'} awarded · {result.coins_distributed} ⚽ distributed.
              </p>
            )}
            <p className="mt-1 text-[11px] text-green-700">Re-running with the same picks is safe — already-settled rows are skipped.</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-900">
          <p className="font-bold">Heads up</p>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            <li>Winner correct → +100 ⚽ · Golden Ball / Boot / Glove correct → +50 ⚽ each · Max 250 ⚽.</li>
            <li>Every user with matching picks gets coins immediately; totals roll into the leaderboard.</li>
            <li>Rerunning this action skips already-settled users — safe to retry if a call fails midway.</li>
          </ul>
        </div>

        {loadingTeams ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">Loading teams…</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">World Cup Winner (+100 ⚽)</label>
              <select
                value={winnerTeamId}
                onChange={e => setWinnerTeamId(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 bg-white"
              >
                <option value="">Winning team…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.short_code} · {t.name}</option>)}
              </select>
            </div>

            <PlayerPicker
              label="Golden Ball (+50 ⚽) — best player"
              teams={teams} playersByTeam={playersByTeam}
              teamId={ballTeamId} setTeamId={setBallTeamId}
              playerId={ballPlayerId} setPlayerId={setBallPlayerId}
              onLoadTeam={loadTeamRoster}
            />
            <PlayerPicker
              label="Golden Boot (+50 ⚽) — top scorer"
              teams={teams} playersByTeam={playersByTeam}
              teamId={bootTeamId} setTeamId={setBootTeamId}
              playerId={bootPlayerId} setPlayerId={setBootPlayerId}
              onLoadTeam={loadTeamRoster}
            />
            <PlayerPicker
              label="Golden Glove (+50 ⚽) — best goalkeeper"
              teams={teams} playersByTeam={playersByTeam}
              teamId={gloveTeamId} setTeamId={setGloveTeamId}
              playerId={glovePlayerId} setPlayerId={setGlovePlayerId}
              onLoadTeam={loadTeamRoster}
            />

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!allFilled || submitting}
              className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              Settle Tournament Awards
            </button>
          </div>
        )}
      </main>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center px-4" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-800">Confirm tournament settlement</h2>
            <p className="text-xs text-gray-500 mt-1">Users with matching picks will be credited immediately.</p>

            <div className="mt-3 text-sm space-y-1.5">
              <div className="flex justify-between gap-2"><span className="text-gray-500">Winner</span><span className="font-semibold text-gray-800 text-right">{pickTeamName(winnerTeamId)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500">Golden Ball</span><span className="font-semibold text-gray-800 text-right">{pickPlayerName(ballTeamId, ballPlayerId)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500">Golden Boot</span><span className="font-semibold text-gray-800 text-right">{pickPlayerName(bootTeamId, bootPlayerId)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-gray-500">Golden Glove</span><span className="font-semibold text-gray-800 text-right">{pickPlayerName(gloveTeamId, glovePlayerId)}</span></div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-60"
              >
                {submitting ? 'Settling…' : 'Yes, settle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
