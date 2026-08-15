import { useEffect, useMemo, useState } from 'react'
import { API_BASE } from '../api/config'

type Role = 'admin' | 'caller'
type Session = { username: string; password: string; role: Role; groupIndex: number | null; totalGroups: number }
type Row = {
  client_id: number
  name: string
  mobile: string
  is_gym_client: 'yes' | 'no'
  called_done: 'yes' | 'no'
  comments: string
  updated_by: string | null
  updated_at: string | null
}

const SESSION_KEY = 'wc_call_session_v1'

// Bilingual (English + Marathi) message used for WhatsApp shares.
// {name} is replaced with the member's first name.
const SHARE_TEMPLATE =
  'Hi {name}! 🏆 LAST CHANCE to join ProGym Knockout Bonanza — FIFA World Cup 2026 FINAL: 🇪🇸 Spain vs Argentina 🇦🇷, Mon 20 Jul at 00:30 AM IST. Predict early and win! Submit before 12:15 AM: https://progym.co.in/wc2026/knockout-bonanza\n\n' +
  'नमस्कार {name}! 🏆 ProGym Knockout Bonanza ची शेवटची संधी — FIFA World Cup 2026 अंतिम सामना: 🇪🇸 Spain vs Argentina 🇦🇷, सोमवार २० जुलै पहाटे १२:३० (IST). लवकर अंदाज लावा आणि जिंका! १२:१५ पूर्वी सबमिट करा: https://progym.co.in/wc2026/knockout-bonanza'

// Bilingual (English + Marathi) SMS template — used as the default body when opening the SMS app.
const SMS_TEMPLATE_MR =
  'Hi {name}! 🏆 LAST CHANCE — ProGym Knockout Bonanza. WC 2026 FINAL: Spain vs Argentina, Mon 20 Jul 00:30 AM IST. Predict early and win! Submit before 12:15 AM: https://progym.co.in/wc2026/knockout-bonanza\n\n' +
  'नमस्कार {name}! 🏆 ProGym Knockout Bonanza ची शेवटची संधी. WC 2026 अंतिम: Spain vs Argentina, सोम २० जुलै पहाटे १२:३० (IST). लवकर अंदाज लावा आणि जिंका! १२:१५ पूर्वी सबमिट करा: https://progym.co.in/wc2026/knockout-bonanza'

function buildShareText(fullName: string): string {
  const first = (fullName || '').trim().split(/\s+/)[0] || 'there'
  return SHARE_TEMPLATE.split('{name}').join(first)
}

function buildSmsText(fullName: string): string {
  const first = (fullName || '').trim().split(/\s+/)[0] || 'मित्रा'
  return SMS_TEMPLATE_MR.replace('{name}', first)
}

// Normalize a phone number into international format for sms:/wa.me links.
// Strips non-digits; assumes India (+91) when 10 digits with no country code.
function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return '91' + digits
  return digits
}

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch { return null }
}
function saveSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else   window.localStorage.removeItem(SESSION_KEY)
  } catch { /* ignore */ }
}

export default function CallListPage() {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  if (!session) return <LoginScreen onLogin={s => { saveSession(s); setSession(s) }} />
  return <ListScreen session={session} onLogout={() => { saveSession(null); setSession(null) }} />
}

function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState('')
  const [busy, setBusy]         = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await fetch(`${API_BASE}/wc_calls/login.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`)
      const j = await r.json()
      if (!r.ok || !j?.ok) throw new Error(j?.message || 'Login failed')
      onLogin({
        username,
        password,
        role: j.role,
        groupIndex: j.group_index,
        totalGroups: j.total_groups,
      })
    } catch (e: any) {
      setErr(e?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-xl font-black text-gray-900">Bonanza call list</h1>
        <p className="text-xs text-gray-500">Sign in to view your assigned group.</p>
        <input
          type="text" autoCapitalize="none" autoCorrect="off"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Username" value={username} onChange={e => setUsername(e.target.value.trim())}
        />
        <input
          type="password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Password" value={password} onChange={e => setPassword(e.target.value.trim())}
        />
        {err && <p className="text-xs text-red-600">{err}</p>}
        <button
          type="submit" disabled={busy || !username || !password}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg disabled:opacity-40"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

type Tab = number | 'overview'

function ListScreen({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const isAdmin   = session.role === 'admin'
  const [tab, setTab]       = useState<Tab>(isAdmin ? 'overview' : (session.groupIndex ?? 0))
  const [rows, setRows]     = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    if (tab === 'overview') return
    setLoading(true)
    const url = `${API_BASE}/wc_calls/list.php?username=${encodeURIComponent(session.username)}&password=${encodeURIComponent(session.password)}&group_index=${tab}`
    fetch(url)
      .then(r => r.json())
      .then(j => { if (j?.ok) setRows(j.rows || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, session.username, session.password])

  async function save(row: Row, patch: Partial<Pick<Row, 'called_done' | 'comments'>>) {
    const next: Row = { ...row, ...patch }
    setRows(rs => rs.map(r => r.client_id === row.client_id ? next : r))
    setSavingId(row.client_id)
    try {
      await fetch(`${API_BASE}/wc_calls/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: session.username,
          password: session.password,
          client_id: row.client_id,
          called_done: next.called_done,
          comments: next.comments,
        }),
      })
    } finally {
      setSavingId(null)
    }
  }

  const calledCount = useMemo(() => rows.filter(r => r.called_done === 'yes').length, [rows])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-black text-gray-900">Bonanza call list</h1>
            <p className="text-[11px] text-gray-500">
              Signed in as <b>{session.username}</b> ({session.role}) ·{' '}
              {tab === 'overview' ? 'Overview' : `Group ${tab + 1} of ${session.totalGroups}`}
            </p>
          </div>
          <button onClick={onLogout} className="text-xs text-gray-600 underline">Logout</button>
        </div>
        {isAdmin && (
          <div className="max-w-5xl mx-auto px-2 pb-2 overflow-x-auto">
            <div className="flex gap-1">
              <button
                onClick={() => setTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${tab === 'overview' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Overview
              </button>
              {Array.from({ length: session.totalGroups }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${i === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Group {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-3">
        {tab === 'overview' ? (
          <AdminOverview session={session} />
        ) : loading ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No members in this group.</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">Called {calledCount} of {rows.length}</p>
            {rows.map(r => (
              <CallRow key={r.client_id} row={r} saving={savingId === r.client_id} onSave={save} />
            ))}
          </>
        )}
      </main>
    </div>
  )
}

type Caller = {
  username: string
  password: string
  group_index: number
  total_in_group: number
  called_count: number
  shared_with: string | null
}

const SHARE_URL = 'https://progym.co.in/wc2026/calls'

function AdminOverview({ session }: { session: Session }) {
  const [callers, setCallers] = useState<Caller[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/wc_calls/adminOverview.php?username=${encodeURIComponent(session.username)}&password=${encodeURIComponent(session.password)}`)
      .then(r => r.json())
      .then(j => { if (j?.ok) setCallers(j.callers || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session.username, session.password])

  async function share(c: Caller) {
    const text =
      `🏆 WC Bonanza call list\n` +
      `URL: ${SHARE_URL}\n` +
      `Username: ${c.username}\n` +
      `Password: ${c.password}\n\n` +
      `कसे वापरावे:\n` +
      `1. वरील लिंक उघडा आणि username व password टाकून लॉगिन करा.\n` +
      `2. तुमच्या ग्रुपमधील प्रत्येक व्यक्तीला 📞 Call बटणावर क्लिक करून कॉल करा. डिफॉल्ट मेसेजसह SMS पाठवण्यासाठी 💬 SMS दाबा, आणि WhatsApp मेसेज पाठवण्यासाठी 🟢 WhatsApp दाबा.\n` +
      `3. कॉल पूर्ण झाल्यावर चेकबॉक्सवर क्लिक करून "done" म्हणून मार्क करा आणि गरज असल्यास नोट्स लिहा.\n\n` +
      `How to use:\n` +
      `1. Open the link above and sign in with the username & password.\n` +
      `2. For each person in your group, tap 📞 Call to call them, 💬 SMS to send the default SMS, or 🟢 WhatsApp to send a WhatsApp message.\n` +
      `3. Once done, tick the checkbox to mark as done and add any notes if needed.\n\n` +
      `धन्यवाद! 🙏 / Thank you! 🙏`
    // Copy first so admin can paste into the chat after picking a contact,
    // then open WhatsApp's contact picker in a new tab.
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
    }
    setCopiedId(c.username)
    setTimeout(() => setCopiedId(p => p === c.username ? null : p), 1800)
    // whatsapp:// scheme launches the installed WhatsApp app on mobile
    // (contact picker with the text pre-filled). On desktop navigates to
    // WhatsApp Web in the same tab.
    const encoded = encodeURIComponent(text)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    window.location.href = isMobile
      ? `whatsapp://send?text=${encoded}`
      : `https://web.whatsapp.com/send?text=${encoded}`
  }

  async function saveSharedWith(target: string, name: string) {
    setCallers(prev => prev.map(p => p.username === target ? { ...p, shared_with: name || null } : p))
    try {
      await fetch(`${API_BASE}/wc_calls/setSharedWith.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: session.username,
          password: session.password,
          target_username: target,
          shared_with: name,
        }),
      })
    } catch { /* ignore — optimistic */ }
  }

  const totalCalled = callers.reduce((s, c) => s + c.called_count, 0)
  const totalAll    = callers.reduce((s, c) => s + c.total_in_group, 0)

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500">Overall progress</p>
        <p className="text-2xl font-black text-gray-900 tabular-nums">{totalCalled} / {totalAll}</p>
        <p className="text-[11px] text-gray-400">members called</p>
      </div>

      <BonanzaGateConfig session={session} />

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
      ) : (
        callers.map(c => (
          <CallerRow
            key={c.username}
            caller={c}
            copied={copiedId === c.username}
            onShare={share}
            onSaveSharedWith={saveSharedWith}
          />
        ))
      )}
    </div>
  )
}

function CallerRow({
  caller, copied, onShare, onSaveSharedWith,
}: {
  caller: Caller
  copied: boolean
  onShare: (c: Caller) => void
  onSaveSharedWith: (target: string, name: string) => void
}) {
  const [name, setName] = useState(caller.shared_with || '')
  useEffect(() => { setName(caller.shared_with || '') }, [caller.shared_with])

  const pct = caller.total_in_group > 0
    ? Math.round((caller.called_count / caller.total_in_group) * 100)
    : 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">
            {caller.username} <span className="text-gray-400 font-normal">· Group {caller.group_index + 1}</span>
          </p>
          <p className="text-[11px] text-gray-500 font-mono">pwd: {caller.password}</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => { if (name !== (caller.shared_with || '')) onSaveSharedWith(caller.username, name) }}
            placeholder="Shared with… (friend name)"
            className="mt-1.5 w-full border border-gray-200 rounded-md px-2 py-1 text-xs"
          />
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-gray-500 tabular-nums w-16 text-right">{caller.called_count} / {caller.total_in_group}</p>
          </div>
        </div>
        <button
          onClick={() => onShare(caller)}
          className="shrink-0 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg active:scale-[0.98]"
        >
          {copied ? '✓ Copied' : 'Share'}
        </button>
      </div>
    </div>
  )
}

function BonanzaGateConfig({ session }: { session: Session }) {
  const [value, setValue]   = useState<string>('')
  const [current, setCurrent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/wc_config/get.php?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        const n = Number(j?.menuGate?.minFootballPoints ?? 0)
        setCurrent(n)
        setValue(String(n))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    const n = parseInt(value, 10)
    if (isNaN(n) || n < 0) { setMsg({ ok: false, text: 'Enter a whole number ≥ 0' }); return }
    setSaving(true); setMsg(null)
    try {
      const r = await fetch(`${API_BASE}/wc_config/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: session.username,
          password: session.password,
          minFootballPoints: n,
        }),
      })
      const j = await r.json()
      if (!r.ok || !j?.ok) throw new Error(j?.message || 'Save failed')
      setCurrent(n)
      setMsg({ ok: true, text: `Saved. Users with ≤ ${n} pts will see Bonanza-only menu on next refresh.` })
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const dirty = String(current ?? '') !== value.trim()

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-bold text-gray-900">Bonanza-only gate</p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        Users whose regular football points are <b>≤</b> this number see only the Bonanza &amp; Profile tabs.
      </p>
      {loading ? (
        <p className="text-xs text-gray-400 mt-3">Loading current value…</p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <label className="text-[11px] text-gray-500 shrink-0">minFootballPoints</label>
          <input
            type="number" min={0}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm tabular-nums"
          />
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {current !== null && !dirty && <span className="text-[11px] text-gray-400">(current: {current})</span>}
        </div>
      )}
      {msg && (
        <p className={`text-[11px] mt-2 ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>
      )}
    </div>
  )
}

function CallRow({ row, saving, onSave }: { row: Row; saving: boolean; onSave: (row: Row, patch: Partial<Pick<Row, 'called_done' | 'comments'>>) => void }) {
  const [comments, setComments] = useState(row.comments)

  useEffect(() => { setComments(row.comments) }, [row.comments])

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3 ${row.called_done === 'yes' ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.called_done === 'yes'}
          onChange={e => onSave(row, { called_done: e.target.checked ? 'yes' : 'no' })}
          className="mt-1 w-5 h-5 shrink-0"
          aria-label="Mark as called"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-gray-900 truncate">{row.name}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.is_gym_client === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {row.is_gym_client === 'yes' ? 'Member' : 'Non-member'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <a href={`tel:${row.mobile}`} className="text-xs text-blue-600 font-mono">{row.mobile || '—'}</a>
            {row.mobile && (() => {
              const intl    = normalizePhone(row.mobile)
              const waMsg   = encodeURIComponent(buildShareText(row.name))
              const smsMsg  = encodeURIComponent(buildSmsText(row.name))
              return (
                <>
                  <a
                    href={`tel:${row.mobile}`}
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 active:scale-95"
                  >
                    📞 Call
                  </a>
                  <a
                    href={`sms:+${intl}?body=${smsMsg}`}
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 active:scale-95"
                  >
                    💬 SMS
                  </a>
                  <a
                    href={`https://wa.me/${intl}?text=${waMsg}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 active:scale-95"
                  >
                    🟢 WhatsApp
                  </a>
                </>
              )
            })()}
          </div>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            onBlur={() => { if (comments !== row.comments) onSave(row, { comments }) }}
            placeholder="Notes / comments…"
            rows={2}
            className="mt-2 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          />
          {row.updated_by && row.updated_at && (
            <p className="text-[10px] text-gray-400 mt-1">Last updated by {row.updated_by} · {row.updated_at}{saving ? ' · saving…' : ''}</p>
          )}
        </div>
      </div>
    </div>
  )
}
