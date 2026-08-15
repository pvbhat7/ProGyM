import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { clearSession, getSession } from '../services/wcSession'
import { unregisterPushForClient } from '../services/wcPush'
import { useMenuGate } from '../hooks/useMenuGate'

interface ClientInfo {
  name?: string
  mobile?: string
  email?: string
  isGymClient?: string
  photo?: string
}

interface PredictionsSummary {
  total_coins_earned?: number
  predictions?: unknown[]
}

function formatJoined(ts: number | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatMobile(m?: string): string {
  if (!m) return ''
  const digits = m.replace(/\D/g, '')
  if (digits.length === 10) return `+91 ${digits.slice(0,5)} ${digits.slice(5)}`
  return m
}

const SUPPORT_PHONE = '918796655176'

function buildCoinIssueWhatsAppUrl(name: string, clientId: number, mobile: string | undefined, balance: number): string {
  const lines = [
    'Hi ProGym, I would like to report an issue with my football coins.',
    '',
    `Name: ${name}`,
    `Client ID: #${clientId}`,
    `Mobile: ${mobile || '-'}`,
    `Current balance: ${Math.round(balance)} football(s)`,
    '',
    'Issue details:',
    '',
  ]
  return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(lines.join('\n'))}`
}

function initialsFor(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const session = getSession()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [balance, setBalance] = useState(0)
  const [predictionCount, setPredictionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const gate = useMenuGate()

  useEffect(() => {
    if (!session?.clientId) { navigate('/signup'); return }

    const clientReq = fetch(`${API_BASE}/client/byId.php?id=${session.clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then((j: ClientInfo | null) => setClient(j))
      .catch(() => {})

    const predReq = fetch(`${API_BASE}/wc_predictions/myPredictions.php?client_id=${session.clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then((j: PredictionsSummary | null) => {
        if (!j) return
        setBalance(Number(j.total_coins_earned) || 0)
        setPredictionCount(Array.isArray(j.predictions) ? j.predictions.length : 0)
      })
      .catch(() => {})

    Promise.all([clientReq, predReq]).finally(() => setLoading(false))
  }, [session?.clientId, navigate])

  async function handleLogout() {
    if (!confirm('Log out of the prediction campaign?')) return
    const cid = session?.clientId || 0
    if (cid > 0) {
      // Fire-and-forget — never block logout on a network call.
      unregisterPushForClient(cid).catch(() => {})
    }
    clearSession()
    navigate('/', { replace: true })
  }

  const name      = client?.name || session?.name || 'Player'
  const mobile    = client?.mobile || session?.mobile
  const email     = client?.email && client.email.trim() !== '' ? client.email : null
  const isMember  = (client?.isGymClient || '').toLowerCase() === 'yes'
  const joinedStr = formatJoined(session?.joinedAt)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader title="Profile" subtitle={session?.name || ''} />

      <main className="max-w-md mx-auto px-3 py-3 space-y-3">
        {/* Identity card */}
        <section className="bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-900 text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white text-blue-700 flex items-center justify-center text-2xl font-black shadow-md border-2 border-white">
              {initialsFor(name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black truncate">{name}</p>
              <p className="text-[12px] opacity-90 truncate">{formatMobile(mobile)}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isMember ? 'bg-amber-300 text-amber-900' : 'bg-white/20 text-white border border-white/30'}`}>
                {isMember ? '🏋️ Gym Member' : '🎯 Predictor'}
              </span>
            </div>
          </div>
        </section>

        {!gate.gated && (
          <>
            {/* Refer & Earn — eye-catching gold call-to-action */}
            <button
              onClick={() => navigate('/refer')}
              className="w-full text-left bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-white rounded-2xl px-4 py-3 shadow-md active:scale-[0.99] transition-transform flex items-center gap-3"
            >
              <span className="text-3xl drop-shadow">⭐</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm leading-tight">Refer & Earn Stars</p>
                <p className="text-amber-50 text-[11px] leading-tight">Climb the referral leaderboard 🏆</p>
              </div>
              <span className="text-white font-black text-lg">→</span>
            </button>

            {/* Stats row */}
            <section className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/coins')}
                className="bg-white rounded-2xl border border-gray-100 p-3 text-left hover:border-blue-200 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Footballs</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{Math.round(balance)} ⚽</p>
                <p className="text-[10px] text-blue-600 mt-1 font-semibold">View history →</p>
              </button>
              <button
                onClick={() => navigate('/my-picks')}
                className="bg-white rounded-2xl border border-gray-100 p-3 text-left hover:border-blue-200 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Predictions</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{predictionCount}</p>
                <p className="text-[10px] text-blue-600 mt-1 font-semibold">My picks →</p>
              </button>
            </section>
          </>
        )}

        {/* Details */}
        <section className="bg-white rounded-2xl border border-gray-100 p-1">
          {loading && (
            <div className="p-4 animate-pulse space-y-2">
              <div className="h-3 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          )}
          {!loading && (
            <ul className="divide-y divide-gray-100">
              <li className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-gray-500">Mobile</span>
                <span className="text-[13px] font-semibold text-gray-800">{formatMobile(mobile) || '—'}</span>
              </li>
              {email && (
                <li className="flex items-center justify-between px-4 py-3">
                  <span className="text-[12px] text-gray-500">Email</span>
                  <span className="text-[13px] font-semibold text-gray-800 truncate ml-2">{email}</span>
                </li>
              )}
              <li className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-gray-500">Account type</span>
                <span className="text-[13px] font-semibold text-gray-800">{isMember ? 'Gym Member' : 'Predictor only'}</span>
              </li>
              {joinedStr && (
                <li className="flex items-center justify-between px-4 py-3">
                  <span className="text-[12px] text-gray-500">Joined</span>
                  <span className="text-[13px] font-semibold text-gray-800">{joinedStr}</span>
                </li>
              )}
              <li className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-gray-500">Client ID</span>
                <span className="text-[13px] font-mono text-gray-500">#{session?.clientId}</span>
              </li>
            </ul>
          )}
        </section>

        {/* Support / Contact */}
        <section className="space-y-2">
          <a
            href={buildCoinIssueWhatsAppUrl(name, session?.clientId || 0, mobile, balance)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-100 active:scale-[0.99] transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Report a coin issue
          </a>
          <a
            href={`tel:+${SUPPORT_PHONE}`}
            className="w-full py-3 px-4 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-100 active:scale-[0.99] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call admin
          </a>
        </section>

        {/* Terms & Conditions */}
        <a
          href={`${import.meta.env.BASE_URL}terms.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.99] transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Terms &amp; Conditions
        </a>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 active:scale-[0.99] transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log out
        </button>

        {!isMember && (
          <p className="text-center text-[11px] text-gray-400 pt-1">
            Predictor-only accounts can't book gym sessions. Talk to ProGym to upgrade.
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
