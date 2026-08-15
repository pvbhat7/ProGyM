import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import NotificationBell from '../components/NotificationBell'

type PaymentTx = {
  id: number
  packageDetailsId: number
  feesPaid: number
  proCoinsUsed?: number
  paymentDate: string
  isApproved: string
  paymentMode: string
  clientId: string
  clientGender: string
  discontinue: string
}

type PackageDetail = {
  id: number
  description: string
  fees: number
  startDate: string
  endDate: string
  amountPaid: number
  paymentDate: string
  status: string
  packageId: number
  clientId: number
  discontinue: string
  paymentTransactions: PaymentTx[] | null
}

const parseDate = (s: string) => {
  if (!s) return null
  const parts = s.split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts.map(Number)
  return new Date(y, m - 1, d)
}

const fmtDate = (s: string) => {
  const d = parseDate(s)
  if (!d) return s || '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtRs = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function MemberPackagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [packages, setPackages] = useState<PackageDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    fetch(`${API_BASE}/packageDetails/byClientId.php?clientId=${user.userId}`)
      .then(async r => {
        if (!r.ok) return []
        const d = await r.json()
        return Array.isArray(d) ? d.filter((x: PackageDetail) => x && typeof x === 'object' && x.id) : []
      })
      .then((data: PackageDetail[]) => {
        data.sort((a, b) => {
          const ta = parseDate(a.startDate)?.getTime() ?? 0
          const tb = parseDate(b.startDate)?.getTime() ?? 0
          return tb - ta
        })
        setPackages(data)
        if (data.length > 0) setExpandedId(data[0].id)
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [user?.userId])

  const isActive = (pkg: PackageDetail) => {
    if (pkg.status === 'active') return true
    const end = parseDate(pkg.endDate)
    return end ? end >= new Date() : false
  }

  const getProgress = (pkg: PackageDetail) => {
    const start = parseDate(pkg.startDate)
    const end = parseDate(pkg.endDate)
    if (!start || !end) return { elapsed: 0, total: 0, pct: 0, daysLeft: 0 }
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
    const elapsed = Math.max(0, Math.min(total, Math.round((Date.now() - start.getTime()) / 86400000)))
    const daysLeft = Math.max(0, total - elapsed)
    return { elapsed, total, pct: Math.min(100, Math.round(elapsed / total * 100)), daysLeft }
  }

  const activeCount = packages.filter(isActive).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/member-dashboard')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">My Packages</h1>
            <p className="text-xs text-gray-400">Membership & payment history</p>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-10">
        {loading ? (
          <div className="space-y-4">
            {[1,2].map(i => <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
            <span className="text-4xl block mb-3">📦</span>
            <p className="text-gray-500 font-medium">No packages found</p>
            <p className="text-gray-400 text-xs mt-1">Contact your gym to enroll in a package</p>
          </div>
        ) : (
          <>
            {activeCount === 0 && (
              <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-yellow-700">No active membership. Please renew your package.</p>
              </div>
            )}

            {/* Package cards */}
            <div className="space-y-4">
              {packages.map((pkg, idx) => {
                const active = isActive(pkg)
                const prog = getProgress(pkg)
                const txs = Array.isArray(pkg.paymentTransactions)
                  ? pkg.paymentTransactions.filter(t => t && typeof t === 'object')
                  : []
                const paid = txs.reduce((s, t) => s + (Number(t.feesPaid) || 0) + (Number(t.proCoinsUsed) || 0), 0)
                const balance = Math.max(0, (Number(pkg.fees) || 0) - paid)
                const expanded = expandedId === pkg.id

                return (
                  <div key={pkg.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${active ? 'border-orange-200' : 'border-gray-100'}`}>
                    {/* Header (always visible, clickable to expand) */}
                    <div
                      className={`p-5 cursor-pointer select-none ${active ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gray-50'}`}
                      onClick={() => setExpandedId(expanded ? null : pkg.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {active ? '● Active' : 'Expired'}
                          </span>
                          {idx === 0 && active && (
                            <span className="text-xs font-medium px-2 py-0.5 bg-white/20 text-white rounded-full">Current</span>
                          )}
                        </div>
                        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''} ${active ? 'text-white/70' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      <p className={`font-bold text-xl ${active ? 'text-white' : 'text-gray-800'}`}>
                        {fmtRs(pkg.fees)}
                        <span className={`text-sm font-normal ml-1 ${active ? 'text-white/70' : 'text-gray-400'}`}>membership</span>
                      </p>

                      <div className={`flex items-center gap-2 mt-1 text-xs ${active ? 'text-white/80' : 'text-gray-500'}`}>
                        <span>{fmtDate(pkg.startDate)}</span>
                        <span>→</span>
                        <span>{fmtDate(pkg.endDate)}</span>
                      </div>

                      {active && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-white/70 mb-1.5">
                            <span>{prog.daysLeft} days remaining</span>
                            <span>{prog.elapsed}/{prog.total} days used</span>
                          </div>
                          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full" style={{ width: `${prog.pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded details */}
                    {expanded && (
                      <div>
                        {/* Amount summary */}
                        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                          <div className="p-4 text-center">
                            <p className="text-xs text-gray-400">Total Fees</p>
                            <p className="font-bold text-gray-800 mt-0.5 text-sm">{fmtRs(pkg.fees)}</p>
                          </div>
                          <div className="p-4 text-center">
                            <p className="text-xs text-gray-400">Paid</p>
                            <p className="font-bold text-green-600 mt-0.5 text-sm">{fmtRs(paid)}</p>
                          </div>
                          <div className="p-4 text-center">
                            <p className="text-xs text-gray-400">Balance</p>
                            <p className={`font-bold mt-0.5 text-sm ${balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>{fmtRs(balance)}</p>
                          </div>
                        </div>

                        {/* Description */}
                        {pkg.description && (
                          <div className="px-5 py-3 border-b border-gray-50 text-sm text-gray-600">
                            {pkg.description}
                          </div>
                        )}

                        {/* Payment transactions */}
                        {txs.length > 0 ? (
                          <>
                            <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payments ({txs.length})</span>
                            </div>
                            {txs.map(tx => (
                              <div key={tx.id} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.isApproved === 'YES' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                    <span className="text-sm">{tx.isApproved === 'YES' ? '✅' : '⏳'}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">
                                      {fmtRs(tx.feesPaid)}
                                      {Number(tx.proCoinsUsed) > 0 && (
                                        <span className="ml-2 text-xs font-medium text-yellow-700">+ {Math.floor(Number(tx.proCoinsUsed))} coins</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-400">{tx.paymentDate} · {tx.paymentMode || 'Cash'}</p>
                                  </div>
                                </div>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${tx.isApproved === 'YES' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
                                  {tx.isApproved === 'YES' ? 'Approved' : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="px-5 py-5 text-center text-gray-400 text-sm">No payment records</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
