import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { getSession } from '../services/wcSession'
import { toast } from '../components/Toast'

interface Row {
  client_id: number
  client_name: string
  mobile_masked: string
  client_mobile?: string | null
  total_points: number
  winners_correct: number
  predictions_settled: number
  predictions_made: number
  perfect_bracket: boolean
  tiebreaker_estimate: number | null
  tiebreaker_diff: number | null
  rank: number
}
interface Resp { ok: boolean; rows: Row[]; actual_total_goals: number | null; top_n: number; is_eliminated?: boolean; is_admin_caller?: boolean }

// Bilingual (English + Marathi) reminder — mirrors the CallListPage template.
const REMINDER_TEMPLATE =
  'Hi {name}! 🏆 LAST CHANCE to join ProGym Knockout Bonanza — FIFA World Cup 2026 FINAL: 🇪🇸 Spain vs Argentina 🇦🇷, Mon 20 Jul at 00:30 AM IST. Predict early and win! Submit before 12:15 AM: https://progym.co.in/wc2026/knockout-bonanza\n\n' +
  'नमस्कार {name}! 🏆 ProGym Knockout Bonanza ची शेवटची संधी — FIFA World Cup 2026 अंतिम सामना: 🇪🇸 Spain vs Argentina 🇦🇷, सोमवार २० जुलै पहाटे १२:३० (IST). लवकर अंदाज लावा आणि जिंका! १२:१५ पूर्वी सबमिट करा: https://progym.co.in/wc2026/knockout-bonanza'

function buildReminder(fullName: string): string {
  const first = (fullName || '').trim().split(/\s+/)[0] || 'there'
  return REMINDER_TEMPLATE.split('{name}').join(first)
}

function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return '91' + digits
  return digits
}

export default function KnockoutBonanzaLeaderboardPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)

  function reload() {
    const url = `${API_BASE}/wc_special/leaderboard.php${session ? '?client_id=' + session.clientId : ''}`
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(reload, [])

  const myRow = session ? data?.rows.find(r => String(r.client_id) === String(session.clientId)) : null
  const isEliminated = !!data?.is_eliminated

  async function confirmLeave() {
    if (!session) return
    setLeaving(true)
    try {
      const r = await fetch(`${API_BASE}/wc_special/leave.php`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ client_id: session.clientId })
      })
      const j = await r.json()
      if (!j.ok) { toast(j.error || 'Could not leave tournament'); return }
      toast('You have left the tournament')
      setShowLeaveModal(false)
      reload()
    } catch {
      toast('Network error')
    } finally { setLeaving(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24">
      <AppHeader title="Bonanza Leaderboard" showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={() => navigate('/knockout-bonanza')} className="text-sm text-purple-700 font-bold">← Back to Bonanza</button>
          {session && !isEliminated && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="text-[11px] font-bold text-rose-600 border border-rose-300 bg-rose-50 px-2.5 py-1 rounded-md hover:bg-rose-100"
            >
              Leave tournament
            </button>
          )}
        </div>

        {data?.actual_total_goals !== null && data?.actual_total_goals !== undefined && (
          <p className="text-[11px] text-gray-600 mt-2 px-1">Tiebreaker resolved · Actual total goals: <b>{data.actual_total_goals}</b></p>
        )}

        {myRow && (
          <div className="mt-3 rounded-xl bg-white border-2 border-purple-400 p-3 flex items-center gap-3">
            <span className="text-2xl font-black text-purple-600 w-8 text-center">#{myRow.rank}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">You</p>
              <p className="text-[11px] text-gray-500">{myRow.predictions_made}/4 predicted · {myRow.winners_correct}/4 winners</p>
            </div>
            <p className="text-xl font-black text-purple-700">{myRow.total_points}<span className="text-xs text-gray-400 font-bold ml-0.5">pts</span></p>
          </div>
        )}

        {session && isEliminated && (
          <div className="mt-3 rounded-xl bg-rose-50 border-2 border-rose-300 p-3">
            <p className="text-sm font-bold text-rose-800">🚪 You have left the tournament</p>
            <p className="text-[11px] text-rose-700 mt-0.5">You can no longer submit predictions. This decision is permanent.</p>
          </div>
        )}

        {loading && <div className="mt-4 space-y-2">{[...Array(8)].map((_,i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>}

        {!loading && data && data.rows.length === 0 && (
          <p className="text-center text-gray-500 mt-8 text-sm">No predictions submitted yet. Be the first — head back and pick your winners!</p>
        )}

        {!loading && data && data.rows.length > 0 && (
          <div className="mt-4 space-y-2">
            {data.rows.map(r => {
              const isMe   = session && String(r.client_id) === String(session.clientId)
              const isTop3 = r.rank <= 3
              return (
                <div key={r.client_id}
                  className={`rounded-xl p-3 flex items-center gap-3 border ${isTop3 ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'} ${isMe ? 'ring-2 ring-purple-400' : ''}`}>
                  <span className={`text-lg font-black w-8 text-center ${isTop3 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{r.client_name}{isMe && <span className="text-purple-700 ml-1">(you)</span>}</p>
                    {(r.perfect_bracket || r.tiebreaker_diff !== null) && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {r.perfect_bracket && <span className="text-amber-700 font-bold">🎯 Perfect 4</span>}
                        {r.perfect_bracket && r.tiebreaker_diff !== null && <span className="mx-1">·</span>}
                        {r.tiebreaker_diff !== null && <span>TB ±{r.tiebreaker_diff}</span>}
                      </p>
                    )}
                  </div>
                  <p className="text-base font-black text-gray-800">{r.total_points}<span className="text-[10px] text-gray-400 font-bold ml-0.5">pts</span></p>
                  {r.client_mobile && (() => {
                    const intl = normalizePhone(r.client_mobile)
                    if (!intl) return null
                    const encoded = encodeURIComponent(buildReminder(r.client_name))
                    const isMobileUA = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                    const waHref = isMobileUA
                      ? `https://wa.me/${intl}?text=${encoded}`
                      : `https://web.whatsapp.com/send?phone=${intl}&text=${encoded}`
                    return (
                      <div className="flex items-center gap-1.5 ml-2" onClick={e => e.stopPropagation()}>
                        <a
                          href={`sms:+${intl}?body=${encoded}`}
                          aria-label={`Send SMS to ${r.client_name}`}
                          className="text-lg leading-none px-1.5 py-1 rounded-md bg-blue-50 border border-blue-200 hover:bg-blue-100"
                          title="Send SMS"
                        >💬</a>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Send WhatsApp to ${r.client_name}`}
                          className="text-lg leading-none px-1.5 py-1 rounded-md bg-green-50 border border-green-200 hover:bg-green-100"
                          title="Send WhatsApp"
                        >🟢</a>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => !leaving && setShowLeaveModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-black text-rose-700">Leave Tournament?</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to leave the Bonanza tournament?
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-gray-700">
              <li>• You will be <b>removed from the leaderboard</b>.</li>
              <li>• All your predictions and tiebreaker will be discarded.</li>
              <li>• You will <b>never be able to rejoin</b> this tournament.</li>
            </ul>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                disabled={leaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-800 font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeave}
                disabled={leaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-bold disabled:opacity-50"
              >
                {leaving ? 'Leaving…' : 'Yes, leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
