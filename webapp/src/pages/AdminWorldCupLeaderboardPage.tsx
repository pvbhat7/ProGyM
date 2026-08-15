import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'

interface OverallEntry {
  rank: number
  client_id: string
  client_name: string | null
  client_photo: string | null
  client_mobile: string | null
  referral_code: string | null
  was_gym_client_at_join: string
  total_coins_earned: number
  total_matches_predicted: number
  predictions_placed: number
  joined_at: string | null
  sms_reminder_sent_at: string | null
  whatsapp_reminder_sent_at: string | null
  match_reminder_sms_sent_at: string | null
  match_reminder_whatsapp_sent_at: string | null
  fifa_coupon: string | null
  fifa_discount_percent?: number | null
  fifa_coupon_redeemed_at?: string | null
}

interface NextMatch {
  id: number
  team_a_name: string | null
  team_a_code: string | null
  team_b_name: string | null
  team_b_code: string | null
  stage: string | null
  kickoff_at: string | null
}

type ReminderMode = 'referral' | 'match'
type ReminderChannel = 'sms' | 'whatsapp' | 'match_sms' | 'match_whatsapp'

const REFER_URL_BASE = 'https://progym.co.in/wc2026/'
const MATCH_REMINDER_URL = 'https://progym.co.in/wc2026/'
const PENDING_TOGGLE_STORAGE_KEY = 'wc_reminder_pending_toggle_v1'
const REMINDER_MODE_STORAGE_KEY = 'wc_reminder_mode_v1'

// FIFA 3-letter code → ISO 3166-1 alpha-2 (kept in sync with wc2026-app/src/constants/teamFlags.ts).
const FIFA_TO_ISO: Record<string, string> = {
  MEX:'mx', KOR:'kr', CZE:'cz', RSA:'za',
  CAN:'ca', BIH:'ba', QAT:'qa', SUI:'ch',
  BRA:'br', MAR:'ma', HAI:'ht', SCO:'gb-sct',
  USA:'us', PAR:'py', AUS:'au', TUR:'tr',
  GER:'de', CUW:'cw', CIV:'ci', ECU:'ec',
  NED:'nl', JPN:'jp', SWE:'se', TUN:'tn',
  BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz',
  ESP:'es', CPV:'cv', KSA:'sa', URU:'uy',
  FRA:'fr', SEN:'sn', IRQ:'iq', NOR:'no',
  ARG:'ar', ALG:'dz', AUT:'at', JOR:'jo',
  POR:'pt', COD:'cd', UZB:'uz', COL:'co',
  ENG:'gb-eng', CRO:'hr', GHA:'gh', PAN:'pa',
}

// Convert a 2-letter ISO code to the corresponding regional-indicator flag emoji.
// Returns '' for non-2-letter codes (e.g. gb-eng, gb-sct) which don't have a base emoji.
function flagEmoji(fifaCode: string | null): string {
  if (!fifaCode) return ''
  const iso = FIFA_TO_ISO[fifaCode.toUpperCase()]
  if (!iso || iso.length !== 2) return ''
  const base = 0x1F1E6 - 'a'.charCodeAt(0)
  return String.fromCodePoint(iso.charCodeAt(0) + base) + String.fromCodePoint(iso.charCodeAt(1) + base)
}

// "2026-06-17 18:00:00" → "6 PM"   ;   "2026-06-17 18:30:00" → "6:30 PM"
function formatKickoffShort(serverTs: string | null): string {
  if (!serverTs) return ''
  const [, t = '00:00:00'] = serverTs.split(' ')
  const [hh, mm] = t.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return ''
  const h12 = ((hh + 11) % 12) + 1
  const ampm = hh < 12 ? 'AM' : 'PM'
  return mm === 0 ? `${h12} ${ampm}` : `${h12}:${String(mm).padStart(2, '0')} ${ampm}`
}

function buildReferUrl(code: string | null): string {
  if (!code) return REFER_URL_BASE
  return `${REFER_URL_BASE}?ref=${encodeURIComponent(code)}`
}

// Normalise an Indian mobile to international form without "+" (for wa.me).
// Returns "" if we can't make sense of the input.
function normaliseMobile(raw: string | null): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return '91' + digits
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1)
  return digits
}

function firstName(name: string | null): string {
  if (!name) return 'there'
  return name.trim().split(/\s+/)[0] || 'there'
}

function buildSmsBody(name: string | null, referralCode: string | null): string {
  const n = firstName(name)
  return `Hi ${n}, Refer & Earn is live on the ProGym FIFA World Cup 2026 app! Earn 1 Gold Coin for every successful referral and the top 5 referrers win exciting gift hampers. Your personal link: ${buildReferUrl(referralCode)}`
}

function buildMatchSmsBody(name: string | null, matches: NextMatch[]): string {
  const n = firstName(name)
  if (!matches.length) {
    return `Hi ${n}, no more matches today on ProGym FIFA WC 2026. Check the app for upcoming fixtures: ${MATCH_REMINDER_URL}`
  }
  const lines = matches.map(m => {
    const teams = `${m.team_a_name ?? 'Team A'} vs ${m.team_b_name ?? 'Team B'}`
    return `• ${teams} — ${formatKickoffShort(m.kickoff_at)}`
  })
  return (
    `Hi ${n}, today on ProGym FIFA WC 2026:\n` +
    `${lines.join('\n')}\n` +
    `Predictions close 15 min before each match.\n` +
    `Play: ${MATCH_REMINDER_URL}`
  )
}

function buildMatchWhatsappBody(name: string | null, matches: NextMatch[]): string {
  const n = firstName(name)
  if (!matches.length) {
    return (
      `Hello ${n}, 👋\n\n` +
      `⚽ No more matches today on *ProGym FIFA World Cup 2026*.\n\n` +
      `Check upcoming fixtures 👇\n${MATCH_REMINDER_URL}\n\nSee you tomorrow! 🍀🏆`
    )
  }
  const lines = matches.map(m => {
    const flagA = flagEmoji(m.team_a_code)
    const flagB = flagEmoji(m.team_b_code)
    const teamA = `${flagA ? flagA + ' ' : ''}*${m.team_a_name ?? 'Team A'}*`
    const teamB = `*${m.team_b_name ?? 'Team B'}*${flagB ? ' ' + flagB : ''}`
    return `${teamA} vs ${teamB} — ${formatKickoffShort(m.kickoff_at)}`
  })
  return (
    `Hello ${n}, 👋\n\n` +
    `⚽ *Today's matches — ProGym FIFA WC 2026*\n\n` +
    `${lines.join('\n')}\n\n` +
    `⏳ Predictions close 15 min before each match.\n\n` +
    `Play 👇\n${MATCH_REMINDER_URL}\n\n` +
    `Good luck! 🍀🏆`
  )
}

function buildWhatsappBody(name: string | null, referralCode: string | null): string {
  const n = firstName(name)
  return (
    `Hello ${n}, 👋\n\n` +
    `⚽ *The ProGym FIFA World Cup 2026 begins!*\n\n` +
    `🇫🇷 *France vs Senegal* 🇸🇳\n` +
    `🗓 17 June · 12:30 AM IST\n` +
    `⏳ Predictions close 15 minutes before match starts — lock in yours early!\n\n` +
    `🎯 *Refer & Earn is now LIVE*\n` +
    `🟡 Earn *1 Gold Coin* for every successful referral\n` +
    `🎁 The *top 5 referrers* win exciting *gift hampers*\n\n` +
    `Share your personal referral link with friends and family 👇\n${buildReferUrl(referralCode)}\n\n` +
    `Place your first prediction, invite your crew, and let the games begin. 🏆🔥`
  )
}

// Server timestamps come back as "YYYY-MM-DD HH:MM:SS" in IST (server TZ = Asia/Calcutta).
// Treat as a naked local datetime so the browser doesn't shift it.
function formatSentAt(serverTs: string): string {
  const [datePart, timePart = ''] = serverTs.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return serverTs
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const hhmm = timePart ? timePart.slice(0, 5) : ''
  return hhmm ? `${d} ${months[m - 1]}, ${hhmm}` : `${d} ${months[m - 1]}`
}

interface DailyEntry {
  rank: number
  client_id: string
  client_name: string | null
  client_photo: string | null
  coins_today: number
  matches_predicted_today: number
}

interface Summary {
  total_participants: number
  member_signups: number
  non_member_signups: number
  converted_count: number
  total_coins_distributed: number
}

type Tab = 'overall' | 'daily'
type MemberFilter = 'all' | 'member' | 'new'

function todayInIst(): string {
  // Compute "now" in IST, format as YYYY-MM-DD
  const istMs = Date.now() + 5.5 * 3600 * 1000
  const d = new Date(istMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function avatarUrl(photo: string | null): string {
  if (!photo) return ''
  if (/^https?:\/\//.test(photo)) return photo
  return `${MEDIA_BASE}/img/${photo}`
}

// MySQL DATETIME ("YYYY-MM-DD HH:MM:SS") is in IST on the server. Render as "14 Jun" / "14 Jun, 14:23".
function formatJoinedAt(s: string | null): { date: string; time: string } {
  if (!s) return { date: '—', time: '' }
  // Treat the string as a naked local datetime — don't let the browser shift it by timezone.
  const [datePart, timePart = ''] = s.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return { date: s, time: '' }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const date = `${d} ${months[m - 1]}`
  const time = timePart ? timePart.slice(0, 5) : ''
  return { date, time }
}

function rankBadge(rank: number) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-xs font-bold text-gray-500">#{rank}</span>
}

// Coupon cell — shows the FIFA thank-you code with a copy-to-clipboard button.
// Amber tint for 100% winners so admins can spot them fast; strikethrough +
// "used" chip for already-redeemed codes to prevent re-issuing.
function CouponCell({ code, discount, redeemedAt, compact }:{
  code: string | null
  discount?: number | null
  redeemedAt?: string | null
  compact?: boolean
}) {
  const [copied, setCopied] = useState(false)
  if (!code) return <span className="text-[10px] text-gray-400 italic">—</span>
  const isWinner   = (discount ?? 50) >= 100
  const isRedeemed = !!redeemedAt
  const safeCode: string = code

  async function copy() {
    try {
      await navigator.clipboard.writeText(safeCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Fallback for very old browsers
      const ta = document.createElement('textarea')
      ta.value = safeCode; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopied(true); setTimeout(() => setCopied(false), 1200)
    }
  }

  return (
    <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
      isRedeemed ? 'border-gray-200 bg-gray-50' :
      isWinner   ? 'border-amber-300 bg-amber-50' :
                   'border-purple-200 bg-purple-50'
    }`}>
      <code className={`font-mono ${compact ? 'text-[10px]' : 'text-[11px]'} tracking-wider ${
        isRedeemed ? 'text-gray-400 line-through' :
        isWinner   ? 'text-amber-800 font-bold' :
                     'text-purple-800'
      }`}>{code}</code>
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Copied!' : 'Copy coupon code'}
        aria-label="Copy coupon code"
        className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center ${
          copied ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
        }`}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>
      {isRedeemed && (
        <span className="text-[9px] font-bold text-gray-500 uppercase" title={`Redeemed ${redeemedAt}`}>used</span>
      )}
    </div>
  )
}

function ReminderButtons({
  entry,
  mode,
  todayMatches,
  onSent,
  layout,
}: {
  entry: OverallEntry
  mode: ReminderMode
  todayMatches: NextMatch[]
  onSent: (clientId: string, channel: ReminderChannel, sentAt: string) => void
  layout: 'inline' | 'stacked'
}) {
  const mobile = normaliseMobile(entry.client_mobile)
  const disabled = !mobile
  const smsSentAt = mode === 'referral' ? entry.sms_reminder_sent_at      : entry.match_reminder_sms_sent_at
  const waSentAt  = mode === 'referral' ? entry.whatsapp_reminder_sent_at : entry.match_reminder_whatsapp_sent_at

  const smsChannel: ReminderChannel = mode === 'referral' ? 'sms'      : 'match_sms'
  const waChannel: ReminderChannel  = mode === 'referral' ? 'whatsapp' : 'match_whatsapp'

  function recordSent(channel: ReminderChannel) {
    fetch(`${API_BASE}/wc_leaderboard/markReminderSent.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: Number(entry.client_id), channel }),
    })
      .then(r => r.json())
      .then(j => {
        if (!j?.ok) return
        const tsMap: Record<ReminderChannel, string | null> = {
          sms:            j.sms_reminder_sent_at,
          whatsapp:       j.whatsapp_reminder_sent_at,
          match_sms:      j.match_reminder_sms_sent_at,
          match_whatsapp: j.match_reminder_whatsapp_sent_at,
        }
        const ts = tsMap[channel]
        if (ts) onSent(entry.client_id, channel, ts)
      })
      .catch(() => { /* tick won't show; admin can retap */ })
  }

  function openSms() {
    if (!mobile) return
    const text = mode === 'referral'
      ? buildSmsBody(entry.client_name, entry.referral_code)
      : buildMatchSmsBody(entry.client_name, todayMatches)
    window.location.href = `sms:+${mobile}?body=${encodeURIComponent(text)}`
    recordSent(smsChannel)
  }

  function openWhatsapp() {
    if (!mobile) return
    const text = mode === 'referral'
      ? buildWhatsappBody(entry.client_name, entry.referral_code)
      : buildMatchWhatsappBody(entry.client_name, todayMatches)
    window.location.href = `https://wa.me/${mobile}?text=${encodeURIComponent(text)}`
    recordSent(waChannel)
  }

  const tickClass = 'inline-flex items-center text-[9px] font-semibold text-emerald-700 mt-0.5'
  const btnBase   = 'inline-flex items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  const container = layout === 'stacked'
    ? 'flex flex-col gap-1 w-full'
    : 'flex flex-col gap-1 items-stretch w-28'

  return (
    <div className={container}>
      <div className={layout === 'stacked' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-1'}>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={openSms}
            disabled={disabled}
            className={`${btnBase} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-2 py-1.5`}
            title={mobile ? 'Open SMS app with prefilled refer-and-earn message' : 'No mobile on file'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.91 7.91 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            SMS
          </button>
          {smsSentAt && (
            <span className={tickClass} title={`SMS reminder logged at ${formatSentAt(smsSentAt)}`}>
              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              {formatSentAt(smsSentAt)}
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={openWhatsapp}
            disabled={disabled}
            className={`${btnBase} bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2 py-1.5`}
            title={mobile ? 'Open WhatsApp with prefilled refer-and-earn message' : 'No mobile on file'}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.821 11.821 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886a9.86 9.86 0 001.519 5.269l-.999 3.648 3.969-.618z"/></svg>
            WhatsApp
          </button>
          {waSentAt && (
            <span className={tickClass} title={`WhatsApp reminder logged at ${formatSentAt(waSentAt)}`}>
              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              {formatSentAt(waSentAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Avatar({ photo, name }: { photo: string | null; name: string | null }) {
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').slice(0, 1).toUpperCase()
  if (!photo || failed) {
    return (
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
        {initial}
      </div>
    )
  }
  return (
    <img
      src={avatarUrl(photo)}
      alt=""
      className="w-9 h-9 rounded-full object-cover bg-gray-100 flex-shrink-0"
      onError={() => setFailed(true)}
    />
  )
}

export default function AdminWorldCupLeaderboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overall')
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all')
  const [date, setDate] = useState<string>(todayInIst())
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [reminderMode, setReminderMode] = useState<ReminderMode>(() => {
    try { return localStorage.getItem(REMINDER_MODE_STORAGE_KEY) === 'match' ? 'match' : 'referral' } catch { return 'referral' }
  })
  const [todayMatches, setTodayMatches] = useState<NextMatch[]>([])

  function changeReminderMode(next: ReminderMode) {
    setReminderMode(next)
    try { localStorage.setItem(REMINDER_MODE_STORAGE_KEY, next) } catch { /* ignore */ }
  }
  const [onlyPendingReminders, setOnlyPendingReminders] = useState<boolean>(() => {
    try { return localStorage.getItem(PENDING_TOGGLE_STORAGE_KEY) === '1' } catch { return false }
  })

  function toggleOnlyPending() {
    setOnlyPendingReminders(v => {
      const next = !v
      try { localStorage.setItem(PENDING_TOGGLE_STORAGE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  const [overall, setOverall] = useState<OverallEntry[]>([])
  const [daily, setDaily]     = useState<DailyEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  const [loadingOverall, setLoadingOverall] = useState(true)
  const [loadingDaily, setLoadingDaily]     = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(true)

  function markReminderSent(clientId: string, channel: ReminderChannel, sentAt: string) {
    setOverall(prev => prev.map(e => {
      if (e.client_id !== clientId) return e
      switch (channel) {
        case 'sms':            return { ...e, sms_reminder_sent_at: sentAt }
        case 'whatsapp':       return { ...e, whatsapp_reminder_sent_at: sentAt }
        case 'match_sms':      return { ...e, match_reminder_sms_sent_at: sentAt }
        case 'match_whatsapp': return { ...e, match_reminder_whatsapp_sent_at: sentAt }
      }
    }))
  }

  function loadOverall() {
    setLoadingOverall(true)
    fetch(`${API_BASE}/wc_leaderboard/overall_with_contact.php`)
      .then(r => r.json())
      .then(j => { setOverall(Array.isArray(j?.leaderboard) ? j.leaderboard : []); setLoadingOverall(false) })
      .catch(() => setLoadingOverall(false))
  }

  function loadDaily(d: string) {
    setLoadingDaily(true)
    fetch(`${API_BASE}/wc_leaderboard/daily.php?date=${d}`)
      .then(r => r.json())
      .then(j => { setDaily(Array.isArray(j?.leaderboard) ? j.leaderboard : []); setLoadingDaily(false) })
      .catch(() => setLoadingDaily(false))
  }

  function loadSummary() {
    setLoadingSummary(true)
    fetch(`${API_BASE}/wc_leaderboard/summary.php`)
      .then(r => r.json())
      .then(j => { setSummary(j); setLoadingSummary(false) })
      .catch(() => setLoadingSummary(false))
  }

  useEffect(() => {
    loadOverall()
    loadSummary()
    // Fetch today's remaining matches once on mount — used by Match-reminder mode.
    fetch(`${API_BASE}/wc_leaderboard/todayUpcomingMatches.php`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j && j.ok && Array.isArray(j.matches)) setTodayMatches(j.matches as NextMatch[]) })
      .catch(() => { /* match-reminder msg falls back to "no matches today" body */ })
  }, [])

  useEffect(() => {
    if (tab === 'daily') loadDaily(date)
  }, [tab, date])

  const conversionRate = useMemo(() => {
    if (!summary || summary.non_member_signups === 0) return 0
    return Math.round((summary.converted_count / summary.non_member_signups) * 1000) / 10
  }, [summary])

  // "Pending" = NEITHER SMS nor WhatsApp has been sent yet *for the current mode*.
  // A player drops out as soon as EITHER channel is stamped (for this mode).
  function isPendingFor(mode: ReminderMode, e: OverallEntry): boolean {
    return mode === 'referral'
      ? (!e.sms_reminder_sent_at && !e.whatsapp_reminder_sent_at)
      : (!e.match_reminder_sms_sent_at && !e.match_reminder_whatsapp_sent_at)
  }

  // Step 1 — member-pill filter only. Used for the pending COUNT badge so the number
  // stays stable when the admin types in the search box.
  const memberScopedOverall = useMemo(() => {
    if (memberFilter === 'all') return overall
    const want = memberFilter === 'member' ? 'yes' : 'no'
    return overall.filter(e => e.was_gym_client_at_join === want)
  }, [overall, memberFilter])

  const pendingCount = useMemo(
    () => memberScopedOverall.filter(e => isPendingFor(reminderMode, e)).length,
    [memberScopedOverall, reminderMode]
  )

  // Step 2 — apply search + pending-toggle to get the visible list.
  const filteredOverall = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return memberScopedOverall.filter(e => {
      if (q && !(e.client_name || '').toLowerCase().includes(q)) return false
      if (onlyPendingReminders && !isPendingFor(reminderMode, e)) return false
      return true
    })
  }, [memberScopedOverall, searchQuery, onlyPendingReminders, reminderMode])

  const memberCount = useMemo(() => overall.filter(e => e.was_gym_client_at_join === 'yes').length, [overall])
  const newPlayerCount = useMemo(() => overall.filter(e => e.was_gym_client_at_join === 'no').length, [overall])

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">World Cup Leaderboard</h1>
            <p className="text-xs text-gray-400">Track participants, footballs, conversions</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* Campaign summary cards */}
        <section className="mb-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Campaign Summary</h2>
          {loadingSummary || !summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Players</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{summary.total_participants}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{summary.member_signups} members · {summary.non_member_signups} new</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
                <p className="text-[10px] text-green-700 uppercase tracking-wider">Conversions</p>
                <p className="text-xl font-bold text-green-700 mt-1">{summary.converted_count}</p>
                <p className="text-[10px] text-green-600 mt-0.5">{conversionRate}% of new signups</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <p className="text-[10px] text-emerald-700 uppercase tracking-wider">Footballs Given</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{Math.round(summary.total_coins_distributed)} ⚽</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">across all settled matches</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-[10px] text-blue-700 uppercase tracking-wider">Non-Member Hooked</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{summary.non_member_signups - summary.converted_count}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Yet to convert</p>
              </div>
            </div>
          )}
        </section>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl mb-3 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setTab('overall')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'overall' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Overall
            </button>
            <button
              onClick={() => setTab('daily')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'daily' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Daily
            </button>
          </div>
        </div>

        {tab === 'daily' && (
          <div className="mb-3 flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Date:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-1.5 text-base sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
            />
            <span className="text-[10px] text-gray-400">based on match settle date</span>
          </div>
        )}

        {/* Leaderboard list */}
        {tab === 'overall' && (
          <>
            {loadingOverall && (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}
            {!loadingOverall && overall.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-5xl mb-3">🏆</p>
                <p className="font-semibold text-gray-600">No predictions yet</p>
                <p className="text-sm mt-1">Leaderboard fills up after the first match is settled.</p>
              </div>
            )}
            {!loadingOverall && overall.length > 0 && (
              <>
                {/* Reminder-mode segmented toggle */}
                <div className="mb-3">
                  <div className="inline-flex w-full bg-gray-100 border border-gray-200 rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => changeReminderMode('referral')}
                      className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                        reminderMode === 'referral'
                          ? 'bg-white text-orange-600 shadow-sm border border-orange-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Send referral msgs
                    </button>
                    <button
                      type="button"
                      onClick={() => changeReminderMode('match')}
                      className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                        reminderMode === 'match'
                          ? 'bg-white text-orange-600 shadow-sm border border-orange-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Send match reminders
                    </button>
                  </div>
                  {reminderMode === 'match' && (
                    <p className="text-[10px] text-gray-500 mt-1.5 pl-1">
                      {todayMatches.length > 0
                        ? <>Today: <span className="font-semibold text-gray-700">{todayMatches.map(m => `${m.team_a_name} vs ${m.team_b_name} (${formatKickoffShort(m.kickoff_at)})`).join(' · ')}</span></>
                        : <span className="text-gray-400">No more matches today — message will say so.</span>
                      }
                    </p>
                  )}
                </div>

                {/* Search by name */}
                <div className="relative mb-3">
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full pl-9 pr-9 py-2 text-base sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      aria-label="Clear search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Pending-reminders toggle */}
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onlyPendingReminders}
                    onClick={toggleOnlyPending}
                    className="flex items-center gap-2.5 min-w-0"
                  >
                    <span
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                        onlyPendingReminders ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                          onlyPendingReminders ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span className="text-sm font-semibold text-gray-700 text-left leading-tight">
                      Show only pending reminders
                      <span className="block text-[10px] font-normal text-gray-400">Hide players already messaged on SMS or WhatsApp</span>
                    </span>
                  </button>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                      pendingCount === 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}
                    title="Players still missing SMS or WhatsApp (or both)"
                  >
                    {pendingCount} pending
                  </span>
                </div>

                {/* Member filter badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setMemberFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      memberFilter === 'all'
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    All <span className="opacity-70">· {overall.length}</span>
                  </button>
                  <button
                    onClick={() => setMemberFilter('member')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      memberFilter === 'member'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-purple-700 border-purple-200 hover:border-purple-400'
                    }`}
                  >
                    Gym Members <span className="opacity-70">· {memberCount}</span>
                  </button>
                  <button
                    onClick={() => setMemberFilter('new')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      memberFilter === 'new'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'
                    }`}
                  >
                    Non-Members <span className="opacity-70">· {newPlayerCount}</span>
                  </button>
                </div>

                {filteredOverall.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-3xl mb-2">🔍</p>
                    <p className="font-semibold text-gray-600 text-sm">No players match this filter</p>
                  </div>
                ) : (
                  <>
                    {/* Column headers (desktop only — mobile uses card layout) */}
                    <div className="hidden sm:flex bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 items-center gap-3 mb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      <div className="w-7 flex-shrink-0 text-center">Rank</div>
                      <div className="w-9 flex-shrink-0" />
                      <div className="flex-1 min-w-0">Player</div>
                      <div className="text-right pr-3 w-20">Joined</div>
                      <div className="text-right pr-3 w-24">Mobile</div>
                      <div className="text-center pr-3 w-40">Coupon</div>
                      <div className="text-right pr-3 w-16">Predicted</div>
                      <div className="text-right pl-3 pr-3 w-20">Footballs</div>
                      <div className="text-center w-28">Remind</div>
                    </div>
                    <div className="space-y-1.5">
                      {filteredOverall.map(e => {
                        const joined = formatJoinedAt(e.joined_at)
                        return (
                        <div
                          key={e.client_id}
                          className={`bg-white rounded-xl border border-gray-100 ${e.rank <= 3 ? 'shadow-sm' : ''}`}
                        >
                          {/* Desktop row */}
                          <div className="hidden sm:flex items-center gap-3 px-3 py-2">
                            <div className="w-7 flex-shrink-0 text-center">{rankBadge(e.rank)}</div>
                            <Avatar photo={e.client_photo} name={e.client_name} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{e.client_name || `Client #${e.client_id}`}</p>
                              <p className="text-[10px] text-gray-400">
                                {e.total_matches_predicted} settled
                                {' · '}
                                {e.was_gym_client_at_join === 'yes'
                                  ? <span className="text-purple-600 font-medium">member</span>
                                  : <span className="text-blue-600 font-medium">new player</span>
                                }
                              </p>
                            </div>
                            <div className="text-right pr-3 w-20" title={e.joined_at || ''}>
                              <p className="text-xs font-semibold text-gray-700">{joined.date}</p>
                              {joined.time && <p className="text-[10px] text-gray-400">{joined.time}</p>}
                            </div>
                            <div className="text-right pr-3 w-24">
                              <p className="text-xs font-medium text-gray-700 truncate">{e.client_mobile || '—'}</p>
                            </div>
                            <div className="text-center pr-3 w-40">
                              <CouponCell code={e.fifa_coupon} discount={e.fifa_discount_percent} redeemedAt={e.fifa_coupon_redeemed_at} />
                            </div>
                            <div className="text-right pr-3 border-r border-gray-100 w-16">
                              <p className="text-sm font-bold text-orange-600">{e.predictions_placed}</p>
                            </div>
                            <div className="text-right pl-3 pr-3 w-20">
                              <p className="text-sm font-bold text-emerald-700">{Math.round(e.total_coins_earned)} ⚽</p>
                            </div>
                            <div className="w-28 flex-shrink-0">
                              <ReminderButtons entry={e} mode={reminderMode} todayMatches={todayMatches} onSent={markReminderSent} layout="inline" />
                            </div>
                          </div>

                          {/* Mobile card — 3 lines */}
                          <div className="sm:hidden px-3 py-2.5 space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 flex-shrink-0 text-center">{rankBadge(e.rank)}</div>
                              <Avatar photo={e.client_photo} name={e.client_name} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{e.client_name || `Client #${e.client_id}`}</p>
                                <p className="text-[10px] text-gray-500">
                                  {e.client_mobile || 'no mobile'}
                                  {' · '}
                                  {e.was_gym_client_at_join === 'yes'
                                    ? <span className="text-purple-600 font-medium">member</span>
                                    : <span className="text-blue-600 font-medium">new player</span>
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-600 px-1">
                              <span>Joined <span className="font-semibold text-gray-700">{joined.date}</span>{joined.time ? `, ${joined.time}` : ''}</span>
                              <span>Predicted <span className="font-bold text-orange-600">{e.predictions_placed}</span></span>
                              <span><span className="font-bold text-emerald-700">{Math.round(e.total_coins_earned)} ⚽</span></span>
                            </div>
                            <div className="flex items-center gap-1.5 px-1">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Coupon</span>
                              <CouponCell code={e.fifa_coupon} discount={e.fifa_discount_percent} redeemedAt={e.fifa_coupon_redeemed_at} compact />
                            </div>
                            <ReminderButtons entry={e} mode={reminderMode} todayMatches={todayMatches} onSent={markReminderSent} layout="stacked" />
                          </div>
                        </div>
                      )})}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {tab === 'daily' && (
          <>
            {loadingDaily && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}
            {!loadingDaily && daily.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-5xl mb-3">📅</p>
                <p className="font-semibold text-gray-600">No footballs earned on this date</p>
                <p className="text-sm mt-1">Try a date where matches were settled.</p>
              </div>
            )}
            {!loadingDaily && daily.length > 0 && (
              <>
                {/* Column headers */}
                <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-3 mb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="w-7 flex-shrink-0 text-center">Rank</div>
                  <div className="w-9 flex-shrink-0" />
                  <div className="flex-1 min-w-0">Player</div>
                  <div className="text-right w-20">Footballs</div>
                </div>
                <div className="space-y-1.5">
                  {daily.map(e => (
                    <div key={e.client_id} className="bg-white rounded-xl border border-gray-100 px-3 py-2 flex items-center gap-3">
                      <div className="w-7 flex-shrink-0 text-center">{rankBadge(e.rank)}</div>
                      <Avatar photo={e.client_photo} name={e.client_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{e.client_name || `Client #${e.client_id}`}</p>
                        <p className="text-[10px] text-gray-400">{e.matches_predicted_today} {e.matches_predicted_today === 1 ? 'match' : 'matches'} settled today</p>
                      </div>
                      <div className="text-right w-20">
                        <p className="text-sm font-bold text-emerald-700">{Math.round(e.coins_today)} ⚽</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
