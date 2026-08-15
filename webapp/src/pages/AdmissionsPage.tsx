import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'

const IMG_BASE = MEDIA_BASE

type AdmissionClient = {
  id: string
  name: string
  mobile: string
  photo: string | null
  gender: string
  admissionDate: string  // raw from DB (may be dd/mm/yy or dd/mm/yyyy)
  parsedDate: Date
  displayDate: string    // normalized dd/mm/yyyy
}

type GroupTab = 'week' | 'month' | 'year'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}

function resolvePhoto(photo: string | null | undefined): string | null {
  if (!photo) return null
  return photo.startsWith('http') ? photo : `${IMG_BASE}/${photo}`
}

// Handles both dd/mm/yyyy and dd/mm/yy
function parseAdmissionDate(s: string): Date {
  if (!s) return new Date(NaN)
  const p = s.split('/')
  if (p.length !== 3) return new Date(NaN)
  const dd = parseInt(p[0]), mm = parseInt(p[1])
  let yy = parseInt(p[2])
  if (yy < 100) yy += 2000
  return new Date(yy, mm - 1, dd)
}

function toDisplayDate(d: Date): string {
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function getWeekStart(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay() || 7   // Mon=1 … Sun=7
  copy.setDate(copy.getDate() - (day - 1))
  return copy
}

function getWeekEnd(start: Date): Date {
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

// Key is Monday's YYYY-MM-DD so lexicographic sort == chronological sort
function weekKey(d: Date): string {
  const start = getWeekStart(d)
  const dd = String(start.getDate()).padStart(2, '0')
  const mm = String(start.getMonth() + 1).padStart(2, '0')
  return `${start.getFullYear()}-${mm}-${dd}`
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function yearKey(d: Date): string {
  return String(d.getFullYear())
}

function weekLabel(key: string): string {
  // key is YYYY-MM-DD (Monday)
  const [y, m, d] = key.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = getWeekEnd(start)
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  const startStr = start.toLocaleDateString('en-IN', opts)
  const endStr   = end.toLocaleDateString('en-IN', { ...opts, year: 'numeric' })
  return `${startStr} – ${endStr}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function AdmissionsPage() {
  const navigate = useNavigate()

  const [clients, setClients] = useState<AdmissionClient[] | null>(null)
  const [loading, setLoading]  = useState(true)
  const [search, setSearch]    = useState('')
  const [gender, setGender]    = useState<'all' | 'male' | 'female'>('all')
  const [groupTab, setGroupTab] = useState<GroupTab>('month')

  useEffect(() => {
    fetch(`${API_BASE}/client/allWithPackages.php`)
      .then(r => r.json())
      .then((data: Record<string, string>[]) => {
        const list: AdmissionClient[] = (Array.isArray(data) ? data : [])
          .map(m => {
            const parsed = parseAdmissionDate(m.admissionDate || '')
            return {
              id:            String(m.id),
              name:          m.name   || '',
              mobile:        m.mobile || '',
              photo:         resolvePhoto(m.photo),
              gender:        (m.gender || '').toLowerCase(),
              admissionDate: m.admissionDate || '',
              parsedDate:    parsed,
              displayDate:   toDisplayDate(parsed),
            }
          })
          .filter(c => !isNaN(c.parsedDate.getTime()))
          .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime())
        setClients(list)
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!Array.isArray(clients)) return []
    const q = search.trim().toLowerCase()
    return clients.filter(c => {
      if (gender !== 'all' && c.gender !== gender) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.mobile.includes(q)) return false
      return true
    })
  }, [clients, search, gender])

  const groups = useMemo(() => {
    const map = new Map<string, AdmissionClient[]>()
    for (const c of filtered) {
      const key = groupTab === 'week'  ? weekKey(c.parsedDate)
                : groupTab === 'month' ? monthKey(c.parsedDate)
                : yearKey(c.parsedDate)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered, groupTab])

  function groupLabel(key: string): string {
    if (groupTab === 'week')  return weekLabel(key)
    if (groupTab === 'month') return monthLabel(key)
    return key
  }

  const groupUnit = groupTab === 'week' ? 'week' : groupTab === 'month' ? 'month' : 'year'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Admissions</h1>
            {!loading && Array.isArray(clients) && (
              <p className="text-xs text-gray-400">{clients.length} total gym members</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-8">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or mobile…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters + Group toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {(['all', 'male', 'female'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  gender === g
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {g === 'all' ? 'All' : g === 'male' ? '♂ Male' : '♀ Female'}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1">
            {(['week', 'month', 'year'] as GroupTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setGroupTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  groupTab === tab
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'week' ? 'Week' : tab === 'month' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary line */}
        {!loading && (
          <p className="text-xs text-gray-400">
            {filtered.length} member{filtered.length !== 1 ? 's' : ''} across{' '}
            {groups.length} {groupUnit}{groups.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="divide-y divide-gray-50">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
                        <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-gray-700">No admissions found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try a different search or filter.
            </p>
          </div>
        )}

        {/* Grouped sections */}
        {!loading && groups.map(([key, members]) => (
          <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Section header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-800 text-sm">
                {groupTab === 'week' ? '📅 ' : groupTab === 'month' ? '📆 ' : '🗓️ '}
                {groupLabel(key)}
              </p>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Members */}
            <div className="divide-y divide-gray-50">
              {members.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div className={`relative w-10 h-10 rounded-full ${avatarColor(c.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden`}>
                    <span className="select-none">{c.name.charAt(0).toUpperCase()}</span>
                    {c.photo && (
                      <img
                        src={c.photo}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                  </div>

                  {/* Name + mobile */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">📱 {c.mobile || '—'}</p>
                  </div>

                  {/* Date + gender */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{c.displayDate}</p>
                    <p className={`text-xs mt-0.5 font-medium ${
                      c.gender === 'male'   ? 'text-blue-400'
                    : c.gender === 'female' ? 'text-pink-400'
                    : 'text-gray-300'
                    }`}>
                      {c.gender === 'male' ? '♂ Male' : c.gender === 'female' ? '♀ Female' : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
