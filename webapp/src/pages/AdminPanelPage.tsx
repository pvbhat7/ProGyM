import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_BASE } from '../api/config'
import SecurityPinDialog from '../components/SecurityPinDialog'

interface Member {
  id: string
  name: string
  mobile: string
  email: string
  gender: string
  photo: string | null
  profileActiveFlag: string
  admissionDate: string
  pkgId: string | null
  pkgFees: string | null
  pkgAmountPaid: string | null
  pkgStartDate: string | null
  pkgEndDate: string | null
  pkgStatus: string | null
  pkgName: string | null
}

type StatusFilter = 'all' | 'active' | 'inactive'
type GenderFilter = 'all' | 'male' | 'female'
type ZoneFilter  = 'all' | 'green' | 'yellow' | 'red' | 'new'

function toDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function last10Days(): string[] {
  const days: string[] = []
  const now = new Date()
  now.setHours(0,0,0,0)
  for (let i = 0; i < 10; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(toDMY(d))
  }
  return days.reverse()
}

function parseDMY(s: string | null): Date | null {
  if (!s) return null
  const p = s.split('/')
  if (p.length !== 3) return null
  return new Date(+p[2], +p[1] - 1, +p[0])
}

function calcDaysLeft(endDate: string | null): number | null {
  const end = parseDMY(endDate)
  if (!end) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / 86400000)
}

function isNewlyRegistered(admissionDate: string | null): boolean {
  const d = parseDMY(admissionDate)
  if (!d) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - d.getTime()) / 86400000) <= 30
}

function getZone(days: number | null, admissionDate?: string | null): 'green' | 'yellow' | 'red' | 'new' | 'none' {
  if (days === null) return isNewlyRegistered(admissionDate ?? null) ? 'new' : 'none'
  if (days > 5)  return 'green'
  if (days >= 0) return 'yellow'
  return 'red'
}

const ZONE_PRIORITY: Record<string, number> = { red: 0, yellow: 1, green: 2, new: 3, none: 4 }

const ROW_BG: Record<string, string> = {
  red:    'bg-red-100',
  yellow: 'bg-yellow-100',
  green:  'bg-green-100',
  new:    'bg-blue-50',
  none:   'bg-white',
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}

export default function AdminPanelPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [members, setMembers]     = useState<Member[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<StatusFilter>('active')
  const [genderFilter, setGender] = useState<GenderFilter>('all')
  const [duesOnly, setDuesOnly]   = useState(false)
  const [zoneFilter, setZone]     = useState<ZoneFilter>('all')
  const [successMsg, setSuccessMsg] = useState<string>(() => (location.state as { successMsg?: string })?.successMsg || '')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [attendanceMap, setAttendanceMap] = useState<Map<string, Set<string>>>(new Map())

  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(''), 4000)
    return () => clearTimeout(t)
  }, [successMsg])

  useEffect(() => {
    const days = last10Days()
    Promise.all([
      fetch(`${API_BASE}/client/allWithPackages.php`).then(r => r.json()),
      fetch(`${API_BASE}/attendance/getLastTenDaysAttendance.php`).then(r => r.json()).catch(() => []),
    ]).then(([clients, attendance]) => {
      setMembers(Array.isArray(clients) ? clients : [])
      if (Array.isArray(attendance)) {
        const map = new Map<string, Set<string>>()
        attendance.forEach((a: { cid?: string | number; date?: string }) => {
          if (!a.cid || !a.date || !days.includes(a.date)) return
          const cid = String(a.cid)
          if (!map.has(cid)) map.set(cid, new Set())
          map.get(cid)!.add(a.date)
        })
        setAttendanceMap(map)
      }
      setLoading(false)
    }).catch(() => { setError(true); setLoading(false) })
  }, [])

  const duesCount = useMemo(() =>
    members.filter(m => {
      const paid = parseFloat(m.pkgAmountPaid || '0')
      const fees = parseFloat(m.pkgFees || '0')
      return fees > 0 && paid < fees
    }).length, [members])

  const preZone = useMemo(() =>
    members.filter(m => {
      if (search) {
        const q = search.toLowerCase()
        if (!m.name.toLowerCase().includes(q) && !m.mobile.includes(q)) return false
      }
      if (statusFilter === 'active'   && m.profileActiveFlag !== 'enable')  return false
      if (statusFilter === 'inactive' && m.profileActiveFlag !== 'disable') return false
      if (genderFilter !== 'all' && m.gender?.toLowerCase() !== genderFilter) return false
      if (duesOnly) {
        const paid = parseFloat(m.pkgAmountPaid || '0')
        const fees = parseFloat(m.pkgFees || '0')
        if (fees <= 0 || paid >= fees) return false
      }
      return true
    }), [members, search, statusFilter, genderFilter, duesOnly])

  const zoneCounts = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0, new: 0 }
    preZone.forEach(m => {
      const z = getZone(calcDaysLeft(m.pkgEndDate), m.admissionDate)
      if (z !== 'none') counts[z]++
    })
    return counts
  }, [preZone])

  const filtered = useMemo(() => {
    const list = preZone.filter(m => {
      if (zoneFilter === 'all') return true
      return getZone(calcDaysLeft(m.pkgEndDate), m.admissionDate) === zoneFilter
    })
    return list.sort((a, b) => {
      const daysA = calcDaysLeft(a.pkgEndDate)
      const daysB = calcDaysLeft(b.pkgEndDate)
      const zA = getZone(daysA, a.admissionDate)
      const zB = getZone(daysB, b.admissionDate)
      const zoneDiff = ZONE_PRIORITY[zA] - ZONE_PRIORITY[zB]
      if (zoneDiff !== 0) return zoneDiff
      if (daysA === null && daysB === null) return 0
      if (daysA === null) return 1
      if (daysB === null) return -1
      return daysA - daysB
    })
  }, [preZone, zoneFilter])

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Members</h1>
            {!loading && (
              <p className="text-xs text-gray-400">{filtered.length} of {members.length} members</p>
            )}
          </div>
          {duesCount > 0 && (
            <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
              ⚠ {duesCount} with dues
            </span>
          )}
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
        </div>
      </header>

      {successMsg && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-700 font-medium flex-1">{successMsg}</p>
            <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-4 items-start">

        {/* RIGHT: Action panel — top on mobile, right sidebar on desktop */}
        <div className="w-full lg:w-48 flex-shrink-0 lg:sticky lg:top-20">
          <div className="flex flex-row lg:flex-col gap-3">

            {/* Add Client */}
            <button
              onClick={() => setShowPinDialog(true)}
              className="flex-1 lg:flex-none flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">Add Client</p>
                <p className="text-xs text-gray-400 mt-0.5 hidden lg:block">Register new member</p>
              </div>
            </button>

            {/* View Attendance */}
            <button
              onClick={() => navigate('/attendance')}
              className="flex-1 lg:flex-none flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-green-600 transition-colors">View Attendance</p>
                <p className="text-xs text-gray-400 mt-0.5 hidden lg:block">Daily check-ins</p>
              </div>
            </button>

            {/* Clear Members List */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex-1 lg:flex-none flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-red-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-red-600 transition-colors">Clear List</p>
                <p className="text-xs text-gray-400 mt-0.5 hidden lg:block">Reset members list</p>
              </div>
            </button>

          </div>
        </div>

        {/* LEFT: Members list */}
        <div className="flex-1 min-w-0">

          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 px-4 py-3 space-y-2.5">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or mobile..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => setZone('all')} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${zoneFilter === 'all' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>All</button>
              <button onClick={() => setZone('green')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${zoneFilter === 'green' ? 'bg-green-500 text-white border-green-500 shadow-sm' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />Active &gt;5d
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${zoneFilter === 'green' ? 'bg-white/25 text-white' : 'bg-green-200 text-green-800'}`}>{zoneCounts.green}</span>
              </button>
              <button onClick={() => setZone('yellow')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${zoneFilter === 'yellow' ? 'bg-yellow-400 text-yellow-900 border-yellow-400 shadow-sm' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'}`}>
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />Expiring 0–5d
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${zoneFilter === 'yellow' ? 'bg-white/30 text-yellow-900' : 'bg-yellow-200 text-yellow-800'}`}>{zoneCounts.yellow}</span>
              </button>
              <button onClick={() => setZone('red')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${zoneFilter === 'red' ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}>
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />Expired
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${zoneFilter === 'red' ? 'bg-white/25 text-white' : 'bg-red-200 text-red-800'}`}>{zoneCounts.red}</span>
              </button>
              <button onClick={() => setZone('new')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${zoneFilter === 'new' ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}>
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />New ≤30d
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${zoneFilter === 'new' ? 'bg-white/25 text-white' : 'bg-blue-200 text-blue-800'}`}>{zoneCounts.new}</span>
              </button>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <FilterChip active={statusFilter === 'all'}      onClick={() => setStatus('all')}>All</FilterChip>
                <FilterChip active={statusFilter === 'active'}   onClick={() => setStatus('active')}>Active</FilterChip>
                <FilterChip active={statusFilter === 'inactive'} onClick={() => setStatus('inactive')}>Inactive</FilterChip>
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <FilterChip active={genderFilter === 'all'}    onClick={() => setGender('all')}>All</FilterChip>
                <FilterChip active={genderFilter === 'male'}   onClick={() => setGender('male')}>Male</FilterChip>
                <FilterChip active={genderFilter === 'female'} onClick={() => setGender('female')}>Female</FilterChip>
              </div>
              <button
                onClick={() => setDuesOnly(d => !d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${duesOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                ⚠ Dues Pending
              </button>
            </div>
          </div>

          {/* Table */}
          {loading && (
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="bg-gray-200 h-11" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white border-b border-gray-100 px-4 py-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
                    <div className="h-4 bg-gray-200 rounded w-40" />
                    <div className="ml-auto flex gap-6">
                      <div className="h-4 bg-gray-100 rounded w-20" />
                      <div className="h-4 bg-gray-100 rounded w-10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">😕</p>
              <p className="font-semibold text-gray-600">Could not load members</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">🔍</p>
              <p className="font-semibold text-gray-600">No members match</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-3 text-left font-bold text-gray-800">Name</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-800">Last 10d</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-800">Payment Status</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-800">Days Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const days = calcDaysLeft(m.pkgEndDate)
                    const zone = getZone(days, m.admissionDate)
                    const fees = parseFloat(m.pkgFees || '0')
                    const paid = parseFloat(m.pkgAmountPaid || '0')
                    const dues = fees > 0 && paid < fees ? fees - paid : 0

                    let paymentStatus = 'NO PACKAGE'
                    if (fees > 0) paymentStatus = dues > 0 ? `DUES ₹${dues.toLocaleString('en-IN')}` : 'FULLY-PAID'

                    return (
                      <tr
                        key={m.id}
                        className={`${ROW_BG[zone]} text-gray-800 border-b border-black/10`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`relative w-9 h-9 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden`}>
                              <span className="select-none">{m.name.charAt(0).toUpperCase()}</span>
                              {m.photo && (
                                <img
                                  src={m.photo}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                            </div>
                            <span className="font-bold whitespace-nowrap">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-center">
                            {last10Days().map(day => (
                              <span
                                key={day}
                                title={day}
                                className={`w-3 h-3 rounded-full ${attendanceMap.get(m.id)?.has(day) ? 'bg-green-500' : 'bg-red-400'}`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold whitespace-nowrap">
                          {paymentStatus}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-lg">
                          {days !== null ? days : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Clear List Confirmation Dialog ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-800">Clear Members List?</p>
                <p className="text-sm text-gray-500 mt-0.5">This will remove all saved members from the public members page list on this device.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('progym_searched_members_v2')
                  setShowClearConfirm(false)
                  setSuccessMsg('Members list cleared')
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

    {showPinDialog && (
      <SecurityPinDialog
        onSuccess={pin => { setShowPinDialog(false); navigate('/members/new', { state: { pin } }) }}
        onCancel={() => setShowPinDialog(false)}
      />
    )}
    </>
  )
}
