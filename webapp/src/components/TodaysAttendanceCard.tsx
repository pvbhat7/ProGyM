import { useState, useEffect, useRef, type ReactNode } from 'react'
import { API_BASE } from '../api/config'

// Self-contained "Today's Attendance" card + modal.
// Used by the trainer dashboard (identical visual to the admin one on DashboardPage).

type AttendeeRow = {
  id: number
  cid: string
  clientName: string
  timeStamp: string
  date: string
}

function todayDDMMYYYY() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function toDMY(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function last5Days() {
  const out: string[] = []
  const now = new Date(); now.setHours(0, 0, 0, 0)
  for (let i = 0; i < 5; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i)
    out.push(toDMY(d))
  }
  return out.reverse()
}

function calcDaysLeft(endDate?: string | null): number | null {
  if (!endDate) return null
  const p = endDate.split('/'); if (p.length !== 3) return null
  const end = new Date(+p[2], +p[1] - 1, +p[0])
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / 86400000)
}

function zoneOf(days: number | null): 'green' | 'yellow' | 'red' | 'none' {
  if (days === null) return 'none'
  if (days > 5) return 'green'
  if (days >= 0) return 'yellow'
  return 'red'
}

const ZONE_PILL: Record<'green' | 'yellow' | 'red' | 'none', string> = {
  green:  'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  none:   'bg-gray-100 text-gray-500 border-gray-200',
}

// DB photo fields have a Java history trail appended after the first '?'.
function getPhotoUrl(photo?: string | null): string {
  if (!photo) return ''
  let s = photo.split('?')[0]
  if (!s) return ''
  if (s.startsWith('http://')) s = 'https://' + s.slice(7)
  if (s.startsWith('http')) return s
  if (s.startsWith('/')) return `https://tavrostechinfo.com${s}`
  return `https://tavrostechinfo.com/PROGYM/ggs/${s}`
}

function AttendeeAvatar({ name, photo }: { name: string; photo?: string }) {
  const [err, setErr] = useState(false)
  const url = getPhotoUrl(photo)
  const initials = name?.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  if (!url || err) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
        {initials}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={name}
      onError={() => setErr(true)}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm ring-2 ring-white"
    />
  )
}

function ModalShell({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'} rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, sub, onClose }: { title: ReactNode; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
      <div>
        <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors text-lg"
      >
        ✕
      </button>
    </div>
  )
}

function ScrollLock({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      if ((scrollTop <= 0 && e.deltaY < 0) || (scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0))
        e.preventDefault()
    }
    const onTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
    const onTouchMove = (e: TouchEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const delta = touchStartY.current - e.touches[0].clientY
      if ((scrollTop <= 0 && delta < 0) || (scrollTop + clientHeight >= scrollHeight - 1 && delta > 0))
        e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])
  return <div ref={ref} className={className}>{children}</div>
}

export default function TodaysAttendanceCard() {
  const [count, setCount] = useState<number | 'err' | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [attendees, setAttendees] = useState<AttendeeRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [clientMeta, setClientMeta] = useState<Map<string, { photo?: string; endDate?: string | null }>>(new Map())
  const [attendanceHistory, setAttendanceHistory] = useState<Map<string, Set<string>>>(new Map())

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/stats.php`)
      .then(r => r.json())
      .then((d: { todayAttendance: number }) => setCount(d.todayAttendance ?? null))
      .catch(() => setCount('err'))
  }, [])

  function openModal() {
    setShowModal(true)
    if (attendees !== null) return
    setLoading(true)
    const days = last5Days()
    Promise.all([
      fetch(`${API_BASE}/attendance/getAllbyDate.php?date=${encodeURIComponent(todayDDMMYYYY())}`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/client/allActive.php`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/client/clientMemberStatPVO.php?profileActiveFlag=enable`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/attendance/getLastTenDaysAttendance.php`).then(r => r.json()).catch(() => []),
    ]).then(([todayRows, photoRows, metaRows, historyRows]) => {
      setAttendees(Array.isArray(todayRows) ? todayRows : [])

      const m = new Map<string, { photo?: string; endDate?: string | null }>()
      if (Array.isArray(photoRows)) {
        photoRows.forEach((c: { id?: string | number; photo?: string }) => {
          if (c.id != null) m.set(String(c.id), { photo: c.photo || undefined })
        })
      }
      if (Array.isArray(metaRows)) {
        metaRows.forEach((r: { id?: string | number; endDate?: string | null }) => {
          if (r.id == null) return
          const key = String(r.id)
          const existing = m.get(key) ?? {}
          m.set(key, { ...existing, endDate: r.endDate ?? null })
        })
      }
      setClientMeta(m)

      if (Array.isArray(historyRows)) {
        const hmap = new Map<string, Set<string>>()
        historyRows.forEach((a: { cid?: string | number; date?: string }) => {
          if (a.cid == null || !a.date || !days.includes(a.date)) return
          const cid = String(a.cid)
          if (!hmap.has(cid)) hmap.set(cid, new Set())
          hmap.get(cid)!.add(a.date)
        })
        setAttendanceHistory(hmap)
      }
    }).catch(() => setAttendees([]))
      .finally(() => setLoading(false))
  }

  const display = count === null ? null : count === 'err' ? '—' : String(count)

  return (
    <>
      {/* Stat card — same visual as the admin dashboard */}
      <div
        onClick={openModal}
        className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg cursor-pointer active:scale-95 transition-transform duration-150 group"
      >
        <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <span className="text-3xl leading-none">✅</span>
          <div className="flex-1">
            {display === null
              ? <div className="h-9 w-16 bg-white/25 rounded-lg animate-pulse" />
              : <p className="text-3xl font-extrabold text-white leading-none tabular-nums">{display}</p>
            }
            <p className="text-sm text-white/75 font-medium mt-1">Today's Attendance</p>
          </div>
          <div className="w-8 h-8 bg-white/20 group-hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {showModal && (
        <ModalShell onClose={() => setShowModal(false)} wide>
          <ModalHeader
            title="Today's Attendance"
            sub={todayDDMMYYYY()}
            onClose={() => setShowModal(false)}
          />
          <ScrollLock className="overflow-y-auto overscroll-contain flex-1 px-5 py-3">
            {loading && (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            )}
            {!loading && attendees?.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">No attendance recorded today.</p>
            )}
            {!loading && attendees && attendees.length > 0 && (
              <ul className="divide-y divide-gray-50">
                {attendees.map((a, i) => {
                  const rawTime = a.timeStamp?.split(' ')[1] ?? ''
                  const fmtTime = (t: string) => {
                    const [hStr, mStr] = t.split(':')
                    let h = parseInt(hStr, 10)
                    const m = mStr ?? '00'
                    const period = h >= 12 ? 'PM' : 'AM'
                    if (h === 0) h = 12
                    else if (h > 12) h -= 12
                    return `${h}:${m} ${period}`
                  }
                  const timePart = rawTime ? fmtTime(rawTime) : ''
                  const cidKey   = String(a.cid)
                  const meta     = clientMeta.get(cidKey)
                  const daysLeft = calcDaysLeft(meta?.endDate)
                  const zone     = zoneOf(daysLeft)
                  const attended = attendanceHistory.get(cidKey) ?? new Set<string>()
                  const daysArr  = last5Days()
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <span className="w-5 text-right text-xs font-semibold text-gray-400 tabular-nums flex-shrink-0">{i + 1}</span>
                      <AttendeeAvatar name={a.clientName} photo={meta?.photo} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{a.clientName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {timePart && <p className="text-xs text-gray-400">{timePart}</p>}
                          {timePart && <span className="text-gray-200">·</span>}
                          <div className="flex items-center gap-1" title="Last 5 days">
                            {daysArr.map(day => (
                              <span
                                key={day}
                                title={day}
                                className={`w-2 h-2 rounded-full ${attended.has(day) ? 'bg-green-500' : 'bg-red-400'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span
                        title={meta?.endDate ? `Expires ${meta.endDate}` : 'No active package'}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${ZONE_PILL[zone]}`}
                      >
                        {daysLeft === null
                          ? '—'
                          : daysLeft < 0
                          ? `Exp ${Math.abs(daysLeft)}d`
                          : `${daysLeft}d left`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollLock>
          {attendees && attendees.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-center font-medium text-gray-400">
              {attendees.length} member{attendees.length > 1 ? 's' : ''} checked in today
            </div>
          )}
        </ModalShell>
      )}
    </>
  )
}
