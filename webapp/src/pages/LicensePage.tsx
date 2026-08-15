import { useEffect, useState } from 'react'
import { useLicense } from '../context/LicenseContext'
import { fetchLicenseHistory, type LicenseHistoryResponse } from '../services/license'

// Read-only License page for the gym admin — shows current subscription
// status, days remaining, vendor contact + payment history from the
// license server. Mirrors the shop's License page in spirit.
export default function LicensePage() {
  const { state, refresh } = useLicense()
  const [refreshing, setRefreshing] = useState(false)
  const [history, setHistory] = useState<LicenseHistoryResponse | null>(null)
  const [historyErr, setHistoryErr] = useState<string | null>(null)

  const lic = state.data
  const contact = lic?.contact ?? { name: 'Support', phone: '', email: '' }

  const loadHistory = async () => {
    try {
      setHistoryErr(null)
      const h = await fetchLicenseHistory()
      setHistory(h)
    } catch (err) {
      setHistoryErr(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => { void loadHistory() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await Promise.all([refresh({ force: true }), loadHistory()]) }
    finally { setRefreshing(false) }
  }

  const daysLeft = lic?.expiry ? daysUntil(lic.expiry) : null

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">License</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your current subscription status, plan and vendor contact.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={refreshing || state.status === 'loading'}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${statusIconBg(state.status)}`}>
            <span className="text-2xl">{statusEmoji(state.status)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">{statusTitle(state.status)}</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(state.status)}`}>
                {statusLabel(state.status)}
              </span>
              {state.status === 'active' && daysLeft !== null ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${daysLeft <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {daysLeft <= 0 ? 'Expires today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-600 mt-1">{statusDescription(state.status)}</p>
            {lic?.reason ? (
              <p className="text-xs text-slate-500 mt-2">
                Reason: <code className="font-mono">{lic.reason}</code>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Validity + contact */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">Validity</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Plan expires" value={lic?.expiry ?? '—'} />
            {daysLeft !== null ? (
              <Row
                label="Days remaining"
                value={daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}` : daysLeft === 0 ? 'Expires today' : `${-daysLeft} ${-daysLeft === 1 ? 'day' : 'days'} past expiry`}
                valueClass={daysLeft < 0 ? 'text-red-700 font-semibold' : daysLeft <= 7 ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}
              />
            ) : null}
            {lic?.grace_until ? (
              <Row label="Grace period until" value={lic.grace_until} valueClass="text-amber-700 font-medium" />
            ) : null}
            <Row label="Last verified" value={state.lastCheckedAt ? new Date(state.lastCheckedAt).toLocaleString() : '—'} />
            {lic?.cached_at ? <Row label="Cached at (server)" value={lic.cached_at} /> : null}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">For payment or renewal, contact</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="font-medium">{contact.name || '—'}</span></div>
            <div><span className="text-slate-500">Phone:</span>{' '}
              {contact.phone ? <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline font-medium">{contact.phone}</a> : '—'}
            </div>
            <div><span className="text-slate-500">Email:</span>{' '}
              {contact.email ? <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline font-medium break-all">{contact.email}</a> : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Subscription history</h3>
          {history ? (
            <p className="text-xs text-slate-500 mt-1">
              {history.totals.payment_count}{' '}
              {history.totals.payment_count === 1 ? 'payment' : 'payments'} · Total ₹{history.totals.total_paid.toLocaleString('en-IN')}
            </p>
          ) : null}
        </div>
        {historyErr ? (
          <div className="p-5 text-sm text-amber-700 bg-amber-50">Could not load history: {historyErr}</div>
        ) : !history ? (
          <div className="p-5 text-sm text-slate-500">Loading…</div>
        ) : history.payments.length === 0 ? (
          <div className="p-5 text-sm text-slate-500 text-center">
            No payments recorded yet. Current period: {history.current_period_start} → {history.current_period_end}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th>Paid on</Th><Th>Amount</Th><Th>Method</Th><Th>Period</Th><Th>Reference</Th>
                </tr>
              </thead>
              <tbody>
                {[...history.payments].reverse().map((p, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <Td>{p.paid_on}</Td>
                    <Td className="font-medium">₹{p.amount.toLocaleString('en-IN')}</Td>
                    <Td className="capitalize">{p.method}</Td>
                    <Td className="whitespace-nowrap text-slate-600">{p.period_start} → {p.period_end}</Td>
                    <Td className="text-slate-500">{p.reference_note || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-slate-900 ${valueClass ?? ''}`}>{value}</dd>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</th>
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-slate-900 ${className ?? ''}`}>{children}</td>
}

function daysUntil(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 0
  const [, y, mo, d] = m
  const target = new Date(Number(y), Number(mo) - 1, Number(d)).getTime()
  const now = new Date()
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - n) / 86400000)
}

function statusTitle(s: string): string {
  return s === 'active' ? 'Subscription active'
       : s === 'grace'  ? 'Payment overdue — grace period'
       : s === 'locked' ? 'Access is locked'
       : s === 'loading' ? 'Checking license…'
       : 'License status unknown'
}
function statusLabel(s: string): string {
  return s === 'active' ? 'Active' : s === 'grace' ? 'Grace' : s === 'locked' ? 'Locked' : s === 'loading' ? 'Checking' : 'Unknown'
}
function statusDescription(s: string): string {
  return s === 'active' ? "Thanks — your subscription is current. Full access is enabled."
       : s === 'grace'  ? 'Your subscription payment is overdue. Please renew before the grace period ends.'
       : s === 'locked' ? 'The subscription is not currently active. Please contact the vendor to reactivate.'
       : s === 'loading' ? 'Fetching current status from the license server.'
       : 'Could not determine current license status. Try refreshing.'
}
function statusEmoji(s: string): string {
  return s === 'active' ? '✅' : s === 'grace' ? '⚠️' : s === 'locked' ? '🔒' : '❓'
}
function statusIconBg(s: string): string {
  return s === 'active' ? 'bg-emerald-100' : s === 'grace' ? 'bg-amber-100' : s === 'locked' ? 'bg-red-100' : 'bg-slate-100'
}
function statusBadge(s: string): string {
  return s === 'active' ? 'bg-emerald-100 text-emerald-800'
       : s === 'grace'  ? 'bg-amber-100 text-amber-800'
       : s === 'locked' ? 'bg-red-100 text-red-800'
       : 'bg-slate-100 text-slate-700'
}
