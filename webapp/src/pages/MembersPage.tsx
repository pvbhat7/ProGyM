import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { useAuth } from '../context/AuthContext'
import WhatsAppApiButton from '../components/WhatsAppApiButton'

interface Member {
  id: string
  name: string
  mobile: string
  email: string
  gender: string
  photo: string | null
  profileActiveFlag: string
  creationSource: string | null
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
type SourceFilter = 'gym' | 'wc_campaign'

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
  red:    'bg-red-200 hover:bg-red-300',
  yellow: 'bg-yellow-100 hover:bg-yellow-200',
  green:  'bg-green-100 hover:bg-green-200',
  new:    'bg-blue-50 hover:bg-blue-100',
  none:   'bg-white hover:bg-gray-50',
}

const ROW_TEXT: Record<string, string> = {
  red:    'text-gray-800',
  yellow: 'text-gray-800',
  green:  'text-gray-800',
  new:    'text-gray-800',
  none:   'text-gray-700',
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function remindedAgo(iso?: string): string {
  if (!iso) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const sent  = new Date(iso); sent.setHours(0, 0, 0, 0)
  const diff  = Math.round((today.getTime() - sent.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

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

export default function MembersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const [members, setMembers]         = useState<Member[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState<StatusFilter>('active')
  const [genderFilter, setGender]     = useState<GenderFilter>('all')
  const [duesOnly, setDuesOnly]       = useState(false)
  const [zoneFilter, setZone]         = useState<ZoneFilter>('all')
  const [sourceFilter, setSource]     = useState<SourceFilter>('gym')
  const [updating, setUpdating]       = useState<Set<string>>(new Set())
  const [reminding, setReminding]         = useState<Set<string>>(new Set())
  const [reminded, setReminded]           = useState<Set<string>>(new Set())
  const [remindFailed, setRemindFailed]   = useState<Set<string>>(new Set())
  const [attendanceMap, setAttendanceMap] = useState<Map<string, Set<string>>>(new Map())
  const [lastReminded, setLastReminded]   = useState<Record<string, { email?: string; sms?: string; wa?: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('progym_reminders') ?? '{}') } catch { return {} }
  })

  useEffect(() => {
    const membersKey    = `progym_members_${sourceFilter}`
    const attendanceKey = 'progym_members_attendance'
    const CACHE_TTL_MS  = 10 * 60 * 1000  // 10 min — fine for a session; background refetch keeps it current

    let servedFromCache = false
    try {
      const cachedMembers = sessionStorage.getItem(membersKey)
      if (cachedMembers) {
        const { data, ts } = JSON.parse(cachedMembers) as { data: Member[]; ts: number }
        if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(data)) {
          setMembers(data)
          servedFromCache = true
        }
      }
      const cachedAttendance = sessionStorage.getItem(attendanceKey)
      if (cachedAttendance) {
        const { data, ts } = JSON.parse(cachedAttendance) as { data: [string, string[]][]; ts: number }
        if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(data)) {
          setAttendanceMap(new Map(data.map(([k, arr]) => [k, new Set(arr)])))
        }
      }
    } catch { /* corrupted cache — ignore, fall through to network */ }

    // Show table instantly from cache; only spin the loader on a true cold load.
    setLoading(!servedFromCache)
    setError(false)

    const days = last10Days()
    Promise.all([
      fetch(`${API_BASE}/client/allWithPackages.php?source=${sourceFilter}`).then(r => r.json()),
      fetch(`${API_BASE}/attendance/getLastTenDaysAttendance.php`).then(r => r.json()).catch(() => []),
    ]).then(([clients, attendance]) => {
      const list = Array.isArray(clients) ? clients : []
      setMembers(list)
      try { sessionStorage.setItem(membersKey, JSON.stringify({ data: list, ts: Date.now() })) } catch {}

      if (Array.isArray(attendance)) {
        const map = new Map<string, Set<string>>()
        attendance.forEach((a: { cid?: string | number; date?: string }) => {
          if (!a.cid || !a.date || !days.includes(a.date)) return
          const cid = String(a.cid)
          if (!map.has(cid)) map.set(cid, new Set())
          map.get(cid)!.add(a.date)
        })
        setAttendanceMap(map)
        try {
          const serial: [string, string[]][] = Array.from(map, ([k, v]) => [k, Array.from(v)])
          sessionStorage.setItem(attendanceKey, JSON.stringify({ data: serial, ts: Date.now() }))
        } catch {}
      }
      setLoading(false)
    }).catch(() => {
      if (!servedFromCache) setError(true)
      setLoading(false)
    })
  }, [sourceFilter])

  function saveReminded(memberId: string, channel: 'email' | 'sms' | 'wa') {
    setLastReminded(prev => {
      const next = { ...prev, [memberId]: { ...prev[memberId], [channel]: new Date().toISOString() } }
      try { localStorage.setItem('progym_reminders', JSON.stringify(next)) } catch {}
      return next
    })
  }

  async function sendReminder(m: Member, e: React.MouseEvent) {
    e.stopPropagation()
    if (reminding.has(m.id)) return
    setReminding(prev => new Set([...prev, m.id]))
    setRemindFailed(prev => { const s = new Set(prev); s.delete(m.id); return s })
    try {
      const res = await fetch(`${API_BASE}/client/sendPaymentReminder.php?id=${m.id}`)
      if (res.ok) {
        setReminded(prev => new Set([...prev, m.id]))
        saveReminded(m.id, 'email')
      } else {
        setRemindFailed(prev => new Set([...prev, m.id]))
      }
    } catch {
      setRemindFailed(prev => new Set([...prev, m.id]))
    } finally {
      setReminding(prev => { const s = new Set(prev); s.delete(m.id); return s })
    }
  }

  async function toggleProfile(m: Member, e: React.MouseEvent) {
    e.stopPropagation()
    if (updating.has(m.id)) return
    const newFlag = m.profileActiveFlag === 'enable' ? 'disable' : 'enable'
    setUpdating(prev => new Set([...prev, m.id]))
    try {
      const res = await fetch(`${API_BASE}/client/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...m, profileActiveFlag: newFlag }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(mem =>
          mem.id === m.id ? { ...mem, profileActiveFlag: newFlag } : mem
        ))
      }
    } finally {
      setUpdating(prev => { const s = new Set(prev); s.delete(m.id); return s })
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-2.5">
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
            <button
              onClick={() => setSource('gym')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${sourceFilter === 'gym' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              Gym Members
            </button>
            <button
              onClick={() => setSource('wc_campaign')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${sourceFilter === 'wc_campaign' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              WC2026 Campaign
            </button>
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
      </div>

      {/* Table */}
      <main className="max-w-6xl mx-auto px-4 py-4 pb-8">
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
                    <div className="h-7 bg-gray-100 rounded w-24" />
                    <div className="h-7 bg-gray-100 rounded w-16" />
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
                  {!isTrainer && <th className="px-4 py-3 text-center font-bold text-gray-800">Reminder</th>}
                  {!isTrainer && <th className="px-4 py-3 text-center font-bold text-gray-800">Call</th>}
                  {!isTrainer && <th className="px-4 py-3 text-center font-bold text-gray-800">Enable/Disable</th>}
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
                  if (fees > 0) {
                    if (dues > 0) paymentStatus = `DUES ₹${dues.toLocaleString('en-IN')}`
                    else if (zone === 'red') paymentStatus = 'PACKAGE EXPIRED'
                    else paymentStatus = 'FULLY-PAID'
                  }

                  const reminderBase = dues > 0 ? 'Send Payment Reminder' : 'Send Package Reminder'
                  const isReminderDisabled = zone === 'none' || ((zone === 'green' || zone === 'new') && dues === 0)
                  const emailColor = reminded.has(m.id) ? 'text-green-600' : remindFailed.has(m.id) ? 'text-red-500' : dues > 0 ? 'text-orange-500' : 'text-blue-600'
                  const smsBody = dues > 0
                    ? `Hi ${m.name}, you have a pending due of Rs.${dues} at Pro Gym Kolhapur. Please clear it to continue your membership. App: https://progym.co.in/login`
                    : days !== null && days <= 0
                    ? `Hi ${m.name}, your Pro Gym Kolhapur membership has expired. Renew now to continue. App: https://progym.co.in/login`
                    : `Hi ${m.name}, your Pro Gym Kolhapur membership expires in ${days} days. Renew soon! App: https://progym.co.in/login`
                  const smsHref = `sms:${m.mobile}?body=${encodeURIComponent(smsBody)}`

                  return (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`/members/${m.id}`)}
                      className={`${ROW_BG[zone]} ${ROW_TEXT[zone]} border-b border-black/10 cursor-pointer transition-colors`}
                    >
                      {/* Name + Photo */}
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

                      {/* Last 10 days attendance dots */}
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

                      {/* Payment Status */}
                      <td className="px-4 py-3 text-center font-semibold whitespace-nowrap">
                        {paymentStatus}
                      </td>

                      {/* Days Remaining */}
                      <td className="px-4 py-3 text-center font-bold text-lg">
                        {days !== null ? days : '—'}
                      </td>

                      {/* Reminder Icons: Email / SMS / WhatsApp */}
                      {!isTrainer && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Email */}
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              title={`${reminderBase} (Email)`}
                              onClick={e => sendReminder(m, e)}
                              disabled={isReminderDisabled || reminding.has(m.id)}
                              className={`p-1.5 rounded-lg transition-colors hover:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed ${emailColor}`}
                            >
                              {reminding.has(m.id) ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                              ) : reminded.has(m.id) ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                              ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>
                              )}
                            </button>
                            <span className="text-[9px] leading-none text-gray-500 whitespace-nowrap">
                              {remindedAgo(lastReminded[m.id]?.email)}
                            </span>
                          </div>

                          {/* SMS */}
                          <div className="flex flex-col items-center gap-0.5">
                            <a
                              href={smsHref}
                              title={`${reminderBase} (SMS)`}
                              onClick={e => { if (isReminderDisabled) { e.preventDefault(); return }; e.stopPropagation(); saveReminded(m.id, 'sms') }}
                              className={`p-1.5 rounded-lg transition-colors hover:bg-black/10 text-purple-600 ${isReminderDisabled ? 'opacity-40 pointer-events-none' : ''}`}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H6l-4 4V6z"/></svg>
                            </a>
                            <span className="text-[9px] leading-none text-gray-500 whitespace-nowrap">
                              {remindedAgo(lastReminded[m.id]?.sms)}
                            </span>
                          </div>

                          {/* WhatsApp */}
                          <div className="flex flex-col items-center gap-0.5">
                            <WhatsAppApiButton
                              kind="reminder"
                              clientId={m.id}
                              title={`${reminderBase} (WhatsApp)`}
                              iconClassName="w-5 h-5"
                              onSent={() => saveReminded(m.id, 'wa')}
                              className={`p-1.5 rounded-lg transition-colors hover:bg-black/10 text-green-500 ${isReminderDisabled ? 'opacity-40 pointer-events-none' : ''}`}
                            />
                            <span className="text-[9px] leading-none text-gray-500 whitespace-nowrap">
                              {remindedAgo(lastReminded[m.id]?.wa)}
                            </span>
                          </div>
                        </div>
                      </td>
                      )}

                      {/* Call */}
                      {!isTrainer && (
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`tel:${m.mobile}`}
                          onClick={e => e.stopPropagation()}
                          title={`Call ${m.mobile}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z"/></svg>
                        </a>
                      </td>
                      )}

                      {/* Enable / Disable */}
                      {!isTrainer && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={e => toggleProfile(m, e)}
                          disabled={updating.has(m.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 ${
                            m.profileActiveFlag === 'enable'
                              ? 'bg-red-800 text-white hover:bg-red-900'
                              : 'bg-green-700 text-white hover:bg-green-800'
                          }`}
                        >
                          {updating.has(m.id) ? '…' : m.profileActiveFlag === 'enable' ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  )
}
