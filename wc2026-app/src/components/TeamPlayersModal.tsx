import { useEffect, useState } from 'react'
import { API_BASE } from '../api/config'
import TeamFlag from './TeamFlag'

interface Player {
  id: string
  team_id: string
  name: string
  position: string | null
  jersey_number: string | null
}

interface Props {
  teamId: number
  teamName: string
  teamCode: string
  groupName?: string | null
  onClose: () => void
}

// Loosely sort by typical position order. Falls back to alpha.
const POS_RANK: Record<string, number> = {
  'GK': 0, 'G': 0,
  'CB': 1, 'LB': 1, 'RB': 1, 'DEF': 1, 'D': 1,
  'CDM': 2, 'CM': 2, 'CAM': 2, 'LM': 2, 'RM': 2, 'MID': 2, 'M': 2,
  'LW': 3, 'RW': 3, 'CF': 3, 'ST': 3, 'FW': 3, 'F': 3,
}

function rankFor(p: Player): number {
  const pos = (p.position || '').toUpperCase().trim()
  for (const key of Object.keys(POS_RANK)) {
    if (pos.startsWith(key)) return POS_RANK[key]
  }
  return 4
}

const POS_TINT: Record<number, string> = {
  0: 'bg-amber-50 text-amber-700 border-amber-200',
  1: 'bg-blue-50 text-blue-700 border-blue-200',
  2: 'bg-blue-50 text-blue-700 border-blue-200',
  3: 'bg-rose-50 text-rose-700 border-rose-200',
  4: 'bg-gray-50 text-gray-600 border-gray-200',
}

export default function TeamPlayersModal({ teamId, teamName, teamCode, groupName, onClose }: Props) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/wc_players/byTeamId.php?team_id=${teamId}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (cancelled) return
        if (!Array.isArray(j)) { setErr(true); return }
        setPlayers(j)
      })
      .catch(() => { if (!cancelled) setErr(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [teamId])

  const sorted = players.slice().sort((a, b) => {
    const r = rankFor(a) - rankFor(b)
    if (r !== 0) return r
    const ja = parseInt(a.jersey_number || '99', 10)
    const jb = parseInt(b.jersey_number || '99', 10)
    if (ja !== jb) return ja - jb
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-900 text-white p-4 rounded-t-3xl sm:rounded-t-3xl overflow-hidden">
          <div className="absolute inset-0 opacity-[0.10] pointer-events-none"
               style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(255,255,255,0.5) 22px, rgba(255,255,255,0.5) 23px)' }} />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start gap-3">
            <TeamFlag code={teamCode} size={160} className="w-16 h-11 ring-2 ring-white/40 shadow flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight truncate">{teamName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] uppercase tracking-wider bg-white/15 backdrop-blur px-2 py-0.5 rounded-full font-semibold">{teamCode}</span>
                {groupName && (
                  <span className="text-[10px] uppercase tracking-wider bg-white/15 backdrop-blur px-2 py-0.5 rounded-full font-semibold">Group {groupName}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0" aria-label="Close">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Squad */}
        <div className="p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 mb-3 flex items-center gap-1.5">
            <span>👥</span> Squad {!loading && sorted.length > 0 && <span className="text-gray-400 font-normal">· {sorted.length} players</span>}
          </p>

          {loading && (
            <div className="space-y-1.5">
              {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          )}

          {!loading && err && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-3xl mb-2">😕</p>
              <p className="font-semibold text-gray-600">Could not load squad</p>
            </div>
          )}

          {!loading && !err && sorted.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-3xl mb-2">⚽</p>
              <p className="font-semibold text-gray-600">Squad not announced yet</p>
            </div>
          )}

          {!loading && !err && sorted.length > 0 && (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {sorted.map(p => {
                const tint = POS_TINT[rankFor(p)]
                return (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2 bg-white">
                    <span className="w-7 text-center text-xs font-black text-gray-400 tabular-nums flex-shrink-0">
                      {p.jersey_number || '—'}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{p.name}</span>
                    {p.position && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tint} flex-shrink-0`}>
                        {p.position}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

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
