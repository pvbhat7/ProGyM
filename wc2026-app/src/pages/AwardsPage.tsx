import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { getSession } from '../services/wcSession'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { toast } from '../components/Toast'

type Team = {
  id: number
  name: string
  short_code: string
  flag?: string
  group_name?: string
}

type Player = {
  id: number
  team_id: number
  name: string
  position: string
  jersey_number?: number
}

type Award = 'winner' | 'ball' | 'boot' | 'glove'

type ServerState = {
  prediction: any | null
  submitted: boolean
  lock_at: string
  locked_now: boolean
  points: { winner: number; ball: number; boot: number; glove: number }
}

const AWARD_META: Record<Award, { icon: string; title: string; subtitle: string; accent: string }> = {
  winner: { icon: '🏆', title: 'World Cup Winner',         subtitle: 'Pick the team that lifts the trophy',         accent: 'from-amber-400 to-yellow-500' },
  ball:   { icon: '⚽', title: 'Golden Ball',              subtitle: 'Best player of the tournament',              accent: 'from-amber-300 to-orange-400' },
  boot:   { icon: '👟', title: 'Golden Boot',              subtitle: 'Top scorer of the tournament',               accent: 'from-yellow-400 to-amber-500' },
  glove:  { icon: '🧤', title: 'Golden Glove',             subtitle: 'Best goalkeeper of the tournament',          accent: 'from-amber-200 to-yellow-300' },
}

export default function AwardsPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [loading, setLoading] = useState(true)
  const [server, setServer] = useState<ServerState | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [playersCache, setPlayersCache] = useState<Record<number, Player[]>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state — local until submitted
  const [winnerTeamId,    setWinnerTeamId]    = useState<number | ''>('')
  const [ballTeamId,      setBallTeamId]      = useState<number | ''>('')
  const [ballPlayerId,    setBallPlayerId]    = useState<number | ''>('')
  const [bootTeamId,      setBootTeamId]      = useState<number | ''>('')
  const [bootPlayerId,    setBootPlayerId]    = useState<number | ''>('')
  const [gloveTeamId,     setGloveTeamId]     = useState<number | ''>('')
  const [glovePlayerId,   setGlovePlayerId]   = useState<number | ''>('')

  useEffect(() => {
    if (!session) { navigate('/signup'); return }
    Promise.all([
      fetch(`${API_BASE}/wc_tournament_predictions/byClient.php?client_id=${session.clientId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/wc_teams/all.php`).then(r => r.ok ? r.json() : []),
    ]).then(([s, ts]) => {
      setServer(s)
      setTeams(Array.isArray(ts) ? ts : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [navigate, session?.clientId])

  async function loadTeamPlayers(teamId: number): Promise<Player[]> {
    if (playersCache[teamId]) return playersCache[teamId]
    try {
      const res = await fetch(`${API_BASE}/wc_players/byTeamId.php?team_id=${teamId}`)
      const data = res.ok ? await res.json() : []
      const list = Array.isArray(data) ? data : []
      setPlayersCache(prev => ({ ...prev, [teamId]: list }))
      return list
    } catch {
      return []
    }
  }

  async function pickTeamFor(award: Award, teamId: number) {
    if (award === 'ball')  { setBallTeamId(teamId);  setBallPlayerId('') }
    if (award === 'boot')  { setBootTeamId(teamId);  setBootPlayerId('') }
    if (award === 'glove') { setGloveTeamId(teamId); setGlovePlayerId('') }
    await loadTeamPlayers(teamId)
  }

  const allPicked = !!winnerTeamId && !!ballPlayerId && !!bootPlayerId && !!glovePlayerId
  const maxWin = useMemo(() => {
    const p = server?.points
    return p ? p.winner + p.ball + p.boot + p.glove : 250
  }, [server])

  async function handleSubmit() {
    if (!session) return
    if (!allPicked) { setError('Pick all 4 awards before locking in.'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/wc_tournament_predictions/submit.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: session.clientId,
          pred_winner_team_id:         winnerTeamId,
          pred_golden_ball_player_id:  ballPlayerId,
          pred_golden_boot_player_id:  bootPlayerId,
          pred_golden_glove_player_id: glovePlayerId,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || 'Could not save')
      toast('Picks locked in 🔒')
      // Re-fetch to switch the UI into locked/read-only mode
      const ref = await fetch(`${API_BASE}/wc_tournament_predictions/byClient.php?client_id=${session.clientId}`).then(r => r.ok ? r.json() : null)
      setServer(ref)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e?.message || 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Major Awards" showBack />
        <div className="p-6 text-center text-gray-400">Loading…</div>
      </div>
    )
  }

  // ---------- LOCKED / SUBMITTED VIEW ----------
  if (server?.submitted && server.prediction) {
    const p = server.prediction
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white pb-24">
        <AppHeader title="Major Awards" showBack />
        <main className="max-w-md mx-auto px-3 py-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-4 mb-3 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🔒</span>
              <p className="font-black text-lg leading-tight">Your picks are locked</p>
            </div>
            <p className="text-emerald-50 text-sm">
              Submitted on {(p.submitted_at || '').replace('T', ' ')}. Settled when the tournament ends.
            </p>
            <p className="text-emerald-50 text-xs mt-2">Earn up to <span className="font-bold text-white">{maxWin} football coins</span></p>
          </div>

          <LockedCard award="winner" label={p.winner_team_name || '—'} sub={p.winner_team_code ? `${p.winner_team_code}` : ''} coins={server.points.winner} correct={p.winner_correct} />
          <LockedCard award="ball"   label={p.golden_ball_player_name || '—'}  sub={p.golden_ball_team_name  ? `${p.golden_ball_team_code} · ${p.golden_ball_team_name}`   : ''} coins={server.points.ball}  correct={p.ball_correct} />
          <LockedCard award="boot"   label={p.golden_boot_player_name || '—'}  sub={p.golden_boot_team_name  ? `${p.golden_boot_team_code} · ${p.golden_boot_team_name}`   : ''} coins={server.points.boot}  correct={p.boot_correct} />
          <LockedCard award="glove"  label={p.golden_glove_player_name || '—'} sub={p.golden_glove_team_name ? `${p.golden_glove_team_code} · ${p.golden_glove_team_name}` : ''} coins={server.points.glove} correct={p.glove_correct} />

          {p.settled_at && (
            <div className="mt-3 rounded-xl bg-white border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Awarded</p>
              <p className="text-2xl font-black text-amber-600">+{p.coins_awarded} ⚽</p>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    )
  }

  // ---------- LOCKED-BY-DEADLINE VIEW (never submitted) ----------
  if (server?.locked_now && !server.submitted) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <AppHeader title="Major Awards" showBack />
        <main className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="text-6xl mb-3">🔒</div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">Picks closed</h2>
          <p className="text-sm text-gray-600 mb-5">
            The deadline for tournament award picks has passed. They open again next tournament.
          </p>
        </main>
        <BottomNav />
      </div>
    )
  }

  // ---------- OPEN / PICK VIEW ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white pb-28">
      <AppHeader title="Major Awards" showBack />
      <main className="max-w-md mx-auto px-3 py-3">

        {/* Hero / warning callout */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white p-4 mb-3 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="font-black text-lg leading-tight">Tournament Major Awards</p>
              <p className="text-amber-50 text-xs">Settled at end of tournament</p>
            </div>
          </div>
          <p className="text-amber-50 text-sm mt-1">
            Pick all 4 awards in one shot. <span className="font-bold underline">Once submitted, they're locked forever — no changes.</span>
          </p>
          <p className="text-amber-50 text-xs mt-2">Earn up to <span className="font-bold text-white">{maxWin} football coins</span></p>
          {server?.lock_at && (
            <p className="text-amber-50 text-[11px] mt-1">Picks close: {server.lock_at}</p>
          )}
        </div>

        {/* World Cup Winner — team-only */}
        <PickCard award="winner" coins={server?.points.winner ?? 100} done={!!winnerTeamId}>
          <select
            value={winnerTeamId}
            onChange={e => setWinnerTeamId(e.target.value ? Number(e.target.value) : '')}
            className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 rounded-xl outline-none font-semibold border-amber-200 bg-amber-50/40 focus:border-amber-500"
          >
            <option value="">— Pick the champion team —</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.short_code} · {t.name}{t.group_name ? ` · Group ${t.group_name}` : ''}</option>
            ))}
          </select>
        </PickCard>

        {/* Golden Ball — best player */}
        <TwoStepPicker
          award="ball"
          coins={server?.points.ball ?? 50}
          teams={teams}
          teamId={ballTeamId}
          playerId={ballPlayerId}
          players={ballTeamId ? playersCache[ballTeamId] || [] : []}
          onTeam={tid => pickTeamFor('ball', tid)}
          onPlayer={pid => setBallPlayerId(pid)}
        />

        {/* Golden Boot — top scorer */}
        <TwoStepPicker
          award="boot"
          coins={server?.points.boot ?? 50}
          teams={teams}
          teamId={bootTeamId}
          playerId={bootPlayerId}
          players={bootTeamId ? playersCache[bootTeamId] || [] : []}
          onTeam={tid => pickTeamFor('boot', tid)}
          onPlayer={pid => setBootPlayerId(pid)}
        />

        {/* Golden Glove — best goalkeeper */}
        <TwoStepPicker
          award="glove"
          coins={server?.points.glove ?? 50}
          teams={teams}
          teamId={gloveTeamId}
          playerId={glovePlayerId}
          players={gloveTeamId ? (playersCache[gloveTeamId] || []).filter(p => (p.position || '').toUpperCase().startsWith('G')) : []}
          onTeam={tid => pickTeamFor('glove', tid)}
          onPlayer={pid => setGlovePlayerId(pid)}
          playerHint="Only goalkeepers"
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 my-2 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>{error}
          </div>
        )}

        <div className="mt-3 mb-1 px-2 text-[11px] text-gray-500 leading-relaxed">
          ⚠️ Locking is permanent. Picks cannot be changed after submission, even before the deadline.
        </div>
      </main>

      {/* Sticky submit footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_18px_-8px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex-shrink-0">
            <p className="text-[10px] text-gray-500 leading-none uppercase tracking-wider font-bold">Max ⚽</p>
            <p className="text-lg font-black text-amber-700 leading-tight">+{maxWin} ⚽</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !allPicked}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-md disabled:opacity-60 active:scale-[0.99] transition-transform"
          >
            {saving ? 'Locking…' : !allPicked ? 'Pick all 4 to lock in' : '🔒 Lock my picks'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- helpers -----

function PickCard({ award, coins, done, children }: { award: Award; coins: number; done: boolean; children: React.ReactNode }) {
  const m = AWARD_META[award]
  return (
    <div className={`relative rounded-2xl p-3 mb-2.5 border transition-all ${done ? 'border-amber-300 bg-gradient-to-br from-amber-50/80 to-white' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.accent} flex items-center justify-center text-lg shadow`}>
            {m.icon}
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 leading-tight">{m.title}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{m.subtitle}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">+{coins} ⚽</span>
      </div>
      {children}
    </div>
  )
}

function TwoStepPicker({ award, coins, teams, teamId, playerId, players, onTeam, onPlayer, playerHint }: {
  award: Award
  coins: number
  teams: Team[]
  teamId: number | ''
  playerId: number | ''
  players: Player[]
  onTeam: (id: number) => void
  onPlayer: (id: number) => void
  playerHint?: string
}) {
  return (
    <PickCard award={award} coins={coins} done={!!playerId}>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={teamId}
          onChange={e => onTeam(Number(e.target.value))}
          className="w-full appearance-none px-2.5 py-2 text-xs border-2 rounded-xl outline-none font-semibold border-amber-200 bg-amber-50/40 focus:border-amber-500"
        >
          <option value="">— Pick team —</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.short_code} · {t.name}</option>)}
        </select>
        <select
          value={playerId}
          onChange={e => onPlayer(Number(e.target.value))}
          disabled={!teamId}
          className="w-full appearance-none px-2.5 py-2 text-xs border-2 rounded-xl outline-none font-semibold border-amber-200 bg-amber-50/40 focus:border-amber-500 disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">{teamId ? '— Pick player —' : '(team first)'}</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>
              {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}{p.position ? ` · ${p.position}` : ''}
            </option>
          ))}
        </select>
      </div>
      {playerHint && <p className="text-[10px] text-gray-500 mt-1.5 px-1">{playerHint}</p>}
    </PickCard>
  )
}

function LockedCard({ award, label, sub, coins, correct }: { award: Award; label: string; sub: string; coins: number; correct?: string }) {
  const m = AWARD_META[award]
  const isCorrect = correct === 'yes'
  const isIncorrect = correct === 'no' && correct !== undefined
  return (
    <div className={`rounded-2xl p-3 mb-2.5 border bg-white ${isCorrect ? 'border-emerald-300' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.accent} flex items-center justify-center text-lg shadow`}>
            {m.icon}
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 leading-tight">{m.title}</p>
            <p className="text-[11px] text-gray-500 leading-tight">+{coins} ⚽ if correct</p>
          </div>
        </div>
        {isCorrect && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ +{coins}</span>}
        {isIncorrect && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">✗</span>}
      </div>
      <div className="px-1 py-1">
        <p className="text-base font-bold text-gray-900">{label}</p>
        {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}
