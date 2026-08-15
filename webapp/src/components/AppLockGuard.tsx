import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchAppLockStatus } from '../services/appControl'
import { isOverridePath } from '../constants/secret'
import { SirenAudio } from './SirenAudio'
import { getSharedAudioContext } from '../utils/audioPrewarm'

type Phase = 'ok' | 'countdown' | 'terminated'

const COUNTDOWN_SECONDS = 12
const POLL_MS = 7000

export default function AppLockGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [phase, setPhase] = useState<Phase>('ok')
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const sirenRef = useRef<SirenAudio | null>(null)
  const phaseRef = useRef<Phase>('ok')
  phaseRef.current = phase

  // The override pages must never be locked out — that's how we recover.
  const isOverride = isOverridePath(location.pathname)

  // Poll the server for lock status
  useEffect(() => {
    if (isOverride) return

    let cancelled = false
    const tick = async () => {
      try {
        const s = await fetchAppLockStatus()
        if (cancelled) return
        if (s.locked && phaseRef.current === 'ok') {
          // Just turned locked — start the dramatic countdown
          setPhase('countdown')
          setSecondsLeft(COUNTDOWN_SECONDS)
        } else if (!s.locked && phaseRef.current !== 'ok') {
          // Unlocked remotely — restore
          setPhase('ok')
          sirenRef.current?.stop()
          sirenRef.current = null
        }
      } catch { /* ignore network errors so we fail open */ }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [isOverride])

  // Countdown driver + siren
  useEffect(() => {
    if (phase !== 'countdown') return

    // Try to start siren immediately. If browser autoplay policy blocks it
    // (always the case on a fresh page refresh), the AudioContext stays
    // suspended until first user gesture — we attach catch-all listeners
    // so the very first tap/click/key/touch arms the audio.
    if (!sirenRef.current) sirenRef.current = new SirenAudio()
    sirenRef.current.start()

    const arm = () => {
      sirenRef.current?.start()
    }
    const events: (keyof DocumentEventMap)[] = ['click', 'touchstart', 'pointerdown', 'keydown', 'mousedown']
    events.forEach(ev => document.addEventListener(ev, arm, { once: true, passive: true } as AddEventListenerOptions))

    const id = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(id)
          setPhase('terminated')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(id)
      events.forEach(ev => document.removeEventListener(ev, arm))
    }
  }, [phase])

  // Stop siren when leaving countdown phase
  useEffect(() => {
    if (phase === 'ok') {
      sirenRef.current?.stop()
      sirenRef.current = null
    }
    // Permanent terminated phase: keep the siren going for max drama? No — too annoying.
    // Cut it once countdown ends, then on the terminated screen play short alert beeps.
    if (phase === 'terminated') {
      sirenRef.current?.stop()
      sirenRef.current = null
    }
  }, [phase])

  if (isOverride || phase === 'ok') return <>{children}</>
  if (phase === 'countdown') return <CountdownScreen seconds={secondsLeft} />
  return <TerminatedScreen />
}

/* ---------- COUNTDOWN (Phase 1) — "Threat Detected · Isolating" ---------- */

function CountdownScreen({ seconds }: { seconds: number }) {
  const pct = ((COUNTDOWN_SECONDS - seconds) / COUNTDOWN_SECONDS) * 100
  return (
    <div className="fixed inset-0 z-[9999] overflow-auto select-none"
         style={{ background: 'linear-gradient(180deg, #0b1220 0%, #0a0f1a 60%, #060912 100%)',
                  color: '#e5e7eb', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-md overflow-hidden border"
             style={{ background: 'rgba(15,23,42,0.7)', borderColor: '#7f1d1d',
                      boxShadow: '0 0 0 1px rgba(220,38,38,0.25), 0 10px 40px rgba(0,0,0,0.6)' }}>

          {/* Header */}
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b flex items-center gap-3 sm:gap-4"
               style={{ borderColor: 'rgba(220,38,38,0.4)', background: 'rgba(127,29,29,0.18)' }}>
            <div className="rounded-full p-2 sm:p-2.5 animate-pulse"
                 style={{ background: 'rgba(220,38,38,0.22)', border: '1px solid #ef4444',
                          boxShadow: '0 0 16px rgba(239,68,68,0.6)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      stroke="#ef4444" strokeWidth="1.8" fill="rgba(239,68,68,0.10)"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] sm:text-xs tracking-[0.25em] text-red-300 font-semibold">CRITICAL THREAT DETECTED</div>
              <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">Containment Protocol Engaging</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Malicious activity has been identified on this device.
                The system will be isolated from the network shortly to prevent further damage.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-8 py-6 sm:py-7">
            {/* Threat preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat label="Threat"   value="Trojan.Cryptolock.X9K2" mono />
              <Stat label="Severity" value="CRITICAL" highlight />
              <Stat label="Action"   value="QUARANTINE" />
              <Stat label="Status"   value="ENGAGING" pulse />
            </div>

            {/* Countdown panel */}
            <div className="rounded border px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
                 style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'rgba(239,68,68,0.4)' }}>
              <div className="flex flex-col items-center justify-center min-w-[120px]">
                <div className="text-[10px] tracking-[0.3em] text-red-300/80 font-semibold mb-1">ISOLATING IN</div>
                <div
                  key={seconds}
                  className="text-6xl sm:text-7xl font-bold tabular-nums leading-none"
                  style={{ color: '#fca5a5', textShadow: '0 0 24px rgba(239,68,68,0.7)',
                           animation: 'popIn 0.9s ease-out' }}
                >
                  {String(seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] tracking-widest text-slate-400 mt-1">SECONDS</div>
              </div>

              <div className="flex-1 w-full">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Severing active connections</span>
                  <span className="font-mono">{Math.round(pct)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full transition-all duration-1000 ease-linear"
                       style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #dc2626, #f97316)' }} />
                </div>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  Do not power off this device. Network traffic is being severed and active sessions terminated.
                  Once isolation is complete you will be redirected to the quarantine console.
                </p>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500"
               style={{ borderColor: 'rgba(148,163,184,0.15)', background: 'rgba(0,0,0,0.35)' }}>
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Endpoint Security · v9.4.21 · signature db 2026.05.31</span>
            </div>
            <div className="font-mono">Pre-quarantine handoff</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0.4); opacity: 0; }
          40%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function Stat({ label, value, mono, highlight, pulse }:
  { label: string; value: string; mono?: boolean; highlight?: boolean; pulse?: boolean }) {
  return (
    <div className="rounded border px-3 py-2"
         style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(148,163,184,0.18)' }}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">{label}</div>
      {highlight ? (
        <div className="inline-block px-2 py-0.5 rounded text-[11px] font-bold tracking-wider"
             style={{ background: '#dc2626', color: 'white' }}>
          {value}
        </div>
      ) : (
        <div className={`text-sm text-slate-200 ${mono ? 'font-mono' : 'font-semibold'} ${pulse ? 'animate-pulse text-red-300' : ''}`}>
          {value}
        </div>
      )}
    </div>
  )
}

/* ---------- TERMINATED (Phase 2) — Corporate antivirus quarantine ---------- */

function TerminatedScreen() {
  const [audioReady, setAudioReady] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [uptime, setUptime] = useState(0) // seconds since lockdown

  // Try shared context immediately. If document had a prior gesture, this
  // already runs and sound plays instantly. If not, watch state until it does.
  useEffect(() => {
    const ac = getSharedAudioContext()
    if (!ac) return
    const check = () => { if (ac.state === 'running') setAudioReady(true) }
    check()
    ac.addEventListener?.('statechange', check)
    // Also fire on any gesture as a safety net
    const onGesture = () => { ac.resume().catch(() => {}); check() }
    const evs: (keyof DocumentEventMap)[] = ['click', 'touchstart', 'pointerdown', 'keydown', 'mousedown']
    evs.forEach(ev => document.addEventListener(ev, onGesture, { passive: true } as AddEventListenerOptions))
    return () => {
      ac.removeEventListener?.('statechange', check)
      evs.forEach(ev => document.removeEventListener(ev, onGesture))
    }
  }, [])

  // Periodic sterile error beep every ~4 seconds — system alert vibe
  useEffect(() => {
    if (!audioReady) return
    const ac = getSharedAudioContext()
    if (!ac) return

    const playBeep = () => {
      try {
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, ac.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.16, ac.currentTime + 0.005)
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18)
        osc.connect(gain); gain.connect(ac.destination)
        osc.start()
        osc.stop(ac.currentTime + 0.2)
        // Second beep ~150ms later — classic "boop-boop" system alert
        const osc2 = ac.createOscillator()
        const gain2 = ac.createGain()
        osc2.type = 'sine'
        osc2.frequency.value = 660
        gain2.gain.setValueAtTime(0.0001, ac.currentTime + 0.18)
        gain2.gain.exponentialRampToValueAtTime(0.14, ac.currentTime + 0.19)
        gain2.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.36)
        osc2.connect(gain2); gain2.connect(ac.destination)
        osc2.start(ac.currentTime + 0.18)
        osc2.stop(ac.currentTime + 0.4)
      } catch { /* noop */ }
    }
    playBeep()
    const id = setInterval(playBeep, 4000)
    return () => clearInterval(id)
  }, [audioReady])

  // Slowly creeping fake scan progress (loops 0–100 over ~40s)
  useEffect(() => {
    const id = setInterval(() => setScanProgress(p => (p >= 100 ? 0 : p + 1)), 400)
    return () => clearInterval(id)
  }, [])

  // Uptime since detection (counts up)
  useEffect(() => {
    const id = setInterval(() => setUptime(u => u + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const detectedAt = (() => {
    const d = new Date(Date.now() - uptime * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} IST`
  })()

  return (
    <div className="fixed inset-0 z-[9999] overflow-auto select-none"
         style={{ background: 'linear-gradient(180deg, #0b1220 0%, #0a0f1a 60%, #060912 100%)',
                  color: '#e5e7eb', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero card */}
        <div className="rounded-md overflow-hidden border"
             style={{ background: 'rgba(15,23,42,0.7)', borderColor: '#7f1d1d',
                      boxShadow: '0 0 0 1px rgba(220,38,38,0.25), 0 10px 40px rgba(0,0,0,0.6)' }}>

          {/* Header strip */}
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b flex items-center gap-3 sm:gap-4"
               style={{ borderColor: 'rgba(220,38,38,0.4)', background: 'rgba(127,29,29,0.15)' }}>
            <div className="rounded-full p-2 sm:p-2.5" style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid #ef4444' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      stroke="#ef4444" strokeWidth="1.8" fill="rgba(239,68,68,0.08)"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] sm:text-xs tracking-[0.25em] text-red-300 font-semibold">CRITICAL THREAT DETECTED</div>
              <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">System Access Has Been Suspended</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Malicious activity has been detected on this device and the system has been placed in protective isolation.
                All inbound and outbound traffic is currently blocked.
              </p>
            </div>
          </div>

          {/* Body grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0">

            {/* Threat details */}
            <div className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'rgba(220,38,38,0.25)' }}>
              <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-3">Threat Details</div>
              <dl className="text-sm space-y-2">
                <Row k="Threat ID"           v="Trojan.Cryptolock.X9K2-INFECTED" mono />
                <Row k="Severity"            v={<span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider"
                                                   style={{ background: '#dc2626', color: 'white' }}>CRITICAL</span>} />
                <Row k="Classification"      v="Ransomware / Data Encryption" />
                <Row k="Vector"              v="Inbound · HTTPS · Port 443" mono />
                <Row k="Detected"            v={detectedAt} mono />
                <Row k="Quarantine Uptime"   v={<span className="font-mono text-red-300">{fmtUptime(uptime)}</span>} />
                <Row k="Affected Modules"    v="47 / 47" mono />
                <Row k="Encrypted Records"   v="8,194" mono />
                <Row k="Host"                v="tavrostechinfo.com" mono />
                <Row k="Device Fingerprint"  v="9A:3E:7C:2F:88:1B:0D:5A" mono />
              </dl>
            </div>

            {/* Remediation */}
            <div className="p-4 sm:p-6">
              <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-3">Remediation Required</div>

              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                This system cannot be used until the threat is cleared by an authorized administrator.
                Contact your administrator immediately for further instructions.
              </p>

              <ul className="text-xs sm:text-sm text-slate-400 space-y-1.5 list-disc pl-5">
                <li>Do not power off this device — it may corrupt encrypted records.</li>
                <li>Do not refresh or close this window without proper remediation.</li>
                <li>Avoid public networks until remediation is verified.</li>
              </ul>

              {/* Fake "containment scan" progress */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Containment scan in progress</span>
                  <span className="font-mono">{scanProgress}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full transition-all duration-300"
                       style={{ width: `${scanProgress}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer strip */}
          <div className="px-4 sm:px-6 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500"
               style={{ borderColor: 'rgba(148,163,184,0.15)', background: 'rgba(0,0,0,0.35)' }}>
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Endpoint Security · v9.4.21 · signature db 2026.05.31</span>
            </div>
            <div className="font-mono">Incident #INC-{String((uptime % 10000) + 88212).padStart(6, '0')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <dt className="text-slate-500 shrink-0">{k}</dt>
      <dd className={`text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>{v}</dd>
    </div>
  )
}
