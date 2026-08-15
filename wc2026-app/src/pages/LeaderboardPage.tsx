import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { getSession } from '../services/wcSession'

interface OverallEntry {
  rank: number
  client_id: string
  client_name: string | null
  was_gym_client_at_join: string
  total_coins_earned: number
  total_matches_predicted: number
  client_mobile?: string | null
  fifa_coupon?: string | null
  fifa_discount_percent?: number | null
}

interface DailyEntry {
  rank: number
  client_id: string
  client_name: string | null
  coins_today: number
  matches_predicted_today: number
}

const ADMIN_MOBILE_SUFFIX = '8796655176'
const WA_SENT_KEY = 'wc_daily_wa_sent_v1'
const PROGYM_MAP  = 'https://maps.app.goo.gl/9uT6EvBLTu7MWu2V7'

// Deterministic pseudo-random coupon per client_id — stable across reloads
// and browsers without needing server storage. Format: PROGYM50-XXXXX.
function couponFor(clientId: string): string {
  const seed = `progym-wc2026-thankyou-${clientId}`
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let n = Math.abs(h)
  let out = ''
  for (let i = 0; i < 5; i++) {
    out += alphabet[n % alphabet.length]
    n = Math.floor(n / alphabet.length) + (i + 1) * 131
  }
  return `PROGYM50-${out}`
}

function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return '91' + digits
  return digits
}

function buildThankYouMessage(fullName: string | null, code: string, discountPercent: number = 50): string {
  const first = (fullName || '').trim().split(/\s+/)[0] || 'there'
  const marathiFirst = (fullName || '').trim().split(/\s+/)[0] || 'मित्रा'

  if (discountPercent >= 100) {
    // 100% winners — tournament champions get FREE membership.
    return (
      `Hi ${first}! 🏆 CONGRATULATIONS! You are one of the top winners of the ProGym World Cup 2026 tournament. ` +
      `You have won a *FREE (100% OFF) gym membership* on us! ` +
      `Your winner coupon: *${code}*. Redeem at ProGym: ${PROGYM_MAP}\n` +
      `📞 Contact: +91 8796655176\n\n` +
      `नमस्कार ${marathiFirst}! 🏆 अभिनंदन! तुम्ही ProGym World Cup 2026 टूर्नामेंटच्या टॉप विजेत्यांपैकी एक आहात. ` +
      `तुम्हाला *पूर्णपणे मोफत (१००% सूट) Gym मेंबरशिप* मिळाली आहे! ` +
      `तुमचा विजेता कूपन: *${code}*. ProGym येथे रिडीम करा: ${PROGYM_MAP}\n` +
      `📞 संपर्क: +91 8796655176`
    )
  }

  // Default 50% thank-you (all other participants).
  return (
    `Hi ${first}! 🎉 Thanks for taking part in the ProGym World Cup 2026 tournament. ` +
    `As a token of appreciation, enjoy 50% OFF on your gym membership. ` +
    `Your coupon: *${code}*. Redeem at ProGym: ${PROGYM_MAP}\n` +
    `📞 Contact: +91 8796655176\n\n` +
    `नमस्कार ${marathiFirst}! 🎉 ProGym World Cup 2026 टूर्नामेंटमध्ये सहभागी झाल्याबद्दल धन्यवाद. ` +
    `कौतुक म्हणून तुम्हाला Gym मेंबरशिपवर ५०% सूट. ` +
    `तुमचा कूपन: *${code}*. ProGym येथे रिडीम करा: ${PROGYM_MAP}\n` +
    `📞 संपर्क: +91 8796655176`
  )
}

function loadSentSet(): Set<string> {
  try {
    const raw = localStorage.getItem(WA_SENT_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch { return new Set() }
}
function persistSentSet(s: Set<string>) {
  try { localStorage.setItem(WA_SENT_KEY, JSON.stringify(Array.from(s))) } catch {}
}

interface ReferralEntry {
  rank: number
  client_id: number
  client_name: string | null
  gold_coins: number
  referrals_count: number
}

type Tab = 'overall' | 'daily' | 'referral'

function todayInIst(): string {
  const ist = Date.now() + 5.5 * 3600 * 1000
  const d = new Date(ist)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function rankBadge(rank: number) {
  if (rank === 1) return <span className="text-xl">🥇</span>
  if (rank === 2) return <span className="text-xl">🥈</span>
  if (rank === 3) return <span className="text-xl">🥉</span>
  return <span className="text-xs font-bold text-gray-500">#{rank}</span>
}

export default function LeaderboardPage() {
  const session = getSession()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab: Tab =
    searchParams.get('tab') === 'daily'    ? 'daily' :
    searchParams.get('tab') === 'referral' ? 'referral' :
    'overall'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [date, setDate] = useState(todayInIst())
  const [overall, setOverall]   = useState<OverallEntry[]>([])
  const [daily, setDaily]       = useState<DailyEntry[]>([])
  const [referral, setReferral] = useState<ReferralEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [breakdownFor, setBreakdownFor] = useState<{ clientId: string; name: string } | null>(null)

  function switchTab(next: Tab){
    setTab(next)
    const sp = new URLSearchParams(searchParams)
    if (next === 'overall') sp.delete('tab'); else sp.set('tab', next)
    setSearchParams(sp, { replace: true })
  }

  useEffect(() => {
    setLoading(true)
    const q = session?.clientId ? `?client_id=${session.clientId}&limit=500` : '?limit=500'
    fetch(`${API_BASE}/wc_leaderboard/overall.php${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => setOverall(Array.isArray(j?.leaderboard) ? j.leaderboard : []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'daily') return
    setLoading(true)
    fetch(`${API_BASE}/wc_leaderboard/daily.php?date=${date}&limit=100`)
      .then(r => r.ok ? r.json() : null)
      .then(j => setDaily(Array.isArray(j?.leaderboard) ? j.leaderboard : []))
      .finally(() => setLoading(false))
  }, [tab, date])

  const isAdmin = (session?.mobile || '').replace(/\D/g, '').endsWith(ADMIN_MOBILE_SUFFIX)
  const [waSent, setWaSent] = useState<Set<string>>(() => loadSentSet())
  function toggleSent(clientId: string) {
    setWaSent(prev => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId); else next.add(clientId)
      persistSentSet(next)
      return next
    })
  }
  function markSent(clientId: string) {
    setWaSent(prev => {
      if (prev.has(clientId)) return prev
      const next = new Set(prev); next.add(clientId); persistSentSet(next); return next
    })
  }

  useEffect(() => {
    if (tab !== 'referral') return
    setLoading(true)
    fetch(`${API_BASE}/wc_referrals/ranking.php?limit=500`)
      .then(r => r.ok ? r.json() : null)
      .then(j => setReferral(Array.isArray(j?.leaderboard) ? j.leaderboard : []))
      .finally(() => setLoading(false))
  }, [tab])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader title="Leaderboard" subtitle="Most footballs · top 5 ranking" />

      <main className="max-w-md mx-auto px-3 py-3">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3 flex">
          <button
            onClick={() => switchTab('overall')}
            className={`flex-1 py-2 text-xs font-semibold ${tab === 'overall' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Overall
          </button>
          <button
            onClick={() => switchTab('daily')}
            className={`flex-1 py-2 text-xs font-semibold ${tab === 'daily' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Daily
          </button>
          <button
            onClick={() => switchTab('referral')}
            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1 ${tab === 'referral' ? 'bg-amber-500 text-white' : 'text-gray-600'}`}
          >
            <span>⭐</span><span>Referral</span>
          </button>
        </div>

        {tab === 'referral' && (
          <div className="mb-3 rounded-xl bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <p className="text-[11px] text-amber-900 font-semibold leading-tight flex-1">
              Top 3 on the referral ranking
            </p>
            <button
              onClick={() => navigate('/refer')}
              className="text-[11px] font-bold text-white px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-sm active:scale-[0.97] transition-all flex-shrink-0"
            >
              Click to refer
            </button>
          </div>
        )}

        {tab === 'daily' && (
          <div className="mb-3 flex items-center gap-2 text-xs">
            <label className="font-medium text-gray-600">Date:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
        )}

        {(session?.mobile || '').replace(/\D/g, '').endsWith('8796655176') && (
          <div className="mb-3 rounded-xl bg-rose-50 border-2 border-rose-300 p-3">
            <p className="text-sm font-bold text-rose-800">🚪 You are eliminated from the tournament</p>
            <p className="text-[11px] text-rose-700 mt-0.5">As tournament organiser you don't appear on the leaderboard — members compete on a level field.</p>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {tab === 'overall' && !loading && (
          overall.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">🏆</p>
              <p className="font-semibold text-gray-600">Leaderboard empty</p>
              <p className="text-sm mt-1">First match settles soon — be one of the first to score!</p>
              <button
                onClick={() => setShowRules(true)}
                className="mt-4 text-xs font-semibold text-blue-700 underline"
              >
                How is ranking decided?
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-500 italic">Tap any row to see ⚽ breakdown</p>
                <button
                  onClick={() => setShowRules(true)}
                  className="text-[11px] font-semibold text-blue-700 flex items-center gap-1 hover:underline"
                >
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-blue-400 text-[10px]">i</span>
                  How is ranking decided?
                </button>
              </div>
              {isAdmin && (
                <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 mb-1">
                  Admin view · WhatsApp column visible only to you. Sent-marks are stored in this browser only.
                </p>
              )}
              {overall.map(e => {
                const me   = session?.clientId === Number(e.client_id)
                const card = (
                  <button
                    type="button"
                    onClick={() => setBreakdownFor({ clientId: String(e.client_id), name: e.client_name || `Player #${e.client_id}` })}
                    aria-label={`See football breakdown for ${e.client_name || `Player #${e.client_id}`}`}
                    className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 hover:shadow-sm hover:border-blue-300 active:scale-[0.99] transition ${me ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-100 bg-white'}`}
                  >
                    <div className="w-8 flex-shrink-0 text-center">{rankBadge(e.rank)}</div>
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                      {(e.client_name || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {e.client_name || `Player #${e.client_id}`}
                        {me && <span className="ml-1.5 text-[10px] font-bold text-blue-700">(You)</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {e.total_matches_predicted} matches
                        {e.was_gym_client_at_join === 'yes' && (
                          <> · <span className="text-purple-600 font-medium">progym member</span></>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-1.5 flex-shrink-0">
                      <p className="text-sm font-bold text-blue-700">{Math.round(e.total_coins_earned)} ⚽</p>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-gray-400">
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                    </div>
                  </button>
                )
                if (!isAdmin) return <div key={e.client_id}>{card}</div>

                const cid       = String(e.client_id)
                const code      = e.fifa_coupon || couponFor(cid)
                const discount  = typeof e.fifa_discount_percent === 'number' ? e.fifa_discount_percent : 50
                const isWinner  = discount >= 100
                const intl      = normalizePhone(e.client_mobile)
                const sent      = waSent.has(cid)
                const isMobileUA = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                const body      = encodeURIComponent(buildThankYouMessage(e.client_name, code, discount))
                const href      = intl
                  ? (isMobileUA ? `https://wa.me/${intl}?text=${body}` : `https://web.whatsapp.com/send?phone=${intl}&text=${body}`)
                  : ''
                return (
                  <div key={e.client_id} className="space-y-1">
                    {card}
                    <div className={`rounded-xl border px-2.5 py-1.5 flex items-center flex-wrap gap-x-2 gap-y-1 ${sent ? 'border-emerald-300 bg-emerald-50' : isWinner ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                      {isWinner && (
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider whitespace-nowrap">🏆 100% Winner</span>
                      )}
                      {intl ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markSent(cid)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-md border whitespace-nowrap ${sent ? 'border-emerald-400 bg-white text-emerald-700' : 'border-green-400 bg-green-500 text-white hover:bg-green-600'}`}
                          title={`Send thank-you WhatsApp · ${code}`}
                        >
                          🟢 {sent ? 'Resend' : 'WhatsApp'}
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">No mobile</span>
                      )}
                      <span className="text-[10px] font-mono text-gray-600 tracking-wider truncate flex-1 min-w-0">{code}</span>
                      <label className="flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer select-none whitespace-nowrap ml-auto">
                        <input type="checkbox" checked={sent} onChange={() => toggleSent(cid)} className="h-3 w-3 accent-emerald-500" />
                        <span>{sent ? 'Sent' : 'Mark sent'}</span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'referral' && !loading && referral.length > 0 && (
          <div className="space-y-1.5">
              {referral.map(e => {
                const me = session?.clientId === Number(e.client_id)
                const topFive = e.rank <= 5
                return (
                  <div
                    key={e.client_id}
                    className={`rounded-xl border px-3 py-2 flex items-center gap-3 ${
                      me ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200'
                         : topFive ? 'border-amber-200 bg-amber-50'
                         : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="w-8 flex-shrink-0 text-center">{rankBadge(e.rank)}</div>
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {(e.client_name || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {e.client_name || `Player #${e.client_id}`}
                        {me && <span className="ml-1.5 text-[10px] font-bold text-amber-700">(You)</span>}
                        {topFive && !me && <span className="ml-1.5 text-[10px] font-bold text-amber-600">🎁</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {e.referrals_count} {e.referrals_count === 1 ? 'referral' : 'referrals'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{e.gold_coins} ⭐</p>
                    </div>
                  </div>
                )
              })}
            </div>
        )}

        {tab === 'daily' && !loading && (
          daily.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">📅</p>
              <p className="font-semibold text-gray-600">No footballs earned on this day</p>
              <p className="text-sm mt-1">Try a date where matches have been settled.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {daily.map(e => {
                const me = session?.clientId === Number(e.client_id)
                return (
                  <div
                    key={e.client_id}
                    className={`rounded-xl border px-3 py-2 flex items-center gap-3 ${me ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-100 bg-white'}`}
                  >
                    <div className="w-8 flex-shrink-0 text-center">{rankBadge(e.rank)}</div>
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                      {(e.client_name || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {e.client_name || `Player #${e.client_id}`}
                        {me && <span className="ml-1.5 text-[10px] font-bold text-blue-700">(You)</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">{e.matches_predicted_today} matches settled today</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-700">{Math.round(e.coins_today)} ⚽</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </main>

      {showRules && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-800">How ranking works</h3>
              <button
                onClick={() => setShowRules(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Players are ranked by these rules — if two players tie on one rule, the next rule decides.
            </p>
            <ol className="space-y-2.5 text-xs text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-blue-700 flex-shrink-0">1.</span>
                <span>Most footballs ⚽ ranks higher.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-700 flex-shrink-0">2.</span>
                <span>If tied — the player with better consistent daily ranking across the tournament ranks higher.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-700 flex-shrink-0">3.</span>
                <span>If still tied — the player who finished in Top 3 on more days ranks higher.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-700 flex-shrink-0">4.</span>
                <span>If still tied — the player who made their very first prediction earliest ranks higher.</span>
              </li>
            </ol>

            <div className="mt-5 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-800 mb-3">रॅंकिंग कशी ठरते</h4>
              <ol className="space-y-2.5 text-xs text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-700 flex-shrink-0">1.</span>
                  <span>सर्वाधिक फुटबॉल्स ⚽ असलेला खेळाडू वरच्या क्रमांकावर येतो.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-700 flex-shrink-0">2.</span>
                  <span>बरोबरी झाल्यास, संपूर्ण स्पर्धेदरम्यान ज्याची दैनंदिन रॅंकिंग अधिक चांगली असेल तो वरच्या क्रमांकावर येतो.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-700 flex-shrink-0">3.</span>
                  <span>तरीही बरोबरी राहिल्यास, टॉप 3 मध्ये सर्वाधिक दिवस राहिलेला खेळाडू वरच्या क्रमांकावर येतो.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-700 flex-shrink-0">4.</span>
                  <span>तरीही बरोबरी राहिल्यास, ज्याने आपला पहिला अंदाज (Prediction) सर्वात आधी नोंदवला असेल तो वरच्या क्रमांकावर येतो.</span>
                </li>
              </ol>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="mt-5 w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {breakdownFor && (
        <FootballBreakdownModal
          clientId={breakdownFor.clientId}
          playerName={breakdownFor.name}
          onClose={() => setBreakdownFor(null)}
        />
      )}

      <BottomNav />
    </div>
  )
}

interface BreakdownRow {
  match_id: number
  kickoff_at: string
  settled_at: string | null
  submitted_at: string | null
  team_a_code: string
  team_b_code: string
  actual_score_a: number | null
  actual_score_b: number | null
  multiplier: number
  category: 'winner' | 'both-score' | 'exact-score' | 'motm' | 'bonus' | 'tournament-award'
  category_label: string
  prediction_answer: string | null
  credit: number
}

const CATEGORY_SHORT: Record<BreakdownRow['category'], string> = {
  'winner':           'Winner',
  'both-score':       'Both Score',
  'exact-score':      'Exact Score',
  'motm':             'MOTM',
  'bonus':            'Bonus',
  'tournament-award': 'Tournament',
}

function fmtMatchDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s.replace(' ', 'T'))
  if (isNaN(d.getTime())) return s
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function FootballBreakdownModal({ clientId, playerName, onClose }:{
  clientId: string
  playerName: string
  onClose: () => void
}) {
  const [rows, setRows] = useState<BreakdownRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/wc_predictions/coinHistoryByCategory.php?client_id=${encodeURIComponent(clientId)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(j => {
        setRows(Array.isArray(j?.rows) ? j.rows : [])
        setTotal(Number(j?.total_credit) || 0)
      })
      .catch(() => setError('Could not load breakdown.'))
      .finally(() => setLoading(false))
  }, [clientId])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center py-10 px-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[calc(100dvh-5rem)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 truncate">{playerName}</h3>
            <p className="text-[11px] text-gray-500">Football breakdown · one row per correct category</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none flex-shrink-0 ml-2"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs">
          <span className="text-blue-900 font-medium">Total credited</span>
          <span className="font-bold text-blue-700">{Math.round(total)} ⚽</span>
        </div>

        {!loading && !error && rows.length > 0 && (
          <div className="px-3 flex-shrink-0 border-b border-gray-200">
            <table className="w-full table-fixed text-[11px] text-center">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="text-gray-500">
                <tr>
                  <th className="py-1.5 px-1 font-semibold">Match</th>
                  <th className="py-1.5 px-1 font-semibold">Category</th>
                  <th className="py-1.5 px-1 font-semibold leading-tight">Prediction<br />answer</th>
                  <th className="py-1.5 px-1 font-semibold leading-tight">Prediction<br />submitted</th>
                  <th className="py-1.5 px-1 font-semibold">⚽</th>
                </tr>
              </thead>
            </table>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading && (
            <div className="space-y-2 pt-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && (
            <p className="text-center text-sm text-red-600 py-10">{error}</p>
          )}

          {!loading && !error && rows.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-10">No football credits yet.</p>
          )}

          {!loading && !error && rows.length > 0 && (
            <table className="w-full table-fixed text-[11px] text-center">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
              </colgroup>
              <tbody>
                {rows.map((r, i) => {
                  const isAward = r.category === 'tournament-award'
                  return (
                    <tr key={`${r.match_id}-${r.category}-${i}`} className={`border-b border-gray-100 ${isAward ? 'bg-amber-50' : ''}`}>
                      <td className="py-1.5 px-1 align-middle">
                        {isAward ? (
                          <>
                            <p className="font-semibold text-amber-800 truncate">🏆 {r.category_label}</p>
                            <p className="text-[10px] text-gray-400">Tournament</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-800 truncate">{r.team_a_code} vs {r.team_b_code}</p>
                            <p className="text-[10px] text-gray-400">{fmtMatchDate(r.kickoff_at)}</p>
                          </>
                        )}
                      </td>
                      <td className="py-1.5 px-1 align-middle text-gray-700 break-words">{isAward ? 'Award' : CATEGORY_SHORT[r.category]}</td>
                      <td className="py-1.5 px-1 align-middle text-gray-700 break-words">{r.prediction_answer ?? '—'}</td>
                      <td className="py-1.5 px-1 align-middle text-[10px] text-gray-500">{fmtMatchDate(r.submitted_at)}</td>
                      <td className={`py-1.5 px-1 align-middle font-bold ${isAward ? 'text-amber-700' : 'text-blue-700'}`}>+{Math.round(r.credit)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
