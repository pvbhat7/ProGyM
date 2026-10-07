import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { useAuth } from '../context/AuthContext'

type Audience = 'all' | 'active' | 'inactive' | 'male' | 'female' | 'client'

const AUDIENCES: { value: Audience; label: string; desc: string }[] = [
  { value: 'active',   label: 'Active members',   desc: 'Profile enabled' },
  { value: 'all',      label: 'Everyone',         desc: 'All registered users' },
  { value: 'inactive', label: 'Inactive members', desc: 'Profile disabled / expired' },
  { value: 'male',     label: 'Active · Male',    desc: '' },
  { value: 'female',   label: 'Active · Female',  desc: '' },
  { value: 'client',   label: 'One member',       desc: 'Search by name' },
]

const LINKS: { value: string; label: string }[] = [
  { value: '',                     label: 'No link (opens dashboard)' },
  { value: '/member-packages',     label: 'My Packages' },
  { value: '/member-procoins',     label: 'ProCoins' },
  { value: '/member-referral',     label: 'Refer & Earn' },
  { value: '/member-attendance',   label: 'Attendance' },
  { value: '/member-before-after', label: 'Before / After' },
  { value: '/member-profile',      label: 'Profile' },
  { value: 'custom',               label: 'Custom URL…' },
]

const TITLE_MAX = 80
const PUSH_MESSAGE_MAX = 250
const WA_MESSAGE_MAX = 900

interface Reach { members: number; membersWithPush: number; devices: number }
interface WaPreview {
  recipients: number; skipped: number; pricePerMsg: number
  dailyCap: number; sentToday: number; pendingQueue: number; testMode: boolean
}
interface WaResult { success: boolean; message?: string; id?: number; queued?: number; skipped?: number }

// How many calendar days a WhatsApp blast of `count` needs under the daily cap
function waDays(count: number, p: WaPreview): number {
  const todayRoom = Math.max(0, p.dailyCap - p.sentToday - p.pendingQueue)
  if (count <= todayRoom) return 1
  return 1 + Math.ceil((count - todayRoom) / Math.max(1, p.dailyCap))
}
interface Member { id: string; name: string; mobile: string }
interface Broadcast {
  id: string; title: string; message: string; image: string | null; link: string | null
  audience: Audience; audienceValue: string | null; clientName: string | null
  recipients: string; devices: string; pushSent: string; pushFailed: string
  createdBy: string | null; createdAt: string
}
interface SendResult {
  success: boolean; message?: string; recipients?: number; devices?: number
  pushSent?: number; pushFailed?: number; pushError?: string | null
}

function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = ev => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const maxDim = 1024
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
          else { width = Math.round(width * maxDim / height); height = maxDim }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

function audienceLabel(b: Broadcast): string {
  if (b.audience === 'client') return b.clientName ? `👤 ${b.clientName}` : `👤 #${b.audienceValue}`
  return AUDIENCES.find(a => a.value === b.audience)?.label ?? b.audience
}

export default function AdminPushPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle]       = useState('')
  const [message, setMessage]   = useState('')
  const [image, setImage]       = useState('')
  const [linkChoice, setLinkChoice] = useState('')
  const [customLink, setCustomLink] = useState('')
  const [audience, setAudience] = useState<Audience>('active')
  const [member, setMember]     = useState<Member | null>(null)

  const [search, setSearch]           = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [reachState, setReachState]   = useState<{ key: string; data: Reach } | null>(null)
  const [sending, setSending]         = useState(false)
  const [result, setResult]           = useState<SendResult | null>(null)
  const [waResult, setWaResult]       = useState<WaResult | null>(null)
  const [tab, setTab]                 = useState<'send' | 'devices' | 'log' | 'whatsapp'>('send')
  const [viaPush, setViaPush]         = useState(true)
  const [viaWa, setViaWa]             = useState(false)

  const messageMax = viaPush ? PUSH_MESSAGE_MAX : WA_MESSAGE_MAX
  const link = linkChoice === 'custom' ? customLink.trim() : linkChoice
  const linkValid = !viaPush || linkChoice !== 'custom' || /^https:\/\/\S+$/i.test(link)
  const audienceReady = audience !== 'client' || member !== null
  const canSend = (viaPush || viaWa)
    && (!viaPush || title.trim() !== '')
    && message.trim() !== '' && message.length <= messageMax
    && linkValid && audienceReady && !sending

  // WhatsApp reach + cost estimate
  const waKey = viaWa && audienceReady ? `${audience}:${member?.id ?? ''}` : ''
  const [waPreviewState, setWaPreviewState] = useState<{ key: string; data: WaPreview } | null>(null)
  const waPreview = waPreviewState?.key === waKey ? waPreviewState.data : null
  useEffect(() => {
    if (!waKey) return
    const [aud, value] = waKey.split(':')
    fetch(`${API_BASE}/whatsapp/broadcastPreview.php?audience=${aud}&value=${encodeURIComponent(value)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: WaPreview | null) => { if (data) setWaPreviewState({ key: waKey, data }) })
      .catch(() => {})
  }, [waKey])
  const waCost = waPreview ? Math.round(waPreview.recipients * waPreview.pricePerMsg) : 0

  // Reach estimate for the selected audience (keyed so a stale count never shows)
  const reachKey = audienceReady ? `${audience}:${member?.id ?? ''}` : ''
  const reach = reachState?.key === reachKey ? reachState.data : null
  useEffect(() => {
    if (!reachKey) return
    const [aud, value] = reachKey.split(':')
    fetch(`${API_BASE}/push/audienceCount.php?audience=${aud}&value=${encodeURIComponent(value)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: Reach | null) => { if (data) setReachState({ key: reachKey, data }) })
      .catch(() => {})
  }, [reachKey])

  // Debounced member search
  const searchActive = audience === 'client' && search.trim().length >= 2
  const visibleResults = searchActive ? searchResults : []
  useEffect(() => {
    if (!searchActive) return
    const t = setTimeout(() => {
      fetch(`${API_BASE}/client/byName.php?name=${encodeURIComponent(search.trim())}`)
        .then(r => r.ok ? r.json() : [])
        .then((d: Record<string, string>[]) =>
          setSearchResults(Array.isArray(d) ? d.slice(0, 8).map(c => ({ id: String(c.id), name: c.name, mobile: c.mobile || '' })) : []))
        .catch(() => setSearchResults([]))
    }, 400)
    return () => clearTimeout(t)
  }, [search, searchActive])

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { setImage(await compressToBase64(file)) } catch { alert('Could not read that image.') }
  }

  async function send() {
    if (!canSend) return
    const who = audience === 'client'
      ? member!.name
      : `${AUDIENCES.find(a => a.value === audience)!.label}${reach ? ` (${reach.members} members)` : ''}`
    const lines = [`Send to ${who}?`, '']
    if (viaPush) lines.push('🔔 App push notification — free')
    if (viaWa && waPreview) {
      const days = waDays(waPreview.recipients, waPreview)
      lines.push(`💬 WhatsApp to ${waPreview.recipients} members — approx. ₹${waCost}` +
        (days > 1 ? `, spread over ${days} days (daily limit ${waPreview.dailyCap})` : ''))
    }
    if (!window.confirm(lines.join('\n'))) return

    const audienceValue = audience === 'client' ? member!.id : undefined
    const createdBy = user?.userName || user?.mobile || 'admin'
    setSending(true)
    setResult(null)
    setWaResult(null)

    let pushJson: (SendResult & { id?: number; image?: string | null }) | null = null
    if (viaPush) {
      try {
        const res = await fetch(`${API_BASE}/push/send.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), message: message.trim(),
            image: image || undefined, link: link || undefined,
            audience, audienceValue, createdBy,
          }),
        })
        pushJson = await res.json().catch(() => ({ success: false, message: `HTTP ${res.status}` }))
      } catch {
        pushJson = { success: false, message: 'Network error — please try again.' }
      }
      setResult(pushJson)
    }

    let waJson: WaResult | null = null
    if (viaWa) {
      try {
        const res = await fetch(`${API_BASE}/whatsapp/broadcast.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), message: message.trim(),
            // reuse the image push already uploaded; otherwise upload it with the WhatsApp broadcast
            imageUrl: pushJson?.image || undefined,
            image: pushJson?.image ? undefined : (image || undefined),
            audience, audienceValue, createdBy,
            pushBroadcastId: pushJson?.id,
          }),
        })
        waJson = await res.json().catch(() => ({ success: false, message: `HTTP ${res.status}` }))
      } catch {
        waJson = { success: false, message: 'Network error — please try again.' }
      }
      setWaResult(waJson)
    }

    const allOk = (!viaPush || pushJson?.success) && (!viaWa || waJson?.success)
    if (allOk) {
      setTitle(''); setMessage(''); setImage(''); setLinkChoice(''); setCustomLink('')
    }
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">Broadcast</h1>
            <p className="text-xs text-gray-400">Send app notifications and WhatsApp messages to members</p>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {([['send', '✏️ Send'], ['log', '🔔 Push log'], ['whatsapp', '💬 WhatsApp log'], ['devices', '📱 Devices']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === value ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'devices' && <DevicesTab />}
      {tab === 'log' && <DeliveryLogTab />}
      {tab === 'whatsapp' && <WhatsAppLogTab />}

      {tab === 'send' && (
      <main className="max-w-5xl mx-auto px-4 py-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── Compose ── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1.5">Send via</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['push', '🔔', 'App push', 'Free'],
                ['wa', '💬', 'WhatsApp', 'From PRO GYM'],
                ['both', '📣', 'Both', 'Important notices'],
              ] as const).map(([value, icon, label, sub]) => {
                const selected = value === 'both' ? viaPush && viaWa : value === 'push' ? viaPush && !viaWa : viaWa && !viaPush
                return (
                  <button
                    key={value}
                    onClick={() => { setViaPush(value !== 'wa'); setViaWa(value !== 'push') }}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors ${selected ? (value === 'push' ? 'border-orange-400 bg-orange-50' : 'border-green-500 bg-green-50') : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <p className="text-sm font-semibold text-gray-800">{icon} {label}</p>
                    <p className="text-[11px] text-gray-400">{sub}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="flex justify-between text-sm font-semibold text-gray-700 mb-1.5">
              <span>Title {!viaPush && <span className="font-normal text-xs text-gray-400">(optional — shown in bold on WhatsApp)</span>}</span>
              <span className="font-normal text-xs text-gray-400">{title.length}/{TITLE_MAX}</span>
            </label>
            <input
              value={title}
              maxLength={TITLE_MAX}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Diwali offer 🎉"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm font-semibold text-gray-700 mb-1.5">
              Message <span className={`font-normal text-xs ${message.length > messageMax ? 'text-red-500' : 'text-gray-400'}`}>{message.length}/{messageMax}</span>
            </label>
            <textarea
              value={message}
              maxLength={messageMax}
              rows={viaPush ? 3 : 5}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Get 20% off on 6-month plans. Offer valid till Sunday."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            {viaWa && (
              <p className="mt-1 text-[11px] text-gray-400">WhatsApp shows the message as one paragraph — line breaks are removed.</p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1.5">Image <span className="font-normal text-xs text-gray-400">(optional · landscape 2:1 looks best)</span></p>
            {image ? (
              <div className="relative">
                <img src={image} alt="" className="w-full max-h-56 object-cover rounded-xl border border-gray-100" />
                <button
                  onClick={() => setImage('')}
                  className="absolute top-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black/75"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 h-28 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm cursor-pointer hover:border-orange-300 hover:text-orange-500">
                <span className="text-2xl">🖼️</span>
                Choose image
                <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              </label>
            )}
          </div>

          {viaPush && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1.5">When tapped, open <span className="font-normal text-xs text-gray-400">(push only)</span></p>
            <select
              value={linkChoice}
              onChange={e => setLinkChoice(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {LINKS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            {linkChoice === 'custom' && (
              <input
                value={customLink}
                onChange={e => setCustomLink(e.target.value)}
                placeholder="https://…"
                className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${customLink && !linkValid ? 'border-red-300' : 'border-gray-200'}`}
              />
            )}
          </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1.5">Send to</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AUDIENCES.map(a => (
                <button
                  key={a.value}
                  onClick={() => { setAudience(a.value); if (a.value !== 'client') setMember(null) }}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${audience === a.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <p className="text-sm font-semibold text-gray-800">{a.label}</p>
                  {a.desc && <p className="text-[11px] text-gray-400">{a.desc}</p>}
                </button>
              ))}
            </div>

            {audience === 'client' && (
              <div className="mt-3">
                {member ? (
                  <div className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
                    <p className="text-sm text-gray-800"><b>{member.name}</b> <span className="text-gray-500">· {member.mobile} · #{member.id}</span></p>
                    <button onClick={() => setMember(null)} className="text-xs font-semibold text-orange-600 hover:underline">Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Type member name…"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    {visibleResults.length > 0 && (
                      <ul className="mt-1 rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                        {visibleResults.map(m => (
                          <li key={m.id}>
                            <button
                              onClick={() => { setMember(m); setSearch(''); setSearchResults([]) }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {m.name} <span className="text-gray-400">· {m.mobile} · #{m.id}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}

            {viaPush && reach && (
              <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                🔔 Reaches <b>{reach.members}</b> member{reach.members === 1 ? '' : 's'} in the in-app inbox ·{' '}
                <b>{reach.membersWithPush}</b> with browser push on <b>{reach.devices}</b> device{reach.devices === 1 ? '' : 's'}
              </p>
            )}
            {viaWa && waPreview && (
              <div className="mt-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-xs text-green-900 leading-relaxed">
                💬 WhatsApp to <b>{waPreview.recipients}</b> member{waPreview.recipients === 1 ? '' : 's'}
                {waPreview.skipped > 0 && <span className="text-green-700"> ({waPreview.skipped} skipped — no valid / duplicate mobile)</span>}
                {' · '}approx. <b>₹{waCost}</b> <span className="text-green-700">(₹{waPreview.pricePerMsg} each)</span>
                {waDays(waPreview.recipients, waPreview) > 1 && (
                  <p className="mt-1 text-amber-700">
                    ⏳ Daily limit is {waPreview.dailyCap} messages — this will be sent over <b>{waDays(waPreview.recipients, waPreview)} days</b> automatically.
                  </p>
                )}
                {waPreview.pendingQueue > 0 && (
                  <p className="mt-1 text-green-700">{waPreview.pendingQueue} messages from earlier broadcasts are still queued ahead of this one.</p>
                )}
                {waPreview.testMode && <p className="mt-1 text-amber-700">🧪 Test mode — only allowed test numbers will actually receive it.</p>}
              </div>
            )}
          </div>

          {waResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${waResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {waResult.success
                ? <>💬 WhatsApp queued for <b>{waResult.queued}</b> member{waResult.queued === 1 ? '' : 's'} — sending now. Track progress in the <button onClick={() => setTab('whatsapp')} className="underline font-semibold">WhatsApp log</button>.</>
                : <>❌ WhatsApp: {waResult.message || 'Failed to queue.'}</>}
            </div>
          )}

          {result && (
            <div className={`rounded-xl px-4 py-3 text-sm ${result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.success ? (
                <>
                  ✅ Sent to <b>{result.recipients}</b> inbox{result.recipients === 1 ? '' : 'es'} · push delivered to{' '}
                  <b>{result.pushSent}</b>/{result.devices} device{result.devices === 1 ? '' : 's'}
                  {!!result.pushFailed && <span className="text-amber-700"> ({result.pushFailed} failed)</span>}
                  {result.pushError && <p className="mt-1 text-xs text-red-600">Push error: {result.pushError}</p>}
                </>
              ) : (
                <>❌ {result.message || 'Failed to send.'}</>
              )}
            </div>
          )}

          <button
            onClick={send}
            disabled={!canSend}
            className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending…' : viaPush && viaWa ? 'Send push + WhatsApp' : viaWa ? 'Send WhatsApp' : 'Send notification'}
          </button>
        </section>

        {/* ── Preview + history ── */}
        <aside className="space-y-5">
          {viaWa && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">WhatsApp preview</p>
              <div className="rounded-2xl p-3" style={{ background: '#efeae2' }}>
                <div className="max-w-[92%] rounded-lg rounded-tl-none bg-white shadow-sm overflow-hidden">
                  {image && <img src={image} alt="" className="w-full aspect-[2/1] object-cover" />}
                  <div className="px-3 py-2 text-[13px] text-gray-800 leading-snug break-words">
                    <p>📢 <b>Message from Pro Gym, Kolhapur</b></p>
                    <p className="mt-2">Hi {member?.name ?? 'Rahul'},</p>
                    <p className="mt-2">
                      {title.trim() && <><b>{title.trim()}</b> — </>}
                      {message.trim().replace(/\s+/g, ' ') || 'Your message appears here.'}
                    </p>
                    <p className="mt-2">For any questions, call us or visit the gym.<br />– Team Pro Gym</p>
                    <p className="text-right text-[10px] text-gray-400 mt-1">PRO GYM</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viaPush && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Push preview</p>
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex gap-3 p-3">
                <img src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg" alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{title || 'Notification title'}</p>
                  <p className="text-xs text-gray-500 leading-snug whitespace-pre-line line-clamp-3">{message || 'Your message appears here.'}</p>
                </div>
              </div>
              {image && <img src={image} alt="" className="w-full aspect-[2/1] object-cover" />}
            </div>
            <p className="mt-2 text-[11px] text-gray-400 leading-snug">
              Images show on Chrome/Edge (Android, Windows). Safari, iPhone, Firefox and macOS show text only. The in-app inbox always shows the image.
            </p>
          </div>
          )}
        </aside>
      </main>
      )}
    </div>
  )
}

// ── WhatsApp broadcast log tab ──────────────────────────────────────────────

interface WaBroadcast {
  id: string; title: string; message: string; image: string | null
  audience: Audience; audienceValue: string | null; clientName: string | null
  createdBy: string | null; createdAt: string; status: 'queued' | 'sending' | 'done'
  total: string; skipped: string; sent: string; failed: string; pending: string
  delivered: string; readCount: string; failedAfterSend: string; lastError: string | null
}

function WhatsAppLogTab() {
  const [rows, setRows] = useState<WaBroadcast[] | null>(null)

  const load = useCallback(() => {
    fetch(`${API_BASE}/whatsapp/broadcasts.php`)
      .then(r => r.ok ? r.json() : { broadcasts: [] })
      .then(d => setRows(Array.isArray(d.broadcasts) ? d.broadcasts : []))
      .catch(() => setRows([]))
  }, [])
  useEffect(() => { load() }, [load])

  // Auto-refresh while something is still sending
  const active = rows?.some(r => r.status !== 'done')
  useEffect(() => {
    if (!active) return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [active, load])

  if (!rows) return <div className="max-w-5xl mx-auto px-4 py-5"><div className="h-40 rounded-2xl bg-white border border-gray-100 animate-pulse" /></div>

  return (
    <main className="max-w-5xl mx-auto px-4 py-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <b>Sent</b> = accepted by WhatsApp · <b className="text-green-600">Delivered</b> = reached the phone ·{' '}
          <b className="text-emerald-700">Read</b> = opened (only if the member has read receipts on) ·{' '}
          <b className="text-amber-600">Queued</b> = waiting for the next day's limit.
        </p>
        <button onClick={load} className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">↻ Refresh</button>
      </div>

      {rows.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No WhatsApp broadcasts yet.</p>}

      {rows.map(b => {
        const failed = Number(b.failed) + Number(b.failedAfterSend)
        return (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
            {b.image && <img src={b.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800 truncate">{b.title || b.message}</p>
                <span className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${b.status === 'done' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                  {b.status === 'done' ? 'Done' : 'Sending'}
                </span>
              </div>
              {b.title && <p className="text-xs text-gray-500 truncate">{b.message}</p>}
              <p className="mt-1 text-[11px] text-gray-400">
                {b.createdAt} · {audienceLabel({ ...b, link: null, recipients: '', devices: '', pushSent: '', pushFailed: '' })}
                {b.createdBy ? ` · by ${b.createdBy}` : ''}
                {Number(b.skipped) > 0 ? ` · ${b.skipped} skipped (no valid mobile)` : ''}
              </p>
              {b.lastError && failed > 0 && <p className="mt-1 text-[11px] text-red-600 truncate" title={b.lastError}>Last error: {b.lastError}</p>}
            </div>
            <div className="shrink-0 grid grid-cols-5 gap-3 text-center">
              <div><p className="text-sm font-bold text-gray-700">{b.sent}/{b.total}</p><p className="text-[10px] text-gray-400">Sent</p></div>
              <div><p className="text-sm font-bold text-green-600">{b.delivered}</p><p className="text-[10px] text-gray-400">Delivered</p></div>
              <div><p className="text-sm font-bold text-emerald-700">{b.readCount}</p><p className="text-[10px] text-gray-400">Read</p></div>
              <div><p className="text-sm font-bold text-amber-600">{b.pending}</p><p className="text-[10px] text-gray-400">Queued</p></div>
              <div><p className="text-sm font-bold text-red-600">{failed}</p><p className="text-[10px] text-gray-400">Failed</p></div>
            </div>
          </div>
        )
      })}
    </main>
  )
}

// ── Devices tab ─────────────────────────────────────────────────────────────

interface Device {
  id: string; clientId: string; name: string | null; mobile: string | null; userAgent: string | null
  isActive: string; createdAt: string; lastSeenAt: string; sent: string; delivered: string; clicked: string
}
interface DevicesResponse {
  summary: { activeDevices: number; activeMembers: number; inactiveDevices: number }
  devices: Device[]
}

// "iPhone · Safari", "Android · Chrome", "Windows · Edge" …
function describeDevice(ua: string | null): { icon: string; label: string } {
  if (!ua) return { icon: '❔', label: 'Unknown' }
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Other'
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : /iPhone|iPad/.test(ua) ? 'Home Screen app' : 'Browser'
  const icon = os === 'iPhone' || os === 'iPad' ? '🍎' : os === 'Android' ? '🤖' : '💻'
  return { icon, label: `${os} · ${browser}` }
}

function StatCard({ value, label, tone = 'text-gray-800' }: { value: number | string; label: string; tone?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function DevicesTab() {
  const [data, setData] = useState<DevicesResponse | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/push/devices.php`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData({ summary: { activeDevices: 0, activeMembers: 0, inactiveDevices: 0 }, devices: [] }))
  }, [])

  if (!data) return <div className="max-w-5xl mx-auto px-4 py-5"><div className="h-40 rounded-2xl bg-white border border-gray-100 animate-pulse" /></div>

  const rows = data.devices.filter(d => showInactive || d.isActive === 'yes')
  const byOs: Record<string, number> = {}
  data.devices.filter(d => d.isActive === 'yes').forEach(d => {
    const os = describeDevice(d.userAgent).label.split(' · ')[0]
    byOs[os] = (byOs[os] ?? 0) + 1
  })

  return (
    <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard value={data.summary.activeMembers} label="Members with push on" tone="text-orange-600" />
        <StatCard value={data.summary.activeDevices} label="Active devices" />
        <StatCard value={data.summary.inactiveDevices} label="Removed (logged out / expired)" tone="text-gray-400" />
      </div>
      {Object.keys(byOs).length > 0 && (
        <p className="text-xs text-gray-500">
          {Object.entries(byOs).map(([os, n]) => `${os}: ${n}`).join(' · ')}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Registered devices</p>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Show removed
          </label>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">No devices yet — members appear here after tapping “Allow notifications”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-2">Member</th>
                  <th className="text-left font-semibold px-4 py-2">Device</th>
                  <th className="text-left font-semibold px-4 py-2">Registered</th>
                  <th className="text-left font-semibold px-4 py-2">Last seen</th>
                  <th className="text-right font-semibold px-4 py-2" title="Accepted by Firebase / shown on device / tapped">Sent · Shown · Tapped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(d => {
                  const dev = describeDevice(d.userAgent)
                  return (
                    <tr key={d.id} className={d.isActive === 'yes' ? '' : 'opacity-50'}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800">{d.name ?? `#${d.clientId}`}</p>
                        <p className="text-xs text-gray-400">{d.mobile}</p>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap" title={d.userAgent ?? ''}>
                        {dev.icon} {dev.label}
                        {d.isActive !== 'yes' && <span className="ml-2 text-[10px] font-semibold uppercase text-red-500">removed</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{d.createdAt}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{d.lastSeenAt}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600 whitespace-nowrap">
                        {d.sent} · <span className="text-green-600">{d.delivered}</span> · <span className="text-blue-600">{d.clicked}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

// ── Delivery log tab ────────────────────────────────────────────────────────

interface Delivery {
  tokenId: string; clientId: string; name: string | null; mobile: string | null; userAgent: string | null
  status: 'sent' | 'failed'; error: string | null; sentAt: string; deliveredAt: string | null; clickedAt: string | null
}

function DeliveryLogTab() {
  const [history, setHistory] = useState<(Broadcast & { delivered: string; clicked: string })[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, Delivery[]>>({})

  const load = useCallback(() => {
    fetch(`${API_BASE}/push/history.php`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
  }, [])
  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    if (openId === id) { setOpenId(null); return }
    setOpenId(id)
    fetch(`${API_BASE}/push/deliveries.php?broadcastId=${id}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: Delivery[]) => setDetails(prev => ({ ...prev, [id]: Array.isArray(d) ? d : [] })))
      .catch(() => {})
  }

  if (!history) return <div className="max-w-5xl mx-auto px-4 py-5"><div className="h-40 rounded-2xl bg-white border border-gray-100 animate-pulse" /></div>

  return (
    <main className="max-w-5xl mx-auto px-4 py-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <b>Sent</b> = accepted by Firebase · <b className="text-green-600">Shown</b> = the phone confirmed it displayed the notification ·{' '}
          <b className="text-blue-600">Tapped</b> = member opened it. “Shown” can lag if the phone was offline or asleep.
        </p>
        <button onClick={load} className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">↻ Refresh</button>
      </div>

      {history.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Nothing sent yet.</p>}

      {history.map(b => {
        const isOpen = openId === b.id
        const rows = details[b.id]
        return (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => toggle(b.id)} className="w-full text-left p-4 flex gap-3 hover:bg-gray-50">
              {b.image && <img src={b.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{b.title}</p>
                <p className="text-xs text-gray-500 truncate">{b.message}</p>
                <p className="mt-1 text-[11px] text-gray-400">{b.createdAt} · {audienceLabel(b)}{b.createdBy ? ` · by ${b.createdBy}` : ''}</p>
              </div>
              <div className="shrink-0 grid grid-cols-4 gap-3 text-center">
                <div><p className="text-sm font-bold text-gray-700">{b.recipients}</p><p className="text-[10px] text-gray-400">Inbox</p></div>
                <div><p className="text-sm font-bold text-gray-700">{b.pushSent}/{b.devices}</p><p className="text-[10px] text-gray-400">Sent</p></div>
                <div><p className="text-sm font-bold text-green-600">{b.delivered}</p><p className="text-[10px] text-gray-400">Shown</p></div>
                <div><p className="text-sm font-bold text-blue-600">{b.clicked}</p><p className="text-[10px] text-gray-400">Tapped</p></div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                {!rows ? (
                  <div className="h-16 animate-pulse bg-gray-50" />
                ) : rows.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-gray-400">No devices were registered for this audience — delivered to in-app inbox only.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-left font-semibold px-4 py-2">Member</th>
                          <th className="text-left font-semibold px-4 py-2">Device</th>
                          <th className="text-left font-semibold px-4 py-2">Status</th>
                          <th className="text-left font-semibold px-4 py-2">Shown</th>
                          <th className="text-left font-semibold px-4 py-2">Tapped</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map(r => {
                          const dev = describeDevice(r.userAgent)
                          return (
                            <tr key={r.tokenId}>
                              <td className="px-4 py-2"><span className="font-medium text-gray-800">{r.name ?? `#${r.clientId}`}</span> <span className="text-gray-400">{r.mobile}</span></td>
                              <td className="px-4 py-2 whitespace-nowrap">{dev.icon} {dev.label}</td>
                              <td className="px-4 py-2">
                                {r.status === 'sent'
                                  ? <span className="font-semibold text-gray-600">✓ Sent</span>
                                  : <span className="font-semibold text-red-600" title={r.error ?? ''}>✗ Failed{r.error ? ` — ${r.error}` : ''}</span>}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">{r.deliveredAt ? <span className="text-green-600">✓ {r.deliveredAt}</span> : <span className="text-gray-300">—</span>}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{r.clickedAt ? <span className="text-blue-600">✓ {r.clickedAt}</span> : <span className="text-gray-300">—</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </main>
  )
}
