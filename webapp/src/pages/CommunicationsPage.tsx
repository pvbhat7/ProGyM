import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { sendWhatsAppToClient, type WhatsAppKind } from '../components/WhatsAppApiButton'

type EmailType =
  | 'all'
  | 'welcome'
  | 'payment'
  | 'reminder'
  | 'photo_reminder'
  | 'app_launch'
  | 'procoin_bonus'
  | 'procoin_birthday'
  | 'procoin_gift'

interface EmailRow {
  id: string
  clientId: string | null
  recipientName: string
  recipientEmail: string
  recipientMobile: string | null
  type: string
  subject: string
  status: 'sent' | 'failed'
  errorMessage: string | null
  triggeredBy: string
  sentAt: string
}

interface EmailDetail extends EmailRow {
  bodyHtml: string
  smsText: string
  whatsappText: string
}

interface ListResponse {
  total: number
  page: number
  pageSize: number
  rows: EmailRow[]
}

interface StatsResponse {
  overall: { total: number; sent: number; failed: number }
  byType: { type: string; total: string; sent: string; failed: string }[]
}

const TAB_CONFIG: { value: EmailType; label: string; icon: string }[] = [
  { value: 'all',              label: 'All',            icon: '📨' },
  { value: 'welcome',          label: 'Welcome',        icon: '🏋' },
  { value: 'payment',          label: 'Payment',        icon: '💰' },
  { value: 'reminder',         label: 'Reminder',       icon: '⏰' },
  { value: 'photo_reminder',   label: 'Photo Reminder', icon: '📸' },
  { value: 'app_launch',       label: 'App Launch',     icon: '🚀' },
  { value: 'procoin_bonus',    label: 'ProCoin Bonus',  icon: '🎉' },
  { value: 'procoin_birthday', label: 'Birthday',       icon: '🎂' },
  { value: 'procoin_gift',     label: 'ProCoin Gift',   icon: '🎁' },
]

// email_log.type → WhatsApp API message kind (types not listed fall back to WhatsApp Web)
const API_KIND_BY_TYPE: Record<string, WhatsAppKind> = {
  welcome:          'welcome',
  reminder:         'reminder',
  photo_reminder:   'photo_reminder',
  app_launch:       'app_launch',
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function todayISO(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function shiftISO(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(n => parseInt(n, 10))
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + deltaDays)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function prettyDateLabel(iso: string): string {
  const today = todayISO()
  const yesterday = shiftISO(today, -1)
  if (iso === today) return 'Today'
  if (iso === yesterday) return 'Yesterday'
  const [y, m, d] = iso.split('-').map(n => parseInt(n, 10))
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function normaliseMobile(m: string | null | undefined): string {
  if (!m) return ''
  const digits = m.replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits
  return digits
}

export default function CommunicationsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const activeTab = (params.get('type') as EmailType) || 'all'
  const search    = params.get('search') || ''
  const statusF   = params.get('status') || 'all'
  const page      = Math.max(1, parseInt(params.get('page') || '1', 10))
  const dateParam = params.get('date')
  const date      = dateParam === null ? todayISO() : dateParam  // '' means "all dates"
  const isAllDates = date === ''
  const today      = todayISO()

  const [data, setData]       = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [stats, setStats]     = useState<StatsResponse | null>(null)
  const [searchInput, setSearchInput] = useState(search)
  const [preview, setPreview] = useState<EmailDetail | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [toast, setToast]     = useState<string>('')

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null || value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    setLoading(true)
    setError(false)
    const qs = new URLSearchParams()
    if (activeTab !== 'all') qs.set('type', activeTab)
    if (search)              qs.set('search', search)
    if (statusF !== 'all')   qs.set('status', statusF)
    if (!isAllDates) { qs.set('from', date); qs.set('to', date) }
    qs.set('page', String(page))
    qs.set('pageSize', '50')

    fetch(`${API_BASE}/emaillog/all.php?${qs.toString()}`)
      .then(r => r.json())
      .then((d: ListResponse) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [activeTab, search, statusF, page, date, isAllDates])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (!isAllDates) { qs.set('from', date); qs.set('to', date) }
    fetch(`${API_BASE}/emaillog/stats.php${qs.toString() ? '?' + qs.toString() : ''}`)
      .then(r => r.json())
      .then((s: StatsResponse) => setStats(s))
      .catch(() => { /* silent */ })
  }, [data, date, isAllDates])

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 }
    stats?.byType.forEach(t => { counts[t.type] = parseInt(t.total, 10) || 0 })
    counts.all = stats?.overall.total ?? 0
    return counts
  }, [stats])

  const openPreview = useCallback(async (id: string) => {
    setPreviewLoading(true)
    setPreview(null)
    try {
      const r = await fetch(`${API_BASE}/emaillog/byId.php?id=${id}`)
      const d: EmailDetail = await r.json()
      setPreview(d)
    } catch {
      setToast('Could not load email')
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setToast(`${label} copied to clipboard`)
      setTimeout(() => setToast(''), 2500)
    }).catch(() => setToast('Copy failed'))
  }

  function handleSms(row: EmailRow | EmailDetail, smsText: string) {
    const mobile = (row.recipientMobile || '').replace(/\D/g, '')
    if (!mobile) { setToast('No mobile number on file'); return }
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = `sms:${mobile}?body=${encodeURIComponent(smsText)}`
    } else {
      copyToClipboard(smsText, 'SMS text')
    }
  }

  async function handleWhatsApp(row: EmailRow | EmailDetail, waText: string) {
    const mobile = normaliseMobile(row.recipientMobile)
    if (!mobile) { setToast('No mobile number on file'); return }

    // Types with an approved template go out from the PRO GYM number via the API
    const apiKind = API_KIND_BY_TYPE[row.type]
    if (apiKind && row.clientId) {
      setToast('Sending on WhatsApp…')
      const res = await sendWhatsAppToClient(apiKind, { clientId: row.clientId })
      setToast(res.success ? '✅ Sent on WhatsApp from PRO GYM' : `❌ WhatsApp not sent: ${res.error}`)
      setTimeout(() => setToast(''), 3500)
      return
    }

    // ProCoin bonus/gift resends carry a custom amount — fall back to WhatsApp Web
    const text = encodeURIComponent(waText)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      // Native app deep-link — opens WhatsApp directly on Android/iOS
      window.location.href = `whatsapp://send?phone=${mobile}&text=${text}`
    } else {
      // Desktop: WhatsApp Web
      window.open(`https://wa.me/${mobile}?text=${text}`, '_blank', 'noopener,noreferrer')
    }
  }

  const rows = data?.rows ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Communications</h1>
            <p className="text-xs text-gray-400">
              {stats ? `${stats.overall.total} emails · ${stats.overall.sent} sent · ${stats.overall.failed} failed` : 'Loading…'}
            </p>
          </div>
          <button onClick={() => navigate('/whatsapp')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 border border-green-600 rounded-lg text-white hover:bg-green-700 transition-colors text-sm font-medium">
            WhatsApp
          </button>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
            Dashboard
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-10">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 py-2 min-w-max">
            {TAB_CONFIG.map(tab => {
              const isActive = activeTab === tab.value
              const count = tabCounts[tab.value] ?? 0
              return (
                <button
                  key={tab.value}
                  onClick={() => setParam('type', tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Date navigator — compact single row */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-3 px-2 py-2 flex items-center gap-1.5">
          <button
            onClick={() => setParam('date', shiftISO(isAllDates ? today : date, -1))}
            title="Previous day"
            className="w-8 h-9 flex-shrink-0 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="relative flex-1 min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 h-9 bg-gray-50 border border-gray-200 rounded-md pointer-events-none">
              <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-sm font-semibold text-gray-800 flex-1 truncate">
                {isAllDates ? 'All Dates' : prettyDateLabel(date)}
              </span>
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <input
              type="date"
              value={isAllDates ? '' : date}
              max={today}
              onChange={e => setParam('date', e.target.value || '')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Pick a date"
            />
          </div>

          <button
            onClick={() => setParam('date', shiftISO(isAllDates ? today : date, 1))}
            disabled={!isAllDates && date >= today}
            title="Next day"
            className="w-8 h-9 flex-shrink-0 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Today: only shown when not already on today (saves mobile space) */}
          {(isAllDates || date !== today) && (
            <button
              onClick={() => setParam('date', today)}
              title="Jump to today"
              className="flex-shrink-0 h-9 px-2.5 rounded-md bg-orange-50 text-orange-600 text-[11px] font-bold hover:bg-orange-100 active:bg-orange-200 transition-colors"
            >
              Today
            </button>
          )}

          <button
            onClick={() => setParam('date', isAllDates ? today : '')}
            title={isAllDates ? 'Switch to single-day view' : 'Show all dates'}
            className={`flex-shrink-0 h-9 px-2.5 rounded-md text-[11px] font-bold transition-colors ${
              isAllDates ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            All
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 px-4 py-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, mobile, or subject…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setParam('search', searchInput) }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {(['all', 'sent', 'failed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setParam('status', s)}
                className={`px-3 py-2 transition-colors ${statusF === s ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {s === 'all' ? 'All' : s === 'sent' ? '✓ Sent' : '✕ Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading && (
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="border-b border-gray-100 px-4 py-3 animate-pulse flex gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">😕</p>
            <p className="font-semibold text-gray-600">Could not load communications</p>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">📭</p>
            <p className="font-semibold text-gray-600">No emails found</p>
            <p className="text-sm mt-1">Try a different tab or clear filters</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl shadow-sm border border-gray-200 bg-white">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left font-bold text-gray-800">Date</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-800">Recipient</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-800">Type</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-800">Subject</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-800">Status</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const typeLabel = TAB_CONFIG.find(t => t.value === r.type)
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{formatDate(r.sentAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 text-sm">{r.recipientName || '—'}</p>
                          <p className="text-xs text-gray-400">{r.recipientEmail}</p>
                          {r.recipientMobile && <p className="text-xs text-gray-400">📞 {r.recipientMobile}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
                            {typeLabel?.icon} {typeLabel?.label ?? r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-gray-700 truncate">{r.subject}</p>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {r.status === 'sent'
                            ? <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">✓ SENT</span>
                            : <span title={r.errorMessage ?? ''} className="inline-block bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full">✕ FAILED</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openPreview(r.id)}
                              title="Preview email"
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                const r2 = await fetch(`${API_BASE}/emaillog/byId.php?id=${r.id}`)
                                const d: EmailDetail = await r2.json()
                                handleSms(r, d.smsText || r.subject)
                              }}
                              title="Send as SMS"
                              disabled={!r.recipientMobile}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                const r2 = await fetch(`${API_BASE}/emaillog/byId.php?id=${r.id}`)
                                const d: EmailDetail = await r2.json()
                                handleWhatsApp(r, d.whatsappText || r.subject)
                              }}
                              title="Send via WhatsApp"
                              disabled={!r.recipientMobile}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-50 hover:bg-green-100 text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden flex flex-col gap-3">
              {rows.map(r => {
                const typeLabel = TAB_CONFIG.find(t => t.value === r.type)
                return (
                  <div
                    key={r.id}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm p-3"
                    onClick={() => openPreview(r.id)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-[11px] font-semibold text-gray-700">
                        {typeLabel?.icon} {typeLabel?.label ?? r.type}
                      </span>
                      {r.status === 'sent'
                        ? <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ SENT</span>
                        : <span title={r.errorMessage ?? ''} className="inline-block bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">✕ FAILED</span>
                      }
                    </div>

                    <p className="font-semibold text-gray-800 text-sm leading-tight">{r.recipientName || '—'}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{r.recipientEmail}</p>
                    {r.recipientMobile && <p className="text-[11px] text-gray-500">📞 {r.recipientMobile}</p>}

                    <p className="text-xs text-gray-700 mt-2 line-clamp-2">{r.subject}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(r.sentAt)}</p>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={e => { e.stopPropagation(); openPreview(r.id) }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold active:bg-blue-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={async e => {
                          e.stopPropagation()
                          const r2 = await fetch(`${API_BASE}/emaillog/byId.php?id=${r.id}`)
                          const d: EmailDetail = await r2.json()
                          handleSms(r, d.smsText || r.subject)
                        }}
                        disabled={!r.recipientMobile}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold active:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        SMS
                      </button>
                      <button
                        onClick={async e => {
                          e.stopPropagation()
                          const r2 = await fetch(`${API_BASE}/emaillog/byId.php?id=${r.id}`)
                          const d: EmailDetail = await r2.json()
                          handleWhatsApp(r, d.whatsappText || r.subject)
                        }}
                        disabled={!r.recipientMobile}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-600 text-xs font-semibold active:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && !error && data && data.total > data.pageSize && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <p className="text-gray-500">Page {page} of {totalPages} · {data.total} total</p>
            <div className="flex gap-2">
              <button
                onClick={() => setParam('page', String(page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >Prev</button>
              <button
                onClick={() => setParam('page', String(page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {(preview || previewLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setPreview(null); setPreviewLoading(false) }}
        >
          <div
            className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-bold">Email Preview</p>
                <h3 className="font-bold text-gray-800 text-sm truncate">{preview?.subject ?? 'Loading…'}</h3>
                {preview && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    To {preview.recipientName} · {preview.recipientEmail}
                    {preview.recipientMobile ? ` · ${preview.recipientMobile}` : ''}
                  </p>
                )}
              </div>
              <button onClick={() => { setPreview(null); setPreviewLoading(false) }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
            </div>

            <div className="overflow-y-auto flex-1">
              {previewLoading && <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>}
              {preview && (
                <>
                  <iframe
                    title="Email body"
                    srcDoc={preview.bodyHtml || '<p style="font-family:sans-serif;color:#888;padding:20px">No body</p>'}
                    sandbox=""
                    className="w-full h-[60vh] sm:h-[500px]"
                    style={{ border: 'none' }}
                  />
                  <div className="p-5 border-t border-gray-100 space-y-4 bg-gray-50">
                    {preview.smsText && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">SMS Text</p>
                          <button
                            onClick={() => copyToClipboard(preview.smsText, 'SMS text')}
                            className="text-xs text-blue-600 hover:underline"
                          >Copy</button>
                        </div>
                        <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans">{preview.smsText}</pre>
                      </div>
                    )}
                    {preview.whatsappText && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">WhatsApp Text</p>
                          <button
                            onClick={() => copyToClipboard(preview.whatsappText, 'WhatsApp text')}
                            className="text-xs text-blue-600 hover:underline"
                          >Copy</button>
                        </div>
                        <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans">{preview.whatsappText}</pre>
                      </div>
                    )}
                    {preview.status === 'failed' && preview.errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                        <p className="font-bold mb-1">Send failed</p>
                        <p>{preview.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {preview && (
              <div className="px-5 py-3 border-t border-gray-100 bg-white flex gap-2 justify-end flex-shrink-0">
                <button
                  onClick={() => handleSms(preview, preview.smsText)}
                  disabled={!preview.recipientMobile}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  💬 Send as SMS
                </button>
                <button
                  onClick={() => handleWhatsApp(preview, preview.whatsappText)}
                  disabled={!preview.recipientMobile}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  📱 Send via WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
