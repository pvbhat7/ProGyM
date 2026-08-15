import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

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

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<AdminSettings>(loadSettings)
  const [saved, setSaved] = useState(false)

  // Refer & Earn feature flag
  const [referAndEarn, setReferAndEarn] = useState<boolean>(false)
  const [referToggleLoading, setReferToggleLoading] = useState(true)
  const [referSaved, setReferSaved] = useState(false)

  // FIFA World Cup 2026 UI toggle (public dashboard)
  const [showFifaUi, setShowFifaUi] = useState<boolean | null>(null)
  const [fifaSaving, setFifaSaving] = useState(false)
  const [fifaSaved, setFifaSaved] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/settings/getFeatureFlags.php`)
      .then(r => r.json())
      .then((d: { showFifaUi?: boolean }) => setShowFifaUi(d.showFifaUi ?? false))
      .catch(() => setShowFifaUi(false))
  }, [])

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
      setFifaSaved(true)
      setTimeout(() => setFifaSaved(false), 2000)
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
  const [lockSaved, setLockSaved] = useState(false)
  const [lockError, setLockError] = useState('')

  // Prediction launch gate — predictions are blocked for everyone until this datetime (IST)
  // Empty string = launch is live (no gate). Admin client IDs (comma-separated) bypass the gate.
  const [launchAt, setLaunchAt] = useState<string>('')          // datetime-local value: YYYY-MM-DDTHH:MM
  const [launchAtSaved, setLaunchAtSaved] = useState<string>('')
  const [adminIds, setAdminIds] = useState<string>('')
  const [adminIdsSaved, setAdminIdsSaved] = useState<string>('')
  const [launchLoading, setLaunchLoading] = useState(true)
  const [launchSaving, setLaunchSaving] = useState(false)
  const [launchSaved, setLaunchSaved] = useState(false)
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
      setLaunchSaved(true)
      setTimeout(() => setLaunchSaved(false), 1500)
    } catch {
      setLaunchError('Network error. Try again.')
    } finally {
      setLaunchSaving(false)
    }
  }

  function clearLaunchGate() {
    setLaunchAt('')
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
      setLockSaved(true)
      setTimeout(() => setLockSaved(false), 1500)
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
      setReferSaved(true)
      setTimeout(() => setReferSaved(false), 1500)
    } catch {
      setReferAndEarn(!next)
    }
  }

  // PIN management state
  const [currentPin, setCurrentPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/adminuser/getSecurityPin.php`)
      .then(r => r.json())
      .then(d => setCurrentPin(d.pin ?? ''))
      .catch(() => {})
  }, [])

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
        setCurrentPin(newPin)
        setChangingPin(false)
        setOldPin(''); setNewPin(''); setConfirmPin('')
        setPinSuccess(true)
        setTimeout(() => setPinSuccess(false), 2500)
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

  useEffect(() => {
    saveSettings(settings)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [settings])

  function toggleAutoLogout() {
    setSettings(prev => ({ ...prev, autoLogoutEnabled: !prev.autoLogoutEnabled }))
  }

  function setMinutes(m: number) {
    setSettings(prev => ({ ...prev, autoLogoutMinutes: m }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg">Settings</h1>
            <p className="text-xs text-gray-400">Admin preferences</p>
          </div>
          {saved && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">✓ Saved</span>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* ── FIFA World Cup 2026 dashboard toggle ───────────────────────── */}
        <div className="relative bg-gradient-to-br from-blue-950 via-slate-900 to-red-950 rounded-2xl border border-amber-400/30 shadow-lg overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative px-5 py-4 border-b border-white/10 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="flex-1">
              <h2 className="font-black text-white text-base tracking-wide">FIFA World Cup 2026 UI</h2>
              <p className="text-amber-200/60 text-[11px] mt-0.5 font-semibold uppercase tracking-widest">Public Dashboard Theme</p>
            </div>
            {showFifaUi === true && (
              <span className="text-[10px] font-black text-blue-200 bg-blue-500/20 border border-blue-300/40 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
            )}
          </div>

          <div className="relative p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-white text-sm mb-1">Show FIFA UI on public dashboard</p>
                <p className="text-white/60 text-xs leading-relaxed">
                  Replaces the homepage with a World Cup-themed layout — team flags, upcoming match cards,
                  countdown to kickoff, group stage strip, and star players. Members / Workouts / Admin / Attendance become compact chips.
                  <br />
                  <span className="text-amber-200/80 font-semibold">Turn OFF after the tournament to revert to the standard dashboard.</span>
                </p>
              </div>

              <button
                disabled={showFifaUi === null || fifaSaving}
                onClick={toggleFifaUi}
                className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ring-1 ring-white/20 ${
                  showFifaUi ? 'bg-gradient-to-r from-blue-500 to-red-500' : 'bg-white/15'
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
              <p className="mt-3 text-xs font-semibold text-amber-200 bg-amber-500/15 border border-amber-300/30 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved — public dashboard updates instantly
              </p>
            )}
          </div>
        </div>

        {/* Auto-logout card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 text-base">🔐 Session &amp; Security</h2>
          </div>

          {/* Toggle */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Auto Logout</p>
              <p className="text-xs text-gray-400 mt-0.5">Automatically log out admin after inactivity</p>
            </div>
            <button
              onClick={toggleAutoLogout}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.autoLogoutEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.autoLogoutEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Timeout duration */}
          {settings.autoLogoutEnabled && (
            <div className="px-5 pb-5 border-t border-gray-50 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Timeout Duration</p>
              <div className="flex flex-wrap gap-2">
                {MINUTE_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                      settings.autoLogoutMinutes === m
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300'
                    }`}>
                    {m < 60 ? `${m} min` : '1 hr'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Admin will be warned 1 minute before logout. Disable auto logout before running long bulk operations.
              </p>
            </div>
          )}

          {!settings.autoLogoutEnabled && (
            <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-700">⚠️ Auto logout is disabled — remember to log out manually when done.</p>
            </div>
          )}
        </div>

        {/* Member Features */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-base">🎁 Member Features</h2>
            {referSaved && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">✓ Saved</span>
            )}
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Refer &amp; Earn</p>
              <p className="text-xs text-gray-400 mt-0.5">Show the Refer &amp; Earn button to all members</p>
            </div>
            {referToggleLoading ? (
              <div className="w-11 h-6 bg-gray-100 rounded-full animate-pulse" />
            ) : (
              <button
                onClick={toggleReferAndEarn}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${referAndEarn ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${referAndEarn ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            )}
          </div>
          <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500">
              {referAndEarn
                ? '✅ Refer & Earn is ON — members can see and use this feature.'
                : '⏸ Refer & Earn is OFF — the button is disabled for all members.'}
            </p>
          </div>
        </div>

        {/* Prediction Lock Window card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-base">⏱️ Prediction Lock Window</h2>
            {lockSaved && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">✓ Saved</span>
            )}
          </div>

          <div className="px-5 py-4">
            <p className="font-semibold text-gray-800 text-sm">Close predictions before kickoff</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">
              Members won't be able to submit / edit predictions inside this window.
            </p>

            {lockLoading ? (
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={lockMinutes}
                    onChange={e => { setLockMinutes(e.target.value.replace(/\D/g, '').slice(0, 4)); setLockError('') }}
                    placeholder="0"
                    disabled={lockSaving}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-20 text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 uppercase tracking-wider">minutes</span>
                </div>
                <button
                  onClick={saveLockMinutes}
                  disabled={lockSaving || lockMinutes === String(lockSavedMinutes) || lockMinutes === ''}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {lockSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}

            {lockError && (
              <p className="text-xs text-red-500 mt-2">{lockError}</p>
            )}
          </div>

          <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-800">
              {lockSavedMinutes === 0 ? (
                <>🟢 Currently <b>locking at kickoff</b> — members can predict right up until the match starts.</>
              ) : (
                <>🔒 Currently locking <b>{lockSavedMinutes} minute{lockSavedMinutes === 1 ? '' : 's'} before kickoff</b>. Example: if a match starts at <b>9:00 PM</b>, predictions close at <b>{(() => { const h = 21 * 60 - lockSavedMinutes; const hh = Math.floor(h / 60); const mm = h % 60; const ampm = hh >= 12 ? 'PM' : 'AM'; const dh = hh % 12 || 12; return `${dh}:${String(mm).padStart(2, '0')} ${ampm}` })()}</b>.</>
              )}
            </p>
          </div>
        </div>

        {/* Prediction Launch Gate card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-base">🚀 Prediction Launch</h2>
            {launchSaved && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">✓ Saved</span>
            )}
          </div>

          <div className="px-5 py-4">
            <p className="font-semibold text-gray-800 text-sm">Go-live date &amp; time (IST)</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">
              Before this time, members see a countdown and can't submit predictions.
              Leave blank to make predictions live immediately.
            </p>

            {launchLoading ? (
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={launchAt}
                  onChange={e => { setLaunchAt(e.target.value); setLaunchError('') }}
                  disabled={launchSaving}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-50"
                />
                {launchAt && (
                  <button
                    type="button"
                    onClick={clearLaunchGate}
                    disabled={launchSaving}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    title="Clear — predictions go live immediately"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="px-5 pb-4">
            <p className="font-semibold text-gray-800 text-sm">Admin client IDs (bypass gate)</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">
              Comma-separated client IDs that can predict before launch — use for testing.
            </p>
            <input
              type="text"
              value={adminIds}
              onChange={e => setAdminIds(e.target.value)}
              placeholder="e.g. 1, 42"
              disabled={launchSaving || launchLoading}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={saveLaunchSettings}
              disabled={launchSaving || launchLoading || (launchAt === launchAtSaved && adminIds.trim() === adminIdsSaved)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {launchSaving ? 'Saving…' : 'Save Launch Settings'}
            </button>
            {launchError && (
              <p className="text-xs text-red-500 mt-2">{launchError}</p>
            )}
          </div>

          <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-800">
              {launchAtSaved
                ? <>⏳ Predictions locked until <b>{launchAtSaved.replace('T', ' ')} IST</b>. Members see a countdown banner.</>
                : <>🟢 Predictions are <b>LIVE</b> — no launch gate active.</>
              }
            </p>
          </div>
        </div>

        {/* Add Client PIN card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-base">🔑 Add Client PIN</h2>
            {pinSuccess && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">✓ PIN Updated</span>
            )}
          </div>

          {/* Current PIN display */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Current PIN</p>
              <p className="text-xs text-gray-400 mt-0.5">Required when adding a new client</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-[0.3em] text-gray-800 min-w-[4rem] text-right">
                {showPin ? currentPin : '••••'}
              </span>
              <button
                onClick={() => setShowPin(v => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Change PIN button or form */}
          {!changingPin ? (
            <div className="px-5 pb-5">
              <button
                onClick={() => setChangingPin(true)}
                className="w-full py-2.5 rounded-xl border-2 border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-50 transition-colors"
              >
                Change PIN
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePin} className="px-5 pb-5 border-t border-gray-50 pt-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">Change PIN</p>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Current PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={oldPin}
                  onChange={e => { setOldPin(filterDigits(e.target.value)); setPinError('') }}
                  placeholder="••••"
                  maxLength={4}
                  disabled={pinLoading}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg tracking-[0.4em] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-gray-400 disabled:bg-gray-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">New PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={e => { setNewPin(filterDigits(e.target.value)); setPinError('') }}
                  placeholder="••••"
                  maxLength={4}
                  disabled={pinLoading}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg tracking-[0.4em] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-gray-400 disabled:bg-gray-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Confirm New PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={e => { setConfirmPin(filterDigits(e.target.value)); setPinError('') }}
                  placeholder="••••"
                  maxLength={4}
                  disabled={pinLoading}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg tracking-[0.4em] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-gray-400 disabled:bg-gray-50"
                />
              </div>

              {pinError && (
                <p className="text-xs text-red-500 text-center">{pinError}</p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={cancelChange}
                  disabled={pinLoading}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinLoading || oldPin.length < 4 || newPin.length < 4 || confirmPin.length < 4}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pinLoading ? 'Saving…' : 'Save PIN'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
