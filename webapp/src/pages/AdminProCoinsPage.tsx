import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

type Tab = 'bonus' | 'targeted' | 'history' | 'rules' | 'redemptions' | 'settings'
type HistorySubView = 'all' | 'members' | 'period'
type PeriodType = 'date' | 'week' | 'month'
type TxnTypeFilter = 'all' | 'credit' | 'debit'

type Redemption = {
  order_id: string
  productName: string
  img: string
  amount: string
  orderDate: string
  status: string
  paymentStatus: string
  proCoinsUsed: string
  clientId: string
  clientName: string
  clientMobile: string
  clientPhoto: string
}

type EarningRule = {
  id: string
  eventType: string
  coinAmount: string
  description: string
  isActive: string
  updatedAt: string
}

type CoinMember = { id: string; name: string; email: string; mobile: string }

type TransactionRow = {
  id: string
  txnId: string
  des: string
  amount: string
  creditDebit: string
  txnDate: string
  clientId: string
  clientName: string
}

type MemberSummaryRow = {
  clientId: string
  clientName: string
  totalCredited: string
  totalRedeemed: string
  balance: string
}

type PeriodRow = {
  period: string
  label: string
  totalCoins: string
  txnCount: string
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

function parseDMY(s: string): number {
  const p = s?.split('/')
  if (!p || p.length < 3) return 0
  return Date.UTC(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
}

function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-52 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function AdminProCoinsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('bonus')

  // ── Bonus tab ────────────────────────────────────────────────────────────
  const [bonusAmount, setBonusAmount]     = useState('100')
  const [bonusTitle, setBonusTitle]       = useState('Loyalty Appreciation Bonus')
  const [bonusSubTitle, setBonusSubTitle] = useState('A special thank-you for being part of the ProGym family!')
  const [bonusDesc, setBonusDesc]         = useState('')
  const [showBonusConfirm, setShowBonusConfirm] = useState(false)
  const [bonusSending, setBonusSending]   = useState(false)
  const [bonusResult, setBonusResult]     = useState<{ credited: number; emailed: number; skipped: number; partial?: boolean } | null>(null)
  const [bonusProgress, setBonusProgress] = useState<{ done: number; total: number } | null>(null)
  const [resumeState, setResumeState]     = useState<{ campaignId: string; offset: number; credited: number; emailed: number; skipped: number } | null>(null)

  // ── Settings tab ─────────────────────────────────────────────────────────
  const [showProCoinsPanel, setShowProCoinsPanel] = useState<boolean | null>(null)
  const [flagSaving, setFlagSaving]               = useState(false)
  const [flagSaved, setFlagSaved]                 = useState(false)
  const [showFifaUi, setShowFifaUi]   = useState<boolean | null>(null)
  const [fifaSaving, setFifaSaving]   = useState(false)
  const [fifaSaved, setFifaSaved]     = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/settings/getFeatureFlags.php`)
      .then(r => r.json())
      .then((d: { showProCoinsPanel?: boolean; showFifaUi?: boolean }) => {
        setShowProCoinsPanel(d.showProCoinsPanel ?? true)
        setShowFifaUi(d.showFifaUi ?? false)
      })
      .catch(() => { setShowProCoinsPanel(true); setShowFifaUi(false) })
  }, [])

  async function toggleProCoinsPanel(val: boolean) {
    setShowProCoinsPanel(val)
    setFlagSaving(true)
    setFlagSaved(false)
    try {
      await fetch(`${API_BASE}/settings/updateFeatureFlag.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'showProCoinsPanel', value: val }),
      })
      setFlagSaved(true)
      setTimeout(() => setFlagSaved(false), 2500)
    } catch { /* toggle already updated optimistically */ }
    setFlagSaving(false)
  }

  async function toggleFifaUi(val: boolean) {
    setShowFifaUi(val)
    setFifaSaving(true)
    setFifaSaved(false)
    try {
      await fetch(`${API_BASE}/settings/updateFeatureFlag.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'showFifaUi', value: val }),
      })
      setFifaSaved(true)
      setTimeout(() => setFifaSaved(false), 2500)
    } catch { /* optimistic */ }
    setFifaSaving(false)
  }

  // ── Targeted tab ─────────────────────────────────────────────────────────
  const [coinSearch, setCoinSearch]       = useState('')
  const [coinResults, setCoinResults]     = useState<CoinMember[]>([])
  const [coinSearching, setCoinSearching] = useState(false)
  const [coinTarget, setCoinTarget]       = useState<CoinMember | null>(null)
  const [coinAmount, setCoinAmount]       = useState('')
  const [coinDesc, setCoinDesc]           = useState('')
  const [coinSending, setCoinSending]     = useState(false)
  const [coinResult, setCoinResult]       = useState<{ success: boolean; emailed: boolean } | null>(null)

  // ── Transactions tab — sub-view ──────────────────────────────────────────
  const [historySubView, setHistorySubView] = useState<HistorySubView>('all')

  // All Transactions
  const [allTxns, setAllTxns]             = useState<TransactionRow[] | null>(null)
  const [allTxnsLoaded, setAllTxnsLoaded] = useState(false)
  const [txnNameFilter, setTxnNameFilter] = useState('')
  const [txnTypeFilter, setTxnTypeFilter] = useState<TxnTypeFilter>('all')
  const [txnDateFrom, setTxnDateFrom]     = useState('')
  const [txnDateTo, setTxnDateTo]         = useState('')

  // Member Summary
  const [memberSummary, setMemberSummary]             = useState<MemberSummaryRow[] | null>(null)
  const [memberSummaryLoaded, setMemberSummaryLoaded] = useState(false)
  const [memberSummaryFilter, setMemberSummaryFilter] = useState('')
  const [detailMember, setDetailMember]               = useState<MemberSummaryRow | null>(null)
  const [memberTxns, setMemberTxns]                   = useState<TransactionRow[] | null>(null)
  const [memberTxnsLoading, setMemberTxnsLoading]     = useState(false)

  // By Period
  const [periodType, setPeriodType]       = useState<PeriodType>('month')
  const [periodData, setPeriodData]       = useState<PeriodRow[] | null>(null)
  const [periodFilter, setPeriodFilter]   = useState('')

  // ── Redemptions tab ───────────────────────────────────────────────────────
  const [redemptions, setRedemptions]             = useState<Redemption[] | null>(null)
  const [redemptionsFilter, setRedemptionsFilter] = useState<'Pending' | 'Ready for Pickup' | 'Cancelled' | 'Delivered' | 'all'>('Pending')
  const [redemptionsLoaded, setRedemptionsLoaded] = useState(false)
  const [actionLoading, setActionLoading]         = useState<Record<string, 'approve' | 'reject' | 'complete' | null>>({})
  const [actionDone, setActionDone]               = useState<Record<string, 'approved' | 'rejected' | 'completed'>>({})

  // ── Earning Rules tab ─────────────────────────────────────────────────────
  const [rules, setRules]             = useState<EarningRule[] | null>(null)
  const [rulesLoaded, setRulesLoaded] = useState(false)
  const [ruleEdits, setRuleEdits]     = useState<Record<string, { coinAmount: string; isActive: string }>>({})
  const [ruleSaving, setRuleSaving]   = useState<Record<string, boolean>>({})
  const [ruleSaved, setRuleSaved]     = useState<Record<string, boolean>>({})

  // ── Effects ───────────────────────────────────────────────────────────────

  // Debounced member search
  useEffect(() => {
    if (tab !== 'targeted') return
    if (coinSearch.length < 2) { setCoinResults([]); return }
    const t = setTimeout(() => {
      setCoinSearching(true)
      fetch(`${API_BASE}/client/byName.php?name=${encodeURIComponent(coinSearch)}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: Record<string, string>[]) =>
          setCoinResults(
            Array.isArray(data)
              ? data.map(c => ({ id: String(c.id), name: c.name, email: c.email || '', mobile: c.mobile || '' }))
              : []
          )
        )
        .catch(() => setCoinResults([]))
        .finally(() => setCoinSearching(false))
    }, 400)
    return () => clearTimeout(t)
  }, [coinSearch, tab])

  // Load all transactions (once per session)
  useEffect(() => {
    if (tab !== 'history' || historySubView !== 'all' || allTxnsLoaded) return
    setAllTxnsLoaded(true)
    fetch(`${API_BASE}/procointransaction/getAllTransactions.php`)
      .then(r => r.json())
      .then((data: TransactionRow[]) => setAllTxns(Array.isArray(data) ? data : []))
      .catch(() => setAllTxns([]))
  }, [tab, historySubView, allTxnsLoaded])

  // Load member summary (once per session)
  useEffect(() => {
    if (tab !== 'history' || historySubView !== 'members' || memberSummaryLoaded) return
    setMemberSummaryLoaded(true)
    fetch(`${API_BASE}/procointransaction/getMemberSummary.php`)
      .then(r => r.json())
      .then((data: MemberSummaryRow[]) => setMemberSummary(Array.isArray(data) ? data : []))
      .catch(() => setMemberSummary([]))
  }, [tab, historySubView, memberSummaryLoaded])

  // Load period data (reload when period type changes)
  useEffect(() => {
    if (tab !== 'history' || historySubView !== 'period') return
    setPeriodData(null)
    fetch(`${API_BASE}/procointransaction/getCreditsByPeriod.php?period=${periodType}`)
      .then(r => r.json())
      .then((data: PeriodRow[]) => setPeriodData(Array.isArray(data) ? data : []))
      .catch(() => setPeriodData([]))
  }, [tab, historySubView, periodType])

  // Load redemptions when tab opens or filter changes
  useEffect(() => {
    if (tab !== 'redemptions') return
    setRedemptions(null)
    setRedemptionsLoaded(false)
    fetch(`${API_BASE}/orders/getCoinRedemptions.php?filter=${encodeURIComponent(redemptionsFilter)}`)
      .then(r => r.json())
      .then((data: Redemption[]) => setRedemptions(Array.isArray(data) ? data : []))
      .catch(() => setRedemptions([]))
      .finally(() => setRedemptionsLoaded(true))
  }, [tab, redemptionsFilter])

  // Load earning rules (once)
  useEffect(() => {
    if (tab !== 'rules' || rulesLoaded) return
    setRulesLoaded(true)
    fetch(`${API_BASE}/coinEarningRules/getAll.php`)
      .then(r => r.json())
      .then((data: EarningRule[]) => {
        if (Array.isArray(data)) {
          setRules(data)
          const edits: Record<string, { coinAmount: string; isActive: string }> = {}
          data.forEach(r => { edits[r.id] = { coinAmount: r.coinAmount, isActive: r.isActive } })
          setRuleEdits(edits)
        } else {
          setRules([])
        }
      })
      .catch(() => setRules([]))
  }, [tab, rulesLoaded])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function loadMemberTxns(clientId: string) {
    setMemberTxnsLoading(true)
    setMemberTxns(null)
    try {
      const r = await fetch(`${API_BASE}/procointransaction/retrieve.php?clientId=${clientId}`)
      const data = await r.json()
      if (Array.isArray(data)) {
        setMemberTxns(
          data.filter((t: TransactionRow) => t && typeof t === 'object' && t.creditDebit === '1')
        )
      } else {
        setMemberTxns([])
      }
    } catch {
      setMemberTxns([])
    }
    setMemberTxnsLoading(false)
  }

  async function saveRule(rule: EarningRule) {
    const edit = ruleEdits[rule.id]
    if (!edit) return
    setRuleSaving(prev => ({ ...prev, [rule.id]: true }))
    setRuleSaved(prev => ({ ...prev, [rule.id]: false }))
    try {
      await fetch(`${API_BASE}/coinEarningRules/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, coinAmount: parseInt(edit.coinAmount) || 0, isActive: edit.isActive }),
      })
      setRuleSaved(prev => ({ ...prev, [rule.id]: true }))
      setRules(prev => prev ? prev.map(r => r.id === rule.id ? { ...r, coinAmount: edit.coinAmount, isActive: edit.isActive } : r) : prev)
      setTimeout(() => setRuleSaved(prev => ({ ...prev, [rule.id]: false })), 2000)
    } catch {
      // silent — user can retry
    }
    setRuleSaving(prev => ({ ...prev, [rule.id]: false }))
  }

  async function runBonusBatches(campaignId: string, startOffset: number, initCredited: number, initEmailed: number, initSkipped: number) {
    const BATCH = 50
    const payload = {
      campaignId,
      amount:      parseInt(bonusAmount) || 100,
      title:       bonusTitle.trim() || 'Loyalty Appreciation Bonus',
      subTitle:    bonusSubTitle.trim(),
      description: bonusDesc.trim(),
      limit:       BATCH,
    }

    let offset       = startOffset
    let totalCredited = initCredited
    let totalEmailed  = initEmailed
    let totalSkipped  = initSkipped

    setBonusSending(true)
    setBonusResult(null)

    try {
      while (true) {
        // Each batch retries up to 3 times on network failure
        let data: Record<string, number> | null = null
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(`${API_BASE}/procoins/sendBonusToAll.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payload, offset }),
            })
            data = await res.json()
            break
          } catch {
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000))
          }
        }

        if (!data) {
          // All 3 retries failed — save resume point so user can continue
          setResumeState({ campaignId, offset, credited: totalCredited, emailed: totalEmailed, skipped: totalSkipped })
          setBonusResult({ credited: totalCredited, emailed: totalEmailed, skipped: totalSkipped, partial: true })
          break
        }

        totalCredited += data.credited ?? 0
        totalEmailed  += data.emailed  ?? 0
        totalSkipped  += data.skipped  ?? 0

        const serverTotal = (data.total ?? (offset + BATCH)) as number
        setBonusProgress({ done: Math.min(offset + BATCH, serverTotal), total: serverTotal })

        if (data.done) {
          setResumeState(null)
          setBonusResult({ credited: totalCredited, emailed: totalEmailed, skipped: totalSkipped })
          break
        }
        offset = (data.nextOffset ?? (offset + BATCH)) as number
      }
    } catch {
      setResumeState({ campaignId, offset, credited: totalCredited, emailed: totalEmailed, skipped: totalSkipped })
      setBonusResult({ credited: totalCredited, emailed: totalEmailed, skipped: totalSkipped, partial: true })
    }

    setBonusProgress(null)
    setBonusSending(false)
    setAllTxnsLoaded(false); setAllTxns(null)
    setMemberSummaryLoaded(false); setMemberSummary(null)
    setPeriodData(null)
  }

  async function sendBonusToAll() {
    setShowBonusConfirm(false)
    setBonusProgress(null)
    setResumeState(null)
    await runBonusBatches('BULK-' + Date.now(), 0, 0, 0, 0)
  }

  async function resumeBonus() {
    if (!resumeState) return
    setBonusProgress(null)
    await runBonusBatches(resumeState.campaignId, resumeState.offset, resumeState.credited, resumeState.emailed, resumeState.skipped)
  }

  async function sendCoinToTarget() {
    if (!coinTarget || !coinAmount) return
    setCoinSending(true)
    try {
      const res = await fetch(`${API_BASE}/procoins/sendToClient.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: coinTarget.id,
          amount: parseInt(coinAmount),
          description: coinDesc.trim() || 'ProCoin Gift from Admin',
        }),
      })
      const data = await res.json()
      setCoinResult({ success: !!data.success, emailed: !!data.emailed })
      setAllTxnsLoaded(false); setAllTxns(null)
      setMemberSummaryLoaded(false); setMemberSummary(null)
      setPeriodData(null)
    } catch {
      setCoinResult({ success: false, emailed: false })
    }
    setCoinSending(false)
  }

  async function approveRedemption(orderId: string) {
    setActionLoading(prev => ({ ...prev, [orderId]: 'approve' }))
    try {
      const res = await fetch(`${API_BASE}/orders/approveCoinRedemption.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: parseInt(orderId) }),
      })
      const data = await res.json()
      if (data.success) {
        setActionDone(prev => ({ ...prev, [orderId]: 'approved' }))
        setRedemptions(prev => prev ? prev.map(r => r.order_id === orderId ? { ...r, status: 'Ready for Pickup' } : r) : prev)
      }
    } catch { /* silent */ }
    setActionLoading(prev => ({ ...prev, [orderId]: null }))
  }

  async function rejectRedemption(orderId: string) {
    setActionLoading(prev => ({ ...prev, [orderId]: 'reject' }))
    try {
      const res = await fetch(`${API_BASE}/orders/rejectCoinRedemption.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: parseInt(orderId) }),
      })
      const data = await res.json()
      if (data.success) {
        setActionDone(prev => ({ ...prev, [orderId]: 'rejected' }))
        setRedemptions(prev => prev ? prev.map(r => r.order_id === orderId ? { ...r, status: 'Cancelled' } : r) : prev)
      }
    } catch { /* silent */ }
    setActionLoading(prev => ({ ...prev, [orderId]: null }))
  }

  async function completeRedemption(orderId: string) {
    setActionLoading(prev => ({ ...prev, [orderId]: 'complete' }))
    try {
      const res = await fetch(`${API_BASE}/orders/completeCoinRedemption.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: parseInt(orderId) }),
      })
      const data = await res.json()
      if (data.success) {
        setActionDone(prev => ({ ...prev, [orderId]: 'completed' }))
        setRedemptions(prev => prev ? prev.map(r => r.order_id === orderId ? { ...r, status: 'Delivered' } : r) : prev)
      }
    } catch { /* silent */ }
    setActionLoading(prev => ({ ...prev, [orderId]: null }))
  }

  function resetBonusForm() { setBonusResult(null); setShowBonusConfirm(false) }

  function resetTargetedForm() {
    setCoinResult(null); setCoinTarget(null); setCoinAmount(''); setCoinDesc(''); setCoinSearch(''); setCoinResults([])
  }

  // ── Derived filtered lists ────────────────────────────────────────────────

  const filteredTxns = (allTxns ?? []).filter(r => {
    if (txnNameFilter && !r.clientName.toLowerCase().includes(txnNameFilter.toLowerCase()) && !r.des.toLowerCase().includes(txnNameFilter.toLowerCase())) return false
    if (txnTypeFilter === 'credit' && r.creditDebit !== '1') return false
    if (txnTypeFilter === 'debit'  && r.creditDebit !== '2') return false
    if (txnDateFrom) {
      const from = new Date(txnDateFrom).getTime()
      if (parseDMY(r.txnDate) < from) return false
    }
    if (txnDateTo) {
      const to = new Date(txnDateTo).getTime()
      if (parseDMY(r.txnDate) > to) return false
    }
    return true
  })

  const filteredMemberSummary = (memberSummary ?? []).filter(r =>
    !memberSummaryFilter || r.clientName.toLowerCase().includes(memberSummaryFilter.toLowerCase())
  )

  const filteredPeriodData = (periodData ?? []).filter(r =>
    !periodFilter || r.label.toLowerCase().includes(periodFilter.toLowerCase())
  )

  // ── Tab config ────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'bonus',       label: 'Send Bonus',    icon: '🎁' },
    { key: 'targeted',    label: 'Send to Member', icon: '🎯' },
    { key: 'history',     label: 'Transactions',   icon: '📊' },
    { key: 'rules',       label: 'Earning Rules',  icon: '⚙️' },
    { key: 'redemptions', label: 'Redemptions',    icon: '🛍️' },
    { key: 'settings',    label: 'Display',        icon: '🖥️' },
  ]

  const bonusAmountNum = parseInt(bonusAmount) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-800 text-lg leading-tight">🪙 ProCoins</h1>
            <p className="text-xs text-gray-400">Credit &amp; manage member rewards</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Send Bonus tab ───────────────────────────────────────────────── */}
        {tab === 'bonus' && (
          <div className="space-y-5">
            {bonusResult ? (
              <div className={`rounded-2xl border p-6 text-center ${
                bonusResult.partial ? 'bg-orange-50 border-orange-200'
                  : bonusResult.credited > 0 ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <span className="text-5xl block mb-3">
                  {bonusResult.partial ? '⚠️' : bonusResult.credited > 0 ? '🎉' : '❌'}
                </span>
                <p className={`text-xl font-bold ${
                  bonusResult.partial ? 'text-orange-600'
                    : bonusResult.credited > 0 ? 'text-green-700'
                    : 'text-red-600'
                }`}>
                  {bonusResult.partial ? 'Interrupted — safe to resume'
                    : bonusResult.credited > 0 ? 'Bonus Sent!'
                    : 'Something went wrong'}
                </p>
                {bonusResult.partial && (
                  <p className="text-xs text-orange-500 mt-1">
                    Network error after {bonusResult.credited} members. Nobody will be double-credited — click Resume to continue from where it stopped.
                  </p>
                )}
                {bonusResult.credited > 0 && (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Credited', val: bonusResult.credited, color: 'text-green-700' },
                      { label: 'Emailed',  val: bonusResult.emailed,  color: 'text-blue-600' },
                      { label: 'Skipped',  val: bonusResult.skipped,  color: 'text-gray-400' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100">
                        <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex gap-3 justify-center flex-wrap">
                  {bonusResult.partial && resumeState && (
                    <button onClick={resumeBonus}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                      Resume Sending
                    </button>
                  )}
                  <button onClick={resetBonusForm}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                    {bonusResult.partial ? 'Start New Campaign' : 'Send Again'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white text-center">
                  <div className="text-5xl mb-3">🪙</div>
                  <p className="text-3xl font-black">{bonusAmountNum > 0 ? bonusAmountNum : '—'} ProCoins</p>
                  <p className="text-white/80 text-sm mt-1">will be credited to every member in your gym</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  <div className="p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Coins to Credit <span className="text-red-400">*</span>
                    </label>
                    <input type="number" value={bonusAmount} min="1" max="10000"
                      onChange={e => setBonusAmount(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-800 focus:outline-none focus:border-yellow-400 transition-colors"
                      placeholder="100" />
                  </div>
                  <div className="p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bonus Name / Title</label>
                    <input type="text" value={bonusTitle} maxLength={80} onChange={e => setBonusTitle(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
                      placeholder="Loyalty Appreciation Bonus" />
                  </div>
                  <div className="p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Subtitle <span className="font-normal normal-case text-gray-400">(shown in wallet)</span>
                    </label>
                    <input type="text" value={bonusSubTitle} maxLength={100} onChange={e => setBonusSubTitle(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
                      placeholder="A special thank-you…" />
                  </div>
                  <div className="p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Email Message <span className="font-normal normal-case text-gray-400">(optional)</span>
                    </label>
                    <textarea value={bonusDesc} maxLength={200} rows={2} onChange={e => setBonusDesc(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 transition-colors resize-none"
                      placeholder="Leave blank to use the default message…" />
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-yellow-800">
                  <p className="font-semibold mb-1">What will happen:</p>
                  <ul className="space-y-1 text-yellow-700 text-xs">
                    <li>• <strong>{bonusAmountNum || '—'} ProCoins</strong> credited to <strong>all members</strong> (active + inactive)</li>
                    <li>• Each member with a registered email gets a notification email</li>
                    <li>• Coins are recorded as "{bonusTitle || 'Loyalty Appreciation Bonus'}"</li>
                  </ul>
                </div>
                {bonusSending && bonusProgress && (
                  <div className="bg-white border border-yellow-200 rounded-xl p-4">
                    <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                      <span>Sending emails…</span>
                      <span>{bonusProgress.done} / {bonusProgress.total} members</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
                        style={{ width: `${Math.round((bonusProgress.done / bonusProgress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <button onClick={() => setShowBonusConfirm(true)}
                  disabled={bonusSending || bonusAmountNum <= 0}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {bonusSending ? <><Spinner />Sending… {bonusProgress ? `(${bonusProgress.done}/${bonusProgress.total})` : ''}</> : `Send ${bonusAmountNum > 0 ? bonusAmountNum : '—'} Coins to All Members`}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Send to Member tab ───────────────────────────────────────────── */}
        {tab === 'targeted' && (
          <div className="space-y-4">
            {coinResult ? (
              <div className={`rounded-2xl border p-6 text-center ${coinResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <span className="text-5xl block mb-3">{coinResult.success ? '🎉' : '❌'}</span>
                <p className={`text-xl font-bold ${coinResult.success ? 'text-green-700' : 'text-red-600'}`}>
                  {coinResult.success ? `${coinAmount} ProCoins sent to ${coinTarget?.name}!` : 'Something went wrong'}
                </p>
                {coinResult.success && (
                  <p className="text-sm text-gray-500 mt-1">
                    {coinResult.emailed ? `Email notification sent to ${coinTarget?.email}` : 'No email on file — coins credited only'}
                  </p>
                )}
                <button onClick={resetTargetedForm}
                  className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  Send to Another Member
                </button>
              </div>
            ) : (
              <>
                {!coinTarget && (
                  <>
                    <div className="relative">
                      <input type="text" value={coinSearch}
                        onChange={e => { setCoinSearch(e.target.value); setCoinTarget(null) }}
                        placeholder="Search member by name…"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 transition-colors pr-10" />
                      {coinSearching ? (
                        <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="absolute right-3 top-3.5 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    {coinSearch.length >= 2 && coinResults.length === 0 && !coinSearching && (
                      <p className="text-center text-gray-400 text-sm py-6">No members found.</p>
                    )}
                    {coinSearch.length < 2 && (
                      <p className="text-center text-gray-400 text-xs py-3">Type at least 2 characters to search</p>
                    )}
                    {coinResults.length > 0 && (
                      <ul className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                        {coinResults.slice(0, 10).map(m => (
                          <li key={m.id}>
                            <button onClick={() => { setCoinTarget(m); setCoinResults([]); setCoinSearch('') }}
                              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors text-left">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold shrink-0">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{m.name}</p>
                                <p className="text-xs text-gray-400 truncate">{m.email || 'No email'} · {m.mobile}</p>
                              </div>
                              <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {coinTarget && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3.5">
                      <div className="w-11 h-11 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                        {coinTarget.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{coinTarget.name}</p>
                        <p className="text-xs text-gray-400 truncate">{coinTarget.email || 'No email'} · +91 {coinTarget.mobile}</p>
                      </div>
                      <button onClick={() => { setCoinTarget(null); setCoinAmount(''); setCoinDesc('') }}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none">✕</button>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                      <div className="p-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          ProCoins to Credit <span className="text-red-400">*</span>
                        </label>
                        <input type="number" value={coinAmount} min="1" max="10000" onChange={e => setCoinAmount(e.target.value)}
                          placeholder="e.g. 50"
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-800 focus:outline-none focus:border-blue-400 transition-colors" />
                      </div>
                      <div className="p-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Message / Reason <span className="font-normal normal-case text-gray-400">(optional)</span>
                        </label>
                        <input type="text" value={coinDesc} maxLength={80} onChange={e => setCoinDesc(e.target.value)}
                          placeholder="e.g. Birthday bonus, Referral reward…"
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 transition-colors" />
                      </div>
                    </div>
                    {!coinTarget.email && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        ⚠️ This member has no email on file — coins will be credited but no email notification will be sent.
                      </p>
                    )}
                    <button onClick={sendCoinToTarget}
                      disabled={coinSending || !coinAmount || parseInt(coinAmount) <= 0}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {coinSending ? <><Spinner />Sending…</> : `Send ${coinAmount || '—'} Coins to ${coinTarget.name.split(' ')[0]}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Transactions tab ─────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Sub-view selector */}
            <div className="flex gap-2">
              {([
                { key: 'all',     label: '📋 All Transactions' },
                { key: 'members', label: '👥 Member Summary' },
                { key: 'period',  label: '📅 By Period' },
              ] as { key: HistorySubView; label: string }[]).map(sv => (
                <button key={sv.key} onClick={() => setHistorySubView(sv.key)}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all border ${
                    historySubView === sv.key
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                  }`}>
                  {sv.label}
                </button>
              ))}
            </div>

            {/* ── All Transactions sub-view ── */}
            {historySubView === 'all' && (
              <div className="space-y-3">
                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  {/* Name/description search */}
                  <div className="relative">
                    <input type="text" value={txnNameFilter} onChange={e => setTxnNameFilter(e.target.value)}
                      placeholder="Filter by member name or description…"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors pr-9" />
                    {txnNameFilter && (
                      <button onClick={() => setTxnNameFilter('')} className="absolute right-3 top-2.5 text-gray-300 hover:text-gray-500">✕</button>
                    )}
                  </div>

                  {/* Type filter + date range row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
                      {(['all', 'credit', 'debit'] as TxnTypeFilter[]).map(t => (
                        <button key={t} onClick={() => setTxnTypeFilter(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                            txnTypeFilter === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}>
                          {t === 'all' ? 'All' : t === 'credit' ? '+ Credit' : '− Debit'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input type="date" value={txnDateFrom} onChange={e => setTxnDateFrom(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:border-orange-400" />
                      <span className="text-gray-300 text-xs">to</span>
                      <input type="date" value={txnDateTo} onChange={e => setTxnDateTo(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:border-orange-400" />
                      {(txnDateFrom || txnDateTo) && (
                        <button onClick={() => { setTxnDateFrom(''); setTxnDateTo('') }}
                          className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Loading */}
                {allTxns === null && <SkeletonList />}

                {/* Empty */}
                {allTxns !== null && filteredTxns.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">🪙</p>
                    <p className="font-semibold text-gray-700">No transactions found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                  </div>
                )}

                {/* List */}
                {allTxns !== null && filteredTxns.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400">{filteredTxns.length} record{filteredTxns.length !== 1 ? 's' : ''}</p>
                    <ul className="space-y-2.5">
                      {filteredTxns.map(r => {
                        const isCredit = r.creditDebit === '1'
                        return (
                          <li key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${isCredit ? 'bg-gradient-to-br from-yellow-400 to-orange-400' : 'bg-gradient-to-br from-red-400 to-rose-500'}`}>
                              {isCredit ? '🪙' : '↩'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 text-sm truncate">{r.clientName}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{r.des}</p>
                              <p className="text-xs text-gray-300 mt-0.5">{r.txnDate} · #{r.txnId}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-base font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                {isCredit ? '+' : '−'}{r.amount}
                              </p>
                              <p className="text-xs text-gray-300">coins</p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* ── Member Summary sub-view ── */}
            {historySubView === 'members' && (
              <div className="space-y-3">
                <div className="relative">
                  <input type="text" value={memberSummaryFilter} onChange={e => setMemberSummaryFilter(e.target.value)}
                    placeholder="Search member…"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors pr-9" />
                  {memberSummaryFilter && (
                    <button onClick={() => setMemberSummaryFilter('')} className="absolute right-3 top-2.5 text-gray-300 hover:text-gray-500">✕</button>
                  )}
                </div>

                {memberSummary === null && <SkeletonList />}

                {memberSummary !== null && filteredMemberSummary.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="font-semibold text-gray-700">No members found</p>
                  </div>
                )}

                {memberSummary !== null && filteredMemberSummary.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400">{filteredMemberSummary.length} member{filteredMemberSummary.length !== 1 ? 's' : ''}</p>
                    <ul className="space-y-2.5">
                      {filteredMemberSummary.map(m => {
                        const isDeleted = m.clientName.startsWith('Member #')
                        return (
                        <li key={m.clientId} className={`bg-white rounded-2xl border shadow-sm p-4 ${isDeleted ? 'border-gray-100 opacity-70' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${isDeleted ? 'bg-gray-400' : 'bg-gradient-to-br from-yellow-400 to-orange-400'}`}>
                              {isDeleted ? '?' : m.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold truncate ${isDeleted ? 'text-gray-400 italic' : 'text-gray-800'}`}>{m.clientName}</p>
                              {isDeleted && <p className="text-xs text-gray-300">Client record deleted</p>}
                            </div>
                            <button
                              onClick={() => { setDetailMember(m); loadMemberTxns(m.clientId) }}
                              className="text-xs font-semibold text-orange-500 hover:text-orange-700 border border-orange-200 hover:border-orange-400 rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap">
                              Details
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-green-50 rounded-xl p-2.5 text-center">
                              <p className="text-base font-bold text-green-700">{Math.round(parseFloat(m.totalCredited) || 0)}</p>
                              <p className="text-xs text-green-600 mt-0.5">Credited</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-2.5 text-center">
                              <p className="text-base font-bold text-red-500">{Math.round(parseFloat(m.totalRedeemed) || 0)}</p>
                              <p className="text-xs text-red-400 mt-0.5">Redeemed</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                              <p className="text-base font-bold text-blue-600">{Math.round(parseFloat(m.balance) || 0)}</p>
                              <p className="text-xs text-blue-500 mt-0.5">Balance</p>
                            </div>
                          </div>
                        </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* ── By Period sub-view ── */}
            {historySubView === 'period' && (
              <div className="space-y-3">
                {/* Period type selector */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
                  {(['date', 'week', 'month'] as PeriodType[]).map(p => (
                    <button key={p} onClick={() => { setPeriodType(p); setPeriodFilter('') }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                        periodType === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {p === 'date' ? 'By Date' : p === 'week' ? 'By Week' : 'By Month'}
                    </button>
                  ))}
                </div>

                {/* Search filter */}
                <div className="relative">
                  <input type="text" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
                    placeholder={`Search ${periodType}…`}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors pr-9" />
                  {periodFilter && (
                    <button onClick={() => setPeriodFilter('')} className="absolute right-3 top-2.5 text-gray-300 hover:text-gray-500">✕</button>
                  )}
                </div>

                {periodData === null && <SkeletonList count={6} />}

                {periodData !== null && filteredPeriodData.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">📅</p>
                    <p className="font-semibold text-gray-700">No data found</p>
                    <p className="text-sm text-gray-400 mt-1">{periodFilter ? 'Try a different search' : 'No credit transactions recorded yet'}</p>
                  </div>
                )}

                {periodData !== null && filteredPeriodData.length > 0 && (() => {
                  const grandTotal = filteredPeriodData.reduce((s, r) => s + (parseFloat(r.totalCoins) || 0), 0)
                  return (
                    <>
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 text-white flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Total Shown</p>
                          <p className="text-2xl font-black mt-0.5">{Math.round(grandTotal).toLocaleString()} coins</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Periods</p>
                          <p className="text-2xl font-black mt-0.5">{filteredPeriodData.length}</p>
                        </div>
                      </div>

                      <ul className="space-y-2.5">
                        {filteredPeriodData.map(r => (
                          <li key={r.period} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                              <span className="text-lg">{periodType === 'month' ? '🗓' : periodType === 'week' ? '📆' : '📅'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 text-sm">{r.label}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{r.txnCount} transaction{parseInt(r.txnCount) !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-bold text-green-600">+{Math.round(parseFloat(r.totalCoins) || 0).toLocaleString()}</p>
                              <p className="text-xs text-gray-300">coins</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── Earning Rules tab ────────────────────────────────────────────── */}
        {tab === 'rules' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              Set how many ProCoins each event awards. Toggle a rule off to disable it entirely.
              <br /><strong>1 ProCoin = ₹1</strong>
            </p>
            {rules === null && (
              <div className="space-y-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-40 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-20 bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            )}
            {rules !== null && rules.length === 0 && (
              <p className="text-center text-gray-400 py-12">No earning rules found.</p>
            )}
            {rules !== null && rules.length > 0 && (
              <ul className="space-y-3">
                {rules.map(rule => {
                  const edit = ruleEdits[rule.id] ?? { coinAmount: rule.coinAmount, isActive: rule.isActive }
                  const isOn   = edit.isActive === 'yes'
                  const saving = !!ruleSaving[rule.id]
                  const saved  = !!ruleSaved[rule.id]
                  const dirty  = edit.coinAmount !== rule.coinAmount || edit.isActive !== rule.isActive
                  return (
                    <li key={rule.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${isOn ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{rule.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">{rule.eventType}</p>
                        </div>
                        <button onClick={() => setRuleEdits(prev => ({ ...prev, [rule.id]: { ...edit, isActive: isOn ? 'no' : 'yes' } }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isOn ? 'bg-green-500' : 'bg-gray-200'}`}>
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">Coins:</span>
                          <input type="number" min="0" max="9999" value={edit.coinAmount}
                            onChange={e => setRuleEdits(prev => ({ ...prev, [rule.id]: { ...edit, coinAmount: e.target.value } }))}
                            className="w-24 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-yellow-400 transition-colors" />
                          <span className="text-xs text-gray-400">= ₹{edit.coinAmount || 0}</span>
                        </div>
                        <button onClick={() => saveRule(rule)} disabled={saving || !dirty}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            saved ? 'bg-green-100 text-green-700' : dirty ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}>
                          {saving ? <><Spinner />Saving…</> : saved ? '✓ Saved' : 'Save'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── Redemptions tab ──────────────────────────────────────────────── */}
        {tab === 'redemptions' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              Members who redeemed merchandise with ProCoins. Approve to let them collect at the gym; reject to refund their coins.
            </p>
            <div className="flex gap-2 flex-wrap">
              {(['Pending', 'Ready for Pickup', 'Delivered', 'Cancelled', 'all'] as const).map(f => (
                <button key={f} onClick={() => setRedemptionsFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    redemptionsFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            {redemptions === null && (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-36 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-20 bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            )}
            {redemptionsLoaded && redemptions !== null && redemptions.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🛍️</p>
                <p className="font-semibold text-gray-700">No redemptions found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {redemptionsFilter === 'Pending'
                    ? 'No pending coin redemption requests right now'
                    : `No ${redemptionsFilter === 'all' ? '' : redemptionsFilter + ' '}coin redemption orders`}
                </p>
              </div>
            )}
            {redemptions !== null && redemptions.length > 0 && (
              <>
                <p className="text-xs text-gray-400">{redemptions.length} request{redemptions.length !== 1 ? 's' : ''}</p>
                <ul className="space-y-3">
                  {redemptions.map(r => {
                    const loading = actionLoading[r.order_id]
                    const done    = actionDone[r.order_id]
                    const isPending = r.status === 'Pending'
                    return (
                      <li key={r.order_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                            {r.img ? <img src={r.img} alt={r.productName} className="w-full h-full object-cover" /> : '📦'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 text-sm truncate">{r.productName}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{r.clientName} · {r.clientMobile}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-yellow-100">
                                🪙 {r.proCoinsUsed} coins
                              </span>
                              <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                r.status === 'Pending'          ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                r.status === 'Ready for Pickup' ? 'bg-green-50 text-green-700 border-green-100' :
                                r.status === 'Delivered'        ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                r.status === 'Cancelled'        ? 'bg-red-50 text-red-600 border-red-100' :
                                'bg-gray-50 text-gray-500 border-gray-100'
                              }`}>{r.status}</span>
                              <span className="text-xs text-gray-300">{r.orderDate}</span>
                            </div>
                          </div>
                        </div>
                        {isPending && !done && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => approveRedemption(r.order_id)} disabled={!!loading}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              {loading === 'approve' ? <><Spinner />Approving…</> : '✓ Approve'}
                            </button>
                            <button onClick={() => rejectRedemption(r.order_id)} disabled={!!loading}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              {loading === 'reject' ? <><Spinner />Rejecting…</> : '✕ Reject'}
                            </button>
                          </div>
                        )}
                        {r.status === 'Ready for Pickup' && !done && (
                          <button onClick={() => completeRedemption(r.order_id)} disabled={!!loading}
                            className="w-full mt-3 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                            {loading === 'complete' ? <><Spinner />Marking…</> : '✓ Mark as Completed'}
                          </button>
                        )}
                        {done === 'approved' && (
                          <p className="mt-3 text-center text-xs font-semibold text-green-600 bg-green-50 rounded-xl py-2">✓ Approved — member notified to collect</p>
                        )}
                        {done === 'rejected' && (
                          <p className="mt-3 text-center text-xs font-semibold text-red-600 bg-red-50 rounded-xl py-2">✕ Rejected — coins refunded to member</p>
                        )}
                        {done === 'completed' && (
                          <p className="mt-3 text-center text-xs font-semibold text-purple-700 bg-purple-50 rounded-xl py-2">✓ Completed — member has collected the item</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        )}

        {/* ── Display Settings tab ─────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="space-y-5">

            {/* Panel toggle card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <span className="text-lg">🖥️</span>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Public Dashboard Display</p>
                  <p className="text-xs text-gray-400 mt-0.5">Controls what visitors see on the public screen</p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🪙</span>
                      <p className="font-semibold text-gray-800 text-sm">ProCoins Awareness Panel</p>
                      {showProCoinsPanel === null && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Loading…</span>
                      )}
                      {showProCoinsPanel === true && (
                        <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Visible</span>
                      )}
                      {showProCoinsPanel === false && (
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">Hidden</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Shows the "Introducing ProCoins" section on the public dashboard — earning rules, auto-scrolling merchandise, and the login-to-redeem prompt.
                      Turn this off once members are familiar with ProCoins.
                    </p>
                  </div>

                  {/* Toggle switch */}
                  <button
                    disabled={showProCoinsPanel === null || flagSaving}
                    onClick={() => toggleProCoinsPanel(!showProCoinsPanel)}
                    className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${
                      showProCoinsPanel ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                      showProCoinsPanel ? 'translate-x-7' : 'translate-x-0'
                    }`}>
                      {flagSaving && (
                        <svg className="w-3 h-3 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>

                {flagSaved && (
                  <p className="mt-3 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved — public dashboard will reflect this immediately
                  </p>
                )}
              </div>
            </div>

            {/* FIFA WC 2026 UI toggle card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <div>
                  <p className="font-bold text-gray-800 text-sm">FIFA World Cup 2026 Dashboard</p>
                  <p className="text-xs text-gray-400 mt-0.5">Replaces the public dashboard with a tournament-themed layout</p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">⚽</span>
                      <p className="font-semibold text-gray-800 text-sm">Show FIFA UI</p>
                      {showFifaUi === null && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Loading…</span>
                      )}
                      {showFifaUi === true && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">FIFA Mode ON</span>
                      )}
                      {showFifaUi === false && (
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">Standard</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Turn this <strong>ON</strong> during the FIFA World Cup 2026 — the public dashboard becomes a tournament hub
                      with team flags, upcoming match cards, countdown timer, group stage strip and star players.
                      Members / Workouts / Admin / Attendance become compact action chips.
                      Turn this <strong>OFF</strong> once the tournament ends to revert to the standard dashboard.
                    </p>
                  </div>

                  {/* Toggle switch */}
                  <button
                    disabled={showFifaUi === null || fifaSaving}
                    onClick={() => toggleFifaUi(!showFifaUi)}
                    className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${
                      showFifaUi ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                      showFifaUi ? 'translate-x-7' : 'translate-x-0'
                    }`}>
                      {fifaSaving && (
                        <svg className="w-3 h-3 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>

                {fifaSaved && (
                  <p className="mt-3 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved — public dashboard will reflect this immediately
                  </p>
                )}
              </div>
            </div>

            {/* Info card */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">💡 When to use this</p>
              <ul className="space-y-1 text-amber-700 text-xs">
                <li>• Keep it <strong>ON</strong> during the first few weeks to build ProCoins awareness</li>
                <li>• Turn it <strong>OFF</strong> once members know about ProCoins and the section is no longer needed</li>
                <li>• Change takes effect instantly — no page reload required on the public screen</li>
              </ul>
            </div>

          </div>
        )}

      </main>

      {/* ── Bonus confirm dialog ─────────────────────────────────────────────── */}
      {showBonusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowBonusConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <span className="text-4xl block mb-3">🪙</span>
              <h4 className="font-bold text-gray-800 text-lg">Send Bonus to All Members?</h4>
              <p className="text-sm text-gray-500 mt-2">
                <strong className="text-gray-800">{bonusAmountNum} ProCoins</strong> will be credited to{' '}
                <strong className="text-gray-800">every member</strong> in your gym as{' '}
                "<strong className="text-gray-800">{bonusTitle || 'Loyalty Appreciation Bonus'}</strong>".
                Members with a registered email will receive a notification.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBonusConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={sendBonusToAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90 transition-opacity">
                Yes, Send!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Member detail modal ──────────────────────────────────────────────── */}
      {detailMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4"
          onClick={() => { setDetailMember(null); setMemberTxns(null) }}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                {detailMember.clientName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{detailMember.clientName}</p>
                <p className="text-xs text-gray-400">Credit transaction history</p>
              </div>
              <button onClick={() => { setDetailMember(null); setMemberTxns(null) }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors text-lg leading-none">✕</button>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-gray-50">
              <div className="text-center">
                <p className="text-sm font-bold text-green-600">{Math.round(parseFloat(detailMember.totalCredited) || 0)}</p>
                <p className="text-xs text-gray-400">Credited</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-red-500">{Math.round(parseFloat(detailMember.totalRedeemed) || 0)}</p>
                <p className="text-xs text-gray-400">Redeemed</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-600">{Math.round(parseFloat(detailMember.balance) || 0)}</p>
                <p className="text-xs text-gray-400">Balance</p>
              </div>
            </div>

            {/* Transaction list */}
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {memberTxnsLoading && (
                <div className="space-y-3 py-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                        <div className="h-2.5 w-28 bg-gray-100 rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-12 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {!memberTxnsLoading && memberTxns !== null && memberTxns.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">🪙</p>
                  <p className="text-sm text-gray-500">No credit transactions found</p>
                </div>
              )}

              {!memberTxnsLoading && memberTxns !== null && memberTxns.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 mb-3">{memberTxns.length} credit transaction{memberTxns.length !== 1 ? 's' : ''}</p>
                  <ul className="space-y-2.5 pb-2">
                    {memberTxns.map(t => (
                      <li key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 shrink-0 text-sm">🪙</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{t.des}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t.txnDate}</p>
                        </div>
                        <p className="text-sm font-bold text-green-600 shrink-0">+{t.amount}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
