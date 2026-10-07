import { useEffect, useState } from 'react'
import { createPaymentLink, fetchPayOptions, type PayOptions, type PayRequest } from '../services/razorpay'

const fmtRs = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`

type Choice = { key: string; label: string; sub: string; amount: number; req: PayRequest }

/** Admin: generate a Razorpay payment link for a member's pending balance or renewal. */
export default function PaymentLinkModal({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const [opts, setOpts] = useState<PayOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [choiceKey, setChoiceKey] = useState<string | null>(null)
  const [whatsapp, setWhatsapp] = useState(true)
  const [notify, setNotify] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<Awaited<ReturnType<typeof createPaymentLink>> | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchPayOptions(clientId).then(setOpts).catch(e => setLoadError(e.message))
  }, [clientId])

  const choices: Choice[] = opts ? [
    ...opts.balances.map(b => ({
      key: `b${b.packageDetailsId}`, label: `Pending balance · ${b.name}`, sub: `${b.startDate} → ${b.endDate}`,
      amount: b.amount, req: { clientId, purpose: 'balance' as const, packageDetailsId: b.packageDetailsId },
    })),
    ...opts.renew.map(r => ({
      key: `r${r.packageId}`, label: `Renew · ${r.description || `${r.days} days`}`, sub: `${r.startDate} → ${r.endDate} (if paid today)`,
      amount: r.fees, req: { clientId, purpose: 'renew' as const, packageId: r.packageId },
    })),
  ] : []
  const chosen = choices.find(c => c.key === choiceKey)

  async function create() {
    if (!chosen) return
    setBusy(true); setError(null)
    try {
      setLink(await createPaymentLink({ ...chosen.req, notify, whatsapp }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const shareText = link
    ? `Hi ${link.name}, please pay ${fmtRs(link.amount)} for ${link.description} at Pro Gym: ${link.url} (valid for ${link.expiresDays} days)`
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">Send Payment Link</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-3">
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}
          {!opts && !loadError && <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />}
          {opts && !opts.enabled && <p className="text-sm text-red-600">Online payments are not enabled on the server.</p>}

          {opts?.enabled && !link && (
            <>
              {choices.length === 0 && <p className="text-sm text-gray-500">No pending balance and no packages available for this member.</p>}
              {choices.map(c => (
                <button
                  key={c.key}
                  onClick={() => setChoiceKey(c.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border ${choiceKey === c.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-800">{c.label}</span>
                    <span className="text-sm font-bold text-gray-800">{fmtRs(c.amount)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                </button>
              ))}
              {choices.length > 0 && (
                <>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)} />
                    Send on WhatsApp automatically
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
                    Also send via Razorpay SMS / email
                  </label>
                </>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                disabled={!chosen || busy}
                onClick={create}
                className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {busy ? 'Creating…' : chosen ? `Create link for ${fmtRs(chosen.amount)}` : 'Select what to collect'}
              </button>
            </>
          )}

          {link && (
            <>
              <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
                Link created. The payment is recorded and approved automatically when the member pays.
              </p>
              {link.whatsappSent === true && (
                <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">✓ Sent to {link.name} on WhatsApp.</p>
              )}
              {link.whatsappSent === false && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  WhatsApp send failed: {link.whatsappError || 'unknown error'}. Use the share button below instead.
                </p>
              )}
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-sm text-gray-700 truncate flex-1">{link.url}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(link.url); setCopied(true) }}
                  className="text-xs font-semibold text-orange-600"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <a
                href={`https://wa.me/${link.mobile ?? ''}?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold"
              >
                Share on WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
