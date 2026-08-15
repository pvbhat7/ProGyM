import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { getSession } from '../services/wcSession'
import { fetchFeatures, parseIstToMs } from '../services/launchGate'

// Deadline is loaded from features.json → awards_lock_at (format "YYYY-MM-DD HH:MM:SS" IST).
// If the field is missing/empty/malformed the gate stays hidden.

// Routes where the gate stays hidden (the awards form itself, signup flow, etc.)
const HIDDEN_PATHS = new Set<string>(['/awards', '/signup'])

// Skip cooldown — after tapping "Skip for now", suppress the modal for this
// many milliseconds so the user can use the app. Stored in localStorage.
const SKIP_KEY        = 'wc_awards_gate_skipped_at'
const SKIP_COOLDOWN_MS = 4 * 60 * 60 * 1000 // 4 hours

function isSkipActive(): boolean {
  try {
    const last = parseInt(localStorage.getItem(SKIP_KEY) || '0', 10)
    return !!last && Date.now() - last < SKIP_COOLDOWN_MS
  } catch { return false }
}
function markSkipped() {
  try { localStorage.setItem(SKIP_KEY, String(Date.now())) } catch { /* ignore */ }
}

type Status = 'loading' | 'show' | 'hide'

function formatClosesLabel(ms: number): string {
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Calcutta',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
  // "Wednesday, 1 July at 11:59 PM" → "Wednesday, 1 July · 11:59 PM IST"
  return fmt.format(new Date(ms)).replace(' at ', ' · ') + ' IST'
}

function useCountdown(targetMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, targetMs - now)
  const totalSec = Math.floor(diff / 1000)
  const days    = Math.floor(totalSec / 86400)
  const hours   = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return { diff, days, hours, minutes, seconds, expired: diff <= 0 }
}

export default function AwardsPredictionGate() {
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null)
  const countdown = useCountdown(deadlineMs ?? 0)

  // Load the awards deadline from features.json on mount.
  useEffect(() => {
    let cancelled = false
    fetchFeatures()
      .then(d => {
        if (cancelled) return
        const raw = typeof d.awards_lock_at === 'string' ? d.awards_lock_at.trim() : ''
        const ms  = raw ? parseIstToMs(raw) : null
        setDeadlineMs(ms)
      })
      .catch(() => { if (!cancelled) setDeadlineMs(null) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const session = getSession()
    if (!session) { setStatus('hide'); return }
    if (HIDDEN_PATHS.has(location.pathname)) { setStatus('hide'); return }
    if (deadlineMs == null) { setStatus('hide'); return }
    if (countdown.expired) { setStatus('hide'); return }
    if (isSkipActive()) { setStatus('hide'); return }

    let cancelled = false
    setStatus('loading')
    fetch(`${API_BASE}/wc_tournament_predictions/byClient.php?client_id=${session.clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return
        if (data && (data.submitted || data.locked_now)) setStatus('hide')
        else setStatus('show')
      })
      .catch(() => { if (!cancelled) setStatus('hide') })

    return () => { cancelled = true }
  }, [location.pathname, countdown.expired, deadlineMs])

  if (status !== 'show') return null

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-4 py-16 sm:py-20">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header band */}
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white px-5 py-5 text-center">
            <div className="text-4xl mb-1">🏆</div>
            <h2 className="text-xl font-black leading-tight">Predict the Tournament Awards</h2>
            <p className="text-amber-50 text-[12px] mt-1 font-semibold">
              Winner · Golden Ball / Boot / Glove
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">

            {/* Countdown */}
            <div>
              <p className="text-center text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">
                Time left · वेळ शिल्लक
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Days',  value: countdown.days },
                  { label: 'Hours', value: countdown.hours },
                  { label: 'Min',   value: countdown.minutes },
                  { label: 'Sec',   value: countdown.seconds },
                ].map(b => (
                  <div key={b.label} className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl py-2.5 text-center">
                    <div className="text-2xl font-black text-white leading-none tabular-nums">{pad(b.value)}</div>
                    <div className="text-[9px] uppercase tracking-wider text-amber-300 font-bold mt-1">{b.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-center text-[11px] text-gray-500 mt-2 font-semibold">
                Closes {deadlineMs != null ? formatClosesLabel(deadlineMs) : '—'}
              </p>
            </div>

            {/* English message */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-1">English</p>
              <p className="text-sm text-gray-800 leading-snug">
                You haven't submitted your tournament award predictions yet. Pick the
                <span className="font-bold"> Winner, Golden Ball, Golden Boot &amp; Golden Glove </span>
                before the timer ends and earn up to
                <span className="font-bold"> 250 football coins</span>.
              </p>
            </div>

            {/* Marathi message */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider font-bold text-orange-700 mb-1">मराठी</p>
              <p className="text-sm text-gray-800 leading-snug">
                तुम्ही अजून टूर्नामेंट अवॉर्ड्सचा अंदाज सबमिट केलेला नाही. वेळ संपण्यापूर्वी
                <span className="font-bold"> विजेता संघ, गोल्डन बॉल, गोल्डन बूट आणि गोल्डन ग्लोव्ह </span>
                निवडा आणि
                <span className="font-bold"> 250 पर्यंत फुटबॉल कॉइन्स </span>
                कमवा.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate('/awards')}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black rounded-2xl shadow-lg active:scale-[0.98] transition-transform text-base"
            >
              Submit Now · आत्ता सबमिट करा →
            </button>

            <button
              onClick={() => { markSkipped(); setStatus('hide') }}
              className="w-full py-2 text-gray-500 text-sm font-semibold hover:text-gray-700 transition-colors"
            >
              Skip for now · नंतर करा
            </button>

            <p className="text-center text-[10px] text-gray-400 leading-snug">
              Once submitted, picks are locked. No changes allowed.<br />
              एकदा सबमिट केल्यानंतर बदल करता येणार नाहीत.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
