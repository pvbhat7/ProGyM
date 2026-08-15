import { useEffect, useMemo, useState } from 'react'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import TeamFlag from '../components/TeamFlag'
import TeamPlayersModal from '../components/TeamPlayersModal'

interface Team {
  id: string
  name: string
  short_code: string
  flag: string | null
  group_name: string | null
}

interface StandingRow {
  team_id: number
  name: string
  short_code: string
  flag: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
}

interface GroupStandings {
  group_name: string
  teams: StandingRow[]
}

interface SelectedTeam {
  id: number
  name: string
  code: string
  group: string | null
}

export default function TeamsPage() {
  const [teams, setTeams]       = useState<Team[]>([])
  const [groups, setGroups]     = useState<GroupStandings[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<SelectedTeam | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`${API_BASE}/wc_teams/all.php`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/wc_standings/getAll.php`).then(r => r.ok ? r.json() : null),
    ]).then(([t, s]) => {
      if (cancelled) return
      setTeams(Array.isArray(t) ? t : [])
      setGroups(s && Array.isArray(s.groups) ? s.groups : [])
    }).catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Build a quick lookup from group_name -> team-list for the flag row.
  const teamsByGroup = useMemo(() => {
    const m = new Map<string, Team[]>()
    for (const t of teams) {
      const g = t.group_name || '?'
      if (!m.has(g)) m.set(g, [])
      m.get(g)!.push(t)
    }
    return m
  }, [teams])

  // Standings by group name for easy zip with flag row.
  const standingsByGroup = useMemo(() => {
    const m = new Map<string, StandingRow[]>()
    for (const g of groups) m.set(g.group_name, g.teams)
    return m
  }, [groups])

  const groupKeys = useMemo(() => {
    const keys = new Set<string>([...teamsByGroup.keys(), ...standingsByGroup.keys()])
    return Array.from(keys).filter(k => k !== '?').sort()
  }, [teamsByGroup, standingsByGroup])

  function openTeam(id: string | number, name: string, code: string, group: string | null) {
    setSelected({ id: Number(id), name, code, group })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader title="Teams" subtitle="48 nations · group standings" />

      <main className="max-w-md mx-auto px-3 py-3">
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && groupKeys.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">⚽</p>
            <p className="font-semibold text-gray-600">No teams loaded</p>
            <p className="text-sm mt-1">Check that the wc_teams API is deployed.</p>
          </div>
        )}

        {!loading && groupKeys.map(g => {
          const flagTeams = teamsByGroup.get(g) || []
          const standings = standingsByGroup.get(g) || []
          return (
            <section key={g} className="mb-4 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {/* Group header */}
              <div className="bg-gradient-to-r from-blue-50 to-amber-50 border-b border-gray-100 px-3 py-2 flex items-center justify-between">
                <p className="text-sm font-black text-gray-800 tracking-wide">Group {g}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  {flagTeams.length} {flagTeams.length === 1 ? 'team' : 'teams'}
                </p>
              </div>

              {/* Flag row — clickable */}
              <div className="grid grid-cols-4 gap-2 px-3 py-3 border-b border-gray-100">
                {flagTeams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openTeam(t.id, t.name, t.short_code, t.group_name)}
                    className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
                  >
                    <TeamFlag code={t.short_code} size={80} className="w-12 h-8 ring-1 ring-gray-200 group-hover:ring-blue-400 transition-colors shadow-sm" />
                    <span className="text-[10px] font-bold text-gray-700 group-hover:text-blue-700 transition-colors truncate w-full text-center">
                      {t.short_code}
                    </span>
                  </button>
                ))}
              </div>

              {/* Standings table */}
              {standings.length > 0 ? (
                <div className="px-2 pb-3 pt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                        <th className="px-1 py-1 text-left">#</th>
                        <th className="px-1 py-1 text-left">Team</th>
                        <th className="px-1 py-1 text-center">P</th>
                        <th className="px-1 py-1 text-center">W</th>
                        <th className="px-1 py-1 text-center">D</th>
                        <th className="px-1 py-1 text-center">L</th>
                        <th className="px-1 py-1 text-center">GD</th>
                        <th className="px-1 py-1 text-center">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, idx) => {
                        // Top 2 advance straight; 3rd is best-third candidate. Highlight accordingly.
                        const rank = idx + 1
                        const bandBg = rank <= 2
                          ? 'bg-blue-50'
                          : rank === 3
                            ? 'bg-amber-50/60'
                            : 'bg-white'
                        return (
                          <tr key={row.team_id} className={`${bandBg} border-t border-gray-100`}>
                            <td className="px-1 py-1.5 font-bold text-gray-500 tabular-nums">{rank}</td>
                            <td className="px-1 py-1.5">
                              <button
                                onClick={() => openTeam(row.team_id, row.name, row.short_code, g)}
                                className="flex items-center gap-1.5 text-left hover:text-blue-700 transition-colors"
                              >
                                <TeamFlag code={row.short_code} size={40} className="w-4 h-3 flex-shrink-0" />
                                <span className="font-semibold truncate">{row.short_code}</span>
                              </button>
                            </td>
                            <td className="px-1 py-1.5 text-center tabular-nums text-gray-600">{row.played}</td>
                            <td className="px-1 py-1.5 text-center tabular-nums text-gray-600">{row.won}</td>
                            <td className="px-1 py-1.5 text-center tabular-nums text-gray-600">{row.drawn}</td>
                            <td className="px-1 py-1.5 text-center tabular-nums text-gray-600">{row.lost}</td>
                            <td className={`px-1 py-1.5 text-center tabular-nums font-semibold ${row.goal_diff > 0 ? 'text-blue-700' : row.goal_diff < 0 ? 'text-rose-700' : 'text-gray-600'}`}>
                              {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                            </td>
                            <td className="px-1 py-1.5 text-center tabular-nums font-black text-gray-900">{row.points}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-3 py-3 text-[11px] text-gray-400 italic">No matches settled yet in this group.</p>
              )}
            </section>
          )
        })}

        <p className="mt-2 text-center text-[10px] text-gray-400">
          <span className="inline-block w-2 h-2 bg-blue-200 rounded-sm mr-1 align-middle" /> top-2 advance
          <span className="inline-block w-2 h-2 bg-amber-200 rounded-sm ml-3 mr-1 align-middle" /> best 3rd candidate
        </p>
      </main>

      <BottomNav />

      {selected && (
        <TeamPlayersModal
          teamId={selected.id}
          teamName={selected.name}
          teamCode={selected.code}
          groupName={selected.group}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
