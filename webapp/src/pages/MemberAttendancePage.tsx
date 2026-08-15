import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import NotificationBell from '../components/NotificationBell'

type AttendanceRecord = {
  id: number
  cid: number
  status: number
  day: number
  month: number
  year: number
  timeStamp: string
  date: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa']

export default function MemberAttendancePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [markMsg, setMarkMsg] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [attYearData, setAttYearData] = useState<AttendanceRecord[]>([])
  const [attStatsLoading, setAttStatsLoading] = useState(true)

  useEffect(() => {
    if (!user?.userId) return
    setLoading(true)
    fetch(`${API_BASE}/attendance/byMonthAndYear.php?month=${viewMonth}&year=${viewYear}&cid=${user.userId}`)
      .then(async r => {
        if (!r.ok) return []
        const d = await r.json()
        return Array.isArray(d) ? d.filter((x: AttendanceRecord) => x && typeof x === 'object') : []
      })
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [viewMonth, viewYear, user?.userId, refreshKey])

  useEffect(() => {
    if (!user?.userId) return
    const cy = now.getFullYear()
    setAttStatsLoading(true)
    Promise.all([
      fetch(`${API_BASE}/attendance/byYear.php?cid=${user.userId}&year=${cy - 1}`)
        .then(r => r.json()).then(d => Array.isArray(d) ? d : []).catch(() => []),
      fetch(`${API_BASE}/attendance/byYear.php?cid=${user.userId}&year=${cy}`)
        .then(r => r.json()).then(d => Array.isArray(d) ? d : []).catch(() => []),
    ])
      .then(([prev, cur]) => {
        const seen = new Set()
        const deduped = [...prev, ...cur].filter((r: AttendanceRecord) => {
          if (seen.has(r.id)) return false
          seen.add(r.id)
          return true
        })
        setAttYearData(deduped)
      })
      .finally(() => setAttStatsLoading(false))
  }, [user?.userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAttendance = async () => {
    if (!user?.userId || marking) return
    setMarking(true)
    setMarkMsg('')
    try {
      const r = await fetch(`${API_BASE}/attendance/create.php?cid=${user.userId}`)
      const text = await r.text()
      if (text && Number(text) > 0) {
        setMarkMsg('Attendance marked!')
        setRefreshKey(k => k + 1)
      } else {
        setMarkMsg('Already marked or failed. Try again.')
      }
    } catch {
      setMarkMsg('Network error. Please try again.')
    } finally {
      setMarking(false)
      setTimeout(() => setMarkMsg(''), 4000)
    }
  }

  const presentDays = new Set(records.map(r => Number(r.day)))
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const firstDayOffset = new Date(viewYear, viewMonth - 1, 1).getDay()
  const isCurrentMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear()
  const today = now.getDate()
  const daysElapsed = isCurrentMonth ? today : daysInMonth
  const attendancePct = daysElapsed > 0 ? Math.round(records.length / daysElapsed * 100) : 0

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth() + 1)) return
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const isNextDisabled = viewYear === now.getFullYear() && viewMonth >= now.getMonth() + 1

  const goToMonth = (m: number, y: number) => {
    setViewMonth(m)
    setViewYear(y)
  }

  // Build calendar cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Monthly overview data
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  })
  const countMap = new Map<string, number>()
  for (const r of attYearData) {
    const parts = r.date?.split('/')
    if (!parts || parts.length !== 3) continue
    const month = parseInt(parts[1], 10)
    const year = parseInt(parts[2], 10)
    if (isNaN(month) || isNaN(year)) continue
    const key = `${year}-${String(month).padStart(2, '0')}`
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  }
  const chartData = last12.map(({ month, year }) => ({
    month, year, count: countMap.get(`${year}-${String(month).padStart(2, '0')}`) ?? 0,
  }))
  const maxCount = Math.max(...chartData.map(d => d.count), 1)
  const thisYearTotal = chartData.filter(d => d.year === now.getFullYear()).reduce((s, d) => s + d.count, 0)
  const bestMonth = chartData.reduce((b, d) => d.count > b.count ? d : b, chartData[0] ?? { month: 1, year: now.getFullYear(), count: 0 })
  const avg = Math.round(chartData.reduce((s, d) => s + d.count, 0) / 12)

  function barColor(count: number) {
    if (count === 0) return 'bg-gray-100'
    const r = count / maxCount
    if (r >= 0.8) return 'bg-green-500'
    if (r >= 0.6) return 'bg-green-400'
    if (r >= 0.35) return 'bg-yellow-400'
    if (r >= 0.15) return 'bg-orange-400'
    return 'bg-orange-300'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/member-dashboard')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">My Attendance</h1>
            <p className="text-xs text-gray-400">Check-in history</p>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-orange-500">{loading ? '—' : records.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Days Present</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-700">{loading ? '—' : daysElapsed}</p>
            <p className="text-xs text-gray-500 mt-0.5">Days Elapsed</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className={`text-2xl font-bold ${attendancePct >= 75 ? 'text-green-500' : attendancePct >= 50 ? 'text-yellow-500' : 'text-red-400'}`}>
              {loading ? '—' : `${attendancePct}%`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Rate</p>
          </div>
        </div>

        {/* Mark attendance */}
        {isCurrentMonth && (
          <div>
            {presentDays.has(today) ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">✅</div>
                <div>
                  <p className="font-semibold text-green-700 text-sm">Attendance marked today</p>
                  <p className="text-xs text-green-600/70 mt-0.5">You've already checked in for today</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleMarkAttendance}
                disabled={marking}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold text-sm py-4 rounded-2xl shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {marking ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Marking…
                  </>
                ) : (
                  <>
                    <span className="text-lg">📍</span>
                    Mark Today's Attendance
                  </>
                )}
              </button>
            )}
            {markMsg && (
              <p className={`mt-2 text-center text-xs font-medium ${markMsg.includes('marked!') ? 'text-green-600' : 'text-red-500'}`}>{markMsg}</p>
            )}
          </div>
        )}

        {/* Two-column layout: Calendar + Check-in Log */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Calendar card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <span className="font-semibold text-gray-800">{MONTHS[viewMonth - 1]} {viewYear}</span>
                {!loading && <p className="text-xs text-gray-400">{records.length} days attended</p>}
              </div>
              <button onClick={nextMonth} disabled={isNextDisabled} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array(35).fill(null).map((_, i) => (
                    <div key={i} className="h-9 bg-gray-100 rounded-full animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-y-1">
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} />
                    const isPresent = presentDays.has(day)
                    const isToday = isCurrentMonth && day === today
                    const isFuture = isCurrentMonth && day > today
                    return (
                      <div key={i} className={`
                        h-9 flex items-center justify-center rounded-full text-sm font-medium mx-0.5
                        ${isPresent ? 'bg-orange-500 text-white shadow-sm' : ''}
                        ${isToday && !isPresent ? 'border-2 border-orange-400 text-orange-500' : ''}
                        ${!isPresent && !isToday && !isFuture ? 'text-gray-300' : ''}
                        ${isFuture ? 'text-gray-200' : ''}
                      `}>
                        {day}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-500">Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border-2 border-orange-400" />
                <span className="text-xs text-gray-500">Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-gray-200" />
                <span className="text-xs text-gray-500">Absent</span>
              </div>
            </div>
          </div>

          {/* Check-in log */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <span className="font-semibold text-gray-700 text-sm">Check-in Log</span>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">
                {Array(4).fill(null).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : records.length > 0 ? (
              <ul className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: 340 }}>
                {[...records].reverse().map(r => (
                  <li key={r.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-500 text-sm font-bold">{String(r.day).padStart(2, '0')}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{r.date}</p>
                        <p className="text-xs text-gray-400">{r.timeStamp}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 bg-green-50 text-green-600 rounded-full font-medium border border-green-100">Present</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <span className="text-4xl block mb-3">📅</span>
                <p className="text-gray-500 text-sm font-medium">No attendance this month</p>
                <p className="text-gray-400 text-xs mt-1">Navigate using arrows to check other months</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">Monthly Overview</p>
            {attStatsLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1" style={{ height: 96 }}>
            {chartData.map(d => {
              const barH = d.count === 0 ? 4 : Math.max(Math.round((d.count / maxCount) * 80), 10)
              const isActive = d.month === viewMonth && d.year === viewYear
              return (
                <button
                  key={`${d.year}-${d.month}`}
                  onClick={() => goToMonth(d.month, d.year)}
                  title={`${MONTHS[d.month - 1]} ${d.year}: ${d.count} days`}
                  className="flex-1 flex flex-col items-center justify-end gap-0.5 group focus:outline-none"
                >
                  {d.count > 0 && (
                    <span className="text-[9px] font-semibold text-gray-500 group-hover:text-gray-800 transition-colors leading-none">
                      {d.count}
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t transition-all group-hover:opacity-80 ${barColor(d.count)} ${isActive ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`}
                    style={{ height: barH }}
                  />
                </button>
              )
            })}
          </div>

          {/* Month labels */}
          <div className="flex gap-1 mt-1">
            {chartData.map(d => (
              <div key={`${d.year}-${d.month}`} className="flex-1 text-center">
                <span className={`text-[9px] font-medium ${d.month === viewMonth && d.year === viewYear ? 'text-orange-500' : 'text-gray-400'}`}>
                  {MONTH_SHORT[d.month - 1]}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /><span className="text-[10px] text-gray-400">High</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-yellow-400" /><span className="text-[10px] text-gray-400">Mid</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-orange-300" /><span className="text-[10px] text-gray-400">Low</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200" /><span className="text-[10px] text-gray-400">None</span></div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-green-50 rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-green-600">{thisYearTotal}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">This Year</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-orange-500">{bestMonth.count}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {bestMonth.count > 0 ? `Best (${MONTH_SHORT[bestMonth.month - 1]})` : 'Best Month'}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-blue-500">{avg}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Avg / Month</p>
            </div>
          </div>

          {/* Monthly table */}
          <div className="mt-4 border-t border-gray-50 pt-3 space-y-1">
            {[...chartData].reverse().map(d => {
              const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
              const isActive = d.month === viewMonth && d.year === viewYear
              return (
                <button
                  key={`${d.year}-${d.month}`}
                  onClick={() => goToMonth(d.month, d.year)}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                >
                  <span className={`text-xs font-medium w-20 flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-gray-600'}`}>
                    {MONTHS[d.month - 1].slice(0, 3)} {d.year}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(d.count)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold w-12 text-right flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-gray-500'}`}>
                    {d.count} {d.count === 1 ? 'day' : 'days'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
