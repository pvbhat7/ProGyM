import { useEffect, useState } from 'react'
import { fetchPayOptions, payOnline, type PayOptions, type PayRequest } from '../services/razorpay'

const fmtRs = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const fmtDate = (s: string) => {
  const [d, m, y] = (s || '').split('/').map(Number)
  if (!d || !m || !y) return s
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Member-side Razorpay checkout: pay pending balance or renew membership. */
export default function PayOnlineCard({ clientId, onPaid }: { clientId: number; onPaid: () => void }) {
  const [opts, setOpts] = useState<PayOptions | null>(null)
  const [showRenew, setShowRenew] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)   // which button started the checkout
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => fetchPayOptions(clientId).then(setOpts).catch(() => setOpts(null))
  useEffect(() => { load() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!opts?.memberVisible || (opts.renew.length === 0 && opts.balances.length === 0)) return null

  async function pay(key: string, req: PayRequest) {
    if (busyKey) return   // one checkout at a time
    setBusyKey(key); setMsg(null)
    const res = await payOnline(req)
    setBusyKey(null)
    if (res.ok) {
      setMsg({ ok: true, text: `Payment of ${fmtRs(res.amount)} received. Receipt sent on WhatsApp/email.` })
      setShowRenew(false); setSelected(null)
      load(); onPaid()
    } else if (!res.cancelled) {
      setMsg({ ok: false, text: res.error })
    }
  }

  const chosen = opts.renew.find(o => o.packageId === selected)

  return (
    <div className="mb-4 bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
        <span className="text-lg">💳</span>
        <p className="font-semibold text-gray-800 text-sm flex-1">Pay online</p>
        <span className="text-[10px] text-gray-400">UPI · Cards · Netbanking</span>
      </div>

      {msg && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-xl text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {opts.balances.map(b => (
        <div key={b.packageDetailsId} className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-800">{fmtRs(b.amount)} pending</p>
            <p className="text-xs text-gray-400">{b.name} · {fmtDate(b.startDate)} → {fmtDate(b.endDate)}</p>
          </div>
          <button
            disabled={busyKey === `b${b.packageDetailsId}`}
            onClick={() => pay(`b${b.packageDetailsId}`, { clientId, purpose: 'balance', packageDetailsId: b.packageDetailsId })}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {busyKey === `b${b.packageDetailsId}` ? 'Processing…' : 'Pay'}
          </button>
        </div>
      ))}

      {opts.renew.length > 0 && (
        <div className="px-5 py-3">
          {!showRenew ? (
            <button onClick={() => setShowRenew(true)} className="w-full py-2.5 rounded-xl border border-orange-300 text-orange-600 text-sm font-semibold">
              Renew membership
            </button>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Choose a plan</p>
              <div className="space-y-2">
                {opts.renew.map(o => (
                  <button
                    key={o.packageId}
                    onClick={() => setSelected(o.packageId)}
                    className={`w-full text-left px-4 py-3 rounded-xl border ${selected === o.packageId ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-800">{o.description || `${o.days} days`}</span>
                      <span className="text-sm font-bold text-gray-800">{fmtRs(o.fees)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(o.startDate)} → {fmtDate(o.endDate)} · {o.days} days</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowRenew(false); setSelected(null) }} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">
                  Cancel
                </button>
                <button
                  disabled={busyKey === 'renew' || !chosen}
                  onClick={() => chosen && pay('renew', { clientId, purpose: 'renew', packageId: chosen.packageId })}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {busyKey === 'renew' ? 'Processing…' : chosen ? `Pay ${fmtRs(chosen.fees)}` : 'Select a plan'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
