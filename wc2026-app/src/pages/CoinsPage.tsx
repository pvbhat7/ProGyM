import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { getSession } from '../services/wcSession'

interface Txn {
  id: string
  type: 'credit' | 'debit' | 'zero'
  amount: number
  description: string
  date: string | null
  team_a_name: string
  team_a_code: string
  team_b_name: string
  team_b_code: string
  actual_score_a: string | null
  actual_score_b: string | null
}

function formatDate(dt: string | null) {
  if (!dt) return ''
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const h24 = parseInt(m[4], 10)
  const h12 = ((h24 + 11) % 12) + 1
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} · ${String(h12).padStart(2,'0')}:${m[5]} ${ampm}`
}

export default function CoinsPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [txns, setTxns] = useState<Txn[]>([])
  const [balance, setBalance] = useState(0)
  const [credits, setCredits] = useState(0)
  const [debits, setDebits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all')

  useEffect(() => {
    if (!session?.clientId) { navigate('/signup'); return }
    fetch(`${API_BASE}/wc_predictions/coinHistory.php?client_id=${session.clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j) return
        setTxns(Array.isArray(j.transactions) ? j.transactions : [])
        setBalance(Number(j.balance) || 0)
        setCredits(Number(j.total_credits) || 0)
        setDebits(Number(j.total_debits) || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.clientId, navigate])

  const filtered = txns.filter(t => {
    if (filter === 'all') return true
    if (filter === 'credit') return t.type === 'credit'
    if (filter === 'debit') return t.type === 'debit'
    return true
  })

  const creditCount = txns.filter(t => t.type === 'credit').length
  const debitCount  = txns.filter(t => t.type === 'debit').length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader title="Football Coins" subtitle={session?.name || ''} showBack />

      <section className="max-w-md mx-auto px-3 pt-3">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-900 text-white rounded-2xl p-4 shadow-md relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(255,255,255,0.5) 22px, rgba(255,255,255,0.5) 23px)' }}
          />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-wider opacity-90">Current Balance</p>
            <p className="text-3xl font-black mt-1 flex items-baseline gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-100">{Math.round(balance)}</span>
              <span className="text-2xl">⚽</span>
            </p>
            <div className="flex gap-4 mt-3 text-[11px]">
              <div>
                <p className="opacity-75">Credited</p>
                <p className="font-bold text-blue-200">+{Math.round(credits)}</p>
              </div>
              <div>
                <p className="opacity-75">Debited</p>
                <p className="font-bold text-red-200">-{Math.round(debits)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-md mx-auto px-3 py-3">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3 flex">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 text-xs font-semibold ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            All · {txns.length}
          </button>
          <button
            onClick={() => setFilter('credit')}
            className={`flex-1 py-2 text-xs font-semibold ${filter === 'credit' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Credits · {creditCount}
          </button>
          <button
            onClick={() => setFilter('debit')}
            className={`flex-1 py-2 text-xs font-semibold ${filter === 'debit' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            Debits · {debitCount}
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">⚽</p>
            <p className="font-semibold text-gray-600">No transactions yet</p>
            <p className="text-sm mt-1">
              {filter === 'debit'
                ? 'No coin debits yet — redemptions will show up here.'
                : 'Earn coins by predicting match outcomes correctly.'}
            </p>
            {filter !== 'debit' && (
              <button onClick={() => navigate('/matches')} className="mt-4 py-2 px-5 bg-blue-600 text-white font-semibold rounded-xl shadow">
                See Matches
              </button>
            )}
          </div>
        )}

        {!loading && filtered.map(t => {
          const isCredit = t.type === 'credit'
          const isZero   = t.type === 'zero'
          const sign     = isCredit ? '+' : isZero ? '' : '-'
          const amountCls = isCredit ? 'text-indigo-700' : isZero ? 'text-gray-400' : 'text-red-700'
          const iconBg    = isCredit ? 'bg-blue-100 text-indigo-700' : isZero ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-700'
          const icon      = isCredit ? '↓' : isZero ? '·' : '↑'
          return (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-3 mb-2 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${iconBg}`}>{icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{t.description}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(t.date)}</p>
              </div>
              <div className={`text-right ${amountCls}`}>
                <p className="font-black text-base">{sign}{Math.abs(Math.round(t.amount))} ⚽</p>
              </div>
            </div>
          )
        })}
      </main>

      <BottomNav />
    </div>
  )
}
