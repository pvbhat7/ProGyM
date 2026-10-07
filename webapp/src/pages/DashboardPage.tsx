import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLicense } from '../context/LicenseContext'
import { useNavigate } from 'react-router-dom'
import { API_BASE, ACTIVITY_KEY } from '../api/config'
import { loadSettings } from './SettingsPage'
import ApprovedDevicesModal from '../components/ApprovedDevicesModal'
import WhatsAppApiButton from '../components/WhatsAppApiButton'
import type { GymFeatureKey } from '../services/license'

type StatVal = number | 'err' | null

type AttendeeRow = {
  id: number
  cid: string
  clientName: string
  timeStamp: string
  date: string
}

type ClientRow = {
  id: string
  name: string
  gender: string
  photo?: string
}

type CollectionRow = {
  label: string
  amount: number
}

type CollectionTab = 'weekly' | 'monthly' | 'yearly'

type BirthdayMember = {
  id: number
  name: string
  email: string
  mobile: string
  photo: string
  birthDate: string
}


function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function getPhotoUrl(photo?: string | null): string {
  if (!photo) return ''
  // DB photo fields have a Java-serialized history trail appended after the URL,
  // e.g. "https://.../123 Name.png?599?Thu Jan 12 19:40:09 IST 2023?..." — keep only the URL part.
  let s = photo.split('?')[0]
  if (!s) return ''
  // Force https so browsers don't block mixed content on the https progym.co.in site.
  if (s.startsWith('http://')) s = 'https://' + s.slice(7)
  if (s.startsWith('http')) return s
  if (s.startsWith('/')) return `https://tavrostechinfo.com${s}`
  return `https://tavrostechinfo.com/PROGYM/ggs/${s}`
}

function toDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function last5Days(): string[] {
  const out: string[] = []
  const now = new Date(); now.setHours(0,0,0,0)
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
  const now = new Date(); now.setHours(0,0,0,0)
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

function StatCard({
  label, value, icon, bgClass, onClick, format,
}: {
  label: string
  value: StatVal
  icon: string
  bgClass: string
  onClick?: () => void
  format?: (n: number) => string
}) {
  const display = value === null ? null : value === 'err' ? '—' : format ? format(value) : String(value)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 ${bgClass} shadow-lg ${onClick ? 'cursor-pointer active:scale-95' : ''} transition-transform duration-150 group`}
      onClick={onClick}
    >
      {/* decorative blobs */}
      <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        <span className="text-2xl leading-none">{icon}</span>
        <div className="mt-3 mb-1">
          {display === null
            ? <div className="h-9 w-16 bg-white/25 rounded-lg animate-pulse" />
            : <p className="text-3xl font-extrabold text-white leading-none tabular-nums">{display}</p>
          }
        </div>
        <p className="text-sm text-white/75 font-medium">{label}</p>
      </div>

      {onClick && (
        <div className="absolute top-4 right-4 w-7 h-7 bg-white/20 group-hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  )
}

type QuickLink = {
  label: string
  icon: string
  desc: string
  path: string | null
  action: (() => void) | null
  iconBg: string
  feature?: GymFeatureKey
}

// ─── Modal primitives at module level so they never remount on parent re-render ─

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

export default function DashboardPage() {
  const { mobile, logout } = useAuth()
  const { state: licenseState } = useLicense()
  const navigate = useNavigate()

  // Feature access — missing key defaults to enabled (older license servers
  // that don't yet send `features` keep every tile visible).
  const features = licenseState.data?.features
  const isFeatureOn = (key?: GymFeatureKey) =>
    key === undefined ? true : features === undefined ? true : features[key] !== false

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    function tick() {
      const { autoLogoutEnabled, autoLogoutMinutes } = loadSettings()
      if (!autoLogoutEnabled) { setSecondsLeft(null); return }
      const lastStr = localStorage.getItem(ACTIVITY_KEY)
      if (!lastStr) { setSecondsLeft(null); return }
      const remaining = autoLogoutMinutes * 60 - Math.floor((Date.now() - parseInt(lastStr, 10)) / 1000)
      setSecondsLeft(Math.max(0, remaining))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const [activeClientList, setActiveClientList] = useState<ClientRow[] | 'err' | null>(null)
  const [todayAttendance, setTodayAttendance]   = useState<StatVal>(null)

  const activeMembers: StatVal = activeClientList === null ? null : activeClientList === 'err' ? 'err' : activeClientList.length
  const activeMale: StatVal    = activeClientList === null ? null : activeClientList === 'err' ? 'err' : activeClientList.filter(c => c.gender?.toLowerCase() === 'male').length
  const activeFemale: StatVal  = activeClientList === null ? null : activeClientList === 'err' ? 'err' : activeClientList.filter(c => c.gender?.toLowerCase() === 'female').length

  const [memberModal, setMemberModal]         = useState<{ show: boolean; title: string; list: ClientRow[] }>({ show: false, title: '', list: [] })
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [attendees, setAttendees]             = useState<AttendeeRow[] | null>(null)
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const [clientMeta, setClientMeta]           = useState<Map<string, { photo?: string; endDate?: string | null }>>(new Map())
  const [attendanceHistory, setAttendanceHistory] = useState<Map<string, Set<string>>>(new Map())

  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [collectionTab, setCollectionTab]     = useState<CollectionTab>('monthly')
  const [collectionData, setCollectionData]   = useState<Record<CollectionTab, CollectionRow[] | null>>({ weekly: null, monthly: null, yearly: null })
  const [collectionLoading, setCollectionLoading] = useState(false)

  const [showBirthdayModal, setShowBirthdayModal] = useState(false)
  const [birthdayMembers, setBirthdayMembers]     = useState<BirthdayMember[]>([])
  const [birthdayLoading, setBirthdayLoading]     = useState(false)
  const [birthdayGifted, setBirthdayGifted]       = useState<Set<number>>(new Set())
  const [birthdayGifting, setBirthdayGifting]     = useState<number | null>(null)
  const [showDevicesModal, setShowDevicesModal]   = useState(false)

  function todayDDMMYYYY() {
    const d  = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  }

  function openMemberModal(filter: 'all' | 'male' | 'female') {
    if (!Array.isArray(activeClientList)) return
    const list  = filter === 'all' ? activeClientList : activeClientList.filter(c => c.gender?.toLowerCase() === filter)
    const title = filter === 'all' ? 'Active Members' : filter === 'male' ? 'Active Male Members' : 'Active Female Members'
    setMemberModal({ show: true, title, list })
  }

  function openAttendanceModal() {
    setShowAttendanceModal(true)
    if (attendees !== null) return
    setAttendeesLoading(true)
    const days = last5Days()
    // Seed photos from activeClientList (which we already have; allActive.php returns photo).
    // clientMemberStatPVO.clientPhoto is corrupted (?date?date... with no URL) so we ignore it.
    const seed = new Map<string, { photo?: string; endDate?: string | null }>()
    if (Array.isArray(activeClientList)) {
      activeClientList.forEach(c => {
        if (c.id != null) seed.set(String(c.id), { photo: c.photo || undefined })
      })
    }

    Promise.all([
      fetch(`${API_BASE}/attendance/getAllbyDate.php?date=${encodeURIComponent(todayDDMMYYYY())}`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/client/clientMemberStatPVO.php?profileActiveFlag=enable`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/attendance/getLastTenDaysAttendance.php`).then(r => r.json()).catch(() => []),
    ]).then(([todayRows, metaRows, historyRows]) => {
      setAttendees(Array.isArray(todayRows) ? todayRows : [])

      const m = new Map(seed)
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
        const map = new Map<string, Set<string>>()
        historyRows.forEach((a: { cid?: string | number; date?: string }) => {
          if (a.cid == null || !a.date || !days.includes(a.date)) return
          const cid = String(a.cid)
          if (!map.has(cid)) map.set(cid, new Set())
          map.get(cid)!.add(a.date)
        })
        setAttendanceHistory(map)
      }
    }).catch(() => setAttendees([]))
      .finally(() => setAttendeesLoading(false))
  }

  function openCollectionModal() {
    setShowCollectionModal(true)
    loadCollectionTab('monthly')
  }

  function loadCollectionTab(tab: CollectionTab) {
    setCollectionTab(tab)
    if (collectionData[tab] !== null) return
    setCollectionLoading(true)
    fetch(`${API_BASE}/paymentTransaction/getCollectionSummary.php?type=${tab}`)
      .then(r => r.json())
      .then((rows: CollectionRow[]) =>
        setCollectionData(prev => ({ ...prev, [tab]: Array.isArray(rows) ? rows : [] }))
      )
      .catch(() => setCollectionData(prev => ({ ...prev, [tab]: [] })))
      .finally(() => setCollectionLoading(false))
  }

  async function openBirthdayModal() {
    setShowBirthdayModal(true)
    setBirthdayLoading(true)
    setBirthdayMembers([])
    setBirthdayGifted(new Set())
    try {
      const [birthdayRes, giftedRes] = await Promise.all([
        fetch(`${API_BASE}/client/todayBirthdays.php`),
        fetch(`${API_BASE}/procoins/birthdayGiftedToday.php`),
      ])
      const list: { id: string; name: string; photo: string; birthDate: string }[] = await birthdayRes.json()
      const giftedData: { clientIds: number[] } = await giftedRes.json()
      setBirthdayGifted(new Set(Array.isArray(giftedData.clientIds) ? giftedData.clientIds : []))
      const base    = Array.isArray(list) ? list : []
      const members = await Promise.all(base.map(async m => {
        try {
          const r = await fetch(`${API_BASE}/client/byId.php?id=${m.id}`)
          const d: Record<string, string> = await r.json()
          return { id: parseInt(m.id), name: m.name, photo: m.photo || '', birthDate: m.birthDate, email: d.email || '', mobile: d.mobile || '' }
        } catch {
          return { id: parseInt(m.id), name: m.name, photo: m.photo || '', birthDate: m.birthDate, email: '', mobile: '' }
        }
      }))
      setBirthdayMembers(members)
    } catch {
      setBirthdayMembers([])
    } finally {
      setBirthdayLoading(false)
    }
  }

  async function giftBirthdayProcoins(member: BirthdayMember) {
    setBirthdayGifting(member.id)
    try {
      const res  = await fetch(`${API_BASE}/procoins/sendToClient.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: String(member.id), amount: 25, description: 'Birthday Gift', isBirthday: true }),
      })
      const data = await res.json()
      if (data.success) setBirthdayGifted(prev => new Set([...prev, member.id]))
    } catch { /* silent */ }
    setBirthdayGifting(null)
  }

  useEffect(() => {
    fetch(`${API_BASE}/client/allActive.php`)
      .then(r => r.json())
      .then((data: ClientRow[]) => setActiveClientList(Array.isArray(data) ? data : []))
      .catch(() => setActiveClientList('err'))

    fetch(`${API_BASE}/dashboard/stats.php`)
      .then(r => r.json())
      .then((d: { todayAttendance: number }) => setTodayAttendance(d.todayAttendance ?? null))
      .catch(() => setTodayAttendance('err'))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const allQuickLinks: QuickLink[] = [
    { label: 'Members',           icon: '👥', desc: 'Manage gym members',                  path: '/members',          action: null,                         iconBg: 'bg-blue-100',    feature: 'members' },
    { label: 'Attendance',        icon: '📋', desc: 'Track daily attendance',              path: '/attendance',       action: null,                         iconBg: 'bg-green-100',   feature: 'attendance' },
    { label: 'Packages',          icon: '📦', desc: 'View & edit packages',               path: '/packages',         action: null,                         iconBg: 'bg-purple-100',  feature: 'packages' },
    { label: 'Diet Plans',        icon: '🥗', desc: 'Assign diet templates',              path: null,                action: null,                         iconBg: 'bg-orange-100',  feature: 'diet_plans' },
    { label: 'Workouts',          icon: '🏋️', desc: 'Manage workout plans',               path: '/admin-workouts',   action: null,                         iconBg: 'bg-red-100',     feature: 'workouts' },
    { label: 'Collection',        icon: '💰', desc: 'Revenue & earnings',                 path: null,                action: openCollectionModal,           iconBg: 'bg-emerald-100', feature: 'collection' },
    { label: 'Roles',             icon: '🛡️', desc: 'Admin users & access',               path: '/roles',            action: null,                         iconBg: 'bg-indigo-100',  feature: 'roles' },
    { label: 'Weight',            icon: '⚖️', desc: 'Track weight trends',               path: '/member-weight',    action: null,                         iconBg: 'bg-amber-100',   feature: 'weight' },
    { label: 'Send Reminders',    icon: '📨', desc: 'Bulk payment & package reminders',   path: '/reminders',        action: null,                         iconBg: 'bg-sky-100',     feature: 'reminders' },
    { label: 'Communications',    icon: '💬', desc: 'Email log · resend via SMS/WhatsApp', path: '/communications',  action: null,                         iconBg: 'bg-fuchsia-100', feature: 'communications' },
    { label: 'Broadcast', icon: '📣', desc: 'Push notifications & WhatsApp to members', path: '/admin-push',      action: null,                         iconBg: 'bg-orange-100',  feature: 'communications' },
    { label: 'Admissions',        icon: '🗓️', desc: 'View member admissions by period',   path: '/admissions',       action: null,                         iconBg: 'bg-violet-100',  feature: 'admissions' },
    { label: 'ProCoins',          icon: '🪙', desc: 'Credit coins to members',            path: '/admin-procoins',   action: null,                         iconBg: 'bg-yellow-100',  feature: 'procoins' },
    { label: 'Before/After Wall', icon: '📸', desc: 'Member transformation photos',       path: '/admin-before-after', action: null,                       iconBg: 'bg-rose-100',    feature: 'before_after' },
    { label: 'Photo Review',      icon: '🖼️', desc: 'Approve / reject profile pictures',  path: '/admin-photo-review', action: null,                       iconBg: 'bg-cyan-100',    feature: 'photo_review' },
    { label: 'Birthdays',         icon: '🎂', desc: 'Members with birthday today',        path: null,                action: openBirthdayModal,            iconBg: 'bg-pink-100',    feature: 'birthdays' },
    { label: 'License',           icon: '🛡️', desc: 'Subscription status & payment history', path: '/license',        action: null,                         iconBg: 'bg-emerald-100' },
    { label: 'Settings',          icon: '⚙️', desc: 'Auto logout & app preferences',      path: '/settings',         action: null,                         iconBg: 'bg-gray-100'    },
    { label: 'Referrals',         icon: '🔗', desc: 'Member referral network & stats',    path: '/admin-referrals',  action: null,                         iconBg: 'bg-teal-100',    feature: 'referrals' },
    { label: 'Approved Devices',  icon: '📱', desc: 'Manage public dashboard devices',    path: null,                action: () => setShowDevicesModal(true), iconBg: 'bg-slate-100', feature: 'approved_devices' },
    { label: 'World Cup',         icon: '⚽', desc: 'Match schedule & results',           path: '/admin-worldcup-matches', action: null,                    iconBg: 'bg-lime-100',    feature: 'worldcup_matches' },
    { label: 'WC Leaderboard',    icon: '🏆', desc: 'Participants, conversions, footballs', path: '/admin-worldcup-leaderboard', action: null,              iconBg: 'bg-yellow-100',  feature: 'worldcup_leaderboard' },
    { label: 'WC Banners',        icon: '🖼️', desc: 'Sponsored carousel on Matches page',  path: '/admin-worldcup-banners',     action: null,              iconBg: 'bg-pink-100',    feature: 'worldcup_banners' },
  ]
  const quickLinks = allQuickLinks.filter(l => isFeatureOn(l.feature))

  const rows      = collectionData[collectionTab] ?? []
  const maxAmount = rows.reduce((m, r) => Math.max(m, r.amount), 0)
  const total     = rows.reduce((s, r) => s + r.amount, 0)
  const tabLabels: Record<CollectionTab, string> = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
              alt="ProGym"
              className="w-9 h-9 rounded-xl object-cover shadow-sm"
            />
            <span className="font-bold text-gray-800 text-lg tracking-tight">ProGym</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2.5">
            {secondsLeft !== null && (
              <div className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                secondsLeft <= 60  ? 'bg-red-100 text-red-600 animate-pulse' :
                secondsLeft <= 120 ? 'bg-amber-100 text-amber-600' :
                                     'bg-gray-100 text-gray-500'
              }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                {mobile?.slice(-2)}
              </div>
              <span className="text-sm text-gray-600 font-medium">+91 {mobile}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-500 border border-red-200 rounded-full hover:bg-red-50 hover:border-red-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero banner ── */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 overflow-hidden">
        {/* Subtle orange glow top-right */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-20">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full mb-3">
            Admin Dashboard
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            {greet()}! <span className="wave-emoji">👋</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">{todayFormatted()}</p>
        </div>
      </div>

      {/* ── Stat cards (float over hero) ── */}
      <div className="max-w-5xl mx-auto px-4 -mt-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Active Members"     value={activeMembers}
            icon="👥"  bgClass="bg-gradient-to-br from-blue-500 to-indigo-600"
            onClick={() => openMemberModal('all')}
          />
          <StatCard
            label="Active Male"        value={activeMale}
            icon="♂️"  bgClass="bg-gradient-to-br from-cyan-500 to-sky-600"
            onClick={() => openMemberModal('male')}
          />
          <StatCard
            label="Active Female"      value={activeFemale}
            icon="♀️"  bgClass="bg-gradient-to-br from-pink-500 to-rose-600"
            onClick={() => openMemberModal('female')}
          />
          <StatCard
            label="Today's Attendance" value={todayAttendance}
            icon="✅"  bgClass="bg-gradient-to-br from-emerald-500 to-green-600"
            onClick={openAttendanceModal}
          />
        </div>
      </div>

      {/* ── Quick Access ── */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-800">Quick Access</h2>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map(l => {
            const clickable = !!(l.path || l.action)
            return (
              <button
                key={l.label}
                onClick={() => {
                  if (l.action) l.action()
                  else if (l.path) navigate(l.path)
                }}
                disabled={!clickable}
                className={`bg-white rounded-2xl p-4 border text-left group transition-all duration-200 ${
                  clickable
                    ? 'border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-200 hover:-translate-y-0.5 cursor-pointer'
                    : 'border-gray-100 shadow-sm opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 ${l.iconBg} transition-transform duration-200 group-hover:scale-110`}>
                  {l.icon}
                </div>
                <p className={`font-semibold text-sm text-gray-800 transition-colors ${clickable ? 'group-hover:text-orange-600' : ''}`}>
                  {l.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{l.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {/* Member list */}
      {memberModal.show && (
        <ModalShell onClose={() => setMemberModal(m => ({ ...m, show: false }))}>
          <ModalHeader
            title={memberModal.title}
            sub={`${memberModal.list.length} member${memberModal.list.length !== 1 ? 's' : ''}`}
            onClose={() => setMemberModal(m => ({ ...m, show: false }))}
          />
          <ScrollLock className="overflow-y-auto overscroll-contain flex-1 px-5 py-3">
            {memberModal.list.length === 0
              ? <p className="text-center text-gray-400 text-sm py-12">No members found.</p>
              : (
                <ul className="divide-y divide-gray-50">
                  {memberModal.list.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-3 py-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                        {i + 1}
                      </div>
                      <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                    </li>
                  ))}
                </ul>
              )
            }
          </ScrollLock>
        </ModalShell>
      )}

      {/* Attendance */}
      {showAttendanceModal && (
        <ModalShell onClose={() => setShowAttendanceModal(false)} wide>
          <ModalHeader
            title="Today's Attendance"
            sub={todayDDMMYYYY()}
            onClose={() => setShowAttendanceModal(false)}
          />
          <ScrollLock className="overflow-y-auto overscroll-contain flex-1 px-5 py-3">
            {attendeesLoading && (
              <div className="space-y-3 py-2">
                {[1,2,3,4].map(i => (
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
            {!attendeesLoading && attendees?.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">No attendance recorded today.</p>
            )}
            {!attendeesLoading && attendees && attendees.length > 0 && (
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

      {/* Collection */}
      {showCollectionModal && (
        <ModalShell onClose={() => setShowCollectionModal(false)} wide>
          <ModalHeader title="Revenue Collection" onClose={() => setShowCollectionModal(false)} />

          {/* Tabs */}
          <div className="flex gap-1.5 px-5 pt-4 pb-1">
            {(['weekly', 'monthly', 'yearly'] as CollectionTab[]).map(tab => (
              <button key={tab} onClick={() => loadCollectionTab(tab)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  collectionTab === tab
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <ScrollLock className="overflow-y-auto overscroll-contain flex-1 px-5 py-4">
            {collectionLoading && (
              <div className="space-y-4 py-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                    <div className="h-8 bg-gray-100 rounded-xl animate-pulse" style={{ width: `${30 + i * 10}%` }} />
                  </div>
                ))}
              </div>
            )}
            {!collectionLoading && rows.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">No data available.</p>
            )}
            {!collectionLoading && rows.length > 0 && (
              <ul className="space-y-4">
                {rows.map((r, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-600 font-medium">{r.label}</span>
                      <span className="text-sm font-bold text-gray-800">{inr(r.amount)}</span>
                    </div>
                    <div className="h-7 bg-gray-100 rounded-xl overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-xl transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: maxAmount > 0 ? `${Math.max(4, (r.amount / maxAmount) * 100)}%` : '4%' }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollLock>

          {!collectionLoading && rows.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 bg-orange-50 rounded-b-2xl flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Total ({tabLabels[collectionTab]})</span>
              <span className="text-xl font-extrabold text-orange-600">{inr(total)}</span>
            </div>
          )}
        </ModalShell>
      )}

      {/* Birthday */}
      {showBirthdayModal && (
        <ModalShell onClose={() => setShowBirthdayModal(false)}>
          <ModalHeader
            title={<>🎂 Birthdays Today</>}
            sub={!birthdayLoading ? (birthdayMembers.length === 0 ? 'No birthdays today' : `${birthdayMembers.length} member${birthdayMembers.length !== 1 ? 's' : ''}`) : undefined}
            onClose={() => setShowBirthdayModal(false)}
          />
          <ScrollLock className="overflow-y-auto overscroll-contain flex-1 px-5 py-3">
            {birthdayLoading && (
              <div className="space-y-3 py-2">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-36 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            )}
            {!birthdayLoading && birthdayMembers.length === 0 && (
              <div className="text-center py-14">
                <p className="text-5xl mb-3">🎈</p>
                <p className="font-semibold text-gray-700">No birthdays today</p>
                <p className="text-sm text-gray-400 mt-1">Enjoy the quiet day!</p>
              </div>
            )}
            {!birthdayLoading && birthdayMembers.length > 0 && (
              <ul className="divide-y divide-gray-50">
                {birthdayMembers.map(m => {
                  return (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex-shrink-0 overflow-hidden shadow-sm">
                        {m.photo
                          ? <img src={m.photo} alt={m.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                          : <span className="w-full h-full flex items-center justify-center text-lg">🎂</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{m.name}</p>
                        {m.mobile && <p className="text-xs text-gray-400 mt-0.5">{m.mobile}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(() => {
                          const gifted  = birthdayGifted.has(m.id)
                          const gifting = birthdayGifting === m.id
                          return (<>
                            {/* Resend only after gifting — the WhatsApp text says the coins were credited */}
                            {gifted && m.mobile && (
                              <WhatsAppApiButton
                                kind="birthday"
                                clientId={m.id}
                                title={`Resend birthday wish to ${m.name} on WhatsApp`}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-green-50 hover:bg-green-100 text-green-600 disabled:opacity-60 transition-colors"
                              />
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); giftBirthdayProcoins(m) }}
                              title="Credits 25 ProCoins and sends the birthday wish on WhatsApp + email"
                              disabled={gifted || gifting || birthdayGifting !== null}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                gifted
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : gifting
                                  ? 'bg-pink-100 text-pink-600 cursor-not-allowed'
                                  : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                              }`}
                            >
                              {gifted ? <>✓ Wished &amp; Gifted</> : gifting ? (
                                <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending…</>
                              ) : <>🎁 Wish & Gift 25 Coins</>}
                            </button>
                          </>)
                        })()}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollLock>
        </ModalShell>
      )}

      {/* Approved Devices */}
      {showDevicesModal && (
        <ApprovedDevicesModal onClose={() => setShowDevicesModal(false)} />
      )}

    </div>
  )
}
