import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import TodaysAttendanceCard from '../components/TodaysAttendanceCard'
import { API_BASE } from '../api/config'

const WC_SESSION_KEY = 'wc_session_v1'

export default function MemberDashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [referAndEarnEnabled, setReferAndEarnEnabled] = useState(false)
  const [wcBusy, setWcBusy] = useState(false)

  // Single-sign-on bridge into the World Cup 2026 prediction app.
  // Both apps live on tavrostechinfo.com so localStorage is shared. We:
  //   1. Hit wc_signup/register.php (idempotent — ensures the user has a
  //      wc_participants row; harmless if they already do).
  //   2. Write the wc_session_v1 key to localStorage in the exact shape
  //      wc2026-app's getSession() expects.
  //   3. Redirect to /wc2026/matches.
  // No second OTP, no re-login — they land already signed in.
  async function openWorldCup() {
    if (!user?.userId || !user?.mobile) return
    setWcBusy(true)
    try {
      // Idempotent — if mobile already exists in `client`, register.php just
      // returns the existing client_id without re-creating anything.
      const res = await fetch(`${API_BASE}/wc_signup/register.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.userName || 'Player',
          mobile: String(user.mobile),
        }),
      })
      const j = await res.json().catch(() => null)
      const clientId = Number(j?.client_id) || Number(user.userId)

      localStorage.setItem(WC_SESSION_KEY, JSON.stringify({
        clientId,
        name: j?.name || user.userName || 'Player',
        mobile: String(user.mobile),
        joinedAt: Date.now(),
      }))

      window.location.href = '/wc2026/matches'
    } catch {
      setWcBusy(false)
      alert('Could not open World Cup 2026 right now. Please try again.')
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/features/get.php`)
      .then(r => r.json())
      .then(d => setReferAndEarnEnabled(d.referAndEarn === 'true'))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.userId) {
      fetch(`${API_BASE}/client/recordLogin.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: user.userId })
      }).catch(() => {})
    }
  }, [user?.userId])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  type MemberLink = {
    label: string
    icon: string
    desc: string
    available: boolean
    path?: string
    onClick?: () => void
    accent?: 'wc'
  }

  const isTrainer = user?.role === 'trainer'

  const memberLinks: MemberLink[] = [
    // Trainer-only entry: opens the admin members list in a restricted view (columns + edits limited).
    ...(isTrainer ? [{ label: 'Members', icon: '👥', desc: 'View gym members',      available: true,  path: '/members' } as MemberLink] : []),
    { label: 'My Profile',  icon: '👤', desc: 'Edit your profile info',    available: true,  path: '/member-profile' },
    { label: 'My Packages', icon: '📦', desc: 'Active & past packages',    available: true,  path: '/member-packages' },
    { label: 'Attendance',  icon: '📅', desc: 'My check-in history',       available: true,  path: '/member-attendance' },
    { label: 'Weight',      icon: '⚖️', desc: 'Track your weight trend',   available: true,  path: '/member-weight' },
    { label: 'ProCoins',    icon: '🪙', desc: 'Rewards & coin balance',    available: true,  path: '/member-procoins' },
    { label: 'Progress',    icon: '📸', desc: 'Before & after photos',     available: true,  path: '/member-before-after' },
    {
      label: 'World Cup 2026', icon: '⚽',
      desc: wcBusy ? 'Opening…' : 'Predict & win football coins',
      available: !wcBusy, onClick: openWorldCup, accent: 'wc',
    },
    { label: 'Refer & Earn', icon: '🎁', desc: 'Invite friends, earn coins', available: referAndEarnEnabled, path: '/member-referral' },
    { label: 'My Workout',  icon: '🏋️', desc: "Today's exercise plan",    available: false, path: '' },
    { label: 'My Diet',     icon: '🥗', desc: 'Your meal plan from the gym', available: true, path: '/member-diet' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
              alt="ProGym"
              className="w-9 h-9 rounded-xl object-cover shadow"
            />
            <span className="font-bold text-gray-800 text-lg">ProGym</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-xs">
                {user?.mobile?.slice(-2)}
              </div>
              <span>+91 {user?.mobile}</span>
            </div>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{greeting()}, {user?.userName || 'Member'}! 👋</h2>
          <p className="text-gray-500 text-sm mt-0.5">Welcome to your fitness portal.</p>
        </div>

        {/* Member ID card */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white mb-6 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Member</p>
            <p className="text-xl font-bold mt-0.5">{user?.userName || '—'}</p>
            <p className="text-white/70 text-sm mt-1">+91 {user?.mobile} · ID #{user?.userId}</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            🏃
          </div>
        </div>

        {/* Today's Attendance — trainer only */}
        {isTrainer && (
          <div className="mb-6">
            <TodaysAttendanceCard />
          </div>
        )}

        {/* Quick links */}
        <h3 className="text-base font-semibold text-gray-700 mb-3">My Portal</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {memberLinks.map(l => {
            const isWc = l.accent === 'wc'
            const wcCls = isWc
              ? 'bg-gradient-to-br from-emerald-50 via-white to-amber-50 border-emerald-200 hover:border-emerald-400'
              : 'bg-white hover:border-orange-300'
            return (
              <button
                key={l.label}
                disabled={!l.available}
                onClick={() => {
                  if (!l.available) return
                  if (l.onClick) l.onClick()
                  else if (l.path) navigate(l.path)
                }}
                className={`${wcCls} rounded-2xl p-4 shadow-sm border border-gray-100 text-left transition-all ${l.available ? 'hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <span className="text-2xl block mb-2">{l.icon}</span>
                <p className={`font-semibold text-sm ${isWc ? 'text-emerald-800' : 'text-gray-800'}`}>{l.label}</p>
                <p className={`text-xs mt-0.5 ${isWc ? 'text-emerald-700/70' : 'text-gray-400'}`}>{l.desc}</p>
              </button>
            )
          })}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-3xl">🚀</span>
          <div>
            <p className="font-semibold text-blue-800 text-sm">Member features coming soon</p>
            <p className="text-blue-600/70 text-xs mt-0.5">Workout tracking, diet plans, attendance & more</p>
          </div>
        </div>
      </main>
    </div>
  )
}
