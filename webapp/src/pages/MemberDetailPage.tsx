import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'
import { useAuth } from '../context/AuthContext'
import ImageCropModal from '../components/ImageCropModal'
import CouponApplier, { type CouponApplierHandle } from '../components/CouponApplier'
import { sendPaymentReceiptOnWhatsApp } from '../utils/whatsappReceipt'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientProfile {
  id: string; name: string; mobile: string; email: string; gender: string
  birthDate: string; address: string; bloodGroup: string; occupation: string
  height: string; weight: string; photo: string; profileActiveFlag: string
  admissionDate: string; isPTClient: string; isGymClient: string
  creationSource: string; remarks: string; previousGym: string
  adp: string; awp: string; reference: string
}

interface Transaction {
  id: string; feesPaid: string; paymentDate: string
  isApproved: string; paymentMode: string; proCoinsUsed?: string
}

interface PackageDetail {
  id: string; description: string; fees: string; startDate: string
  endDate: string; amountPaid: string; paymentDate: string
  status: string; packageId: string; discontinue: string
  transactions: Transaction[]
}

interface AttendanceDay { day: string; date: string; timeStamp: string }

interface WeightEntry { id: string; date: string; weight: string }

interface WorkoutMainType { id: string; name: string; discontinue: string }
interface WorkoutSession { id: string; cid: string; mtid: string; date: string; discontinue: string }
interface WorkoutExerciseTemplate {
  id: string; mtid: string; name: string; reps: string; sets: string
  gifFilePath: string; muscle: string; discontinue: string
}

interface MemberDetail {
  client: ClientProfile
  packages: PackageDetail[]
  attendance: AttendanceDay[]
  attendanceMonth: number
  attendanceYear: number
  weights: WeightEntry[]
  dietName: string | null
  workoutName: string | null
  referredBy: { id: string; name: string } | null
}

interface EditFormState {
  name: string; mobile: string; email: string; gender: string
  birthDate: string; bloodGroup: string; address: string
  occupation: string; height: string; weight: string
  remarks: string; previousGym: string
}

interface AvailablePackage {
  id: string; description: string; fees: string; days: string; gender: string
}

interface AddPkgForm {
  packageId: string; startDate: string; endDate: string
  fees: string; amountPaid: string; paymentMode: string; paymentDate: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = [
  { value: 'A_plus',   label: 'A+'  },
  { value: 'A_minus',  label: 'A−'  },
  { value: 'B_plus',   label: 'B+'  },
  { value: 'B_minus',  label: 'B−'  },
  { value: 'AB_plus',  label: 'AB+' },
  { value: 'AB_minus', label: 'AB−' },
  { value: 'O_plus',   label: 'O+'  },
  { value: 'O_minus',  label: 'O−'  },
]

// ── EXIF / orientation correction ─────────────────────────────────────────────

function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) return 1
  let offset = 2
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false)
    const segLen = view.getUint16(offset + 2, false)
    if (marker === 0xFFE1 && view.byteLength > offset + 10) {
      if (view.getUint32(offset + 4, false) === 0x45786966) {
        const tiffBase = offset + 10
        const little = view.getUint16(tiffBase, false) === 0x4949
        const ifdOffset = view.getUint32(tiffBase + 4, little)
        const numTags = view.getUint16(tiffBase + ifdOffset, little)
        for (let i = 0; i < numTags; i++) {
          const tagOffset = tiffBase + ifdOffset + 2 + i * 12
          if (view.getUint16(tagOffset, little) === 0x0112) {
            return view.getUint16(tagOffset + 8, little)
          }
        }
      }
    }
    if ((marker & 0xFF00) !== 0xFF00) break
    offset += 2 + segLen
  }
  return 1
}

function correctImageOrientation(file: File): Promise<string> {
  return new Promise(resolve => {
    const arrReader = new FileReader()
    arrReader.onload = ae => {
      const orientation = readExifOrientation(ae.target!.result as ArrayBuffer)
      const urlReader = new FileReader()
      urlReader.onload = ue => {
        const dataUrl = ue.target!.result as string
        const img = new Image()
        img.onload = () => {
          const swap = orientation >= 5 && orientation <= 8
          const canvas = document.createElement('canvas')
          canvas.width = swap ? img.height : img.width
          canvas.height = swap ? img.width : img.height
          const ctx = canvas.getContext('2d')!
          switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, img.width, 0); break
            case 3: ctx.transform(-1, 0, 0, -1, img.width, img.height); break
            case 4: ctx.transform(1, 0, 0, -1, 0, img.height); break
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
            case 6: ctx.transform(0, 1, -1, 0, img.height, 0); break
            case 7: ctx.transform(0, -1, -1, 0, img.height, img.width); break
            case 8: ctx.transform(0, -1, 1, 0, 0, img.width); break
          }
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.src = dataUrl
      }
      urlReader.readAsDataURL(file)
    }
    arrReader.readAsArrayBuffer(file)
  })
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toInputDate(dmy: string): string {
  const p = dmy?.split('/')
  return p?.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ''
}

function fromInputDate(ymd: string): string {
  const p = ymd.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const IMG_BASE = MEDIA_BASE

function gifUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return IMG_BASE + (path.startsWith('/') ? path : '/' + path)
}

function inr(n: number) { return '₹' + n.toLocaleString('en-IN') }

function calcAge(dob: string): number | null {
  if (!dob) return null
  const parts = dob.split('/')
  if (parts.length !== 3) return null
  const birth = new Date(+parts[2], +parts[1] - 1, +parts[0])
  const diff = Date.now() - birth.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

function parseDMY(s: string | null): Date | null {
  if (!s) return null
  const p = s.split('/')
  if (p.length !== 3) return null
  return new Date(+p[2], +p[1] - 1, +p[0])
}

function calcDaysLeft(endDate: string | null): number | null {
  const end = parseDMY(endDate)
  if (!end) return null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / 86400000)
}

function daysLeftColor(d: number | null) {
  if (d === null) return 'text-gray-400'
  if (d < 0) return 'text-red-500'
  if (d <= 7) return 'text-orange-500'
  if (d <= 30) return 'text-yellow-600'
  return 'text-green-600'
}

function formatDate(s: string | null) {
  if (!s) return '—'
  const d = parseDMY(s)
  if (!d) return s
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const AVATAR_COLORS = [
  'bg-blue-500','bg-emerald-500','bg-violet-500','bg-orange-500',
  'bg-rose-500','bg-teal-500','bg-indigo-500','bg-pink-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function formatReminderDateLabel(iso: string | undefined): string {
  if (!iso) return 'Not sent'
  const d = new Date(iso)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

type ReminderTheme = {
  bg: string         // card background
  border: string     // card border
  ribbon: string     // top ribbon strip (small bar)
  iconBg: string     // header icon circle background
  iconText: string   // header icon circle text color
  title: string      // title text color
}

function ReminderColumn({
  icon, label, theme,
  waMessage, smsMessage, mobile10, hasEmail, channels,
  emailSending, emailResult, onSendEmail, onMarkChannel,
}: {
  icon: string
  label: string
  theme: ReminderTheme
  waMessage: string
  smsMessage: string
  mobile10: string
  hasEmail: boolean
  channels: { wa?: string; sms?: string; email?: string }
  emailSending: boolean
  emailResult: 'sent' | 'error' | null
  onSendEmail: () => void
  onMarkChannel: (c: 'wa' | 'sms' | 'email') => void
}) {
  const isMobileUA = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const waHref = isMobileUA
    ? `whatsapp://send?phone=91${mobile10}&text=${encodeURIComponent(waMessage)}`
    : `https://wa.me/91${mobile10}?text=${encodeURIComponent(waMessage)}`

  function Channel({
    children, label, sub, dotClass,
  }: { children: React.ReactNode; label: string; sub: string; dotClass: string }) {
    return (
      <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
        {children}
        <span className="text-[10px] font-semibold text-gray-700 leading-tight">{label}</span>
        <span className={`text-[9px] leading-tight text-center ${dotClass}`}>{sub}</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} shadow-sm`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.ribbon}`} />
      <div className="p-4 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-7 h-7 flex items-center justify-center rounded-full ${theme.iconBg} ${theme.iconText} text-base leading-none`}>{icon}</span>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${theme.title}`}>{label}</p>
        </div>

        <div className="flex items-start gap-2">
          {mobile10 && (
            <Channel
              label="WhatsApp"
              sub={formatReminderDateLabel(channels.wa)}
              dotClass={channels.wa ? 'text-green-600 font-semibold' : 'text-gray-400'}
            >
              <a
                href={waHref}
                target={isMobileUA ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={() => onMarkChannel('wa')}
                title="Send via WhatsApp"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 text-white shadow-sm hover:bg-green-600 active:bg-green-700 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </Channel>
          )}

          {mobile10 && (
            <Channel
              label="SMS"
              sub={formatReminderDateLabel(channels.sms)}
              dotClass={channels.sms ? 'text-blue-600 font-semibold' : 'text-gray-400'}
            >
              <a
                href={`sms:+91${mobile10}?body=${encodeURIComponent(smsMessage)}`}
                onClick={() => onMarkChannel('sms')}
                title="Send via SMS"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </a>
            </Channel>
          )}

          {hasEmail && (
            <Channel
              label="Email"
              sub={emailResult === 'sent' ? 'Just sent' : emailResult === 'error' ? 'Failed — retry' : formatReminderDateLabel(channels.email)}
              dotClass={emailResult === 'sent' ? 'text-green-600 font-semibold' : emailResult === 'error' ? 'text-red-500 font-semibold' : channels.email ? 'text-orange-600 font-semibold' : 'text-gray-400'}
            >
              {emailResult === 'sent' ? (
                <span title="Email sent!" className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : emailResult === 'error' ? (
                <button onClick={onSendEmail} title="Failed — click to retry" className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : emailSending ? (
                <span className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-400 text-white shadow-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </span>
              ) : (
                <button onClick={onSendEmail} title="Send via Email" className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-500 text-white shadow-sm hover:bg-orange-600 active:bg-orange-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </Channel>
          )}
        </div>
      </div>
    </div>
  )
}

const THEME_PHOTO: ReminderTheme = {
  bg: 'bg-amber-50/60',
  border: 'border-amber-200',
  ribbon: 'bg-amber-400',
  iconBg: 'bg-amber-100',
  iconText: 'text-amber-700',
  title: 'text-amber-800',
}
const THEME_WELCOME: ReminderTheme = {
  bg: 'bg-emerald-50/60',
  border: 'border-emerald-200',
  ribbon: 'bg-emerald-400',
  iconBg: 'bg-emerald-100',
  iconText: 'text-emerald-700',
  title: 'text-emerald-800',
}
const THEME_APPLAUNCH: ReminderTheme = {
  bg: 'bg-indigo-50/60',
  border: 'border-indigo-200',
  ribbon: 'bg-indigo-400',
  iconBg: 'bg-indigo-100',
  iconText: 'text-indigo-700',
  title: 'text-indigo-800',
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  )
}

function PackageRow({
  pkg,
  clientName,
  clientMobile,
  onEdit,
  onDelete,
  onPay,
}: {
  pkg: PackageDetail
  clientName: string
  clientMobile: string
  // Omitting a handler hides the corresponding button — used for the trainer's view-only membership tab.
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onPay?: (id: string) => void
}) {
  const [txExpanded, setTxExpanded] = useState(false)
  const fees = parseFloat(pkg.fees)
  const paid = parseFloat(pkg.amountPaid)
  const isDiscontinued = pkg.discontinue === 'true'
  const hasPending = fees > paid

  // Sort transactions by id ascending so we can compute snapshot remaining at time of each payment
  const sortedTxs = [...pkg.transactions].sort((a, b) => parseInt(a.id) - parseInt(b.id))
  const cumulativeAtTx = new Map<string, number>()
  let running = 0
  for (const t of sortedTxs) {
    running += parseFloat(t.feesPaid || '0') + parseFloat(t.proCoinsUsed || '0')
    cumulativeAtTx.set(t.id, running)
  }

  const handleSendWhatsApp = (tx: Transaction) => {
    const cum = cumulativeAtTx.get(tx.id) ?? parseFloat(tx.feesPaid || '0')
    const remaining = Math.max(0, fees - cum)
    const txPaid = parseFloat(tx.feesPaid || '0') + parseFloat(tx.proCoinsUsed || '0')
    sendPaymentReceiptOnWhatsApp({
      mobile: clientMobile,
      clientName: clientName || 'Member',
      packageName: pkg.description || `Package #${pkg.id}`,
      duration: `${pkg.startDate} – ${pkg.endDate}`,
      paymentDate: tx.paymentDate,
      paid: txPaid,
      remaining,
    })
  }

  return (
    <>
      <tr className={`border-b border-gray-100 align-middle ${isDiscontinued ? 'opacity-60' : ''}`}>
        <td className="px-2 py-2 pl-4 text-xs font-medium text-gray-800">{pkg.description || 'Package #' + pkg.id}</td>
        <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(pkg.startDate)}</td>
        <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(pkg.endDate)}</td>
        <td className="px-2 py-2 text-xs text-gray-800 text-right whitespace-nowrap">{inr(fees)}</td>
        <td className="px-2 py-2 text-xs text-gray-800 text-right whitespace-nowrap">{inr(paid)}</td>
        <td className="px-2 py-2 whitespace-nowrap">
          {isDiscontinued
            ? <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Stopped</span>
            : fees === 0 ? null
            : paid >= fees
              ? <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Fully Paid</span>
              : paid === 0
                ? <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-500">Unpaid</span>
                : <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">Partial</span>
          }
        </td>
        <td className="px-2 py-2 pr-4 whitespace-nowrap">
          <div className="flex items-center gap-1">
            {onEdit && <button onClick={() => onEdit(pkg.id)} className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">Edit</button>}
            {onDelete && <button onClick={() => onDelete(pkg.id)} className="text-xs px-1.5 py-0.5 rounded border border-red-100 text-red-400 hover:bg-red-50 transition-colors">Delete</button>}
            {onPay && hasPending && (
              <button onClick={() => onPay(pkg.id)} className="text-xs px-3 py-0.5 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors">Pay</button>
            )}
            <button
              onClick={() => setTxExpanded(p => !p)}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${txExpanded ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-100 text-blue-600 hover:bg-blue-50'}`}
            >
              Transactions({pkg.transactions.length}) {txExpanded ? '▲' : '▼'}
            </button>
          </div>
        </td>
      </tr>
      {txExpanded && (
        <tr className="bg-blue-50 border-b border-blue-100">
          <td colSpan={7} className="px-4 py-3">
            {pkg.transactions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No transactions recorded.</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-blue-200">
                    <th className="pb-1 pr-4 font-semibold">Date</th>
                    <th className="pb-1 pr-4 font-semibold">Cash Paid</th>
                    <th className="pb-1 pr-4 font-semibold">ProCoins</th>
                    <th className="pb-1 pr-4 font-semibold">Mode</th>
                    <th className="pb-1 pr-4 font-semibold">Approved</th>
                    <th className="pb-1 font-semibold">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-blue-100 last:border-0">
                      <td className="py-1 pr-4 text-gray-700 whitespace-nowrap">{formatDate(tx.paymentDate)}</td>
                      <td className="py-1 pr-4 text-gray-800 font-medium whitespace-nowrap">{inr(parseFloat(tx.feesPaid))}</td>
                      <td className="py-1 pr-4 whitespace-nowrap">
                        {parseFloat(tx.proCoinsUsed || '0') > 0
                          ? <span className="text-yellow-700 font-semibold">{Math.floor(parseFloat(tx.proCoinsUsed!))} coins</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-1 pr-4 text-gray-600 whitespace-nowrap capitalize">{tx.paymentMode || '—'}</td>
                      <td className="py-1 pr-4">
                        {tx.isApproved === 'YES'
                          ? <span className="text-green-600 font-semibold">Yes</span>
                          : <span className="text-orange-400">Pending</span>}
                      </td>
                      <td className="py-1">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(tx)}
                          title="Send receipt on WhatsApp"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1-.8.9-1 1.1-.4.2-.6.1-1.3-.5-2.5-1.5c-.9-.8-1.5-1.8-1.7-2.1s0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1 2.1 3.2 5 4.5c.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.3-.7.3-1.2.2-1.4 0-.1-.2-.2-.5-.4zM12 2A10 10 0 0 0 3.5 17.3L2 22l4.9-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function AddPackageModal({
  clientId,
  clientGender,
  onClose,
  onSuccess,
}: {
  clientId: string
  clientGender: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [pkgs, setPkgs] = useState<AvailablePackage[]>([])
  const [loadingPkgs, setLoadingPkgs] = useState(true)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<AddPkgForm>({
    packageId: '', startDate: today, endDate: '', fees: '',
    amountPaid: '0', paymentMode: 'Cash', paymentDate: today,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/package/byGender.php?gender=${clientGender}`)
      .then(r => r.json())
      .then(d => { setPkgs(Array.isArray(d) ? d : (d.records ?? [])); setLoadingPkgs(false) })
      .catch(() => setLoadingPkgs(false))
  }, [clientGender])

  const couponRef = useRef<CouponApplierHandle>(null)
  const [discountFactor, setDiscountFactor] = useState(1)

  function feesAfterDiscount(baseFees: string, factor: number): string {
    const n = parseFloat(baseFees) || 0
    return String(Math.round(n * factor))
  }

  function applyPackage(pkgId: string, startStr: string) {
    const pkg = pkgs.find(p => p.id === pkgId)
    if (!pkg) return
    const s = new Date(startStr)
    const e = new Date(s)
    e.setDate(e.getDate() + parseInt(pkg.days))
    setForm(f => ({
      ...f,
      packageId: pkgId,
      startDate: startStr,
      fees: feesAfterDiscount(pkg.fees, discountFactor),
      endDate: e.toISOString().slice(0, 10),
    }))
  }

  // React to coupon apply/clear: recompute fees against the currently selected package
  useEffect(() => {
    if (!form.packageId) return
    const pkg = pkgs.find(p => p.id === form.packageId)
    if (!pkg) return
    const newFees = feesAfterDiscount(pkg.fees, discountFactor)
    setForm(f => ({
      ...f,
      fees: newFees,
      amountPaid: String(Math.min(parseFloat(f.amountPaid) || 0, parseFloat(newFees) || 0)),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountFactor])

  async function handleSubmit() {
    if (!form.packageId || !form.startDate || !form.endDate) {
      setError('Please select a package and dates'); return
    }
    const feesNum = parseFloat(form.fees) || 0
    const paidNum = parseFloat(form.amountPaid) || 0
    if (paidNum > feesNum) {
      setError('Fees paid cannot exceed total fees'); return
    }
    setSaving(true); setError(null)
    try {
      const pkg = pkgs.find(p => p.id === form.packageId)
      const res = await fetch(`${API_BASE}/packageDetails/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: form.packageId,
          clientId,
          startDate: fromInputDate(form.startDate),
          endDate: fromInputDate(form.endDate),
          fees: form.fees,
          amountPaid: form.amountPaid,
          paymentDate: fromInputDate(form.paymentDate),
          status: 'active',
          description: pkg?.description ?? '',
          discontinue: 'false',
        }),
      })
      // API returns the new record ID as a raw number (not JSON object)
      const newPkgDetailId = parseInt(await res.text())
      if (!newPkgDetailId || newPkgDetailId <= 0) { setError('Failed to save package'); return }

      if (paidNum > 0) {
        await fetch(`${API_BASE}/paymentTransaction/create.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageDetailsId: newPkgDetailId,
            clientId,
            clientGender,
            feesPaid: form.amountPaid,
            paymentDate: fromInputDate(form.paymentDate),
            paymentMode: form.paymentMode,
            isApproved: 'YES',
            discontinue: 'false',
          }),
        })
      }
      // Persist coupon redemption AFTER a successful package save so a failed
      // save doesn't burn the coupon. Non-blocking — never fails the flow.
      await couponRef.current?.redeem()
      // WC campaign conversion telemetry: if this client signed up as a
      // non-member via the World Cup mini-app, mark them as converted now.
      // No-op for everyone else, so safe to call unconditionally.
      fetch(`${API_BASE}/wc_signup/markConverted.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: Number(clientId) }),
      }).catch(() => {})
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedPkg = pkgs.find(p => p.id === form.packageId)
  const feesNum = parseFloat(form.fees) || 0
  const paidNum = parseFloat(form.amountPaid) || 0
  const dues = feesNum > paidNum ? feesNum - paidNum : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800 text-base">Add Package</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Package selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Package *</label>
            {loadingPkgs ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={form.packageId}
                onChange={e => applyPackage(e.target.value, form.startDate)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">— Choose a package —</option>
                {pkgs.map(p => (
                  <option key={p.id} value={p.id}>{p.description} — ₹{p.fees} / {p.days} days</option>
                ))}
              </select>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate}
                onChange={e => applyPackage(form.packageId, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date *</label>
              <input type="date" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {/* Summary */}
          {selectedPkg && (
            <div className="bg-orange-50 rounded-xl px-4 py-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-bold text-gray-800">{selectedPkg.days} days</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Fees</p>
                <p className="text-sm font-bold text-gray-800">{inr(feesNum)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance Due</p>
                <p className={`text-sm font-bold ${dues > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {dues > 0 ? inr(dues) : '✓ Paid'}
                </p>
              </div>
            </div>
          )}

          {/* Fees */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Total Fees (₹)</label>
              <input type="number" value={form.fees} placeholder="0" readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fees Paid Now (₹)</label>
              <input type="number" value={form.amountPaid} placeholder="0" min="0" max={form.fees || undefined}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0
                  const max = parseFloat(form.fees) || 0
                  setForm(f => ({ ...f, amountPaid: String(Math.min(val, max)) }))
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['Cash', 'UPI', 'Card', 'Online', 'Cheque'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Date</label>
              <input type="date" value={form.paymentDate}
                onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          <CouponApplier ref={couponRef} clientId={clientId} onApply={setDiscountFactor} />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 pb-6 pt-2 flex gap-3 sticky bottom-0 bg-white border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.packageId || !form.startDate || !form.endDate}
            className="flex-1 py-2.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Add Package'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditPackageModal({
  pkg,
  clientId,
  onClose,
  onSuccess,
}: {
  pkg: PackageDetail
  clientId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    startDate: toInputDate(pkg.startDate),
    endDate: toInputDate(pkg.endDate),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!form.startDate || !form.endDate) { setError('Start and end dates are required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/packageDetails/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pkg.id,
          packageId: pkg.packageId,
          clientId,
          startDate: fromInputDate(form.startDate),
          endDate: fromInputDate(form.endDate),
          fees: pkg.fees,
          amountPaid: pkg.amountPaid,
          paymentDate: pkg.paymentDate,
          status: pkg.status,
          description: pkg.description,
          discontinue: pkg.discontinue,
        }),
      })
      const json = await res.json()
      if (json.message?.toLowerCase().includes('fail')) { setError(json.message || 'Failed'); return }
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800 text-base">Edit Package</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date *</label>
              <input type="date" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 pb-6 pt-2 flex gap-3 sticky bottom-0 bg-white border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RenewPackageModal({
  clientId,
  clientGender,
  lastPackage,
  onClose,
  onSuccess,
}: {
  clientId: string
  clientGender: string
  lastPackage: PackageDetail
  onClose: () => void
  onSuccess: () => void
}) {
  const [pkgs, setPkgs] = useState<AvailablePackage[]>([])
  const [loadingPkgs, setLoadingPkgs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const renewStart = (() => {
    const d = parseDMY(lastPackage.endDate)
    if (!d) return today
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const [form, setForm] = useState<AddPkgForm>({
    packageId: lastPackage.packageId,
    startDate: renewStart,
    endDate: '',
    fees: lastPackage.fees,
    amountPaid: '0',
    paymentMode: 'Cash',
    paymentDate: today,
  })

  useEffect(() => {
    fetch(`${API_BASE}/package/byGender.php?gender=${clientGender}`)
      .then(r => r.json())
      .then(d => {
        const list: AvailablePackage[] = Array.isArray(d) ? d : (d.records ?? [])
        setPkgs(list)
        const match = list.find(p => p.id === lastPackage.packageId)
        if (match) {
          const s = new Date(renewStart)
          const e = new Date(s)
          e.setDate(e.getDate() + parseInt(match.days))
          setForm(f => ({ ...f, endDate: e.toISOString().slice(0, 10) }))
        }
        setLoadingPkgs(false)
      })
      .catch(() => setLoadingPkgs(false))
  }, [clientGender])

  const couponRef = useRef<CouponApplierHandle>(null)
  const [discountFactor, setDiscountFactor] = useState(1)

  function feesAfterDiscount(baseFees: string, factor: number): string {
    const n = parseFloat(baseFees) || 0
    return String(Math.round(n * factor))
  }

  function applyPackage(pkgId: string, startStr: string) {
    const pkg = pkgs.find(p => p.id === pkgId)
    if (!pkg) { setForm(f => ({ ...f, packageId: pkgId, startDate: startStr })); return }
    const s = new Date(startStr)
    const e = new Date(s)
    e.setDate(e.getDate() + parseInt(pkg.days))
    setForm(f => ({
      ...f,
      packageId: pkgId,
      startDate: startStr,
      fees: feesAfterDiscount(pkg.fees, discountFactor),
      endDate: e.toISOString().slice(0, 10),
    }))
  }

  // React to coupon apply/clear: recompute fees against the currently selected package
  useEffect(() => {
    if (!form.packageId) return
    const pkg = pkgs.find(p => p.id === form.packageId)
    if (!pkg) return
    const newFees = feesAfterDiscount(pkg.fees, discountFactor)
    setForm(f => ({
      ...f,
      fees: newFees,
      amountPaid: String(Math.min(parseFloat(f.amountPaid) || 0, parseFloat(newFees) || 0)),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountFactor])

  async function handleSubmit() {
    if (!form.packageId || !form.startDate || !form.endDate) {
      setError('Please select a package and dates'); return
    }
    const feesNum = parseFloat(form.fees) || 0
    const paidNum = parseFloat(form.amountPaid) || 0
    if (paidNum > feesNum) {
      setError('Fees paid cannot exceed total fees'); return
    }
    setSaving(true); setError(null)
    try {
      const pkg = pkgs.find(p => p.id === form.packageId)
      const res = await fetch(`${API_BASE}/packageDetails/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: form.packageId,
          clientId,
          startDate: fromInputDate(form.startDate),
          endDate: fromInputDate(form.endDate),
          fees: form.fees,
          amountPaid: form.amountPaid,
          paymentDate: fromInputDate(form.paymentDate),
          status: 'active',
          description: pkg?.description ?? lastPackage.description ?? '',
          discontinue: 'false',
        }),
      })
      // API returns the new record ID as a raw number (not JSON object)
      const newPkgDetailId = parseInt(await res.text())
      if (!newPkgDetailId || newPkgDetailId <= 0) { setError('Failed to save package'); return }

      if (paidNum > 0) {
        await fetch(`${API_BASE}/paymentTransaction/create.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageDetailsId: newPkgDetailId,
            clientId,
            clientGender,
            feesPaid: form.amountPaid,
            paymentDate: fromInputDate(form.paymentDate),
            paymentMode: form.paymentMode,
            isApproved: 'YES',
            discontinue: 'false',
          }),
        })
      }
      // Persist coupon redemption AFTER a successful save so a failed save
      // doesn't burn the coupon. Non-blocking — never fails the flow.
      await couponRef.current?.redeem()
      // WC campaign conversion telemetry: if this client signed up as a
      // non-member via the World Cup mini-app, mark them as converted now.
      // No-op for everyone else, so safe to call unconditionally.
      fetch(`${API_BASE}/wc_signup/markConverted.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: Number(clientId) }),
      }).catch(() => {})
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedPkg = pkgs.find(p => p.id === form.packageId)
  const feesNum = parseFloat(form.fees) || 0
  const paidNum = parseFloat(form.amountPaid) || 0
  const dues = feesNum > paidNum ? feesNum - paidNum : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-800 text-base">Renew Package</h2>
            <p className="text-xs text-gray-400 mt-0.5">Continuing from {formatDate(lastPackage.endDate)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Package *</label>
            {loadingPkgs ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={form.packageId}
                onChange={e => applyPackage(e.target.value, form.startDate)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">— Choose a package —</option>
                {pkgs.map(p => (
                  <option key={p.id} value={p.id}>{p.description} — ₹{p.fees} / {p.days} days</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate}
                onChange={e => applyPackage(form.packageId, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date *</label>
              <input type="date" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {selectedPkg && (
            <div className="bg-orange-50 rounded-xl px-4 py-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-bold text-gray-800">{selectedPkg.days} days</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Fees</p>
                <p className="text-sm font-bold text-gray-800">{inr(feesNum)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance Due</p>
                <p className={`text-sm font-bold ${dues > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {dues > 0 ? inr(dues) : '✓ Paid'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Total Fees (₹)</label>
              <input type="number" value={form.fees} placeholder="0" readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fees Paid Now (₹)</label>
              <input type="number" value={form.amountPaid} placeholder="0" min="0" max={form.fees || undefined}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0
                  const max = parseFloat(form.fees) || 0
                  setForm(f => ({ ...f, amountPaid: String(Math.min(val, max)) }))
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['Cash', 'UPI', 'Card', 'Online', 'Cheque'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Date</label>
              <input type="date" value={form.paymentDate}
                onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          <CouponApplier ref={couponRef} clientId={clientId} onApply={setDiscountFactor} />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 pb-6 pt-2 flex gap-3 sticky bottom-0 bg-white border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.packageId || !form.startDate || !form.endDate}
            className="flex-1 py-2.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Renew Package'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AttendanceCalendar({
  attendance, month, year, loading, onPrev, onNext,
}: {
  attendance: AttendanceDay[]; month: number; year: number
  loading: boolean; onPrev: () => void; onNext: () => void
}) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const presentDays = new Set(attendance.map(a => parseInt(a.day)))

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const today = new Date()
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year
  const todayDate = today.getDate()

  return (
    <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-gray-500">{attendance.length} days attended</p>
        </div>
        <button
          onClick={onNext}
          disabled={isCurrentMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const isPresent = presentDays.has(day)
          const isToday = isCurrentMonth && day === todayDate
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium
                ${isPresent ? 'bg-green-500 text-white' : isToday ? 'bg-orange-100 text-orange-600 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-gray-500">Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
          <span className="text-xs text-gray-500">Today</span>
        </div>
      </div>
    </div>
  )
}

function PayModal({
  pkg,
  clientId,
  clientGender,
  onClose,
  onSuccess,
}: {
  pkg: PackageDetail
  clientId: string
  clientGender: string
  onClose: () => void
  onSuccess: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const fees = parseFloat(pkg.fees) || 0
  const alreadyPaid = parseFloat(pkg.amountPaid) || 0
  const pending = fees - alreadyPaid

  const [amount, setAmount] = useState(String(pending))
  const [coinsToApply, setCoinsToApply] = useState(0)
  const [coinBalance, setCoinBalance] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paymentDate, setPaymentDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/procointransaction/getBalance.php?clientId=${clientId}`)
      .then(r => r.json())
      .then(d => setCoinBalance(Math.floor(d.balance ?? 0)))
      .catch(() => {})
  }, [clientId])

  const paying = parseFloat(amount) || 0
  const maxCoins = Math.min(coinBalance, Math.floor(paying))
  const cashAmount = paying - coinsToApply

  async function handleSubmit() {
    if (paying <= 0) { setError('Enter an amount to pay'); return }
    if (paying > pending) { setError(`Amount cannot exceed pending balance of ${inr(pending)}`); return }
    if (coinsToApply > maxCoins) { setError(`Max ProCoins you can apply is ${maxCoins}`); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/paymentTransaction/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageDetailsId: pkg.id,
          clientId,
          clientGender,
          feesPaid: cashAmount,
          proCoinsUsed: coinsToApply,
          paymentDate: fromInputDate(paymentDate),
          paymentMode,
          isApproved: 'YES',
          discontinue: 'false',
        }),
      })
      const text = await res.text()
      if (text.includes('"error"')) {
        try { setError(JSON.parse(text).error || 'Payment failed') } catch { setError('Payment failed') }
        return
      }
      await fetch(`${API_BASE}/packageDetails/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pkg.id,
          packageId: pkg.packageId,
          clientId,
          startDate: pkg.startDate,
          endDate: pkg.endDate,
          fees: pkg.fees,
          amountPaid: String(alreadyPaid + paying),
          paymentDate: fromInputDate(paymentDate),
          status: pkg.status,
          description: pkg.description,
          discontinue: pkg.discontinue,
        }),
      })
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">Record Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Summary */}
          <div className="bg-orange-50 rounded-xl px-4 py-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">Total Fees</p>
              <p className="text-sm font-bold text-gray-800">{inr(fees)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Collected</p>
              <p className="text-sm font-bold text-gray-800">{inr(alreadyPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-sm font-bold text-orange-600">{inr(pending)}</p>
            </div>
          </div>

          {/* Total installment */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fees Paying Now (₹)</label>
            <input
              type="number" value={amount} min="0" max={pending}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0
                const clamped = Math.min(val, pending)
                setAmount(String(clamped))
                setCoinsToApply(c => Math.min(c, Math.min(coinBalance, Math.floor(clamped))))
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* ProCoins section — shown only when member has a balance */}
          {coinBalance > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-yellow-800">ProCoin Balance</span>
                <span className="text-xs font-bold text-yellow-700">{coinBalance} coins = {inr(coinBalance)}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Apply ProCoins (max {maxCoins})
                </label>
                <input
                  type="text" inputMode="numeric" value={coinsToApply === 0 ? '' : String(coinsToApply)}
                  placeholder="0"
                  onChange={e => {
                    const val = parseInt(e.target.value.replace(/\D/g, '')) || 0
                    setCoinsToApply(Math.min(Math.max(0, val), maxCoins))
                  }}
                  className="w-full border border-yellow-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              {coinsToApply > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-yellow-200">
                  <span className="text-xs text-gray-500">Cash to collect</span>
                  <span className="text-sm font-bold text-green-700">{inr(cashAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Mode + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {['Cash', 'UPI', 'Card', 'Online', 'Cheque'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Date</label>
              <input type="date" value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 pb-6 pt-2 flex gap-3 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || pending <= 0}
            className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'memberships' | 'attendance' | 'weight' | 'workout'

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const fileRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('memberships')
  const [imgError, setImgError] = useState(false)
  const [remindersExpanded, setRemindersExpanded] = useState(false)

  // Attendance navigation state
  const [attViewMonth, setAttViewMonth] = useState(0)
  const [attViewYear, setAttViewYear] = useState(0)
  const [attViewData, setAttViewData] = useState<AttendanceDay[]>([])
  const [attViewLoading, setAttViewLoading] = useState(false)
  const [attYearData, setAttYearData] = useState<AttendanceDay[]>([])
  const [attStatsLoading, setAttStatsLoading] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageDetail | null>(null)
  const [payingPackage, setPayingPackage] = useState<PackageDetail | null>(null)

  // Password gate
  type GateAction = { type: 'editProfile' } | { type: 'deleteProfile' } | { type: 'editPackage'; packageId: string } | { type: 'deletePackage'; packageId: string } | { type: 'payPackage'; packageId: string }
  const [gateAction, setGateAction] = useState<GateAction | null>(null)
  const [gatePassword, setGatePassword] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)
  const [gateChecking, setGateChecking] = useState(false)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // Workout tab state
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutMainType[]>([])
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([])
  const [workoutTabLoading, setWorkoutTabLoading] = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [assigningAwp, setAssigningAwp] = useState(false)
  const [previewPlanId, setPreviewPlanId] = useState<string>('')
  const [previewExercises, setPreviewExercises] = useState<WorkoutExerciseTemplate[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  // Reminder channels — per-channel last-sent timestamps, keyed by clientId then by kind.
  // Shape: { [clientId]: { photo: { wa, sms, email }, welcome: {...}, app_launch: {...} } }
  type ReminderKind = 'photo' | 'welcome' | 'app_launch'
  type ChannelMap = { wa?: string; sms?: string; email?: string }
  type AllChannels = Partial<Record<ReminderKind, ChannelMap>>
  const [reminderChannels, setReminderChannels] = useState<Record<string, AllChannels>>(() => {
    try {
      // Migrate legacy flat shape ({ [cid]: { wa, sms, email } } = photo only) into new nested shape
      const v2 = localStorage.getItem('progym_member_reminders_v2')
      if (v2) return JSON.parse(v2)
      const legacy = JSON.parse(localStorage.getItem('progym_photo_reminder_channels') || '{}')
      const migrated: Record<string, AllChannels> = {}
      for (const cid of Object.keys(legacy)) migrated[cid] = { photo: legacy[cid] }
      return migrated
    }
    catch { return {} }
  })
  const [photoEmailSending, setPhotoEmailSending] = useState(false)
  const [photoEmailResult, setPhotoEmailResult] = useState<'sent' | 'error' | null>(null)
  const [welcomeEmailSending, setWelcomeEmailSending] = useState(false)
  const [welcomeEmailResult, setWelcomeEmailResult] = useState<'sent' | 'error' | null>(null)
  const [appLaunchEmailSending, setAppLaunchEmailSending] = useState(false)
  const [appLaunchEmailResult, setAppLaunchEmailResult] = useState<'sent' | 'error' | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/member/detail.php?id=${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (tab !== 'workout' || !id) return
    setWorkoutTabLoading(true)
    Promise.all([
      fetch(`${API_BASE}/t_workoutmaintype/getAll.php`).then(r => r.json()),
      fetch(`${API_BASE}/workoutScheduleObject/getAllByClientId.php?cid=${id}`).then(r => r.json()),
    ])
      .then(([types, sessions]) => {
        setWorkoutTypes(Array.isArray(types) ? types.filter((t: WorkoutMainType) => t.discontinue !== 'true') : [])
        const sorted = Array.isArray(sessions)
          ? sessions
              .filter((s: WorkoutSession) => s.discontinue !== 'true')
              .sort((a: WorkoutSession, b: WorkoutSession) => {
                const p = (d: string) => { const [dd, mm, yy] = d.split('/'); return new Date(+yy, +mm - 1, +dd).getTime() }
                return p(b.date) - p(a.date)
              })
          : []
        setWorkoutSessions(sorted)
      })
      .finally(() => setWorkoutTabLoading(false))
  }, [tab, id])

  function openPlanPicker() {
    setPreviewPlanId(data?.client.awp ?? '')
    setPreviewExercises([])
    setShowPlanPicker(true)
    if (data?.client.awp) loadPlanExercises(data.client.awp)
  }

  function loadPlanExercises(mtid: string) {
    setPreviewPlanId(mtid)
    setPreviewLoading(true)
    setPreviewExercises([])
    fetch(`${API_BASE}/t_workoutsubtype/getAllByMainTypeId.php?mtid=${mtid}`)
      .then(r => r.json())
      .then(d => setPreviewExercises(Array.isArray(d) ? d.filter((e: WorkoutExerciseTemplate) => e.discontinue !== 'true') : []))
      .catch(() => setPreviewExercises([]))
      .finally(() => setPreviewLoading(false))
  }

  async function assignWorkoutPlan(typeId: string) {
    if (!data) return
    setAssigningAwp(true)
    try {
      await fetch(`${API_BASE}/client/updateWorkoutPlan.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.client.id, awp: typeId }),
      })
      setShowPlanPicker(false)
      reloadData()
    } finally {
      setAssigningAwp(false)
    }
  }

  function openGate(action: GateAction) {
    setGateAction(action)
    setGatePassword('')
    setGateError(null)
  }

  async function confirmGate() {
    if (!gateAction || !user) return
    setGateChecking(true)
    setGateError(null)
    try {
      const res = await fetch(`${API_BASE}/adminuser/validateByMobile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: user.mobile, password: gatePassword }),
      })
      const json = await res.json()
      if (!json.valid) {
        setGateError('Incorrect password. Please try again.')
        setGateChecking(false)
        return
      }
      const action = gateAction
      setGateAction(null)
      setGatePassword('')
      if (action.type === 'editProfile') {
        startEdit()
      } else if (action.type === 'deleteProfile') {
        await fetch(`${API_BASE}/client/delete.php?id=${id}`)
        navigate('/members', { replace: true })
      } else if (action.type === 'editPackage') {
        handleEdit(action.packageId)
      } else if (action.type === 'deletePackage') {
        await fetch(`${API_BASE}/packageDetails/delete.php?id=${action.packageId}`)
        reloadData()
      } else if (action.type === 'payPackage') {
        handlePay(action.packageId)
      }
    } catch {
      setGateError('Network error. Please try again.')
    } finally {
      setGateChecking(false)
    }
  }

  function startEdit() {
    if (!data) return
    const c = data.client
    setEditForm({
      name: c.name || '',
      mobile: c.mobile || '',
      email: c.email || '',
      gender: c.gender || '',
      birthDate: c.birthDate || '',
      bloodGroup: c.bloodGroup || '',
      address: c.address || '',
      occupation: c.occupation || '',
      height: c.height || '',
      weight: c.weight || '',
      remarks: c.remarks || '',
      previousGym: c.previousGym || '',
    })
    setPhotoPreview(null)
    setPhotoBase64('')
    setSaveMsg(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditForm(null)
    setSaveMsg(null)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    correctImageOrientation(file).then(dataUrl => {
      setCropSrc(dataUrl)
    })
  }

  function handleCropConfirm(croppedDataUrl: string) {
    setCropSrc(null)
    setPhotoPreview(croppedDataUrl)
    setPhotoBase64(croppedDataUrl.split(',')[1])
  }

  function handleCropCancel() {
    setCropSrc(null)
  }

  function markChannelReminded(kind: ReminderKind, channel: 'wa' | 'sms' | 'email') {
    if (!id) return
    const prev = reminderChannels[id] ?? {}
    const prevKind = prev[kind] ?? {}
    const updated = {
      ...reminderChannels,
      [id]: { ...prev, [kind]: { ...prevKind, [channel]: new Date().toISOString() } },
    }
    setReminderChannels(updated)
    localStorage.setItem('progym_member_reminders_v2', JSON.stringify(updated))
  }

  async function sendReminderEmail(
    kind: ReminderKind,
    endpoint: string,
    setSending: (b: boolean) => void,
    setResult: (r: 'sent' | 'error' | null) => void,
  ) {
    if (!id) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/client/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id }),
      })
      const json = await res.json()
      if (json.error) console.error(`${kind} email error:`, json.error)
      const status = json.sent === 1 ? 'sent' : 'error'
      setResult(status)
      if (status === 'sent') markChannelReminded(kind, 'email')
    } catch (e) {
      console.error(`${kind} email fetch error:`, e)
      setResult('error')
    } finally {
      setSending(false)
    }
  }

  const sendPhotoReminderEmail   = () => sendReminderEmail('photo',      'sendPhotoReminderEmail.php',   setPhotoEmailSending,     setPhotoEmailResult)
  const sendWelcomeEmail         = () => sendReminderEmail('welcome',    'sendWelcomeEmail.php',         setWelcomeEmailSending,   setWelcomeEmailResult)
  const sendAppLaunchEmail       = () => sendReminderEmail('app_launch', 'sendAppLaunchEmailSingle.php', setAppLaunchEmailSending, setAppLaunchEmailResult)

  async function handleSave() {
    if (!editForm || !data) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const body = {
        id: data.client.id,
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
        email: editForm.email.trim(),
        gender: editForm.gender,
        birthDate: editForm.birthDate,
        bloodGroup: editForm.bloodGroup,
        address: editForm.address.trim(),
        occupation: editForm.occupation.trim(),
        height: editForm.height,
        weight: editForm.weight,
        remarks: editForm.remarks.trim(),
        previousGym: editForm.previousGym.trim(),
        photo: photoBase64,
      }
      const res = await fetch(`${API_BASE}/client/updateClientAdmin.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.message?.includes('failed')) {
        setSaveMsg({ ok: false, text: json.message || 'Update failed' })
        return
      }
      setData(d => d ? {
        ...d,
        client: {
          ...d.client,
          ...editForm,
          photo: json.photo || d.client.photo,
        },
      } : null)
      setImgError(false)
      setEditing(false)
      setEditForm(null)
      setSaveMsg({ ok: true, text: 'Profile updated successfully' })
      setTimeout(() => setSaveMsg(null), 3000)
    } catch {
      setSaveMsg({ ok: false, text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // Sync attendance view state once on initial data load
  useEffect(() => {
    if (!data || attViewMonth !== 0) return
    setAttViewMonth(data.attendanceMonth)
    setAttViewYear(data.attendanceYear)
    setAttViewData(data.attendance)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch 2 years of attendance data for the monthly chart
  useEffect(() => {
    if (tab !== 'attendance' || !id) return
    const cy = new Date().getFullYear()
    setAttStatsLoading(true)
    Promise.all([
      fetch(`${API_BASE}/attendance/byYear.php?cid=${id}&year=${cy - 1}`)
        .then(r => r.json()).then(d => Array.isArray(d) ? d : []).catch(() => []),
      fetch(`${API_BASE}/attendance/byYear.php?cid=${id}&year=${cy}`)
        .then(r => r.json()).then(d => Array.isArray(d) ? d : []).catch(() => []),
    ])
      .then(([prev, cur]) => {
        const seen = new Set()
        const deduped = [...prev, ...cur].filter(r => {
          if (seen.has(r.id)) return false
          seen.add(r.id)
          return true
        })
        setAttYearData(deduped)
      })
      .finally(() => setAttStatsLoading(false))
  }, [tab, id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </header>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
          <div className="h-28 bg-white rounded-2xl animate-pulse" />
          <div className="h-48 bg-white rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-2">
        <p className="text-4xl">😕</p>
        <p className="text-gray-600 font-semibold">Could not load member</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-sm text-orange-500 underline">Go back</button>
      </div>
    )
  }

  const { client, packages, attendance, weights, dietName, workoutName } = data
  const isActive = client.profileActiveFlag === 'enable'
  const age = calcAge(client.birthDate)
  const photoUrl = client.photo && !imgError
    ? (client.photo.startsWith('http') ? client.photo : `${IMG_BASE}/${client.photo}`)
    : null

  const recentPkg = packages[0] ?? null
  const activeDays = calcDaysLeft(recentPkg?.endDate ?? null)
  const totalDues = recentPkg
    ? Math.max(0, parseFloat(recentPkg.fees) - parseFloat(recentPkg.amountPaid))
    : 0

  const hasPhoto = !!photoUrl
  const mobile10 = client.mobile.replace(/\D/g, '').slice(-10)
  const uploadUrl = 'https://tavrostechinfo.com/progym/upload-photo'
  const loginUrl  = 'https://tavrostechinfo.com/progym/login'
  const waPhotoMsg = `Hi ${client.name}! 👋 Warm greetings from ProGym!\n\nWe noticed your profile is missing a photo. 📸\n\n🎁 *Upload your photo & earn 10 ProCoins instantly!*\n\n💡 *What are ProCoins?*\n→ 100 Welcome Coins already credited to your account\n→ Earn more by completing your profile & gym activities\n→ Redeem them for discounts in the ProGym Shop 🛍️\n\n📸 Upload your photo here 👇\n${uploadUrl}\n\nSee you at the gym! 💪\n— ProGym Team`
  const smsPhotoMsg = `Hi ${client.name}! Greetings from ProGym. Your profile photo is missing - upload it & earn 10 ProCoins (redeemable in our shop)! 📸 Upload your photo here: ${uploadUrl} - ProGym Team`

  const waWelcomeMsg = `🏋 *Welcome to Pro Gym, Kolhapur!*\n\nHi ${client.name}, your membership is now active. We're thrilled to have you on board!\n\n🎉 *100 ProCoins* credited to your wallet as a welcome bonus.\n💡 1 ProCoin = ₹1, redeemable in the ProGym shop or on your next package.\n\n👉 Login: ${loginUrl}\n\n— ProGym Team 💪`
  const smsWelcomeMsg = `Hi ${client.name}, welcome to Pro Gym, Kolhapur! 100 ProCoins credited to your wallet as welcome bonus. Login at ${loginUrl}`

  const waAppLaunchMsg = `🚀 *ProGym App is Now Live!*\n\nHi ${client.name}, your gym just went digital. Track workouts, diet, attendance, weight & shop — all from your phone.\n\n🎁 *100 ProCoins* welcome bonus waiting for you!\n💡 1 ProCoin = ₹1\n\n👉 Login: ${loginUrl}\n\n— ProGym Team 💪`
  const smsAppLaunchMsg = `Hi ${client.name}! ProGym app is now live. Track workouts, diet, attendance & earn ProCoins. Login: ${loginUrl}`

  const memberReminders = reminderChannels[client.id] ?? {}
  const photoChannels   = memberReminders.photo      ?? {}
  const welcomeChannels = memberReminders.welcome    ?? {}
  const appLaunchChans  = memberReminders.app_launch ?? {}

  function handleAddPackage() {
    setShowAddModal(true)
  }

  function reloadData() {
    fetch(`${API_BASE}/member/detail.php?id=${id}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }

  function goToMonth(m: number, y: number) {
    setAttViewMonth(m)
    setAttViewYear(y)
    setAttViewLoading(true)
    fetch(`${API_BASE}/attendance/byMonthAndYear.php?month=${m}&year=${y}&cid=${id}`)
      .then(r => r.json())
      .then(d => setAttViewData(Array.isArray(d) ? d : []))
      .catch(() => setAttViewData([]))
      .finally(() => setAttViewLoading(false))
  }

  function navigateAtt(delta: number) {
    let m = attViewMonth + delta
    let y = attViewYear
    if (m > 12) { m = 1; y++ }
    if (m < 1)  { m = 12; y-- }
    goToMonth(m, y)
  }

  const lastPkg = packages.length > 0
    ? packages.reduce((latest, p) => {
        const d1 = parseDMY(p.endDate), d2 = parseDMY(latest.endDate)
        if (!d1) return latest
        if (!d2) return p
        return d1 > d2 ? p : latest
      })
    : null

  function handleRenewPackage() {
    if (lastPkg) setShowRenewModal(true)
  }

  function handleEdit(packageId: string) {
    const pkg = packages.find(p => p.id === packageId)
    if (pkg) setEditingPackage(pkg)
  }

  function requestEdit(packageId: string) { openGate({ type: 'editPackage', packageId }) }
  function requestDelete(packageId: string) { openGate({ type: 'deletePackage', packageId }) }
  function requestPay(packageId: string) { openGate({ type: 'payPackage', packageId }) }

  function handlePay(packageId: string) {
    const pkg = packages.find(p => p.id === packageId)
    if (pkg) setPayingPackage(pkg)
  }



  const TABS: { key: Tab; label: string; badge?: number }[] = isTrainer
    ? [
        // Trainer: view-only membership + full-CRUD workout. Other tabs hidden entirely.
        { key: 'memberships', label: 'Memberships', badge: packages.length },
        { key: 'workout', label: 'Workouts' },
      ]
    : [
        { key: 'profile', label: 'Profile' },
        { key: 'memberships', label: 'Memberships', badge: packages.length },
        { key: 'attendance', label: 'Attendance', badge: attendance.length },
        { key: 'weight', label: 'Weight', badge: weights.length },
        { key: 'workout', label: 'Workouts' },
      ]

  // Current photo for display in edit mode
  const editPhotoUrl = photoPreview ?? photoUrl

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    )}
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => editing ? cancelEdit() : navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 text-base leading-tight truncate">{client.name}</h1>
            <p className="text-xs text-gray-400">Member #{client.id}</p>
          </div>
          {editing ? (
            <button
              onClick={cancelEdit}
              className="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              Cancel
            </button>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
      </header>

      {/* Hero card */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-start gap-5">
          {/* Avatar / Photo */}
          <div className="relative flex-shrink-0">
            {editPhotoUrl ? (
              <img
                src={editPhotoUrl}
                onError={() => { if (!photoPreview) setImgError(true) }}
                alt={client.name}
                className="w-36 h-36 rounded-2xl object-cover border border-gray-100 shadow-sm"
              />
            ) : (
              <div className={`w-36 h-36 rounded-2xl ${avatarColor(client.name)} flex items-center justify-center text-white text-5xl font-bold shadow-sm`}>
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}
            {editing && (
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-orange-500 rounded-xl flex items-center justify-center shadow-md border-2 border-white hover:bg-orange-600 transition-colors"
                title="Change photo"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* Name + badges + stats */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-36">
            <div>
              <p className="font-bold text-gray-800 text-xl leading-tight truncate">{client.name}</p>
              {!isTrainer && <p className="text-sm text-gray-500 mt-0.5">+91 {client.mobile}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {client.gender && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium capitalize">{client.gender}</span>
                )}
                {age && <span className="text-xs text-gray-400">{age} yrs</span>}
                {client.bloodGroup && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">{client.bloodGroup.replace('_', '+').replace('minus', '-')}</span>
                )}
              </div>
            </div>

            {/* Quick stats inline */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className={`text-lg font-bold ${daysLeftColor(activeDays)}`}>
                  {activeDays === null ? '—' : activeDays < 0 ? 0 : activeDays}
                </p>
                <p className="text-xs text-gray-400">days left</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className={`text-lg font-bold ${totalDues > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                  {totalDues > 0 ? inr(totalDues) : '✓'}
                </p>
                <p className="text-xs text-gray-400">{totalDues > 0 ? 'dues' : 'no dues'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder panels — collapsible (hidden for trainer) */}
      {!isTrainer && (
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button
            type="button"
            onClick={() => setRemindersExpanded(p => !p)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span>🔔</span>
              <span>Reminders</span>
              <span className="text-xs font-normal text-slate-400">
                {hasPhoto ? 'Welcome · App Launch' : 'Photo · Welcome · App Launch'}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
              {remindersExpanded ? 'Hide' : 'View'}
              <svg className={`w-4 h-4 transition-transform ${remindersExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {remindersExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {!hasPhoto && (
                <ReminderColumn
                  icon="📸"
                  label="Profile Photo Reminder"
                  theme={THEME_PHOTO}
                  waMessage={waPhotoMsg}
                  smsMessage={smsPhotoMsg}
                  mobile10={mobile10}
                  hasEmail={!!client.email}
                  channels={photoChannels}
                  emailSending={photoEmailSending}
                  emailResult={photoEmailResult}
                  onSendEmail={sendPhotoReminderEmail}
                  onMarkChannel={(c) => markChannelReminded('photo', c)}
                />
              )}
              <ReminderColumn
                icon="🎉"
                label="Welcome Message"
                theme={THEME_WELCOME}
                waMessage={waWelcomeMsg}
                smsMessage={smsWelcomeMsg}
                mobile10={mobile10}
                hasEmail={!!client.email}
                channels={welcomeChannels}
                emailSending={welcomeEmailSending}
                emailResult={welcomeEmailResult}
                onSendEmail={sendWelcomeEmail}
                onMarkChannel={(c) => markChannelReminded('welcome', c)}
              />
              <ReminderColumn
                icon="🚀"
                label="App Launch"
                theme={THEME_APPLAUNCH}
                waMessage={waAppLaunchMsg}
                smsMessage={smsAppLaunchMsg}
                mobile10={mobile10}
                hasEmail={!!client.email}
                channels={appLaunchChans}
                emailSending={appLaunchEmailSending}
                emailResult={appLaunchEmailResult}
                onSendEmail={sendAppLaunchEmail}
                onMarkChannel={(c) => markChannelReminded('app_launch', c)}
              />
            </div>
          )}
        </div>
      </div>
      )}

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-4xl mx-auto px-4 flex overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { if (!editing) setTab(t.key) }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0
                ${tab === t.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}
                ${editing && t.key !== 'profile' ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hidden file input for photo */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

      {/* Tab content */}
      <main className="max-w-4xl mx-auto px-4 py-4 pb-10">

        {/* ── Profile ── */}
        {tab === 'profile' && (
          <div className="space-y-3">

            {/* Save/error banner */}
            {saveMsg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${saveMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <span>{saveMsg.ok ? '✓' : '✗'}</span>
                {saveMsg.text}
              </div>
            )}

            {editing && editForm ? (
              /* ── Edit mode ── */
              <>
                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Basic Info</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Mobile</label>
                      <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-orange-400 transition-colors overflow-hidden">
                        <span className="pl-3 pr-1 text-sm text-gray-400 select-none">+91</span>
                        <input
                          type="tel"
                          value={editForm.mobile}
                          onChange={e => setEditForm(f => f ? { ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) } : f)}
                          className="flex-1 px-2 py-2.5 text-sm text-gray-800 outline-none bg-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Gender</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['male', 'female'] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setEditForm(f => f ? { ...f, gender: g } : f)}
                            className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all capitalize
                              ${editForm.gender === g
                                ? g === 'male' ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-pink-400 bg-pink-50 text-pink-600'
                                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                              }`}
                          >
                            {g === 'male' ? '♂' : '♀'} {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Personal Details</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm(f => f ? { ...f, email: e.target.value } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Date of Birth</label>
                      <input
                        type="date"
                        value={toInputDate(editForm.birthDate)}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={e => setEditForm(f => f ? { ...f, birthDate: fromInputDate(e.target.value) } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Blood Group</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {BLOOD_GROUPS.map(bg => (
                          <button
                            key={bg.value}
                            type="button"
                            onClick={() => setEditForm(f => f ? { ...f, bloodGroup: f.bloodGroup === bg.value ? '' : bg.value } : f)}
                            className={`py-2 rounded-xl border-2 text-sm font-bold transition-all
                              ${editForm.bloodGroup === bg.value
                                ? 'border-red-400 bg-red-50 text-red-600'
                                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                              }`}
                          >
                            {bg.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Address</label>
                      <textarea
                        value={editForm.address}
                        onChange={e => setEditForm(f => f ? { ...f, address: e.target.value } : f)}
                        rows={2}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Occupation</label>
                      <input
                        type="text"
                        value={editForm.occupation}
                        onChange={e => setEditForm(f => f ? { ...f, occupation: e.target.value } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Fitness */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fitness</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Height (cm)</label>
                      <input
                        type="number"
                        value={editForm.height}
                        onChange={e => setEditForm(f => f ? { ...f, height: e.target.value } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Weight (kg)</label>
                      <input
                        type="number"
                        value={editForm.weight}
                        onChange={e => setEditForm(f => f ? { ...f, weight: e.target.value } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Other */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Other</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Previous Gym</label>
                      <input
                        type="text"
                        value={editForm.previousGym}
                        onChange={e => setEditForm(f => f ? { ...f, previousGym: e.target.value } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Remarks</label>
                      <input
                        type="text"
                        value={editForm.remarks}
                        onChange={e => setEditForm(f => f ? { ...f, remarks: e.target.value } : f)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm rounded-2xl shadow-md disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              /* ── Read-only mode ── */
              <>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openGate({ type: 'deleteProfile' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Profile
                  </button>
                  <button
                    onClick={() => openGate({ type: 'editProfile' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2">
                  <InfoRow label="Mobile" value={'+91 ' + client.mobile} />
                  <InfoRow label="Email" value={client.email} />
                  <InfoRow label="Date of Birth" value={formatDate(client.birthDate) + (age ? ` (${age} yrs)` : '')} />
                  <InfoRow label="Gender" value={client.gender} />
                  <InfoRow label="Blood Group" value={client.bloodGroup?.replace('_', '+').replace('minus', '-')} />
                  <InfoRow label="Address" value={client.address} />
                  <InfoRow label="Occupation" value={client.occupation} />
                  {data.referredBy && (
                    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400 w-28 flex-shrink-0 mt-0.5">Referred by</span>
                      <button
                        onClick={() => navigate(`/members/${data.referredBy!.id}`)}
                        className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium text-left flex-1"
                      >
                        {data.referredBy.name}
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2">
                  <InfoRow label="Height" value={client.height ? client.height + ' cm' : null} />
                  <InfoRow label="Weight" value={client.weight ? client.weight + ' kg' : null} />
                  <InfoRow label="Admission" value={formatDate(client.admissionDate)} />
                  <InfoRow label="Previous Gym" value={client.previousGym} />
                  <InfoRow label="Remarks" value={client.remarks} />
                </div>

                {(dietName || workoutName) && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2">
                    <InfoRow label="Diet Plan" value={dietName} />
                    <InfoRow label="Workout Plan" value={workoutName} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Memberships ── */}
        {tab === 'memberships' && (
          <div className="-mx-4">
            {!isTrainer && (
              <div className="flex gap-2 mb-3 px-4">
                <button onClick={handleAddPackage} className="flex-1 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  + Add Package
                </button>
                <button onClick={handleRenewPackage} className="flex-1 py-2 text-sm font-medium border border-orange-400 text-orange-500 rounded-lg hover:bg-orange-50 transition-colors">
                  Renew Package
                </button>
              </div>
            )}
            <div className="bg-white border-y border-gray-100 shadow-sm overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pl-4">Package</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Start Date</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">End Date</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right whitespace-nowrap">Fees</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right whitespace-nowrap">Collected</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                    <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400">
                        <p className="text-3xl mb-2">📦</p>
                        <p className="font-semibold text-gray-600 text-sm">No package history</p>
                      </td>
                    </tr>
                  ) : packages.map(pkg => (
                    <PackageRow
                      key={pkg.id}
                      pkg={pkg}
                      clientName={data?.client?.name || ''}
                      clientMobile={data?.client?.mobile || ''}
                      onEdit={isTrainer ? undefined : requestEdit}
                      onDelete={isTrainer ? undefined : requestDelete}
                      onPay={isTrainer ? undefined : requestPay}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Attendance ── */}
        {tab === 'attendance' && (() => {
          // Build last 12 months chart data from 2-year fetch
          const now = new Date()
          const last12 = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
            return { month: d.getMonth() + 1, year: d.getFullYear() }
          })
          const countMap = new Map<string, number>()
          for (const r of attYearData) {
            const parts = r.date?.split('/')
            if (!parts || parts.length !== 3) continue
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10)
            const year = parseInt(parts[2], 10)
            if (isNaN(day) || isNaN(month) || isNaN(year)) continue
            const key = `${year}-${String(month).padStart(2, '0')}`
            countMap.set(key, (countMap.get(key) ?? 0) + 1)
          }
          const chartData = last12.map(({ month, year }) => ({
            month, year, count: countMap.get(`${year}-${String(month).padStart(2, '0')}`) ?? 0,
          }))
          const maxCount = Math.max(...chartData.map(d => d.count), 1)
          const thisYearTotal = chartData.filter(d => d.year === now.getFullYear()).reduce((s, d) => s + d.count, 0)
          const bestMonth = chartData.reduce((b, d) => d.count > b.count ? d : b, chartData[0] ?? { month: 1, year: now.getFullYear(), count: 0 })
          const avg = Math.round(chartData.reduce((s, d) => s + d.count, 0) / 12)

          function barColor(count: number) {
            if (count === 0) return 'bg-gray-100'
            const r = count / maxCount
            if (r >= 0.8) return 'bg-green-500'
            if (r >= 0.6) return 'bg-green-400'
            if (r >= 0.35) return 'bg-yellow-400'
            if (r >= 0.15) return 'bg-orange-400'
            return 'bg-orange-300'
          }

          return (
            <div className="space-y-3">
              {/* Calendar */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                {attViewMonth !== 0 && (
                  <AttendanceCalendar
                    attendance={attViewData}
                    month={attViewMonth}
                    year={attViewYear}
                    loading={attViewLoading}
                    onPrev={() => navigateAtt(-1)}
                    onNext={() => navigateAtt(1)}
                  />
                )}
              </div>

              {/* Monthly overview chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-700">Monthly Overview</p>
                  {attStatsLoading && (
                    <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
                  )}
                </div>

                {/* Bar chart */}
                <div className="flex items-end gap-1" style={{ height: 96 }}>
                  {chartData.map(d => {
                    const barH = d.count === 0 ? 4 : Math.max(Math.round((d.count / maxCount) * 80), 10)
                    const isActive = d.month === attViewMonth && d.year === attViewYear
                    return (
                      <button
                        key={`${d.year}-${d.month}`}
                        onClick={() => goToMonth(d.month, d.year)}
                        title={`${MONTHS[d.month - 1]} ${d.year}: ${d.count} days`}
                        className="flex-1 flex flex-col items-center justify-end gap-0.5 group focus:outline-none"
                      >
                        {d.count > 0 && (
                          <span className="text-[9px] font-semibold text-gray-500 group-hover:text-gray-800 transition-colors leading-none">
                            {d.count}
                          </span>
                        )}
                        <div
                          className={`w-full rounded-t transition-all group-hover:opacity-80 ${barColor(d.count)} ${isActive ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`}
                          style={{ height: barH }}
                        />
                      </button>
                    )
                  })}
                </div>

                {/* Month labels */}
                <div className="flex gap-1 mt-1">
                  {chartData.map(d => (
                    <div key={`${d.year}-${d.month}`} className="flex-1 text-center">
                      <span className={`text-[9px] font-medium ${d.month === attViewMonth && d.year === attViewYear ? 'text-orange-500' : 'text-gray-400'}`}>
                        {MONTH_SHORT[d.month - 1]}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /><span className="text-[10px] text-gray-400">High</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-yellow-400" /><span className="text-[10px] text-gray-400">Mid</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-orange-300" /><span className="text-[10px] text-gray-400">Low</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200" /><span className="text-[10px] text-gray-400">None</span></div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <p className="text-base font-bold text-green-600">{thisYearTotal}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">This Year</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                    <p className="text-base font-bold text-orange-500">{bestMonth.count}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {bestMonth.count > 0 ? `Best (${MONTH_SHORT[bestMonth.month - 1]})` : 'Best Month'}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                    <p className="text-base font-bold text-blue-500">{avg}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Avg / Month</p>
                  </div>
                </div>

                {/* Monthly table */}
                <div className="mt-4 border-t border-gray-50 pt-3">
                  <div className="space-y-1">
                    {[...chartData].reverse().map(d => {
                      const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
                      const isActive = d.month === attViewMonth && d.year === attViewYear
                      return (
                        <button
                          key={`${d.year}-${d.month}`}
                          onClick={() => goToMonth(d.month, d.year)}
                          className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                        >
                          <span className={`text-xs font-medium w-20 flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-gray-600'}`}>
                            {MONTHS[d.month - 1].slice(0, 3)} {d.year}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor(d.count)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold w-12 text-right flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-gray-500'}`}>
                            {d.count} {d.count === 1 ? 'day' : 'days'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Weight ── */}
        {tab === 'weight' && (
          <div className="space-y-2">
            {weights.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">⚖️</p>
                <p className="font-semibold text-gray-600">No weight records</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
                  <div className="flex items-end gap-1" style={{ height: 80 }}>
                    {[...weights].reverse().map((w, _i, arr) => {
                      const vals = arr.map(x => parseFloat(x.weight))
                      const min = Math.min(...vals), max = Math.max(...vals)
                      const range = max - min || 1
                      const pct = ((parseFloat(w.weight) - min) / range) * 70 + 10
                      return (
                        <div key={w.id} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                          <div
                            className="w-full bg-orange-400 rounded-t"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">{[...weights].reverse()[0]?.date}</span>
                    <span className="text-xs text-gray-400">{weights[0]?.date}</span>
                  </div>
                </div>

                {weights.map((w, idx) => {
                  const prevWeight = idx > 0 ? parseFloat(weights[idx - 1].weight) : null
                  const diff = prevWeight !== null ? parseFloat(w.weight) - prevWeight : null
                  return (
                    <div key={w.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{w.weight} kg</p>
                        <p className="text-xs text-gray-400">{w.date}</p>
                      </div>
                      {diff !== null && diff !== 0 && (
                        <span className={`text-xs font-medium ${diff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)} kg
                        </span>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── Workouts ── */}
        {tab === 'workout' && (
          <div className="space-y-4">
            {workoutTabLoading ? (
              <div className="space-y-3">
                <div className="h-28 bg-white rounded-2xl animate-pulse" />
                <div className="h-40 bg-white rounded-2xl animate-pulse" />
              </div>
            ) : (
              <>
                {/* Current assigned plan */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Assigned Workout Plan</h3>
                    <button
                      onClick={openPlanPicker}
                      className="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 font-medium hover:bg-orange-100 transition-colors"
                    >
                      {workoutName ? 'Change Plan' : 'Assign Plan'}
                    </button>
                  </div>

                  {workoutName ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-lg">🏋️</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{workoutName}</p>
                        <p className="text-xs text-gray-400">Current plan</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No workout plan assigned yet</p>
                  )}

                </div>

                {/* Workout sessions history */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Workout Sessions
                    {workoutSessions.length > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{workoutSessions.length}</span>
                    )}
                  </h3>

                  {workoutSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-3xl mb-2">🏃</p>
                      <p className="text-sm font-semibold text-gray-500">No sessions yet</p>
                      <p className="text-xs mt-1 text-gray-400">Sessions appear once the member starts their daily workout</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workoutSessions.slice(0, 30).map(s => {
                        const typeName = workoutTypes.find(t => t.id === s.mtid)?.name ?? `Plan #${s.mtid}`
                        return (
                          <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm flex-shrink-0">🗓️</div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{s.date}</p>
                              <p className="text-xs text-gray-400">{typeName}</p>
                            </div>
                          </div>
                        )
                      })}
                      {workoutSessions.length > 30 && (
                        <p className="text-xs text-center text-gray-400 pt-1">Showing latest 30 of {workoutSessions.length} sessions</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddPackageModal
          clientId={client.id}
          clientGender={client.gender}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); reloadData() }}
        />
      )}
      {showRenewModal && lastPkg && (
        <RenewPackageModal
          clientId={client.id}
          clientGender={client.gender}
          lastPackage={lastPkg}
          onClose={() => setShowRenewModal(false)}
          onSuccess={() => { setShowRenewModal(false); reloadData() }}
        />
      )}
      {editingPackage && (
        <EditPackageModal
          pkg={editingPackage}
          clientId={client.id}
          onClose={() => setEditingPackage(null)}
          onSuccess={() => { setEditingPackage(null); reloadData() }}
        />
      )}
      {payingPackage && (
        <PayModal
          pkg={payingPackage}
          clientId={client.id}
          clientGender={client.gender}
          onClose={() => setPayingPackage(null)}
          onSuccess={() => { setPayingPackage(null); reloadData() }}
        />
      )}
      {/* ── Plan Picker Modal ── */}
      {showPlanPicker && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50" onClick={() => setShowPlanPicker(false)}>
          <div
            className="bg-white rounded-t-2xl mt-auto w-full max-w-4xl mx-auto flex flex-col"
            style={{ height: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-semibold text-gray-800">Select Workout Plan</h2>
              <button onClick={() => setShowPlanPicker(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Two-panel body */}
            <div className="flex flex-1 overflow-hidden">

              {/* Left — plan list */}
              <div className="w-52 flex-shrink-0 border-r border-gray-100 overflow-y-auto">
                {workoutTypes.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4">No plans available</p>
                ) : (
                  <ul className="py-2">
                    {workoutTypes.map(wt => (
                      <li key={wt.id}>
                        <button
                          onClick={() => loadPlanExercises(wt.id)}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors border-l-2
                            ${previewPlanId === wt.id
                              ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                              : 'border-transparent text-gray-700 hover:bg-gray-50'}`}
                        >
                          {wt.name}
                          {wt.id === client.awp && (
                            <span className="block text-xs text-orange-400 font-normal mt-0.5">Current</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Right — exercises preview */}
              <div className="flex-1 overflow-y-auto">
                {!previewPlanId ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <span className="text-4xl">👈</span>
                    <p className="text-sm">Select a plan to preview exercises</p>
                  </div>
                ) : previewLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-square" />
                    ))}
                  </div>
                ) : previewExercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <span className="text-4xl">🤷</span>
                    <p className="text-sm">No exercises in this plan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                    {previewExercises.map(ex => {
                      const url = gifUrl(ex.gifFilePath)
                      return (
                        <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                          <div className="bg-gray-50 aspect-square overflow-hidden flex items-center justify-center">
                            {url ? (
                              <img src={url} alt={ex.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl">🏋️</span>
                            )}
                          </div>
                          <div className="px-2.5 py-2">
                            <p className="text-xs font-semibold text-gray-800 leading-snug">{ex.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{ex.sets} sets × {ex.reps} reps</p>
                            {ex.muscle && <p className="text-xs text-orange-400 mt-0.5 capitalize">{ex.muscle}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer — assign button */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => previewPlanId && assignWorkoutPlan(previewPlanId)}
                disabled={!previewPlanId || assigningAwp || previewPlanId === client.awp}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assigningAwp
                  ? 'Assigning…'
                  : previewPlanId === client.awp
                    ? 'Already assigned'
                    : previewPlanId
                      ? `Assign "${workoutTypes.find(t => t.id === previewPlanId)?.name ?? ''}"`
                      : 'Select a plan first'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password gate modal */}
      {gateAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base leading-tight">Confirm Identity</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {gateAction.type === 'deletePackage' ? 'Enter your password to delete this package'
                    : gateAction.type === 'deleteProfile' ? 'Enter your password to permanently delete this profile'
                    : 'Enter your password to continue'}
                </p>
              </div>
            </div>
            <input
              type="password"
              value={gatePassword}
              onChange={e => { setGatePassword(e.target.value); setGateError(null) }}
              onKeyDown={e => e.key === 'Enter' && confirmGate()}
              placeholder="Your account password"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-3"
            />
            {gateError && <p className="text-xs text-red-500 mb-3">{gateError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setGateAction(null); setGatePassword(''); setGateError(null) }}
                disabled={gateChecking}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmGate}
                disabled={gateChecking || !gatePassword}
                className={`flex-1 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${gateAction.type === 'deletePackage' || gateAction.type === 'deleteProfile' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {gateChecking ? 'Verifying…' : gateAction.type === 'deletePackage' || gateAction.type === 'deleteProfile' ? 'Delete' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
