import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { useAuth } from '../context/AuthContext'
import { adminPushClientId, enablePush, getPushStatus } from '../services/pushNotifications'
import type { PushStatus } from '../services/pushNotifications'

const SETTINGS_KEY = 'progym_admin_settings'

export type AdminSettings = {
  autoLogoutEnabled: boolean
  autoLogoutMinutes: number
}

export function loadSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { autoLogoutEnabled: true, autoLogoutMinutes: 5, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { autoLogoutEnabled: true, autoLogoutMinutes: 5 }
}

function saveSettings(s: AdminSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

const MINUTE_OPTIONS = [1, 2, 3, 5, 10, 15, 30, 60]

type AlertContact = { id: number; name: string; mobile: string; pushDevices: number }

type AlertType = 'attendance' | 'signup'
const ALERT_TYPE_FLAG: Record<AlertType, string>  = { attendance: 'alertAttendance', signup: 'alertSignup' }
const ALERT_TYPE_LABEL: Record<AlertType, string> = { attendance: 'Attendance', signup: 'Sign-up' }

type Zone = 'red' | 'yellow' | 'green'
const ZONES: Zone[] = ['red', 'yellow', 'green']
const ZONE_STYLE: Record<Zone, { dot: string; label: string }> = {
  red:    { dot: 'bg-red-500 ring-red-300',       label: 'Red · expired' },
  yellow: { dot: 'bg-yellow-400 ring-yellow-200', label: 'Yellow · 0–5 days left' },
  green:  { dot: 'bg-green-500 ring-green-300',   label: 'Green · 6+ days left' },
}

// ── Small building blocks ───────────────────────────────────────────────

function Toggle({ on, onClick, disabled, busy, color = 'bg-green-500' }: {
  on: boolean | null; onClick: () => void; disabled?: boolean; busy?: boolean; color?: string
}) {
  if (on === null) return <div className="w-10 h-6 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
  return (
    <button
      type="button" role="switch" aria-checked={on}
      disabled={disabled || busy}
      onClick={onClick}
      className={`relative inline-flex h-6 w-10 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-50 ${on ? color : 'bg-gray-300'}`}>
      <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
    </button>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function Row({ icon, tint, title, hint, right, children }: {
  icon: string; tint: string; title: ReactNode; hint?: ReactNode; right?: ReactNode; children?: ReactNode
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${tint}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>
          {hint && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{hint}</p>}
        </div>
        {right}
      </div>
      {children && <div className="mt-3 ml-11">{children}</div>}
    </div>
  )
}

const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-50'
const primaryBtn = 'px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity'
const ghostBtn = 'px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<AdminSettings>(loadSettings)

  // One toast for all save confirmations
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function flash(msg: string) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  const [fifaOpen, setFifaOpen] = useState(false)

  // Refer & Earn feature flag
  const [referAndEarn, setReferAndEarn] = useState<boolean>(false)
  const [referToggleLoading, setReferToggleLoading] = useState(true)

  // FIFA World Cup 2026 UI toggle (public dashboard)
  const [showFifaUi, setShowFifaUi] = useState<boolean | null>(null)
  const [fifaSaving, setFifaSaving] = useState(false)

  // WhatsApp attendance alert to admin (server treats a missing flag as ON)
  const [waAttendance, setWaAttendance] = useState<boolean | null>(null)
  const [waSaving, setWaSaving] = useState(false)

  // Razorpay test/live mode (server re-checks the security PIN)
  const [rzpMode, setRzpMode] = useState<'test' | 'live' | null>(null)
  const [rzpPin, setRzpPin] = useState<string | null>(null)   // non-null = confirm form open
  const [rzpSaving, setRzpSaving] = useState(false)
  const [rzpError, setRzpError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/razorpay/getMode.php`)
      .then(r => r.json())
      .then((d: { mode?: 'test' | 'live' }) => setRzpMode(d.mode ?? null))
      .catch(() => setRzpMode(null))
  }, [])

  async function switchRzpMode() {
    if (!rzpMode || rzpPin === null) return
    const next = rzpMode === 'live' ? 'test' : 'live'
    setRzpSaving(true); setRzpError(null)
    try {
      const r = await fetch(`${API_BASE}/razorpay/setMode.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next, pin: rzpPin }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Failed')
      setRzpMode(d.mode); setRzpPin(null)
      flash(`Razorpay switched to ${String(d.mode).toUpperCase()}`)
    } catch (e) {
      setRzpError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setRzpSaving(false)
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/settings/getFeatureFlags.php`)
      .then(r => r.json())
      .then((d: { showFifaUi?: boolean; whatsappAttendanceAlert?: boolean; pushAttendanceAlert?: boolean;
                  alertAttendance?: boolean; alertSignup?: boolean; razorpayMemberPayments?: boolean }) => {
        setShowFifaUi(d.showFifaUi ?? false)
        setWaAttendance(d.whatsappAttendanceAlert ?? true)
        setPushAttendance(d.pushAttendanceAlert ?? false)
        setAlertTypes({ attendance: d.alertAttendance ?? true, signup: d.alertSignup ?? true })
        setRzpMembers(d.razorpayMemberPayments ?? false)
      })
      .catch(() => { setShowFifaUi(false); setWaAttendance(true); setPushAttendance(false); setAlertTypes({ attendance: true, signup: true }); setRzpMembers(false) })
  }, [])

  // Admin alert types — each on/off on its own (channels + contacts are shared)
  const [alertTypes, setAlertTypes] = useState<Record<AlertType, boolean> | null>(null)
  const [alertTypeSaving, setAlertTypeSaving] = useState<AlertType | null>(null)

  async function toggleAlertType(t: AlertType) {
    if (!alertTypes) return
    const next = !alertTypes[t]
    setAlertTypes({ ...alertTypes, [t]: next })
    setAlertTypeSaving(t)
    try {
      const r = await fetch(`${API_BASE}/settings/updateFeatureFlag.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: ALERT_TYPE_FLAG[t], value: next }),
      })
      if (!r.ok) throw new Error()
      flash(`${ALERT_TYPE_LABEL[t]} alert ${next ? 'ON' : 'OFF'}`)
    } catch {
      setAlertTypes(prev => prev ? { ...prev, [t]: !next } : prev)
    } finally {
      setAlertTypeSaving(null)
    }
  }

  // Attendance alert: push channel + recipient contacts (members)
  const [pushAttendance, setPushAttendance] = useState<boolean | null>(null)
  const [pushSaving, setPushSaving] = useState(false)
  const [alertContacts, setAlertContacts] = useState<AlertContact[] | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<AlertContact[]>([])
  const [contactSearched, setContactSearched] = useState('')   // query the current results belong to
  const [contactSaving, setContactSaving] = useState(false)
  const [contactError, setContactError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/settings/attendanceAlertContacts.php`)
      .then(r => r.json())
      .then((d: { contacts?: AlertContact[]; zones?: Zone[] }) => { setAlertContacts(d.contacts ?? []); setAlertZones(d.zones ?? ZONES) })
      .catch(() => { setAlertContacts([]); setAlertZones(ZONES) })
  }, [])

  // Which member zones trigger the alert (all three = every member)
  const [alertZones, setAlertZones] = useState<Zone[] | null>(null)
  const [zonesSaving, setZonesSaving] = useState(false)

  async function toggleZone(z: Zone) {
    if (!alertZones) return
    const prev = alertZones
    const next = ZONES.filter(x => x === z ? !prev.includes(x) : prev.includes(x))
    setAlertZones(next)
    setZonesSaving(true)
    try {
      const r = await fetch(`${API_BASE}/settings/attendanceAlertContacts.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: next }),
      })
      const d = await r.json()
      if (!d.success) throw new Error()
      flash(next.length === 3 ? 'Alerts for all members' : next.length === 0 ? 'No zone selected — alerts paused' : `Alerts for ${next.join(' + ')} zone`)
    } catch {
      setAlertZones(prev)
    } finally {
      setZonesSaving(false)
    }
  }

  useEffect(() => {
    const q = contactSearch.trim()
    if (q.length < 2) { setContactResults([]); return }
    const t = setTimeout(() => {
      fetch(`${API_BASE}/settings/attendanceAlertContacts.php?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then((d: { results?: AlertContact[] }) => { setContactResults(d.results ?? []); setContactSearched(q) })
        .catch(() => setContactResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [contactSearch])

  async function saveContacts(next: AlertContact[]) {
    const prev = alertContacts
    setAlertContacts(next)
    setContactSaving(true); setContactError('')
    try {
      const r = await fetch(`${API_BASE}/settings/attendanceAlertContacts.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: next.map(c => c.id) }),
      })
      const d = await r.json()
      if (!d.success) throw new Error(d.error || 'Failed')
      setAlertContacts(d.contacts)
      flash('Alert contacts saved')
    } catch (e) {
      setAlertContacts(prev)
      setContactError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setContactSaving(false)
    }
  }

  function addContact(c: AlertContact) {
    setContactSearch(''); setContactResults([])
    if (!alertContacts || alertContacts.some(x => x.id === c.id)) return
    saveContacts([...alertContacts, c])
  }

  // This admin device — register for push under the admin's member record
  const { user } = useAuth()
  const [deviceStatus, setDeviceStatus] = useState<PushStatus | null>(null)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [deviceMsg, setDeviceMsg] = useState('')

  useEffect(() => { getPushStatus().then(setDeviceStatus).catch(() => setDeviceStatus('unsupported')) }, [])

  async function enableThisDevice() {
    if (!user) return
    setDeviceBusy(true); setDeviceMsg('')
    try {
      const cid = await adminPushClientId(user.mobile)
      if (!cid) { setDeviceMsg(`No member record with mobile ${user.mobile} — add one to receive push`); return }
      const s = await enablePush(cid)
      setDeviceStatus(s)
      if (s === 'granted') {
        const d = await fetch(`${API_BASE}/settings/attendanceAlertContacts.php`).then(r => r.json())
        setAlertContacts(d.contacts ?? [])
        flash('This device will receive push alerts')
      } else if (s === 'denied') {
        setDeviceMsg('Notifications are blocked for this site — allow them in browser site settings')
      } else if (s === 'ios-needs-install') {
        setDeviceMsg('On iPhone, add ProGym to the Home Screen first, then open it from there')
      }
    } catch {
      setDeviceMsg('Could not enable push on this device')
    } finally {
      setDeviceBusy(false)
    }
  }

  // "Test" per alert type — sample alert to every contact over the ON channels
  const [testBusy, setTestBusy] = useState<AlertType | null>(null)
  const [testResult, setTestResult] = useState<{ type: AlertType; ok: boolean; text: string } | null>(null)

  async function sendTestAlert(type: AlertType) {
    setTestBusy(type); setTestResult(null)
    const setResult = (ok: boolean, text: string) => setTestResult({ type, ok, text })
    try {
      const r = await fetch(`${API_BASE}/settings/testAttendanceAlert.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const d: {
        success: boolean; error?: string; contacts: number
        whatsapp: { on: boolean; sent: number; failed: number }
        push: { on: boolean; devices: number; sent: number; failed: number }
      } = await r.json()
      if (!d.success) throw new Error(d.error || 'Failed')
      if (d.contacts === 0) { setResult(false, 'No contacts to send to'); return }
      if (!d.whatsapp.on && !d.push.on) { setResult(false, 'Both WhatsApp and Push are OFF — nothing sent'); return }
      const parts: string[] = []
      if (d.whatsapp.on) parts.push(`WhatsApp: ${d.whatsapp.sent} sent${d.whatsapp.failed ? `, ${d.whatsapp.failed} failed` : ''}`)
      if (d.push.on) parts.push(d.push.devices === 0
        ? 'Push: no devices registered'
        : `Push: ${d.push.sent}/${d.push.devices} device${d.push.devices === 1 ? '' : 's'}${d.push.failed ? `, ${d.push.failed} failed` : ''}`)
      const ok = (d.whatsapp.on ? d.whatsapp.failed === 0 : true) && (d.push.on ? d.push.devices > 0 && d.push.failed === 0 : true)
      setResult(ok, parts.join(' · '))
    } catch (e) {
      setResult(false, e instanceof Error ? e.message : 'Failed')
    } finally {
      setTestBusy(null)
    }
  }

  async function togglePushAttendance() {
    if (pushAttendance === null) return
    const next = !pushAttendance
    setPushAttendance(next)
    setPushSaving(true)
    try {
      const r = await fetch(`${API_BASE}/settings/updateFeatureFlag.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'pushAttendanceAlert', value: next }),
      })
      if (!r.ok) throw new Error()
      flash(next ? 'Push alerts ON' : 'Push alerts OFF')
    } catch {
      setPushAttendance(!next)
    } finally {
      setPushSaving(false)
    }
  }

  // Razorpay "Go live" — members see Pay/Renew only when ON (server enforces it too)
  const [rzpMembers, setRzpMembers] = useState<boolean | null>(null)
  const [rzpMembersSaving, setRzpMembersSaving] = useState(false)

  async function toggleRzpMembers() {
    if (rzpMembers === null) return
    const next = !rzpMembers
    setRzpMembers(next)
    setRzpMembersSaving(true)
    try {
      const r = await fetch(`${API_BASE}/settings/updateFeatureFlag.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'razorpayMemberPayments', value: next }),
      })
      if (!r.ok) throw new Error()
      flash(next ? 'Online payments live for members' : 'Online payments hidden from members')
    } catch {
      setRzpMembers(!next)
    } finally {
      setRzpMembersSaving(false)
    }
  }

  async function toggleWaAttendance() {
    if (waAttendance === null) return
    const next = !waAttendance
    setWaAttendance(next)
    setWaSaving(true)
    try {
      const r = await fetch(`${API_BASE}/settings/updateFeatureFlag.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'whatsappAttendanceAlert', value: next }),
      })
      if (!r.ok) throw new Error()
      flash(next ? 'WhatsApp alerts ON' : 'WhatsApp alerts OFF')
    } catch {
      setWaAttendance(!next)
    } finally {
      setWaSaving(false)
    }
  }

  async function toggleFifaUi() {
    if (showFifaUi === null) return
    const next = !showFifaUi
    setShowFifaUi(next)
    setFifaSaving(true)
    try {
      await fetch(`${API_BASE}/settings/updateFeatureFlag.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'showFifaUi', value: next }),
      })
      flash('Saved — public dashboard updates instantly')
    } catch {
      setShowFifaUi(!next)
    } finally {
      setFifaSaving(false)
    }
  }

  // Prediction lock window (minutes before kickoff)
  const [lockMinutes, setLockMinutes] = useState<string>('0')
  const [lockSavedMinutes, setLockSavedMinutes] = useState<number>(0)
  const [lockLoading, setLockLoading] = useState(true)
  const [lockSaving, setLockSaving] = useState(false)
  const [lockError, setLockError] = useState('')

  // Prediction launch gate — predictions are blocked for everyone until this datetime (IST)
  // Empty string = launch is live (no gate). Admin client IDs (comma-separated) bypass the gate.
  const [launchAt, setLaunchAt] = useState<string>('')          // datetime-local value: YYYY-MM-DDTHH:MM
  const [launchAtSaved, setLaunchAtSaved] = useState<string>('')
  const [adminIds, setAdminIds] = useState<string>('')
  const [adminIdsSaved, setAdminIdsSaved] = useState<string>('')
  const [launchLoading, setLaunchLoading] = useState(true)
  const [launchSaving, setLaunchSaving] = useState(false)
  const [launchError, setLaunchError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/features/get.php`)
      .then(r => r.json())
      .then(d => {
        setReferAndEarn(d.referAndEarn === 'true')
        const n = Math.max(0, parseInt(d.prediction_lock_minutes, 10) || 0)
        setLockMinutes(String(n))
        setLockSavedMinutes(n)
        // Server stores "YYYY-MM-DD HH:MM:SS"; <input type=datetime-local> wants "YYYY-MM-DDTHH:MM"
        const raw = typeof d.predictions_launch_at === 'string' ? d.predictions_launch_at.trim() : ''
        const local = raw ? raw.replace(' ', 'T').slice(0, 16) : ''
        setLaunchAt(local)
        setLaunchAtSaved(local)
        const ids = typeof d.predictions_admin_client_ids === 'string' ? d.predictions_admin_client_ids : ''
        setAdminIds(ids)
        setAdminIdsSaved(ids)
      })
      .catch(() => {})
      .finally(() => {
        setReferToggleLoading(false)
        setLockLoading(false)
        setLaunchLoading(false)
      })
  }, [])

  async function saveLaunchSettings() {
    setLaunchError('')
    // datetime-local gives us "YYYY-MM-DDTHH:MM"; send as "YYYY-MM-DD HH:MM:00" for PHP DateTime.
    const trimmedIds = adminIds.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s)).join(',')
    const serverLaunchAt = launchAt ? launchAt.replace('T', ' ') + ':00' : ''
    setLaunchSaving(true)
    try {
      await fetch(`${API_BASE}/features/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictions_launch_at: serverLaunchAt,
          predictions_admin_client_ids: trimmedIds,
        }),
      })
      setLaunchAtSaved(launchAt)
      setAdminIds(trimmedIds)
      setAdminIdsSaved(trimmedIds)
      flash('Launch settings saved')
    } catch {
      setLaunchError('Network error. Try again.')
    } finally {
      setLaunchSaving(false)
    }
  }

  async function saveLockMinutes() {
    setLockError('')
    const n = parseInt(lockMinutes, 10)
    if (isNaN(n) || n < 0) { setLockError('Enter a whole number of minutes (0 or more).'); return }
    if (n > 1440)         { setLockError('Maximum 1440 minutes (24 hours).'); return }
    setLockSaving(true)
    try {
      await fetch(`${API_BASE}/features/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction_lock_minutes: n }),
      })
      setLockSavedMinutes(n)
      setLockMinutes(String(n))
      flash('Lock window saved')
    } catch {
      setLockError('Network error. Try again.')
    } finally {
      setLockSaving(false)
    }
  }

  async function toggleReferAndEarn() {
    const next = !referAndEarn
    setReferAndEarn(next)
    try {
      await fetch(`${API_BASE}/features/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referAndEarn: next ? 'true' : 'false' }),
      })
      flash(next ? 'Refer & Earn ON' : 'Refer & Earn OFF')
    } catch {
      setReferAndEarn(!next)
    }
  }

  // PIN management state
  const [changingPin, setChangingPin] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')

  function filterDigits(val: string) {
    return val.replace(/\D/g, '').slice(0, 4)
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault()
    if (oldPin.length < 4 || newPin.length < 4 || confirmPin.length < 4) {
      setPinError('All PIN fields must be 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match')
      return
    }
    setPinLoading(true)
    setPinError('')
    try {
      const res = await fetch(`${API_BASE}/adminuser/updateSecurityPin.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: oldPin, newPin }),
      })
      const data = await res.json()
      if (data.success) {
        setChangingPin(false)
        setOldPin(''); setNewPin(''); setConfirmPin('')
        flash('PIN updated')
      } else {
        setPinError(data.message || 'Failed to update PIN')
      }
    } catch {
      setPinError('Network error. Please try again.')
    } finally {
      setPinLoading(false)
    }
  }

  function cancelChange() {
    setChangingPin(false)
    setOldPin(''); setNewPin(''); setConfirmPin('')
    setPinError('')
  }

  // Persist local settings; skip the toast on first render
  const firstRun = useRef(true)
  useEffect(() => {
    saveSettings(settings)
    if (firstRun.current) { firstRun.current = false; return }
    flash('Saved')
  }, [settings])

  function toggleAutoLogout() {
    setSettings(prev => ({ ...prev, autoLogoutEnabled: !prev.autoLogoutEnabled }))
  }

  function setMinutes(m: number) {
    setSettings(prev => ({ ...prev, autoLogoutMinutes: m }))
  }

  const lockExample = (() => {
    const h = 21 * 60 - lockSavedMinutes
    const hh = Math.floor(((h % 1440) + 1440) % 1440 / 60)
    const mm = ((h % 60) + 60) % 60
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`
  })()

  // Test button + result for one alert type (sample goes to all contacts over the ON channels)
  const testControls = (t: AlertType) => (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button" onClick={() => sendTestAlert(t)}
        disabled={testBusy !== null || !alertContacts?.length}
        className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full disabled:opacity-50">
        {testBusy === t ? 'Sending…' : '🧪 Send test'}
      </button>
      {testResult?.type === t && (
        <span className={`text-[11px] font-medium ${testResult.ok ? 'text-green-700' : 'text-amber-700'}`}>
          {testResult.ok ? '✓ ' : '⚠ '}{testResult.text}
        </span>
      )}
    </div>
  )

  const pinInput = (label: string, value: string, set: (v: string) => void) => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-gray-500">{label}</span>
      <input
        type="password" inputMode="numeric" maxLength={4} placeholder="••••"
        value={value}
        onChange={e => { set(filterDigits(e.target.value)); setPinError('') }}
        disabled={pinLoading}
        className={`${inputCls} w-full text-center tracking-[0.3em] placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-300`}
      />
    </label>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Settings</h1>
            <p className="text-xs text-gray-400">Admin preferences</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-5 pb-16">

        {/* ── Payments ─────────────────────────────────────────────── */}
        <Section title="Online Payments · Razorpay">
          <Row
            icon="💳" tint="bg-emerald-50"
            title="Go live for members"
            hint={
              <>
                {rzpMembers ? 'Members see Pay / Renew in My Packages' : 'Hidden from members · admin payment links still work'}
                {rzpMembers && rzpMode === 'test' && (
                  <span className="block text-red-600 font-medium">⚠ Mode is TEST — switch to LIVE</span>
                )}
              </>
            }
            right={<Toggle on={rzpMembers} onClick={toggleRzpMembers} busy={rzpMembersSaving} />}
          />
          <Row
            icon="⚙️" tint="bg-amber-50"
            title="Payment mode"
            hint={rzpMode === 'test'
              ? 'No real money · recorded as "Razorpay (Test)"'
              : rzpMode === 'live' ? 'Real payments via UPI, cards, netbanking' : 'Loading…'}
            right={
              <div className="flex p-0.5 rounded-lg bg-gray-100 text-xs font-bold flex-shrink-0">
                {(['test', 'live'] as const).map(m => (
                  <button
                    key={m} type="button"
                    disabled={!rzpMode || rzpSaving}
                    onClick={() => { if (m !== rzpMode) { setRzpPin(rzpPin === null ? '' : null); setRzpError(null) } }}
                    className={`px-3 py-1 rounded-md uppercase transition-colors disabled:opacity-50 ${
                      rzpMode === m
                        ? m === 'live' ? 'bg-green-500 text-white shadow-sm' : 'bg-yellow-400 text-yellow-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            }
          >
            {rzpPin !== null && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">
                  Enter security PIN to switch to <b>{rzpMode === 'live' ? 'TEST' : 'LIVE'}</b>
                </p>
                <div className="flex gap-2">
                  <input
                    type="password" inputMode="numeric" maxLength={6} autoFocus
                    value={rzpPin}
                    onChange={e => setRzpPin(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter' && rzpPin.length >= 4) switchRzpMode() }}
                    className={`${inputCls} w-28`}
                    placeholder="PIN"
                  />
                  <button disabled={rzpSaving || rzpPin.length < 4} onClick={switchRzpMode} className={primaryBtn}>
                    {rzpSaving ? 'Switching…' : 'Switch'}
                  </button>
                  <button onClick={() => { setRzpPin(null); setRzpError(null) }} className={ghostBtn}>Cancel</button>
                </div>
                {rzpError && <p className="text-xs text-red-600">{rzpError}</p>}
              </div>
            )}
          </Row>
        </Section>

        {/* ── Admin alerts: channels + recipients (shared by every alert type) ─── */}
        <Section title="Admin Alerts · how & who">
          <Row
            icon="💬" tint="bg-green-50"
            title="WhatsApp"
            hint="Every alert type below, to each contact"
            right={<Toggle on={waAttendance} onClick={toggleWaAttendance} busy={waSaving} />}
          />
          <Row
            icon="🔔" tint="bg-indigo-50"
            title="Push notification"
            hint="Every alert type, to devices where the contact allowed notifications"
            right={<Toggle on={pushAttendance} onClick={togglePushAttendance} busy={pushSaving} color="bg-indigo-500" />}
          >
            {deviceStatus !== 'unsupported' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-500">This device:</span>
                <button
                  type="button" onClick={enableThisDevice} disabled={deviceBusy}
                  className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full disabled:opacity-50">
                  {deviceBusy ? 'Enabling…' : deviceStatus === 'granted' ? '🔔 Re-register for alerts' : '🔔 Enable push on this device'}
                </button>
                {deviceMsg && <span className="w-full text-[11px] text-amber-600">{deviceMsg}</span>}
              </div>
            )}
          </Row>
          <Row
            icon="👥" tint="bg-slate-100"
            title="Contacts"
            hint={alertContacts === null ? 'Loading…'
              : alertContacts.length === 0 ? <span className="text-amber-600 font-medium">No contacts — nobody receives alerts</span>
              : alertContacts.length === 1 ? '1 contact receives alerts' : `${alertContacts.length} contacts receive alerts`}
            right={contactSaving ? <span className="text-[11px] text-gray-400">Saving…</span> : undefined}
          >
            <div className="space-y-2">
              {(alertContacts ?? []).map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{c.name}</p>
                    <p className="text-[11px] text-gray-400">{c.mobile}</p>
                  </div>
                  {c.pushDevices > 0
                    ? <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">🔔 {c.pushDevices} device{c.pushDevices === 1 ? '' : 's'}</span>
                    : <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap"
                        title="Log into the member app on a phone and allow notifications to get push alerts">No push device</span>}
                  <button
                    onClick={() => alertContacts && saveContacts(alertContacts.filter(x => x.id !== c.id))}
                    disabled={contactSaving}
                    title="Remove"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40">
                    ✕
                  </button>
                </div>
              ))}

              <div className="relative">
                <input
                  type="text"
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="+ Add contact — search member by name or mobile"
                  disabled={alertContacts === null || contactSaving}
                  className={`${inputCls} w-full font-normal`}
                />
                {contactResults.length > 0 && (
                  <ul className="mt-1 bg-white border border-gray-200 rounded-xl shadow-sm max-h-64 overflow-auto divide-y divide-gray-50">
                    {contactResults.map(r => {
                      const added = alertContacts?.some(x => x.id === r.id)
                      return (
                        <li key={r.id}>
                          <button
                            type="button" disabled={added}
                            onClick={() => addContact(r)}
                            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent">
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-gray-800 truncate">{r.name}</span>
                              <span className="block text-[11px] text-gray-400">{r.mobile} · #{r.id}</span>
                            </span>
                            <span className="text-[10px] text-gray-400">{added ? 'Added' : r.pushDevices > 0 ? `🔔 ${r.pushDevices}` : ''}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              {contactResults.length === 0 && contactSearch.trim().length >= 2 && contactSearched === contactSearch.trim() && (
                <p className="text-xs text-gray-400 px-1">No members found for “{contactSearched}”</p>
              )}
              {contactError && <p className="text-xs text-red-500">{contactError}</p>}
            </div>
          </Row>
        </Section>

        {/* ── Alert types: each with its own on/off + Test ──────────────────── */}
        <Section title="Alert Types">
          <Row
            icon="✅" tint="bg-emerald-50"
            title="Attendance check-in"
            hint={alertTypes?.attendance === false ? 'Off — no check-in alerts' : "Member's first check-in of the day"}
            right={<Toggle on={alertTypes ? alertTypes.attendance : null} onClick={() => toggleAlertType('attendance')}
                     busy={alertTypeSaving === 'attendance'} color="bg-emerald-500" />}
          >
            <div className={`space-y-2 ${alertTypes?.attendance === false ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] text-gray-500">Zones:</span>
                <div className="flex items-center gap-2">
                  {ZONES.map(z => {
                    const on = alertZones?.includes(z) ?? false
                    return (
                      <button
                        key={z} type="button"
                        onClick={() => toggleZone(z)}
                        disabled={alertZones === null || zonesSaving}
                        title={`${ZONE_STYLE[z].label} — ${on ? 'alerts ON (tap to turn off)' : 'alerts OFF (tap to turn on)'}`}
                        aria-pressed={on}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:cursor-wait ${ZONE_STYLE[z].dot} ${
                          on ? 'ring-2 ring-offset-1 shadow-sm' : 'opacity-25 hover:opacity-50'
                        }`}>
                        {on && (
                          <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
                <span className="text-[11px] text-gray-400">
                  {alertZones === null ? '' : alertZones.length === 3 ? 'All members'
                    : alertZones.length === 0 ? <span className="text-amber-600 font-medium">None — no alerts</span>
                    : <>Only <b className="text-gray-600 capitalize">{alertZones.join(' + ')}</b></>}
                </span>
              </div>
              {testControls('attendance')}
            </div>
          </Row>
          <Row
            icon="🆕" tint="bg-sky-50"
            title="New sign-up"
            hint={alertTypes?.signup === false ? 'Off — no sign-up alerts' : 'Someone creates an account from the login screen'}
            right={<Toggle on={alertTypes ? alertTypes.signup : null} onClick={() => toggleAlertType('signup')}
                     busy={alertTypeSaving === 'signup'} color="bg-sky-500" />}
          >
            <div className={alertTypes?.signup === false ? 'opacity-40 pointer-events-none' : ''}>
              {testControls('signup')}
            </div>
          </Row>
        </Section>

        {/* ── Members ──────────────────────────────────────────────── */}
        <Section title="Member Features">
          <Row
            icon="🎁" tint="bg-orange-50"
            title="Refer & Earn"
            hint={referAndEarn ? 'Visible to all members' : 'Button disabled for all members'}
            right={<Toggle on={referToggleLoading ? null : referAndEarn} onClick={toggleReferAndEarn} color="bg-orange-500" />}
          />
        </Section>

        {/* ── Security ─────────────────────────────────────────────── */}
        <Section title="Session & Security">
          <Row
            icon="🔐" tint="bg-blue-50"
            title="Auto logout"
            hint={settings.autoLogoutEnabled
              ? 'Warns 1 min before · disable for long bulk jobs'
              : <span className="text-amber-600 font-medium">Off — remember to log out manually</span>}
            right={
              <div className="flex items-center gap-2">
                {settings.autoLogoutEnabled && (
                  <select
                    value={settings.autoLogoutMinutes}
                    onChange={e => setMinutes(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg pl-2 pr-1 py-1 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {MINUTE_OPTIONS.map(m => <option key={m} value={m}>{m < 60 ? `${m} min` : '1 hr'}</option>)}
                  </select>
                )}
                <Toggle on={settings.autoLogoutEnabled} onClick={toggleAutoLogout} color="bg-blue-500" />
              </div>
            }
          />
          <Row
            icon="🔑" tint="bg-purple-50"
            title="Add-client PIN"
            hint="Required when adding a new client"
            right={
              <div className="flex items-center gap-1">
                {/* The server no longer reveals the PIN (it was publicly readable) */}
                <span className="text-sm font-bold tracking-[0.25em] text-gray-800" title="Hidden for security — use Change to set a new PIN">
                  ••••
                </span>
                {!changingPin && (
                  <button onClick={() => setChangingPin(true)} className="ml-1 text-xs font-bold text-orange-600 hover:text-orange-700 px-2 py-1 rounded-md hover:bg-orange-50">
                    Change
                  </button>
                )}
              </div>
            }
          >
            {changingPin && (
              <form onSubmit={handleChangePin} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {pinInput('Current', oldPin, setOldPin)}
                  {pinInput('New', newPin, setNewPin)}
                  {pinInput('Confirm', confirmPin, setConfirmPin)}
                </div>
                {pinError && <p className="text-xs text-red-500">{pinError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={cancelChange} disabled={pinLoading} className={ghostBtn}>Cancel</button>
                  <button
                    type="submit"
                    disabled={pinLoading || oldPin.length < 4 || newPin.length < 4 || confirmPin.length < 4}
                    className={primaryBtn}>
                    {pinLoading ? 'Saving…' : 'Save PIN'}
                  </button>
                </div>
              </form>
            )}
          </Row>
        </Section>

        {/* ── FIFA World Cup 2026 (archived, collapsed) ───────────── */}
        <section>
          <h2 className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Archived</h2>
          <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setFifaOpen(o => !o)}
              aria-expanded={fifaOpen}
              className="w-full px-4 py-3 flex items-center gap-3 text-left bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 hover:brightness-110 transition">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-white/10 flex-shrink-0">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">FIFA World Cup 2026</p>
                <p className="text-[11px] text-amber-200/70 mt-0.5">Tournament ended · dashboard theme &amp; predictions</p>
              </div>
              {showFifaUi && (
                <span className="text-[10px] font-black text-amber-200 bg-amber-500/20 border border-amber-300/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  UI still on
                </span>
              )}
              <svg className={`w-4 h-4 text-white/70 transition-transform ${fifaOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {fifaOpen && (
              <div className="divide-y divide-gray-100">
                <Row
                  icon="🖥️" tint="bg-blue-50"
                  title="FIFA UI on public dashboard"
                  hint={showFifaUi ? 'World Cup layout is live — turn OFF to restore the standard dashboard' : 'Standard dashboard is shown'}
                  right={<Toggle on={showFifaUi} onClick={toggleFifaUi} busy={fifaSaving} color="bg-gradient-to-r from-blue-500 to-red-500" />}
                />

                <Row
                  icon="⏱️" tint="bg-sky-50"
                  title="Prediction lock window"
                  hint={lockSavedMinutes === 0
                    ? 'Locks at kickoff'
                    : `Locks ${lockSavedMinutes} min before · 9:00 PM match closes at ${lockExample}`}
                  right={lockLoading ? <div className="w-28 h-8 bg-gray-100 rounded-lg animate-pulse" /> : (
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <input
                          type="text" inputMode="numeric"
                          value={lockMinutes}
                          onChange={e => { setLockMinutes(e.target.value.replace(/\D/g, '').slice(0, 4)); setLockError('') }}
                          onKeyDown={e => { if (e.key === 'Enter') saveLockMinutes() }}
                          placeholder="0"
                          disabled={lockSaving}
                          className={`${inputCls} w-20 pr-9 text-right`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400">min</span>
                      </div>
                      {lockMinutes !== String(lockSavedMinutes) && lockMinutes !== '' && (
                        <button onClick={saveLockMinutes} disabled={lockSaving} className={primaryBtn}>
                          {lockSaving ? '…' : 'Save'}
                        </button>
                      )}
                    </div>
                  )}
                >
                  {lockError && <p className="text-xs text-red-500">{lockError}</p>}
                </Row>

                <Row
                  icon="🚀" tint="bg-rose-50"
                  title="Prediction launch gate"
                  hint={launchAtSaved
                    ? <>Locked until <b className="text-gray-600">{launchAtSaved.replace('T', ' ')} IST</b></>
                    : <>Predictions are <b className="text-green-600">LIVE</b> · no gate</>}
                >
                  {launchLoading ? <div className="h-16 bg-gray-100 rounded-lg animate-pulse" /> : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] text-gray-500">Go-live (IST) · blank = live now</span>
                          <div className="flex gap-1.5">
                            <input
                              type="datetime-local"
                              value={launchAt}
                              onChange={e => { setLaunchAt(e.target.value); setLaunchError('') }}
                              disabled={launchSaving}
                              className={`${inputCls} flex-1 min-w-0`}
                            />
                            {launchAt && (
                              <button type="button" onClick={() => setLaunchAt('')} disabled={launchSaving} className={ghostBtn}
                                title="Clear — predictions go live immediately">✕</button>
                            )}
                          </div>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] text-gray-500">Bypass client IDs (testing)</span>
                          <input
                            type="text"
                            value={adminIds}
                            onChange={e => setAdminIds(e.target.value)}
                            placeholder="e.g. 1, 42"
                            disabled={launchSaving}
                            className={`${inputCls} w-full`}
                          />
                        </label>
                      </div>
                      {launchError && <p className="text-xs text-red-500">{launchError}</p>}
                      {(launchAt !== launchAtSaved || adminIds.trim() !== adminIdsSaved) && (
                        <div className="flex justify-end">
                          <button onClick={saveLaunchSettings} disabled={launchSaving} className={primaryBtn}>
                            {launchSaving ? 'Saving…' : 'Save launch settings'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Row>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Save toast */}
      <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-20 transition-all duration-200 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-semibold shadow-lg">
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {toast ?? 'Saved'}
        </div>
      </div>
    </div>
  )
}
