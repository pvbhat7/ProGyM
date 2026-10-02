import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'

interface ReferredClient {
  id: string
  name: string
  mobile: string
  gender: string
  profileActiveFlag: string
  isGymClient: string
  discontinue: string
  referPoints: string
  admissionDate?: string
}

export default function MemberReferralPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [referrals, setReferrals] = useState<ReferredClient[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referralCode, setReferralCode] = useState<string>('')

  useEffect(() => {
    if (!user?.userId) return

    // Fetch the client's stored referral code
    fetch(`${API_BASE}/client/byId.php?id=${user.userId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.referralCode) setReferralCode(data.referralCode)
      })
      .catch(() => {})

    // Fetch referred members
    fetch(`${API_BASE}/client/allReferrals.php?reference=${user.userId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReferrals(data.filter((c: ReferredClient) => c && c.id))
        } else {
          setReferrals([])
        }
      })
      .catch(() => setReferrals([]))
      .finally(() => setLoading(false))
  }, [user?.userId])
  const shareText = referralCode
    ? `Join ProGym – the best gym in town! 💪\nUse my referral code *${referralCode}* when you sign up and we both earn ProCoins!\nhttps://progym.co.in/`
    : `Join ProGym – the best gym in town! 💪\nhttps://progym.co.in/`

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  const activeGymMembers = referrals.filter(r => r.isGymClient === 'yes' && r.profileActiveFlag === 'enable' && r.discontinue !== 'true')
  const totalReferrals = referrals.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/member-dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-gray-800 text-lg">Refer &amp; Earn</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Hero */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white text-center">
          <div className="text-5xl mb-3">🎁</div>
          <h2 className="text-xl font-bold">Invite Friends, Earn ProCoins!</h2>
          <p className="text-white/80 text-sm mt-1">
            Share your referral code with friends. When they join ProGym, you both benefit!
          </p>
        </div>

        {/* Referral Code Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your Referral Code</p>
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
            <span className="flex-1 font-mono font-bold text-orange-600 text-xl tracking-widest">
              {referralCode || <span className="inline-block w-40 h-6 bg-orange-100 animate-pulse rounded" />}
            </span>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Join ProGym!', text: shareText })
                } else {
                  handleCopy()
                }
              }}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-3 font-semibold text-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-orange-500">{loading ? '—' : totalReferrals}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Total Referred</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{loading ? '—' : activeGymMembers.length}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Active Gym Members</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">How It Works</p>
          <div className="space-y-4">
            {[
              { step: '1', icon: '📤', title: 'Share your code', desc: 'Send your referral code to friends via WhatsApp or any app' },
              { step: '2', icon: '🏃', title: 'Friend joins ProGym', desc: 'They mention your referral code when signing up at the gym' },
              { step: '3', icon: '🪙', title: 'Earn ProCoins', desc: 'You earn ProCoins when your friend becomes an active member' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{item.icon} {item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referred Members List */}
        <div>
          <p className="text-base font-semibold text-gray-700 mb-3">
            People You Referred {!loading && totalReferrals > 0 && <span className="text-orange-500">({totalReferrals})</span>}
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : totalReferrals === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-semibold text-gray-600 text-sm">No referrals yet</p>
              <p className="text-xs text-gray-400 mt-1">Share your code above and start earning!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(r => {
                const isActive = r.profileActiveFlag === 'enable' && r.discontinue !== 'true'
                const isGymMember = r.isGymClient === 'yes'
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                      {r.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{r.name}</p>
                      <p className="text-xs text-gray-400">+91 {r.mobile}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isGymMember ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                        {isGymMember ? 'Gym Member' : 'App Only'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
