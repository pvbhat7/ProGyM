import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE, MEDIA_BASE } from '../api/config'
import NotificationBell from '../components/NotificationBell'

type Reward = {
  id: number
  clientId: string
  title: string
  subTitle: string
  img: string
  amount: string
  isRedeemed: string
  creditDebit: string
  redeemDate: string
}

type TxnRaw = {
  id: number
  txnId: string
  des: string
  amount: number
  creditDebit: string   // '1' = credit, '2' = debit
  txnDate: string
  clientId: string
}

type EarningRule = {
  id: number
  eventType: string
  coinAmount: number
  description: string
  isActive: string
  updatedAt: string
}

type Product = {
  id: number
  productName: string
  oldPrice: number
  newPrice: number
  productPhoto: string
  discontinue: string
}

type CoinOrder = {
  order_id: number
  name: string
  img: string
  date: string
  status: string
  amount: number
  paymentStatus: string
  proCoinsUsed: number
  trackingDetails: string
}

function imgUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${MEDIA_BASE}/${path}`
}

function getTodayIST(): string {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Calcutta' }))
  const d = String(ist.getDate()).padStart(2, '0')
  const m = String(ist.getMonth() + 1).padStart(2, '0')
  const y = ist.getFullYear()
  return `${d}/${m}/${y}`
}

const EARN_ICONS: Record<string, string> = {
  signup:             '🎉',
  full_payment:       '💳',
  daily_login:        '📱',
  weight_log:         '⚖️',
  before_after_photo: '📸',
  profile_pic:        '🖼️',
}

const EARN_FREQ: Record<string, string> = {
  signup:             'One-time only',
  full_payment:       'Per enrollment',
  daily_login:        'Once per day',
  weight_log:         'Once per week',
  before_after_photo: 'Once per week',
  profile_pic:        'Once per month',
}

function formatDate(raw: string): string {
  if (!raw) return ''
  const clean = raw.replace(/-/g, '/').split(' ')[0]
  const [d, m, y] = clean.split('/')
  if (!d || !m || !y) return raw
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MemberProCoinsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [txns, setTxns] = useState<TxnRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'txns' | 'rewards' | 'earn' | 'shop' | 'orders'>('txns')

  // Earn tab
  const [earningRules, setEarningRules] = useState<EarningRule[]>([])
  const [rulesLoaded, setRulesLoaded] = useState(false)

  // Shop tab
  const [products, setProducts] = useState<Product[]>([])
  const [shopLoaded, setShopLoaded] = useState(false)
  const [shopLoading, setShopLoading] = useState(false)

  // Orders tab
  const [coinOrders, setCoinOrders] = useState<CoinOrder[]>([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Redemption
  const [confirmItem, setConfirmItem] = useState<Product | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const clientId = user?.userId

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/rewards/retrieve.php?clientId=${clientId}`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/procointransaction/retrieve.php?clientId=${clientId}`).then(r => r.ok ? r.json() : []),
    ])
      .then(([rData, tData]) => {
        setRewards(Array.isArray(rData) ? rData : [])
        setTxns(Array.isArray(tData) ? tData : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => {
    if (tab === 'earn' && !rulesLoaded) {
      fetch(`${API_BASE}/coinEarningRules/getAll.php`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setEarningRules(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setRulesLoaded(true))
    }
  }, [tab, rulesLoaded])

  useEffect(() => {
    if (tab === 'shop' && !shopLoaded) {
      setShopLoading(true)
      Promise.all([
        fetch(`${API_BASE}/merchandise/getAllMerchandise.php`).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/supplements/getAllSupplements.php`).then(r => r.ok ? r.json() : []),
      ])
        .then(([mData, sData]) => {
          const merch: Product[] = (Array.isArray(mData) ? mData : []).filter((p: Product) => p.discontinue !== 'true')
          const supp: Product[] = (Array.isArray(sData) ? sData : []).filter((p: Product) => p.discontinue !== 'true')
          setProducts([...merch, ...supp])
          setShopLoaded(true)
        })
        .catch(() => setShopLoaded(true))
        .finally(() => setShopLoading(false))
    }
  }, [tab, shopLoaded])

  const balance = txns.reduce((sum, t) => {
    const amt = Number(t.amount) || 0
    return t.creditDebit === '1' ? sum + amt : sum - amt
  }, 0)

  const sortedTxns = [...txns].sort((a, b) => b.id - a.id)
  const sortedRewards = [...rewards].sort((a, b) => b.id - a.id)

  useEffect(() => {
    if (tab === 'orders' && !ordersLoaded && clientId) {
      setOrdersLoading(true)
      fetch(`${API_BASE}/orders/getMyCoinRedemptions.php?clientId=${clientId}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setCoinOrders(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => { setOrdersLoaded(true); setOrdersLoading(false) })
    }
  }, [tab, ordersLoaded, clientId])

  async function handleRedeem() {
    if (!confirmItem || !clientId) return
    setRedeeming(true)
    const txnId = `REDEEM_${clientId}_${Date.now()}`
    const today = getTodayIST()
    try {
      await fetch(`${API_BASE}/procointransaction/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnId,
          des: `Redeemed: ${confirmItem.productName}`,
          amount: confirmItem.newPrice,
          creditDebit: '2',
          txnDate: today,
          clientId: String(clientId),
        }),
      })
      await fetch(`${API_BASE}/orders/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: String(clientId),
          name: confirmItem.productName,
          img: confirmItem.productPhoto,
          date: today,
          status: 'Pending',
          amount: 0,
          paymentStatus: 'ProCoins',
          proCoinsUsed: confirmItem.newPrice,
          couponUsed: 'empty',
          trackingDetails: '',
        }),
      })
      // Refresh txn list so balance updates
      const tData = await fetch(`${API_BASE}/procointransaction/retrieve.php?clientId=${clientId}`).then(r => r.ok ? r.json() : [])
      setTxns(Array.isArray(tData) ? tData : [])
      setConfirmItem(null)
      setOrdersLoaded(false)   // force Orders tab to re-fetch
      setSuccessMsg(`Redeemed! Your request for "${confirmItem.productName}" is pending admin approval.`)
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch {
      // silent — user can retry
    } finally {
      setRedeeming(false)
    }
  }

  const TABS: { key: typeof tab; label: string }[] = [
    { key: 'txns',    label: 'History'  },
    { key: 'rewards', label: 'Rewards'  },
    { key: 'earn',    label: 'Earn'     },
    { key: 'shop',    label: 'Shop'     },
    { key: 'orders',  label: 'Orders'   },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/member-dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">ProCoins</h1>
            <p className="text-xs text-gray-400">Your rewards wallet</p>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
              🪙
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Available Balance</p>
              {loading ? (
                <div className="h-8 w-24 bg-white/20 rounded-lg mt-1 animate-pulse" />
              ) : (
                <p className="text-3xl font-bold mt-0.5">{balance.toLocaleString()}</p>
              )}
            </div>
          </div>
          <div className="flex gap-4 pt-2 border-t border-white/20">
            <div className="flex-1 text-center">
              <p className="text-white/60 text-xs">Total Earned</p>
              <p className="font-bold text-sm mt-0.5">
                {loading ? '—' : txns.filter(t => t.creditDebit === '1').reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="flex-1 text-center">
              <p className="text-white/60 text-xs">Total Redeemed</p>
              <p className="font-bold text-sm mt-0.5">
                {loading ? '—' : txns.filter(t => t.creditDebit === '2').reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="flex-1 text-center">
              <p className="text-white/60 text-xs">Transactions</p>
              <p className="font-bold text-sm mt-0.5">{loading ? '—' : txns.length}</p>
            </div>
          </div>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
            <span className="text-xl shrink-0">✅</span>
            <p className="text-green-800 text-sm font-medium leading-snug">{successMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === t.key ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── History tab ── */}
        {tab === 'txns' && (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {sortedTxns.length === 0 ? (
                <div className="text-center py-14 text-gray-400">
                  <span className="text-4xl block mb-3">🪙</span>
                  <p className="text-sm">No transactions yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {sortedTxns.map(t => {
                    const isCredit = t.creditDebit === '1'
                    return (
                      <li key={t.id} className="flex items-center px-5 py-4 gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${isCredit ? 'bg-green-50' : 'bg-red-50'}`}>
                          {isCredit ? '⬆️' : '⬇️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{t.des || 'Transaction'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.txnDate)}</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                          {isCredit ? '+' : '−'}{Number(t.amount).toLocaleString()}
                          <span className="text-xs font-normal ml-0.5">coins</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        )}

        {/* ── Rewards tab ── */}
        {tab === 'rewards' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {sortedRewards.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <span className="text-4xl block mb-3">🏆</span>
                <p className="text-sm">No rewards yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {sortedRewards.map(r => {
                  const isRedeemed = r.isRedeemed === 'true'
                  return (
                    <li key={r.id} className="flex items-center px-5 py-4 gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-orange-50 shrink-0 flex items-center justify-center">
                        {r.img ? (
                          <img src={r.img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <span className="text-xl">🏅</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{r.title || 'Reward'}</p>
                        {r.subTitle ? <p className="text-xs text-gray-400 mt-0.5 truncate">{r.subTitle}</p> : null}
                        {isRedeemed && r.redeemDate ? (
                          <p className="text-xs text-gray-300 mt-0.5">Redeemed {formatDate(r.redeemDate)}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-orange-500">
                          {Number(r.amount).toLocaleString()}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">coins</span>
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isRedeemed ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'}`}>
                          {isRedeemed ? 'Redeemed' : 'Active'}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── Earn tab ── */}
        {tab === 'earn' && (
          !rulesLoaded ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : earningRules.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <span className="text-4xl block mb-3">🎯</span>
              <p className="text-sm">No earning rules found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 text-center">1 ProCoin = ₹1 · Redeem coins in the Shop tab</p>
              {earningRules.map(rule => {
                const active = rule.isActive === 'yes'
                return (
                  <div
                    key={rule.id}
                    className={`bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 ${!active ? 'opacity-50' : ''}`}
                  >
                    <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                      {EARN_ICONS[rule.eventType] || '🎯'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{rule.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{EARN_FREQ[rule.eventType] || ''}</p>
                      {!active && <p className="text-xs text-gray-300 mt-0.5">Currently paused</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-orange-500">+{rule.coinAmount}</p>
                      <p className="text-xs text-gray-400">coins</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── Shop tab ── */}
        {tab === 'shop' && (
          shopLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <span className="text-4xl block mb-3">🛍️</span>
              <p className="text-sm">No products available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 text-center">Full coin balance required · 1 ProCoin = ₹1</p>
              {products.map(p => {
                const canRedeem = !loading && balance >= p.newPrice
                const shortage = p.newPrice - balance
                return (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex gap-4 p-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                      {p.productPhoto ? (
                        <img
                          src={imgUrl(p.productPhoto)}
                          alt={p.productName}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <span className="text-2xl">🛍️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-snug">{p.productName}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-base font-bold text-orange-500">{p.newPrice.toLocaleString()} coins</span>
                        {p.oldPrice > p.newPrice && (
                          <span className="text-xs text-gray-400 line-through">₹{p.oldPrice.toLocaleString()}</span>
                        )}
                      </div>
                      {!canRedeem && shortage > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">Need {shortage.toLocaleString()} more coins</p>
                      )}
                      <button
                        onClick={() => setConfirmItem(p)}
                        disabled={!canRedeem}
                        className={`mt-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${canRedeem ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        Redeem with ProCoins
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
        {/* ── Orders tab ── */}
        {tab === 'orders' && (
          ordersLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : coinOrders.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <span className="text-4xl block mb-3">📦</span>
              <p className="text-sm">No redemption orders yet.</p>
              <p className="text-xs mt-1">Redeem products from the Shop tab.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coinOrders.map(order => {
                const statusStyles: Record<string, string> = {
                  'Pending':          'bg-yellow-100 text-yellow-700',
                  'Ready for Pickup': 'bg-blue-100 text-blue-700',
                  'Cancelled':        'bg-red-100 text-red-500',
                  'Delivered':        'bg-green-100 text-green-700',
                }
                const badge = statusStyles[order.status] ?? 'bg-gray-100 text-gray-500'
                return (
                  <div key={order.order_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex gap-4 p-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                      {order.img ? (
                        <img
                          src={imgUrl(order.img)}
                          alt={order.name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <span className="text-2xl">🛍️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-snug truncate">{order.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.date)}</p>
                      <p className="text-sm font-bold text-orange-500 mt-1">
                        {Number(order.proCoinsUsed).toLocaleString()} coins
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end justify-between">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge}`}>
                        {order.status}
                      </span>
                      {order.trackingDetails ? (
                        <p className="text-xs text-gray-400 mt-1 text-right max-w-[110px] truncate">{order.trackingDetails}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </main>

      {/* ── Redemption confirm modal ── */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl mx-auto mb-3 overflow-hidden flex items-center justify-center">
                {confirmItem.productPhoto ? (
                  <img src={imgUrl(confirmItem.productPhoto)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🛍️</span>
                )}
              </div>
              <h3 className="font-bold text-gray-800 text-base">{confirmItem.productName}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Redeem for{' '}
                <span className="font-bold text-orange-500">{confirmItem.newPrice.toLocaleString()} ProCoins</span>?
              </p>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Coins are deducted immediately. Collect the product at the gym once admin approves your request.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmItem(null)}
                disabled={redeeming}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
              >
                {redeeming ? 'Processing…' : 'Confirm Redeem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
