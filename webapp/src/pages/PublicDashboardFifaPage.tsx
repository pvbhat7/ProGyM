import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FullscreenButton from '../components/FullscreenButton'
import TeamFlag from '../components/TeamFlag'
import { API_BASE } from '../api/config'

interface BirthdayClient {
  id: number
  name: string
  photo: string
  birthDate: string
}

interface WcTeam {
  id: number
  name: string
  short_code: string
  flag: string
  group_name: string
}

interface WcMatch {
  id: number
  team_a_id: number
  team_b_id: number
  team_a_name: string
  team_a_code: string
  team_a_group: string
  team_b_name: string
  team_b_code: string
  team_b_group: string
  stage: string
  multiplier: number | string
  kickoff_at: string
  status: string
  score_a?: number | string
  score_b?: number | string
}

function getPhotoUrl(photo: string): string {
  if (!photo) return ''
  if (photo.startsWith('http')) return photo
  if (photo.startsWith('/')) return `https://tavrostechinfo.com${photo}`
  return `https://tavrostechinfo.com/PROGYM/ggs/${photo}`
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right">
      <p className="text-slate-900 font-bold text-lg leading-none tabular-nums tracking-wide">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </p>
      <p className="text-slate-500 text-xs mt-0.5">
        {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
    </div>
  )
}

function formatKickoff(iso: string): { date: string; time: string } {
  if (!iso) return { date: 'TBD', time: '--:--' }
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return { date: 'TBD', time: '--:--' }
  return {
    date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!iso) return null
  const target = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T')).getTime()
  let diff = Math.max(0, target - now)
  const d = Math.floor(diff / 86400000); diff -= d * 86400000
  const h = Math.floor(diff / 3600000);  diff -= h * 3600000
  const m = Math.floor(diff / 60000);    diff -= m * 60000
  const s = Math.floor(diff / 1000)

  const Box = ({ n, l }: { n: number; l: string }) => (
    <div className="flex flex-col items-center px-2 py-1.5 rounded-lg bg-white border border-amber-500/40 shadow-sm min-w-[44px]">
      <span className="text-amber-700 font-black text-lg leading-none tabular-nums">{String(n).padStart(2, '0')}</span>
      <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mt-0.5">{l}</span>
    </div>
  )
  return (
    <div className="flex items-center gap-1.5">
      <Box n={d} l="Days" />
      <Box n={h} l="Hrs" />
      <Box n={m} l="Min" />
      <Box n={s} l="Sec" />
    </div>
  )
}

function NextMatchHero({ match }: { match: WcMatch | null }) {
  if (!match) {
    return (
      <div className="relative rounded-3xl border border-amber-500/40 bg-gradient-to-r from-purple-100 via-white to-pink-100 backdrop-blur-sm p-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #f59e0b 0%, transparent 40%), radial-gradient(circle at 70% 50%, #ef4444 0%, transparent 40%)' }} />
        <div className="relative flex items-center justify-center h-32 gap-4">
          <span className="text-5xl animate-pulse">⚽</span>
          <div>
            <p className="text-amber-700 font-black text-lg uppercase tracking-widest">Match Schedule Coming Soon</p>
            <p className="text-slate-600 text-sm mt-1">Group draws & fixtures will appear here</p>
          </div>
          <span className="text-5xl animate-pulse">🏆</span>
        </div>
      </div>
    )
  }
  return (
    <div className="relative rounded-3xl border border-amber-500/50 bg-gradient-to-r from-purple-100 via-white to-pink-100 backdrop-blur-sm px-4 py-3 sm:px-5 sm:py-3.5 overflow-hidden shadow-2xl shadow-amber-500/10">
      {/* Glowing background blobs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-300/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-pink-300/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] opacity-[0.06] pointer-events-none select-none"
           style={{ animation: 'fifa-trophy-spin 24s linear infinite' }}>🏆</div>

      {/* Live tag (compact — countdown on the right shows the kickoff time) */}
      <div className="relative flex items-center gap-2 mb-2">
        <span
          className="inline-block w-2 h-2 rounded-full bg-pink-500"
          style={{ animation: 'fifa-pulse 1.2s ease-in-out infinite' }}
        />
        <span className="text-pink-700 font-black text-[11px] uppercase tracking-[0.25em]">Next Match</span>
        <span className="text-slate-400 text-[11px]">·</span>
        <span className="text-amber-700 font-bold text-[11px] uppercase tracking-widest">{match.stage}</span>
        {Number(match.multiplier) > 1 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-500/50 text-amber-700 font-black text-[10px] tracking-wide">
            {match.multiplier}x BOOST
          </span>
        )}
      </div>

      {/* Body: [teams] [countdown] side-by-side on md+; stack on very small screens */}
      <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        {/* Teams row */}
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-6 items-center">
          {/* Team A */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-end text-center sm:text-right min-w-0">
            <div className="order-2 sm:order-1 min-w-0">
              <p className="text-slate-900 font-black text-lg sm:text-2xl leading-tight uppercase tracking-tight truncate">{match.team_a_name}</p>
              <p className="text-amber-700/90 text-[11px] font-bold tracking-widest">{match.team_a_code} · GROUP {match.team_a_group}</p>
            </div>
            <div className="order-1 sm:order-2 relative shrink-0">
              <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl scale-150 pointer-events-none" />
              <TeamFlag code={match.team_a_code} size={160} className="relative w-16 h-12 sm:w-24 sm:h-16 ring-2 ring-amber-300/50 shadow-2xl" />
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/40 rounded-full blur-lg pointer-events-none" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <span className="text-slate-900 font-black text-base sm:text-lg tracking-tight">VS</span>
              </div>
            </div>
          </div>

          {/* Team B */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-start text-center sm:text-left min-w-0">
            <div className="order-1 relative shrink-0">
              <div className="absolute inset-0 bg-pink-400/30 rounded-full blur-xl scale-150 pointer-events-none" />
              <TeamFlag code={match.team_b_code} size={160} className="relative w-16 h-12 sm:w-24 sm:h-16 ring-2 ring-pink-500/50 shadow-2xl" />
            </div>
            <div className="order-2 min-w-0">
              <p className="text-slate-900 font-black text-lg sm:text-2xl leading-tight uppercase tracking-tight truncate">{match.team_b_name}</p>
              <p className="text-pink-700/90 text-[11px] font-bold tracking-widest">{match.team_b_code} · GROUP {match.team_b_group}</p>
            </div>
          </div>
        </div>

        {/* Countdown — to the right of the teams on md+ */}
        <div className="shrink-0 flex justify-center md:justify-end">
          <Countdown iso={match.kickoff_at} />
        </div>
      </div>
    </div>
  )
}

function FlagMarquee({ teams }: { teams: WcTeam[] }) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-slate-100 p-3 text-center">
        <p className="text-slate-400 text-xs">Teams will appear here once the draw is published</p>
      </div>
    )
  }
  const items = [...teams, ...teams]
  const animDuration = Math.max(30, teams.length * 2.2)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-slate-100 via-purple-50 to-slate-100 py-3">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      <div
        className="flex gap-6"
        style={{ width: 'max-content', animation: `fifa-flag-scroll ${animDuration}s linear infinite` }}
      >
        {items.map((t, i) => (
          <div key={`${t.id}-${i}`} className="flex flex-col items-center gap-1.5 px-1">
            <TeamFlag code={t.short_code} size={160} className="w-16 h-11 ring-1 ring-slate-300" />
            <span className="text-slate-700 text-[10px] font-bold tracking-wider">{t.short_code}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function UpcomingMatchCard({ match }: { match: WcMatch }) {
  const ko = formatKickoff(match.kickoff_at)
  return (
    <div className="relative rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm p-3 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      <div className="flex items-center justify-between mb-2">
        <span className="text-amber-700 text-[9px] font-black uppercase tracking-widest">{match.stage}</span>
        {Number(match.multiplier) > 1 && (
          <span className="text-amber-700 text-[9px] font-black">{match.multiplier}x</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <TeamFlag code={match.team_a_code} size={40} className="w-6 h-4 flex-shrink-0" />
          <span className="text-slate-900 text-xs font-bold truncate">{match.team_a_code}</span>
        </div>
        <span className="text-slate-400 text-[10px] font-bold">vs</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-slate-900 text-xs font-bold truncate">{match.team_b_code}</span>
          <TeamFlag code={match.team_b_code} size={40} className="w-6 h-4 flex-shrink-0" />
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
        <span className="text-slate-500 text-[10px] tabular-nums">{ko.date}</span>
        <span className="text-amber-700 text-[10px] font-bold tabular-nums">{ko.time}</span>
      </div>
    </div>
  )
}

function MiniBirthday({ clients }: { clients: BirthdayClient[] }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (clients.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % clients.length), 3500)
    return () => clearInterval(t)
  }, [clients.length])
  if (clients.length === 0) return null
  const c = clients[idx]
  const photoUrl = getPhotoUrl(c.photo)
  const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-amber-500/50 bg-amber-100 backdrop-blur-sm">
      <span className="text-base leading-none">🎂</span>
      {photoUrl ? (
        <img src={photoUrl} alt={c.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-300/50" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-black">{initials}</div>
      )}
      <div className="leading-tight">
        <p className="text-amber-700 text-[9px] font-black uppercase tracking-widest">Birthday</p>
        <p className="text-slate-900 text-xs font-bold truncate max-w-[140px]">{c.name}</p>
      </div>
    </div>
  )
}

const HOST_FLAGS = ['USA', 'MEX', 'CAN']

/* ──────────────────────────────────────────────────────────────────────────
   QR modal — opens a large QR for easy scanning
   ────────────────────────────────────────────────────────────────────────── */
type QrEntry = { id: 'addMember' | 'wcPredict'; title: string; subtitle: string; img: string; accent: string }

const QR_ENTRIES: QrEntry[] = [
  {
    id: 'addMember',
    title: 'Add New Member',
    subtitle: 'Scan to open the member sign-up form',
    img: '/progym/qr/add_new_member_qr.png?v=2',
    accent: 'from-green-500 to-emerald-600',
  },
  {
    id: 'wcPredict',
    title: 'World Cup Predictions',
    subtitle: 'Scan to open the WC 2026 prediction app',
    img: '/progym/qr/wc2026_app_qr.png?v=2',
    accent: 'from-purple-500 to-pink-500',
  },
]

function QrModal({ entry, onClose }: { entry: QrEntry | null; onClose: () => void }) {
  if (!entry) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-white via-purple-50 to-pink-50 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-4">
          <p className={`inline-block text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1 rounded-full text-white bg-gradient-to-r ${entry.accent}`}>
            QR Code
          </p>
          <h2 className="text-slate-900 font-black text-xl sm:text-2xl mt-3 tracking-tight">{entry.title}</h2>
          <p className="text-slate-600 text-sm mt-1">{entry.subtitle}</p>
        </div>

        <div className="relative mx-auto bg-white rounded-2xl p-4 sm:p-5 shadow-inner max-w-[320px]">
          <img src={entry.img} alt={entry.title} className="w-full h-auto block" />
          {/* corner markers */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400 rounded-tl-md" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400 rounded-tr-md" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400 rounded-bl-md" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400 rounded-br-md" />
        </div>

        <p className="text-amber-700/90 text-[11px] text-center mt-4 font-semibold tracking-wider uppercase">
          Point your phone camera at the QR
        </p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Classic soccer ball SVG — used as the 4 quick-action buttons
   The pentagon/hexagon pattern is the iconic Telstar look.
   ────────────────────────────────────────────────────────────────────────── */
const SoccerBall = ({ className = '', uid }: { className?: string; uid: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none">
    <defs>
      <radialGradient id={`ball-shine-${uid}`} cx="0.34" cy="0.3" r="0.85">
        <stop offset="0%"   stopColor="#ffffff" />
        <stop offset="60%"  stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#94a3b8" />
      </radialGradient>
    </defs>

    {/* body */}
    <circle cx="50" cy="50" r="46" fill={`url(#ball-shine-${uid})`} stroke="#0f172a" strokeWidth="1.5" />

    {/* center pentagon */}
    <polygon points="50,30 67,42 60,62 40,62 33,42" fill="#0f172a" />

    {/* lines radiating to outer hexagons */}
    <g stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <path d="M50 30 L50 14" />
      <path d="M67 42 L82 36" />
      <path d="M60 62 L72 76" />
      <path d="M40 62 L28 76" />
      <path d="M33 42 L18 36" />
    </g>

    {/* outer hexagon patches */}
    <g fill="#0f172a">
      <polygon points="50,14 58,10 66,15 60,22 50,22" />
      <polygon points="82,36 88,44 85,52 76,49 74,42" />
      <polygon points="72,76 80,80 76,87 67,86 65,79" />
      <polygon points="28,76 20,80 24,87 33,86 35,79" />
      <polygon points="18,36 12,44 15,52 24,49 26,42" />
    </g>

    {/* glossy highlight */}
    <ellipse cx="37" cy="32" rx="14" ry="6" fill="rgba(255,255,255,0.45)" transform="rotate(-30 37 32)" />
  </svg>
)

export default function PublicDashboardFifaPage() {
  const navigate = useNavigate()
  const [birthdayClients, setBirthdayClients] = useState<BirthdayClient[]>([])
  const [teams, setTeams] = useState<WcTeam[]>([])
  const [upcoming, setUpcoming] = useState<WcMatch[]>([])
  const [qrModal, setQrModal] = useState<QrEntry | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/client/todayBirthdays.php`)
      .then(r => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setBirthdayClients(d as BirthdayClient[]) })
      .catch(() => {})
    fetch(`${API_BASE}/wc_teams/all.php`)
      .then(r => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setTeams(d as WcTeam[]) })
      .catch(() => {})
    fetch(`${API_BASE}/wc_matches/upcoming.php`)
      .then(r => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setUpcoming(d as WcMatch[]) })
      .catch(() => {})
  }, [])

  const nextMatch = upcoming[0] || null
  const upcomingRest = upcoming.slice(1, 5)

  const balls = [
    { uid: 'm', label: 'Members',    aura: 'bg-green-500/35',  ring: 'ring-green-300/60',  action: () => navigate('/public-members')    },
    { uid: 'w', label: 'Workouts',   aura: 'bg-pink-500/35',    ring: 'ring-pink-300/60',    action: () => navigate('/workouts')          },
    { uid: 'a', label: 'Admin Zone', aura: 'bg-purple-500/35',   ring: 'ring-purple-300/60',   action: () => navigate('/admin-panel')       },
    { uid: 't', label: 'Attendance', aura: 'bg-amber-400/40',  ring: 'ring-amber-300/70',  action: () => navigate('/quick-attendance')  },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50 select-none relative overflow-hidden">

      <style>{`
        @keyframes fifa-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.4)} }
        @keyframes fifa-trophy-spin { 0%{transform:translate(-50%,-50%) rotate(0deg)} 100%{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes fifa-flag-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fifa-emblem-glow { 0%,100%{filter:drop-shadow(0 0 14px rgba(251,191,36,0.7)) drop-shadow(0 0 6px rgba(239,68,68,0.5))} 50%{filter:drop-shadow(0 0 26px rgba(251,191,36,1)) drop-shadow(0 0 12px rgba(59,130,246,0.6))} }
        @keyframes fifa-ball-float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(15deg)} }
        @keyframes fifa-fly-x { 0%{transform:translateX(-40px) rotate(-12deg);opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{transform:translateX(120vw) rotate(20deg);opacity:0} }
        @keyframes fifa-twinkle { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.9;transform:scale(1.3)} }
        @keyframes fifa-shine { 0%{background-position:200% center} 100%{background-position:-200% center} }
      `}</style>

      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-emerald-300/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-amber-300/25 rounded-full blur-3xl" />

        {/* Stars */}
        {Array.from({ length: 14 }).map((_, i) => {
          const seed = i * 73 % 100
          return (
            <div
              key={i}
              className="absolute rounded-full bg-amber-400"
              style={{
                top: `${(seed * 7) % 95}%`,
                left: `${(seed * 11) % 95}%`,
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                boxShadow: '0 0 6px rgba(245,158,11,0.7)',
                animation: `fifa-twinkle 2.6s ease-in-out ${(i % 6) * 0.3}s infinite`,
              }}
            />
          )
        })}

        {/* Floating balls flying across */}
        <div className="absolute text-[36px] opacity-30 select-none" style={{ top: '12%', animation: 'fifa-fly-x 18s linear infinite' }}>⚽</div>
        <div className="absolute text-[28px] opacity-25 select-none" style={{ top: '78%', animation: 'fifa-fly-x 22s linear 4s infinite' }}>⚽</div>
        <div className="absolute text-[44px] opacity-25 select-none" style={{ top: '45%', animation: 'fifa-fly-x 26s linear 9s infinite' }}>⚽</div>

        {/* Static decor */}
        <div className="absolute text-[80px] opacity-[0.13] select-none" style={{ top: '20%', left: '2%', animation: 'fifa-ball-float 7s ease-in-out infinite' }}>🏆</div>
        <div className="absolute text-[64px] opacity-[0.12] select-none" style={{ bottom: '8%', left: '4%', animation: 'fifa-ball-float 8s ease-in-out 1s infinite' }}>🥅</div>

        {/* Stadium grid */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/45 rounded-2xl blur-lg" />
            <img
              src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
              alt="ProGym"
              className="relative w-10 h-10 rounded-xl object-cover shadow-lg border border-amber-500/40"
            />
          </div>
          <div>
            <p className="font-black text-slate-900 text-base leading-none tracking-wide">ProGym</p>
            <p className="text-slate-400 text-[10px] mt-0.5 tracking-wider">KOLHAPUR</p>
          </div>
          {/* Big FIFA emblem */}
          <div className="flex items-center gap-3 ml-2 sm:ml-4">
            <img
              src="https://tavrostechinfo.com/wc2026/fifa.png"
              alt="FIFA World Cup 2026"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain flex-shrink-0"
              style={{ animation: 'fifa-emblem-glow 2.6s ease-in-out infinite' }}
            />
            <div className="flex flex-col leading-tight">
              <span
                className="text-sm sm:text-base font-black tracking-[0.18em] uppercase"
                style={{
                  background: 'linear-gradient(90deg, #b45309, #f59e0b, #b45309)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'fifa-shine 3s linear infinite',
                }}
              >FIFA WORLD CUP</span>
              <span className="text-slate-700 text-[11px] font-bold tracking-[0.2em] uppercase">2026 · USA · MEX · CAN</span>
              <div className="flex items-center gap-1 mt-1">
                {HOST_FLAGS.map(c => (
                  <TeamFlag key={c} code={c} size={40} className="w-5 h-3.5" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {birthdayClients.length > 0 && <MiniBirthday clients={birthdayClients} />}
          <FullscreenButton />
          <Clock />
        </div>
      </header>

      {/* Main — single column, full width */}
      <main className="relative z-10 flex-1 flex flex-col px-3 sm:px-4 py-3 gap-3 overflow-y-auto min-h-0">

        {/* HERO: Next match */}
        <NextMatchHero match={nextMatch} />

        {/* Row: [LEFT] Upcoming matches  ·  [RIGHT] 4 footballs (in place of Group Stage) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-3">

          {/* UPCOMING matches (left, 2×2 cards) */}
          <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-900 font-black text-sm tracking-wider uppercase flex items-center gap-2">
                <span className="text-amber-700">⚡</span>
                Upcoming Matches
              </p>
              <span className="text-slate-400 text-[10px] uppercase tracking-widest">Next {upcomingRest.length} fixtures</span>
            </div>
            {upcomingRest.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {upcomingRest.map(m => <UpcomingMatchCard key={m.id} match={m} />)}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">No fixtures scheduled yet — check back soon</div>
            )}
          </div>

          {/* QUICK ACTIONS (right, 2×2 footballs) — matches Group Stage card visual weight */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 backdrop-blur-sm p-3 sm:p-4 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-300/30 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-300/30 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-center justify-between mb-3">
              <p className="text-slate-900 font-black text-sm tracking-wider uppercase flex items-center gap-2">
                <span className="text-amber-700">🥅</span>
                Gym Quick Actions
              </p>
              {/* QR thumbnails — click to expand */}
              <div className="flex items-center gap-1.5">
                {QR_ENTRIES.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setQrModal(q)}
                    title={q.title}
                    className="group flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-amber-500/50 active:scale-95 transition-all duration-150"
                  >
                    <div className="w-6 h-6 bg-white rounded-sm p-0.5 flex-shrink-0">
                      <img src={q.img} alt={q.title} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-900 text-[9px] font-bold tracking-wider uppercase leading-none">
                      {q.id === 'addMember' ? 'New Member' : 'WC Predict'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-3">
              {balls.map(b => (
                <button
                  key={b.uid}
                  onClick={b.action}
                  className="group flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all duration-200 focus:outline-none"
                >
                  {/* football with tight aura */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className={`absolute inset-1 ${b.aura} rounded-full blur-lg pointer-events-none opacity-80`} />
                    <SoccerBall
                      uid={b.uid}
                      className="relative w-full h-full group-hover:rotate-[18deg] transition-transform duration-300"
                    />
                  </div>

                  {/* label pill below */}
                  <p className={`text-slate-900 text-xs font-bold tracking-wider uppercase leading-none px-2.5 py-1 rounded-md ring-1 ${b.ring} bg-slate-100 group-hover:bg-slate-200 transition-colors`}>
                    {b.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* TEAM FLAGS marquee — bottom */}
        <FlagMarquee teams={teams} />

      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-2 pt-1 text-center text-slate-500 text-[11px] tracking-wide flex items-center justify-center gap-2 border-t border-slate-200">
        <span>ProGym · Powered by Tavros Tech Info</span>
        <span className="text-amber-700/50">·</span>
        <span className="text-amber-700/80 font-black tracking-widest">🏆 FIFA WC 2026 EDITION</span>
      </footer>

      {/* QR expand modal */}
      <QrModal entry={qrModal} onClose={() => setQrModal(null)} />
    </div>
  )
}
