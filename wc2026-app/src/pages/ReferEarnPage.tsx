import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { API_BASE } from '../api/config'
import { getSession } from '../services/wcSession'
import { toast } from '../components/Toast'

interface ReferralRow {
  referred_client_id: number
  referred_name: string | null
  status: string // 'pending' | 'credited'
  coins_awarded: number
  created_at: string
  credited_at: string | null
}

interface ReferralInfo {
  client_id: number
  referral_code: string | null
  gold_coins: number
  share_link: string
  credited: number
  pending: number
  coins_per_referral: number
  referrals: ReferralRow[]
}

function maskName(n: string | null): string {
  if (!n) return 'New friend'
  const parts = n.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return parts[0] + ' ' + parts[parts.length - 1][0] + '.'
}

function relTime(iso: string | null): string {
  if (!iso) return ''
  const t = Date.parse(iso.replace(' ', 'T'))
  if (Number.isNaN(t)) return ''
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ReferEarnPage() {
  const navigate = useNavigate()
  const session  = getSession()
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.clientId) { navigate('/signup'); return }
    fetch(`${API_BASE}/wc_referrals/info.php?client_id=${session.clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then((j: ReferralInfo | null) => setInfo(j))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.clientId, navigate])

  function shareText(): string {
    if (!info) return ''
    const name = session?.name?.trim() || 'I'
    return [
      `🏆 Join me on ProGym World Cup 2026!`,
      `Predict matches and climb the leaderboard.`,
      ``,
      `Use my referral code: ${info.referral_code}`,
      info.share_link,
      ``,
      `Top 3 referrers top the leaderboard 🏆 — ${name}`
    ].join('\n')
  }

  async function handleShare() {
    if (!info) return
    const text = shareText()
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ProGym World Cup 2026', text, url: info.share_link })
        return
      } catch {
        // user cancelled — fall through
      }
    }
    // Fallback: WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  function copyCode() {
    if (!info?.referral_code) return
    navigator.clipboard?.writeText(info.referral_code).then(
      () => toast('Code copied ✓'),
      () => toast('Could not copy — long-press to select')
    )
  }

  function copyLink() {
    if (!info?.share_link) return
    navigator.clipboard?.writeText(info.share_link).then(
      () => toast('Link copied ✓'),
      () => toast('Could not copy link')
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader title="Refer & Earn" showBack />

      <main className="max-w-md mx-auto px-3 py-3 space-y-3">
        {/* Hero — stars tally + referral code */}
        <section className="bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -right-8 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 bg-yellow-200/30 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-90">Stars</p>
            <p className="text-4xl font-black tabular-nums mt-1 drop-shadow">
              {loading ? '–' : (info?.gold_coins ?? 0)} ⭐
            </p>
            <p className="text-[11px] opacity-90 mt-1">
              Earn 1 star instantly every time a friend signs up with your code.
            </p>

            <div className="mt-4 bg-white/95 text-amber-900 rounded-xl p-3 shadow-md">
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">Your code</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-2xl font-black tracking-[0.2em] tabular-nums flex-1">
                  {loading ? '——————' : (info?.referral_code || '—')}
                </p>
                <button
                  onClick={copyCode}
                  disabled={!info?.referral_code}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors disabled:opacity-50"
                >Copy</button>
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={!info?.referral_code}
              className="w-full mt-3 py-3 bg-white text-amber-700 font-black rounded-xl shadow active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A11.86 11.86 0 0012.04 0C5.5 0 .2 5.3.2 11.85c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 005.64 1.43h.01c6.54 0 11.84-5.3 11.84-11.85 0-3.16-1.23-6.13-3.37-8.42z"/></svg>
              Share on WhatsApp
            </button>
            <button
              onClick={copyLink}
              disabled={!info?.share_link}
              className="w-full mt-2 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl border border-white/40 transition-colors disabled:opacity-50"
            >
              Copy share link
            </button>
          </div>
        </section>

        {/* Friends referred — single stat (credit is instant in current model). */}
        <section className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl flex-shrink-0">
            👥
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Friends referred</p>
            <p className="text-2xl font-black text-gray-800 leading-tight">
              {((info?.credited ?? 0) + (info?.pending ?? 0))}
            </p>
          </div>
        </section>

        {/* Leaderboard promo */}
        <section className="bg-gradient-to-r from-blue-600 via-indigo-700 to-indigo-900 text-white rounded-2xl p-4 shadow-md">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🏆</span>
            <div className="flex-1">
              <p className="font-black text-sm leading-tight">Top 3 on the referral leaderboard</p>
              <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                Climb the referral ranking by inviting friends. The 3 players with the most stars at tournament end top the leaderboard for bragging rights.
              </p>
              <button
                onClick={() => navigate('/leaderboard?tab=referral')}
                className="mt-2 text-[12px] font-bold underline underline-offset-2"
              >
                See referral ranking →
              </button>
            </div>
          </div>
        </section>

        {/* Your referrals list */}
        <section className="bg-white rounded-2xl border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">Your referrals</h2>
          </div>
          {loading && (
            <div className="p-4 animate-pulse space-y-2">
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          )}
          {!loading && (!info || info.referrals.length === 0) && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">📨</p>
              <p className="font-semibold text-gray-600">No referrals yet</p>
              <p className="text-xs mt-1 text-gray-400">Share your code with friends to get started.</p>
            </div>
          )}
          {!loading && info && info.referrals.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {info.referrals.map(r => {
                const credited = r.status === 'credited'
                return (
                  <li key={r.referred_client_id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black flex-shrink-0">
                      {(r.referred_name || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{maskName(r.referred_name)}</p>
                      <p className="text-[10px] text-gray-400">Joined · {relTime(r.created_at)}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${credited ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {credited ? `+${r.coins_awarded} ⭐` : 'Pending'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* How it works */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider mb-2">How it works</h3>
          <ol className="text-[12px] text-gray-600 space-y-2 leading-relaxed list-decimal pl-5">
            <li>Share your code or link with friends.</li>
            <li>The moment they sign up with your code, you earn <span className="font-bold text-amber-600">1 ⭐ star</span>.</li>
            <li>Stars don't change your football-coin tally — they only count toward the referral ranking.</li>
            <li>Top 3 referrers at the end of the tournament top the referral leaderboard 🏆.</li>
          </ol>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
