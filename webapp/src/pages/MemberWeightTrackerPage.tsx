import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import NotificationBell from '../components/NotificationBell'

type Entry = { id: number; cid: number; date: string; weight: number }

function toApiDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)}/${parseInt(m)}/${y}`
}

function displayDate(apiDate: string): string {
  const [d, m, y] = apiDate.split('/')
  if (!d || !m || !y) return apiDate
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function WeightChart({ entries }: { entries: Entry[] }) {
  const sorted = [...entries].sort((a, b) => a.id - b.id)

  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Add at least 2 entries to see the chart
      </div>
    )
  }

  const weights = sorted.map(e => e.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const pad = maxW === minW ? 2 : (maxW - minW) * 0.2
  const yMin = minW - pad
  const yMax = maxW + pad

  const W = 300, H = 120
  const pL = 38, pR = 8, pT = 10, pB = 24
  const cW = W - pL - pR
  const cH = H - pT - pB

  const xS = (i: number) => pL + (i / (sorted.length - 1)) * cW
  const yS = (w: number) => pT + (1 - (w - yMin) / (yMax - yMin)) * cH

  const pts = sorted.map((e, i) => ({ x: xS(i), y: yS(e.weight), w: e.weight, date: e.date }))
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaD = `${lineD} L${pts[pts.length - 1].x},${pT + cH} L${pts[0].x},${pT + cH}Z`

  const yTicks = [yMin, (yMin + yMax) / 2, yMax]
  const xLabelIdxs = Array.from(new Set([0, Math.floor((sorted.length - 1) / 2), sorted.length - 1]))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
      <defs>
        <linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={pL} y1={yS(v)} x2={W - pR} y2={yS(v)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={pL - 4} y={yS(v) + 3.5} textAnchor="end" fontSize="8" fill="#9ca3af">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      <path d={areaD} fill="url(#wtGrad)" opacity="0.25" />
      <path d={lineD} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#f97316" stroke="white" strokeWidth="1.5" />
      ))}
      {xLabelIdxs.map(i => (
        <text key={i} x={pts[i].x} y={H - 6} textAnchor="middle" fontSize="7.5" fill="#9ca3af">
          {(() => { const [d, m] = pts[i].date.split('/'); return `${d}/${m}` })()}
        </text>
      ))}
    </svg>
  )
}

export default function MemberWeightTrackerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const backPath = user?.role === 'admin' ? '/dashboard' : '/member-dashboard'
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(todayIso())
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const cid = user?.userId

  const load = async () => {
    if (!cid) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/WeightTracker/byCidList.php?cid=${cid}`)
      if (res.ok) setEntries(await res.json())
    } catch { /* network error — leave list empty */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(weight)
    if (!w || w < 20 || w > 300) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`${API_BASE}/WeightTracker/add.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid, date: toApiDate(date), weight: w }),
      })
      const text = await res.text()
      if (text.toLowerCase().includes('added')) {
        setSaveMsg('✓ Weight logged!')
        setWeight('')
        await load()
      } else {
        setSaveMsg('Failed to save. Try again.')
      }
    } catch {
      setSaveMsg('Network error.')
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await fetch(`${API_BASE}/WeightTracker/deleteById.php?id=${id}`)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch { /* silently ignore */ }
    setDeletingId(null)
  }

  const sorted = [...entries].sort((a, b) => b.id - a.id)

  const overallDelta = (() => {
    if (sorted.length < 2) return null
    const diff = sorted[0].weight - sorted[sorted.length - 1].weight
    return diff
  })()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">Weight Tracker</h1>
            <p className="text-xs text-gray-400">Log and monitor your weight</p>
          </div>
          <NotificationBell />
          {overallDelta !== null && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              overallDelta < 0 ? 'bg-green-100 text-green-700' :
              overallDelta > 0 ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {overallDelta > 0 ? '▲' : overallDelta < 0 ? '▼' : '—'} {Math.abs(overallDelta).toFixed(1)} kg
            </span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Log weight form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Log Weight</h2>
          <form onSubmit={handleAdd} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                max={todayIso()}
                onChange={e => setDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-gray-500 mb-1.5">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                min="20"
                max="300"
                step="0.1"
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 72.5"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !weight}
              className="h-[42px] px-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-40 transition-all whitespace-nowrap active:scale-95"
            >
              {saving ? '…' : '+ Add'}
            </button>
          </form>
          {saveMsg && (
            <p className={`mt-2.5 text-sm font-medium ${saveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {saveMsg}
            </p>
          )}
        </div>

        {/* Chart */}
        {!loading && entries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Trend</h2>
            <WeightChart entries={entries} />
          </div>
        )}

        {/* History list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">History</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-3">⚖️</span>
              <p className="text-sm">No entries yet.</p>
              <p className="text-xs mt-1">Log your first weight above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {sorted.map((e, i) => {
                const prev = sorted[i + 1]
                const delta = prev != null ? e.weight - prev.weight : null
                return (
                  <li key={e.id} className="flex items-center px-5 py-3.5 gap-3">
                    <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                      {sorted.length - i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{e.weight} kg</p>
                      <p className="text-xs text-gray-400">{displayDate(e.date)}</p>
                    </div>
                    {delta !== null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        delta < 0 ? 'bg-green-100 text-green-700' :
                        delta > 0 ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                    >
                      {deletingId === e.id ? (
                        <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
