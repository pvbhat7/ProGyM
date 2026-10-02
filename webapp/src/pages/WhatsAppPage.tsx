import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

interface Template {
  name: string
  status: string
  category: string
  language: string
  rejectedReason: string | null
  body: string
}

interface TemplatesResponse {
  templates: Template[]
  enabled: boolean
  allowedNumbers: string[]
  testNumbers: string[]
  error?: string
}

interface LogRow {
  id: string
  clientId: string | null
  clientName: string | null
  mobile: string
  type: string
  template: string
  params: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  errorMessage: string | null
  sentAt: string
  updatedAt: string | null
}

const TEMPLATE_LABELS: Record<string, string> = {
  progym_membership_activated: '🏋 Welcome (membership activated)',
  progym_welcome:             '🏋 Welcome (old, marketing — unused)',
  progym_payment_receipt:     '💰 Payment receipt',
  progym_membership_reminder: '⏰ Membership reminder',
  progym_procoins_credited:   '🎉 ProCoins credited',
  progym_birthday:            '🎂 Birthday',
  progym_photo_reminder:      '📸 Photo reminder',
  progym_app_launch:          '🚀 App launch',
}

const TEMPLATE_STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING:  'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAUSED:   'bg-gray-200 text-gray-700',
  DISABLED: 'bg-gray-200 text-gray-700',
}

const LOG_STATUS_STYLE: Record<string, string> = {
  sent:      'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  read:      'bg-emerald-600 text-white',
  failed:    'bg-red-100 text-red-700',
}

function formatDate(s: string | null): string {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T'))
  if (isNaN(d.getTime())) return s
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function WhatsAppPage() {
  const navigate = useNavigate()

  const [tpl, setTpl]               = useState<TemplatesResponse | null>(null)
  const [tplLoading, setTplLoading] = useState(true)
  const [log, setLog]               = useState<LogRow[]>([])
  const [counts, setCounts]         = useState<Record<string, string>>({})
  const [logLoading, setLogLoading] = useState(true)
  const [statusF, setStatusF]       = useState('all')
  const [testMobile, setTestMobile] = useState('')
  const [sending, setSending]       = useState<Set<string>>(new Set())
  const [toast, setToast]           = useState('')

  const loadTemplates = useCallback(() => {
    setTplLoading(true)
    fetch(`${API_BASE}/whatsapp/templates.php`)
      .then(r => r.json())
      .then((d: TemplatesResponse) => {
        setTpl(d)
        if (d.testNumbers?.length) setTestMobile(prev => prev || d.testNumbers[0])
      })
      .catch(() => setTpl({ templates: [], enabled: false, allowedNumbers: [], testNumbers: [], error: 'Could not load templates' }))
      .finally(() => setTplLoading(false))
  }, [])

  const loadLog = useCallback(() => {
    setLogLoading(true)
    const qs = statusF !== 'all' ? `?status=${statusF}` : ''
    fetch(`${API_BASE}/whatsapp/log.php${qs}`)
      .then(r => r.json())
      .then(d => { setLog(d.rows || []); setCounts(d.counts || {}) })
      .catch(() => setLog([]))
      .finally(() => setLogLoading(false))
  }, [statusF])

  useEffect(() => { loadTemplates() }, [loadTemplates])
  useEffect(() => { loadLog() }, [loadLog])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  async function sendTest(template: string) {
    setSending(prev => new Set(prev).add(template))
    try {
      const r = await fetch(`${API_BASE}/whatsapp/sendTest.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, mobile: testMobile }),
      })
      const d = await r.json()
      showToast(d.success ? '✅ Sent — check WhatsApp on the test phone' : `❌ ${d.error || 'Send failed'}`)
      loadLog()
    } catch {
      showToast('❌ Network error')
    } finally {
      setSending(prev => { const next = new Set(prev); next.delete(template); return next })
    }
  }

  const restricted = (tpl?.allowedNumbers?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">WhatsApp</h1>
            <p className="text-xs text-gray-400">Templates, test sends and delivery log</p>
          </div>
          <button onClick={() => { loadTemplates(); loadLog() }} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium">
            ↻ Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">

        {/* Mode banner */}
        {tpl && (
          <div className={`rounded-xl px-4 py-3 text-sm ${
            !tpl.enabled ? 'bg-gray-100 text-gray-700'
            : restricted ? 'bg-amber-50 border border-amber-200 text-amber-800'
            : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {!tpl.enabled
              ? '⏸ WhatsApp sending is turned OFF.'
              : restricted
                ? <>🧪 <strong>Test mode</strong> — messages only go to: {tpl.allowedNumbers.map(n => '+' + n).join(', ')}. Other members get email only.</>
                : <>✅ <strong>Live</strong> — all members with a mobile number receive WhatsApp.</>}
          </div>
        )}

        {/* Templates */}
        <section className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <h2 className="font-semibold text-gray-800 flex-1">Message templates</h2>
            <label className="text-xs text-gray-500 flex items-center gap-2">
              Test number
              <select
                value={testMobile}
                onChange={e => setTestMobile(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700"
              >
                {(tpl?.testNumbers ?? []).map(n => <option key={n} value={n}>+{n}</option>)}
              </select>
            </label>
          </div>

          {tplLoading ? (
            <p className="p-4 text-sm text-gray-400">Loading…</p>
          ) : tpl?.error ? (
            <p className="p-4 text-sm text-red-600">{tpl.error}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tpl?.templates.map(t => (
                <li key={t.name} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 text-sm">{TEMPLATE_LABELS[t.name] ?? t.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TEMPLATE_STATUS_STYLE[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase">{t.category}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate" title={t.body}>{t.body.replace(/\n+/g, ' · ')}</p>
                    {t.rejectedReason && <p className="text-xs text-red-600">Rejected: {t.rejectedReason}</p>}
                  </div>
                  <button
                    onClick={() => sendTest(t.name)}
                    disabled={t.status !== 'APPROVED' || !testMobile || sending.has(t.name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors whitespace-nowrap"
                  >
                    {sending.has(t.name) ? 'Sending…' : 'Send test'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Log */}
        <section className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-800 flex-1">Sent messages</h2>
            {['all', 'sent', 'delivered', 'read', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusF(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusF === s ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {s}{s !== 'all' && counts[s] ? ` ${counts[s]}` : ''}
              </button>
            ))}
          </div>

          {logLoading ? (
            <p className="p-4 text-sm text-gray-400">Loading…</p>
          ) : log.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No WhatsApp messages yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {log.map(r => (
                <li key={r.id} className="px-4 py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{r.clientName || (r.type === 'test' ? 'Test' : '—')}</span>
                      <span className="text-gray-400"> · +{r.mobile}</span>
                    </p>
                    <p className="text-xs text-gray-500">{TEMPLATE_LABELS[r.template] ?? r.template}</p>
                    {r.errorMessage && <p className="text-xs text-red-600 break-words">{r.errorMessage}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${LOG_STATUS_STYLE[r.status] ?? 'bg-gray-100'}`}>
                      {r.status}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(r.sentAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
