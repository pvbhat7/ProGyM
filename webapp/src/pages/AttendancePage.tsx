import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

type AttendanceStats = {
  last10Days:   { date: string; day: string; count: number }[]
  monthSummary: { total: number; uniqueMembers: number; avgPerDay: number; daysElapsed: number }
  todayCount:   number
  yearTotal:    number
  genderSplit:  { Male: number; Female: number; Other: number }
  dayOfWeek:    { day: string; count: number }[]
  topMembers:   { name: string; gender: string; visits: number }[]
  monthlyTrend: { label: string; short: string; count: number }[]
}

type Attendee = {
  id: number
  cid: number
  clientName: string
  timeStamp: string
}

type TrendTab = '7d' | '30d' | '12m'

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 65) % AVATAR_COLORS.length]
}

function parseTime(ts: string): string {
  const parts = ts?.split(' ')
  if (!parts || parts.length < 2) return ''
  const tp = parts[1].split(':')
  const h = parseInt(tp[0])
  const m = tp[1]
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`
}

function formatDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function todayDMY(): string { return formatDMY(new Date()) }
function yesterdayDMY(): string {
  const d = new Date(); d.setDate(d.getDate() - 1); return formatDMY(d)
}
function dmyToInput(dmy: string): string {
  const p = dmy.split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ''
}
function inputToDmy(ymd: string): string {
  const p = ymd.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''
}
function dateLabel(dmy: string): string {
  if (dmy === todayDMY()) return 'Today'
  if (dmy === yesterdayDMY()) return 'Yesterday'
  const p = dmy.split('/')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(p[0])} ${months[parseInt(p[1])-1]}`
}

function calcDaysLeft(endDate: string | null): number | null {
  if (!endDate) return null
  const p = endDate.split('/')
  if (p.length !== 3) return null
  const end = new Date(+p[2], +p[1] - 1, +p[0])
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / 86400000)
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const [stats, setStats]                   = useState<AttendanceStats | null>(null)
  const [checkInList, setCheckInList]       = useState<Attendee[]>([])
  const [checkInLoading, setCheckInLoading] = useState(true)
  const [statsError, setStatsError]         = useState(false)
  const [trendTab, setTrendTab]             = useState<TrendTab>('30d')
  const [selectedDate, setSelectedDate]     = useState<string>(todayDMY())
  const [daysMap, setDaysMap]               = useState<Map<string, string | null>>(new Map())

  const today           = todayDMY()
  const yesterday       = yesterdayDMY()
  const isSelectedToday = selectedDate === today

  useEffect(() => {
    fetch(`${API_BASE}/attendance/getAttendanceStats.php`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStatsError(true))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/client/clientMemberStatPVO.php?profileActiveFlag=enable`)
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; endDate: string | null }[]) => {
        if (!Array.isArray(data)) return
        const m = new Map<string, string | null>()
        data.forEach(d => { if (d?.id) m.set(String(d.id), d.endDate ?? null) })
        setDaysMap(m)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setCheckInLoading(true)
    fetch(`${API_BASE}/attendance/getAllbyDate.php?date=${encodeURIComponent(selectedDate)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setCheckInList(Array.isArray(d) ? d.filter((a: Attendee) => a && typeof a === 'object' && a.clientName) : []))
      .catch(() => setCheckInList([]))
      .finally(() => setCheckInLoading(false))
  }, [selectedDate])

  // Exclude Sundays from trend bars
  const trendData = useMemo(() => {
    if (!stats) return []
    if (trendTab === '7d')
      return stats.last10Days.filter(d => d.day !== 'Sun').slice(-7).map(d => ({ label: d.day, count: d.count }))
    if (trendTab === '30d')
      return stats.last10Days.filter(d => d.day !== 'Sun').map(d => ({ label: d.day, count: d.count }))
    return stats.monthlyTrend.map(d => ({ label: d.short, count: d.count }))
  }, [stats, trendTab])

  // Exclude Sunday from busiest-days chart
  const dowData = useMemo(() => {
    if (!stats) return []
    return stats.dayOfWeek.filter(d => d.day !== 'Sun')
  }, [stats])

  const maxTrend  = trendData.length ? Math.max(...trendData.map(d => d.count), 1) : 1
  const maxDow    = dowData.length ? Math.max(...dowData.map(d => d.count), 1) : 1
  const maxVisits = stats ? Math.max(...stats.topMembers.map(m => m.visits), 1) : 1
  const genderTotal = stats
    ? (stats.genderSplit.Male + stats.genderSplit.Female + stats.genderSplit.Other) || 1
    : 1

  const maleTop   = useMemo(() => stats?.topMembers.filter(m => m.gender?.toLowerCase() === 'male') ?? [], [stats])
  const femaleTop = useMemo(() => stats?.topMembers.filter(m => m.gender?.toLowerCase() === 'female') ?? [], [stats])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Attendance</h1>
            <p className="text-xs text-gray-400">Member activity overview</p>
          </div>
          {isSelectedToday && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {statsError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 text-center">
            Failed to load stats. Please try again.
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Today',      icon: '📍', color: 'from-green-500 to-emerald-500', val: stats?.todayCount },
            { label: 'This Month', icon: '📅', color: 'from-blue-500 to-blue-600',    val: stats?.monthSummary.total },
            { label: 'This Year',  icon: '🏆', color: 'from-purple-500 to-violet-500', val: stats?.yearTotal },
            { label: 'Avg / Day',  icon: '📊', color: 'from-orange-500 to-red-500',   val: stats?.monthSummary.avgPerDay },
          ] as const).map(c => (
            <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-9 h-9 bg-gradient-to-br ${c.color} rounded-xl flex items-center justify-center text-base mb-3`}>
                {c.icon}
              </div>
              {c.val === undefined
                ? <SkeletonBlock className="h-7 w-14 mb-1" />
                : <p className="text-2xl font-bold text-gray-800">{c.val}</p>
              }
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* ── Check-ins ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isSelectedToday && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                <span className="text-sm font-semibold text-gray-800">
                  {isSelectedToday ? "Today's Check-ins" : `Check-ins — ${dateLabel(selectedDate)}`}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                {checkInLoading ? '…' : `${checkInList.length} member${checkInList.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            {/* Date nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(yesterday)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedDate === yesterday
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                Yesterday
              </button>
              <input
                type="date"
                value={dmyToInput(selectedDate)}
                max={dmyToInput(today)}
                onChange={e => e.target.value && setSelectedDate(inputToDmy(e.target.value))}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:border-orange-300 focus:outline-none cursor-pointer"
              />
              {!isSelectedToday && (
                <button
                  onClick={() => setSelectedDate(today)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors shrink-0"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            <span className="w-9 shrink-0" />
            <span className="flex-1">Name</span>
            {isSelectedToday && <span className="w-20 text-center shrink-0">Days Left</span>}
            <span className="w-16 text-right shrink-0">Check-in</span>
          </div>

          {/* Vertical list */}
          {checkInLoading ? (
            <div className="divide-y divide-gray-50">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <SkeletonBlock className="w-9 h-9 !rounded-full shrink-0" />
                  <SkeletonBlock className="h-3 flex-1 max-w-[160px]" />
                  <SkeletonBlock className="h-3 w-14" />
                  <SkeletonBlock className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : checkInList.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">🏋️</p>
              <p className="text-sm text-gray-400">No check-ins on {dateLabel(selectedDate)}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {[...checkInList].reverse().map((a, i) => {
                const days = calcDaysLeft(daysMap.get(String(a.cid)) ?? null)
                const daysColor = days === null
                  ? 'text-gray-400'
                  : days > 5 ? 'text-green-600 bg-green-50'
                  : days >= 0 ? 'text-yellow-600 bg-yellow-50'
                  : 'text-red-600 bg-red-50'
                return (
                  <li key={i} onClick={() => navigate(`/members/${a.cid}`)} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <div className={`w-9 h-9 rounded-full ${avatarColor(a.clientName)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                      {(a.clientName || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{a.clientName}</span>
                    {isSelectedToday && (
                      <span className="w-20 text-center shrink-0">
                        {days === null
                          ? <span className="text-xs text-gray-400">—</span>
                          : <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${daysColor}`}>{days}d</span>
                        }
                      </span>
                    )}
                    <span className="w-16 text-xs text-gray-400 text-right shrink-0">{parseTime(a.timeStamp)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Trend chart with tabs ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Attendance Trend</h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['7d', '30d', '12m'] as TrendTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTrendTab(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    trendTab === t
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === '7d' ? '7 Days' : t === '30d' ? 'Month' : '12 Mo'}
                </button>
              ))}
            </div>
          </div>
          {!stats
            ? <SkeletonBlock className="h-28 w-full" />
            : (
              <div className="flex items-end gap-1 h-32">
                {trendData.map((d, i) => {
                  const pct    = maxTrend > 0 ? (d.count / maxTrend) * 100 : 0
                  const isLast = i === trendData.length - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      {d.count > 0 && (
                        <span className="text-[9px] text-gray-400 font-medium">{d.count}</span>
                      )}
                      <div className="w-full flex items-end" style={{ height: '80px' }}>
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            isLast
                              ? 'bg-gradient-to-t from-orange-500 to-red-400'
                              : 'bg-gradient-to-t from-blue-400 to-blue-300'
                          }`}
                          style={{ height: `${Math.max(pct, d.count > 0 ? 6 : 2)}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-medium truncate w-full text-center ${isLast ? 'text-orange-500' : 'text-gray-400'}`}>
                        {d.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* ── Gender Rankings ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Gender Rankings</h2>
          <p className="text-xs text-gray-400 mb-4">Top members by gender — this month</p>

          {!stats ? <SkeletonBlock className="h-48 w-full" /> : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-bold text-blue-600 w-10 text-right shrink-0">
                  {Math.round(stats.genderSplit.Male / genderTotal * 100)}%
                </span>
                <div className="flex-1 h-5 rounded-full overflow-hidden flex bg-gray-100 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-700 flex items-center justify-center"
                    style={{ width: `${Math.round(stats.genderSplit.Male / genderTotal * 100)}%` }}
                  >
                    {stats.genderSplit.Male > 0 && (
                      <span className="text-[10px] text-white font-bold px-1 truncate">♂ {stats.genderSplit.Male}</span>
                    )}
                  </div>
                  <div
                    className="bg-gradient-to-r from-pink-400 to-pink-500 h-full transition-all duration-700 flex items-center justify-center"
                    style={{ width: `${Math.round(stats.genderSplit.Female / genderTotal * 100)}%` }}
                  >
                    {stats.genderSplit.Female > 0 && (
                      <span className="text-[10px] text-white font-bold px-1 truncate">♀ {stats.genderSplit.Female}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-pink-500 w-10 shrink-0">
                  {Math.round(stats.genderSplit.Female / genderTotal * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-lg leading-none">♂</span>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Male</span>
                    <span className="ml-auto text-xs font-semibold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">
                      {stats.genderSplit.Male} visits
                    </span>
                  </div>
                  {maleTop.length === 0
                    ? <p className="text-xs text-blue-300 text-center py-3">No data</p>
                    : maleTop.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-blue-100/60 last:border-0">
                        <span className="text-[11px] font-bold text-blue-300 w-4 shrink-0">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
                        </span>
                        <span className="text-xs text-blue-900 font-medium truncate flex-1">{m.name}</span>
                        <span className="text-[11px] font-bold text-blue-600 shrink-0 bg-blue-100 px-1.5 rounded-full">{m.visits}d</span>
                      </div>
                    ))
                  }
                </div>

                <div className="bg-pink-50/60 rounded-2xl p-4 border border-pink-100">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-lg leading-none">♀</span>
                    <span className="text-xs font-bold text-pink-700 uppercase tracking-wider">Female</span>
                    <span className="ml-auto text-xs font-semibold text-pink-500 bg-pink-100 px-1.5 py-0.5 rounded-full">
                      {stats.genderSplit.Female} visits
                    </span>
                  </div>
                  {femaleTop.length === 0
                    ? <p className="text-xs text-pink-300 text-center py-3">No data</p>
                    : femaleTop.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-pink-100/60 last:border-0">
                        <span className="text-[11px] font-bold text-pink-300 w-4 shrink-0">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
                        </span>
                        <span className="text-xs text-pink-900 font-medium truncate flex-1">{m.name}</span>
                        <span className="text-[11px] font-bold text-pink-600 shrink-0 bg-pink-100 px-1.5 rounded-full">{m.visits}d</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Busiest Days (Sunday excluded) ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Busiest Days</h2>
          <p className="text-xs text-gray-400 mb-4">Last 30 days footfall · Mon–Sat</p>
          {!stats
            ? <SkeletonBlock className="h-24 w-full" />
            : (
              <div className="flex items-end gap-2 h-24">
                {dowData.map((d, i) => {
                  const pct   = maxDow > 0 ? (d.count / maxDow) * 100 : 0
                  const isTop = d.count === maxDow && maxDow > 0
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      {d.count > 0 && <span className="text-[10px] text-gray-400">{d.count}</span>}
                      <div className="w-full flex items-end" style={{ height: '64px' }}>
                        <div
                          className={`w-full rounded-t-md ${isTop ? 'bg-gradient-to-t from-orange-500 to-orange-400' : 'bg-gradient-to-t from-indigo-400 to-indigo-300'}`}
                          style={{ height: `${Math.max(pct, d.count > 0 ? 6 : 2)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium ${isTop ? 'text-orange-500' : 'text-gray-400'}`}>{d.day}</span>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* ── Top Regular Members ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Most Regular Members</h2>
          <p className="text-xs text-gray-400 mb-4">Top 10 by visit count this month</p>
          {!stats
            ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBlock className="w-8 h-8 !rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <SkeletonBlock className="h-3 w-28" />
                      <SkeletonBlock className="h-2 w-full" />
                    </div>
                    <SkeletonBlock className="h-5 w-10" />
                  </div>
                ))}
              </div>
            )
            : stats.topMembers.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">No data this month.</p>
            : (
              <ul className="space-y-3">
                {stats.topMembers.map((m, i) => {
                  const pct    = maxVisits > 0 ? (m.visits / maxVisits) * 100 : 0
                  const isMale = m.gender?.toLowerCase() === 'male'
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                        {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{m.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${isMale ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                            {isMale ? '♂ M' : '♀ F'}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-yellow-400' : 'bg-gradient-to-r from-blue-400 to-indigo-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-700 shrink-0">{m.visits}d</span>
                    </li>
                  )
                })}
              </ul>
            )
          }
        </div>

        <div className="h-4" />
      </main>
    </div>
  )
}
