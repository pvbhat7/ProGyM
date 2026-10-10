import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { getIdTokenOrThrow } from '../firebase'
import DietPlanPanel from '../components/DietPlanPanel'

// AI Diet Plans (admin). Pick a member, then the shared DietPlanPanel does the rest
// (the same panel is the "Diet" tab on the member profile).

type Recent = { id: number; client_id: number; name: string; title: string; created_at: string }

export default function AdminDietPlansPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const memberId = Number(params.get('member')) || 0

  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: string; name: string }[]>([])
  const [recent, setRecent] = useState<Recent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (memberId) return
    ;(async () => {
      try {
        const token = await getIdTokenOrThrow('AI Diet Plans')
        const r = await fetch(`${API_BASE}/aidiet/member.php`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json()
        if (!r.ok || d.error) throw new Error(d.error || 'Failed to load')
        setRecent(d.recent)
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    })()
  }, [memberId])

  useEffect(() => {
    if (memberId || search.trim().length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      fetch(`${API_BASE}/client/byName.php?name=${encodeURIComponent(search.trim())}`)
        .then(r => (r.ok ? r.json() : []))
        .then((d: Record<string, string>[]) => setResults(Array.isArray(d) ? d.slice(0, 12).map(c => ({ id: String(c.id), name: c.name })) : []))
        .catch(() => setResults([]))
    }, 350)
    return () => clearTimeout(t)
  }, [search, memberId])

  const pick = (id: number | string) => { setSearch(''); setResults([]); setParams({ member: String(id) }) }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => (memberId ? setParams({}) : navigate('/dashboard'))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">🥗 AI Diet Plans</h1>
            <p className="text-xs text-gray-400">Personal Indian meal plans, created with AI</p>
          </div>
          {memberId > 0 && (
            <button onClick={() => navigate(`/members/${memberId}`)} className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-3 py-1.5">
              Profile →
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {memberId > 0 ? <DietPlanPanel memberId={memberId} /> : (
          <>
            {error && <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">⚠️ {error}</div>}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 shadow-md">
              <div className="absolute -right-4 -top-6 text-[110px] opacity-15 select-none">🥗</div>
              <p className="relative font-extrabold text-lg">Create a diet plan</p>
              <p className="relative text-sm text-emerald-50/90 mb-3">Search a member to start</p>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search member by name…" autoFocus
                className="relative w-full rounded-2xl bg-white text-gray-800 px-4 py-3 text-sm outline-none shadow" />
              {results.length > 0 && (
                <div className="relative mt-2 bg-white rounded-2xl overflow-hidden divide-y divide-gray-50 shadow">
                  {results.map(r => (
                    <button key={r.id} onClick={() => pick(r.id)} className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex justify-between text-sm">
                      <span className="font-medium text-gray-800">{r.name}</span>
                      <span className="text-gray-400 text-xs">#{r.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-2">📋 Members with an active plan</p>
              {recent.length === 0
                ? <p className="text-xs text-gray-400 py-2">No AI diet plans yet.</p>
                : <div className="divide-y divide-gray-50">
                    {recent.map(r => (
                      <button key={r.id} onClick={() => pick(r.client_id)} className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2">
                        <span className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">🥗</span>
                        <span className="flex-1"><span className="block text-sm font-semibold text-gray-800">{r.name}</span><span className="block text-xs text-gray-400">{r.title}</span></span>
                        <span className="text-[11px] text-gray-400">{r.created_at.slice(0, 10).split('-').reverse().join('/')}</span>
                      </button>
                    ))}
                  </div>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
