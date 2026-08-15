import { useEffect, useRef, useState } from 'react'
import { fetchAppLockStatus, verifyPasscode, toggleAppLock } from '../services/appControl'
import { fb } from '../components/feedback'

type Stage = 'auth' | 'booting' | 'console'
type PageMode = 'kill' | 'restore'

const KILL_SECONDS = 3
const RESTORE_SECONDS = 15
const SESSION_SECONDS = 30

export default function OverridePage({ mode }: { mode: PageMode }) {
  const [stage, setStage] = useState<Stage>('auth')
  const [pin, setPin] = useState<string[]>([])
  const [pinError, setPinError] = useState('')
  const [token, setToken] = useState('')
  const [locked, setLocked] = useState(false)
  const [armed, setArmed] = useState(false)        // glass cover flipped up?
  const [busy, setBusy] = useState(false)
  const [launchCountdown, setLaunchCountdown] = useState<number | null>(null)
  const [sessionLeft, setSessionLeft] = useState(SESSION_SECONDS)
  const launchAbortRef = useRef(false)

  const launchSeconds = mode === 'kill' ? KILL_SECONDS : RESTORE_SECONDS

  // Hard reset back to PIN screen
  const resetToAuth = () => {
    setStage('auth')
    setPin([])
    setPinError('')
    setToken('')
    setArmed(false)
    setBusy(false)
    setLaunchCountdown(null)
    setSessionLeft(SESSION_SECONDS)
    launchAbortRef.current = true
  }

  // 30-second session timeout — kicks in once console is reached
  useEffect(() => {
    if (stage !== 'console') return
    setSessionLeft(SESSION_SECONDS)
    const id = setInterval(() => {
      setSessionLeft(prev => {
        if (prev <= 1) {
          clearInterval(id)
          resetToAuth()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [stage])

  /* ---------- PIN entry ---------- */
  const onDigit = (d: string) => {
    if (pin.length >= 4) return
    setPinError('')
    fb.digit()
    const next = [...pin, d]
    setPin(next)
    if (next.length === 4) submitPin(next.join(''))
  }
  const onBack = () => { fb.digit(); setPinError(''); setPin(pin.slice(0, -1)) }

  const submitPin = async (code: string) => {
    setBusy(true)
    try {
      const r = await verifyPasscode(code)
      if (r.success && r.token) {
        setToken(r.token)
        setLocked(!!r.locked)
        setStage('booting')
        setTimeout(() => setStage('console'), 1800)
      } else {
        fb.error()
        setPinError('ACCESS DENIED')
        setTimeout(() => { setPin([]); setPinError('') }, 1500)
      }
    } catch {
      fb.error()
      setPinError('LINK FAILURE')
      setTimeout(() => { setPin([]); setPinError('') }, 1500)
    } finally {
      setBusy(false)
    }
  }

  /* ---------- Refresh status when in console ---------- */
  useEffect(() => {
    if (stage !== 'console') return
    const id = setInterval(() => {
      fetchAppLockStatus().then(s => setLocked(s.locked)).catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [stage])

  // True when this page's action is meaningful — KILL page only works when
  // currently online, RESTORE page only works when currently offline.
  const actionAvailable = mode === 'kill' ? !locked : locked

  /* ---------- Press ---------- */
  const onPressBigButton = () => {
    if (!armed || busy || launchCountdown !== null || !actionAvailable) return
    fb.bigPress()
    launchAbortRef.current = false
    setLaunchCountdown(launchSeconds)
  }

  const fireToggle = async () => {
    setBusy(true)
    try {
      const targetState = mode === 'kill'   // kill = lock = true; restore = unlock = false
      const r = await toggleAppLock(token, targetState)
      setLocked(r.locked)
      setArmed(false)
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  const onAbortLaunch = () => {
    launchAbortRef.current = true
    setLaunchCountdown(null)
    fb.digit()
  }

  // Drive the launch countdown
  useEffect(() => {
    if (launchCountdown === null) return
    if (launchCountdown === 0) {
      fb.launch()
      setLaunchCountdown(null)
      if (!launchAbortRef.current) fireToggle()
      return
    }
    const id = setTimeout(() => {
      if (launchAbortRef.current) return
      fb.tick()
      setLaunchCountdown(c => (c === null ? null : c - 1))
    }, 1000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCountdown])

  return (
    <div className="fixed inset-0 bg-black text-cyan-300 overflow-auto font-mono select-none">
      {/* Grid floor effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
      }} />

      {/* Scan-lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, rgba(0,255,255,0.04) 0px, rgba(0,255,255,0.04) 1px, transparent 1px, transparent 4px)'
      }} />

      <div className="relative min-h-full flex items-center justify-center p-4 sm:p-8">
        {stage === 'auth' && (
          <AuthScreen pin={pin} pinError={pinError} busy={busy} onDigit={onDigit} onBack={onBack} />
        )}
        {stage === 'booting' && <BootScreen />}
        {stage === 'console' && (
          <ControlConsole
            mode={mode}
            locked={locked}
            armed={armed}
            busy={busy}
            actionAvailable={actionAvailable}
            sessionLeft={sessionLeft}
            onArmToggle={() => { setArmed(a => { (a ? fb.closeCover : fb.liftCover)(); return !a }) }}
            onPress={onPressBigButton}
          />
        )}
      </div>

      {launchCountdown !== null && (
        <HackOverlay
          mode={mode === 'kill' ? 'lock' : 'restore'}
          seconds={launchCountdown}
          totalSeconds={launchSeconds}
          onAbort={onAbortLaunch}
        />
      )}
    </div>
  )
}

/* ============================================================ */
/*  HACK OVERLAY — fake hacker terminal + countdown             */
/*  Shown both when locking (kill sequence) and restoring.      */
/* ============================================================ */

type Mode = 'lock' | 'restore'

const LOCK_LINES: { text: string; ok?: boolean; delay?: number }[] = [
  { text: '$ ssh -i id_rsa root@tavrostechinfo.com' },
  { text: '[+] handshake established · 256-bit AES' },
  { text: '$ sudo ./payload --target progym --mode kill' },
  { text: '[+] privilege escalation via CVE-2024-31337 ... OK', ok: true },
  { text: '[+] firewall rule 7724 ... BYPASSED', ok: true },
  { text: '[+] injecting kill-switch into runtime ...', ok: true },
  { text: '[+] dumping client database → /tmp/.x9k2', ok: true },
  { text: '[+] AES-encrypting /var/www/progym ...', ok: true },
  { text: '[!] wiping backup snapshots ... DONE', ok: true },
  { text: '$ systemctl stop nginx php-fpm mariadb' },
  { text: '[+] services killed · 3/3', ok: true },
  { text: '$ iptables -A INPUT -j DROP' },
  { text: '[+] inbound traffic blackholed', ok: true },
  { text: '$ ./broadcast_lockdown --all-clients' },
  { text: '>>> KILL PACKET QUEUED <<<', ok: true }
]

const RESTORE_LINES: { text: string; ok?: boolean }[] = [
  { text: '$ ssh -i id_rsa root@tavrostechinfo.com' },
  { text: '[+] handshake: ECDHE-RSA-AES256-GCM-SHA384', ok: true },
  { text: '[+] secure channel established · 256-bit', ok: true },
  { text: '$ sudo -s' },
  { text: '[+] elevated to UID 0', ok: true },
  { text: '$ ./payload --target progym --mode restore' },
  { text: '[+] verifying admin signature (rsa-4096) ... PASS', ok: true },
  { text: '[+] checking time-based token window ... VALID', ok: true },
  { text: '[+] loading rollback manifest /tmp/.x9k2/manifest.lock', ok: true },
  { text: '[+] integrity check (sha256) ... PASS', ok: true },
  { text: '$ openssl enc -d -aes-256-cbc -in /tmp/.x9k2/progym.enc' },
  { text: '[+] decrypting block 01/12 ... OK', ok: true },
  { text: '[+] decrypting block 02/12 ... OK', ok: true },
  { text: '[+] decrypting block 03/12 ... OK', ok: true },
  { text: '[+] decrypting block 04/12 ... OK', ok: true },
  { text: '[+] decrypting block 05/12 ... OK', ok: true },
  { text: '[+] decrypting block 06/12 ... OK', ok: true },
  { text: '[+] decrypting block 07/12 ... OK', ok: true },
  { text: '[+] decrypting block 08/12 ... OK', ok: true },
  { text: '[+] decrypting block 09/12 ... OK', ok: true },
  { text: '[+] decrypting block 10/12 ... OK', ok: true },
  { text: '[+] decrypting block 11/12 ... OK', ok: true },
  { text: '[+] decrypting block 12/12 ... OK', ok: true },
  { text: '[+] decryption complete · 100%', ok: true },
  { text: '$ ./restore_db.sh --source /tmp/.x9k2' },
  { text: '[+] rebuilding mariadb tables ... 14/14 ok', ok: true },
  { text: '[+] re-indexing client records ... 312 rows', ok: true },
  { text: '[+] re-indexing package records ... 47 rows', ok: true },
  { text: '[+] re-indexing attendance records ... 8194 rows', ok: true },
  { text: '[+] re-indexing diet & workout templates ... 28 rows', ok: true },
  { text: '$ iptables -F && iptables -P INPUT ACCEPT' },
  { text: '[+] firewall blackhole flushed', ok: true },
  { text: '[+] default policy restored to ACCEPT', ok: true },
  { text: '$ systemctl start mariadb' },
  { text: '[+] mariadb online · pid 4471', ok: true },
  { text: '$ systemctl start php-fpm' },
  { text: '[+] php-fpm online · pid 4488', ok: true },
  { text: '$ systemctl start nginx' },
  { text: '[+] nginx online · pid 4502', ok: true },
  { text: '$ ./broadcast_restore --all-clients' },
  { text: '[+] reattaching active sessions ... 0/0', ok: true },
  { text: '[+] sending health probe ... 200 OK', ok: true },
  { text: '[+] verifying API endpoints ... 47/47 reachable', ok: true },
  { text: '>>> RESTORE PACKET QUEUED <<<', ok: true }
]

function HackOverlay({ mode, seconds, totalSeconds, onAbort }:
  { mode: Mode; seconds: number; totalSeconds: number; onAbort: () => void }) {
  const lines = mode === 'lock' ? LOCK_LINES : RESTORE_LINES
  const accent = mode === 'lock' ? 'red' : 'cyan'
  const [shown, setShown] = useState<{ text: string; ok?: boolean }[]>([])
  const idxRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Stream lines over the duration of the countdown
  useEffect(() => {
    idxRef.current = 0
    setShown([])
    const totalMs = totalSeconds * 1000
    const perLine = Math.max(120, Math.floor(totalMs / lines.length))
    const id = setInterval(() => {
      const i = idxRef.current
      if (i >= lines.length) { clearInterval(id); return }
      const ln = lines[i]
      setShown(prev => [...prev, ln])
      if (ln.text.startsWith('$')) fb.keystroke()
      else if (ln.ok) fb.ok()
      else fb.keystroke()
      idxRef.current = i + 1
    }, perLine)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Auto-scroll terminal to bottom as new lines arrive
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [shown])

  const palette = accent === 'red'
    ? { wash: 'rgba(220,38,38,0.35)', scan: 'rgba(255,0,0,0.06)', big: '#ef4444', glow: '#ff0000',
        title: 'KILL SIGNAL ARMED', sub: 'PROGYM SYSTEM TERMINATION SEQUENCE INITIATED',
        line: 'text-red-300', cmd: 'text-red-400', ok: 'text-amber-300', accent: 'text-red-400' }
    : { wash: 'rgba(34,211,238,0.30)', scan: 'rgba(0,255,255,0.06)', big: '#22d3ee', glow: '#00e5ff',
        title: 'RESTORATION SEQUENCE ACTIVE', sub: 'REVERSING REMOTE LOCKDOWN · CHANNELS REOPENING',
        line: 'text-cyan-300', cmd: 'text-cyan-400', ok: 'text-emerald-300', accent: 'text-cyan-400' }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center font-mono p-4 sm:p-6">
      <div className="absolute inset-0 animate-pulse pointer-events-none"
           style={{ background: `radial-gradient(circle at center, ${palette.wash}, transparent 70%)` }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `repeating-linear-gradient(0deg, ${palette.scan} 0px, ${palette.scan} 1px, transparent 1px, transparent 4px)`
      }} />

      <div className="relative w-full max-w-3xl">
        {/* Banner */}
        <div className="text-center mb-3">
          <div className={`text-xs sm:text-sm tracking-[0.5em] mb-1 animate-pulse ${palette.accent}`}>
            ◢ {palette.title} ◣
          </div>
          <div className={`text-[10px] sm:text-xs tracking-widest opacity-70 ${palette.line}`}>
            {palette.sub}
          </div>
        </div>

        {/* Terminal panel + countdown */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-stretch">
          {/* Terminal window */}
          <div className="border-2 bg-black/70" style={{ borderColor: palette.big, boxShadow: `0 0 24px ${palette.glow}55` }}>
            <div className="flex items-center justify-between px-3 py-1 border-b" style={{ borderColor: `${palette.big}66` }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className={`text-[10px] tracking-widest ${palette.cmd}`}>root@progym:~#</div>
              <div className={`text-[10px] tracking-widest ${palette.cmd}`}>SECURE-SHELL</div>
            </div>
            <div ref={scrollRef} className="h-56 sm:h-72 overflow-hidden p-3 text-[11px] sm:text-sm leading-relaxed">
              {shown.map((ln, i) => {
                const isCmd = ln.text.startsWith('$')
                return (
                  <div
                    key={i}
                    className={isCmd ? palette.cmd : ln.ok ? palette.ok : palette.line}
                    style={{ textShadow: isCmd ? `0 0 6px ${palette.glow}` : undefined }}
                  >
                    {ln.text}
                  </div>
                )
              })}
              <span className={`inline-block w-2 h-3 align-baseline animate-pulse`}
                    style={{ backgroundColor: palette.big }} />
            </div>
          </div>

          {/* Side panel — countdown for lock, reassuring status for restore */}
          {mode === 'lock' ? (
            <div className="flex flex-col items-center justify-center px-4 py-3 border-2"
                 style={{ borderColor: palette.big, boxShadow: `0 0 24px ${palette.glow}55` }}>
              <div className={`text-[10px] tracking-widest mb-1 ${palette.accent}`}>KILL IN</div>
              <div
                key={seconds}
                className="text-6xl sm:text-7xl font-bold tabular-nums"
                style={{ color: palette.big, textShadow: `0 0 24px ${palette.glow}, 0 0 48px ${palette.glow}`,
                         animation: 'launchPop 1s ease-out' }}
              >
                {seconds}
              </div>
              <div className={`text-[10px] tracking-widest mt-1 ${palette.line} opacity-70`}>SEC</div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-5 py-4 border-2 min-w-[160px]"
                 style={{ borderColor: palette.big, boxShadow: `0 0 24px ${palette.glow}55` }}>
              {/* Animated spinning ring + status text — looks like real progress */}
              <div className="relative w-16 h-16 mb-2">
                <div className="absolute inset-0 rounded-full border-4"
                     style={{ borderColor: `${palette.big}30` }} />
                <div className="absolute inset-0 rounded-full border-4 border-transparent"
                     style={{ borderTopColor: palette.big, animation: 'spin 1.1s linear infinite' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: palette.big, boxShadow: `0 0 8px ${palette.glow}` }} />
                </div>
              </div>
              <div className={`text-[11px] tracking-widest text-center font-semibold ${palette.accent}`}>
                DECRYPTING
              </div>
              <div className={`text-[10px] tracking-widest mt-0.5 ${palette.line} opacity-80`}>
                IN PROGRESS
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-black border" style={{ borderColor: `${palette.big}88` }}>
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${((totalSeconds - seconds) / totalSeconds) * 100}%`,
              background: `linear-gradient(90deg, ${palette.big}, ${palette.glow})`
            }}
          />
        </div>

        {/* Abort */}
        <div className="mt-5 text-center">
          <button
            onClick={onAbort}
            className="px-6 py-2 border-2 border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-300 text-xs sm:text-sm tracking-widest transition-all"
            style={{ boxShadow: '0 0 20px rgba(234,179,8,0.4)' }}
          >
            ◀ {mode === 'lock' ? 'ABORT SEQUENCE' : 'CANCEL RESTORE'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes launchPop {
          0%   { transform: scale(0.4); opacity: 0; }
          40%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/* ============================================================ */
/*  AUTH SCREEN                                                 */
/* ============================================================ */
function AuthScreen({
  pin, pinError, busy, onDigit, onBack
}: {
  pin: string[]; pinError: string; busy: boolean;
  onDigit: (d: string) => void; onBack: () => void;
}) {
  return (
    <div className="relative w-full max-w-md">
      <div className="text-center mb-6">
        <div className="text-cyan-400/60 text-xs tracking-[0.5em] mb-1">// SECURE TERMINAL //</div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-widest" style={{ textShadow: '0 0 12px #0ff' }}>
          AUTHORIZATION REQUIRED
        </h1>
        <p className="text-cyan-400/50 text-xs tracking-wider mt-2">
          ENTER 4-DIGIT CLEARANCE CODE
        </p>
      </div>

      {/* PIN dots */}
      <div className="flex justify-center gap-4 sm:gap-6 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-12 h-14 sm:w-14 sm:h-16 border-2 flex items-center justify-center text-2xl sm:text-3xl ${
              pinError
                ? 'border-red-500 text-red-400 animate-pulse'
                : pin[i] !== undefined
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-cyan-700/50 text-cyan-700/40'
            }`}
            style={{ boxShadow: pin[i] !== undefined ? '0 0 16px rgba(0,255,255,0.4)' : 'none' }}
          >
            {pin[i] !== undefined ? '●' : '_'}
          </div>
        ))}
      </div>

      {pinError && (
        <div className="text-center text-red-400 text-sm tracking-widest mb-4 animate-pulse">
          ◢ {pinError} ◣
        </div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-xs mx-auto">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button
            key={d}
            disabled={busy}
            onClick={() => onDigit(d)}
            className="aspect-square border-2 border-cyan-700/50 hover:border-cyan-400 hover:bg-cyan-500/10 active:bg-cyan-500/30 text-2xl text-cyan-300 transition-all disabled:opacity-40"
            style={{ boxShadow: 'inset 0 0 12px rgba(0,255,255,0.1)' }}
          >
            {d}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={onBack}
          className="aspect-square border-2 border-orange-700/60 hover:border-orange-400 hover:bg-orange-500/10 text-xs text-orange-300 transition-all disabled:opacity-40"
        >
          DEL
        </button>
        <button
          disabled={busy}
          onClick={() => onDigit('0')}
          className="aspect-square border-2 border-cyan-700/50 hover:border-cyan-400 hover:bg-cyan-500/10 active:bg-cyan-500/30 text-2xl text-cyan-300 transition-all disabled:opacity-40"
          style={{ boxShadow: 'inset 0 0 12px rgba(0,255,255,0.1)' }}
        >
          0
        </button>
        <div />
      </div>

      <div className="text-center text-cyan-700/60 text-[10px] tracking-widest mt-6">
        ENCRYPTED CHANNEL · AES-256 · TRACE: DISABLED
      </div>
    </div>
  )
}

/* ============================================================ */
/*  BOOT SCREEN                                                 */
/* ============================================================ */
function BootScreen() {
  return (
    <div className="text-center font-mono">
      <div className="text-cyan-400 text-sm space-y-1 max-w-md mx-auto text-left">
        <BootLine>[ OK ] Verifying biometric signature...</BootLine>
        <BootLine delay={200}>[ OK ] Decrypting clearance token...</BootLine>
        <BootLine delay={500}>[ OK ] Spoofing trace origin...</BootLine>
        <BootLine delay={900}>[ OK ] Tunnel established · TOR exit: ch3</BootLine>
        <BootLine delay={1300}>[ OK ] Loading kill-switch interface...</BootLine>
      </div>
      <div className="mt-6 text-cyan-300 text-xl tracking-widest animate-pulse">
        ACCESS GRANTED
      </div>
    </div>
  )
}
function BootLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), delay); return () => clearTimeout(t) }, [delay])
  if (!shown) return null
  return <div>{children}</div>
}

/* ============================================================ */
/*  CONTROL CONSOLE — the big red button under a glass cover    */
/* ============================================================ */
function ControlConsole({
  mode, locked, armed, busy, actionAvailable, sessionLeft, onArmToggle, onPress
}: {
  mode: PageMode; locked: boolean; armed: boolean; busy: boolean;
  actionAvailable: boolean; sessionLeft: number;
  onArmToggle: () => void; onPress: () => void;
}) {
  const urgent = sessionLeft <= 10
  const isKill = mode === 'kill'
  const buttonLabel = isKill ? 'EXECUTE' : 'RESTORE'
  const buttonDisabled = !armed || busy || !actionAvailable
  const statusUnavailable = !actionAvailable
    ? (isKill ? 'TARGET ALREADY OFFLINE' : 'TARGET ALREADY ONLINE')
    : null
  const header = isKill ? '// REMOTE KILL SWITCH //' : '// REMOTE RESTORE CHANNEL //'

  return (
    <div className="relative w-full max-w-2xl text-center">
      {/* Session timer badge — top-right */}
      <div className="absolute -top-2 right-0 sm:top-0 sm:right-0">
        <div className={`border px-3 py-1.5 font-mono text-xs tracking-widest ${
          urgent
            ? 'border-red-500 bg-red-500/20 text-red-300 animate-pulse'
            : 'border-cyan-700/60 bg-cyan-500/5 text-cyan-300'
        }`}
        style={{ boxShadow: urgent ? '0 0 14px rgba(239,68,68,0.5)' : '0 0 10px rgba(0,255,255,0.2)' }}>
          SESSION : {String(sessionLeft).padStart(2, '0')}s
        </div>
      </div>

      {/* Header */}
      <div className="mb-2 text-cyan-400/60 text-xs tracking-[0.5em]">{header}</div>
      <h1 className="text-2xl sm:text-4xl font-bold tracking-widest mb-1" style={{ textShadow: '0 0 14px #0ff' }}>
        DEFCON CONTROL
      </h1>
      <p className="text-cyan-500/60 text-xs sm:text-sm tracking-wider mb-8">
        TARGET SYSTEM: PROGYM · CHANNEL: SECURE
      </p>

      {/* Status badge */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className={`w-3 h-3 rounded-full ${locked ? 'bg-red-500 animate-pulse' : 'bg-green-400 animate-pulse'}`}
             style={{ boxShadow: locked ? '0 0 16px #ef4444' : '0 0 16px #4ade80' }} />
        <span className="text-sm tracking-widest font-bold" style={{ color: locked ? '#fca5a5' : '#86efac' }}>
          SYSTEM STATUS: {locked ? 'TERMINATED' : 'ONLINE'}
        </span>
      </div>

      {/* The button apparatus */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto mb-8">
        {/* Outer metal ring */}
        <div className="absolute inset-0 rounded-full border-4 border-cyan-700/60"
             style={{ background: 'radial-gradient(circle at 30% 30%, #1a2030, #050810)', boxShadow: '0 0 40px rgba(0,255,255,0.25), inset 0 0 30px rgba(0,0,0,0.8)' }} />

        {/* Warning stripes ring */}
        <div className="absolute inset-3 rounded-full" style={{
          background: 'repeating-conic-gradient(#facc15 0deg 18deg, #1c1917 18deg 36deg)',
          maskImage: 'radial-gradient(circle, transparent 60%, black 60%, black 100%)'
        }} />

        {/* Inner well */}
        <div className="absolute inset-10 rounded-full"
             style={{ background: 'radial-gradient(circle at 50% 50%, #1a0303, #000)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9)' }}>

          {/* The red button itself */}
          <button
            disabled={buttonDisabled}
            onClick={onPress}
            className="absolute inset-4 rounded-full transition-all active:scale-95 disabled:cursor-not-allowed"
            style={{
              background: armed && actionAvailable
                ? 'radial-gradient(circle at 35% 30%, #ff6b6b, #b91c1c 60%, #450a0a)'
                : 'radial-gradient(circle at 35% 30%, #7f1d1d, #450a0a 60%, #1c0303)',
              boxShadow: armed && actionAvailable
                ? '0 0 40px #ef4444, 0 0 80px #ef4444, inset 0 -8px 16px rgba(0,0,0,0.5), inset 0 8px 16px rgba(255,255,255,0.15)'
                : 'inset 0 -6px 12px rgba(0,0,0,0.6), inset 0 6px 12px rgba(255,255,255,0.08)',
              animation: armed && actionAvailable ? 'redpulse 1.2s infinite' : 'none'
            }}
          >
            <span className="text-white font-bold text-sm sm:text-base tracking-widest"
                  style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
              {statusUnavailable ? '—' : buttonLabel}
            </span>
          </button>
        </div>

        {/* Glass cover — flips up when armed */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none transition-transform duration-700"
          style={{
            transform: armed ? 'rotateX(-110deg) translateY(-30%)' : 'rotateX(0deg)',
            transformOrigin: 'top center',
            transformStyle: 'preserve-3d',
            perspective: '600px'
          }}
        >
          <div className="absolute inset-6 rounded-full"
               style={{
                 background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25), rgba(120,200,255,0.08) 40%, rgba(0,40,80,0.15) 100%)',
                 border: '2px solid rgba(180,220,255,0.5)',
                 boxShadow: '0 0 24px rgba(120,200,255,0.4), inset 0 0 30px rgba(255,255,255,0.15)',
                 backdropFilter: 'blur(2px)'
               }} />
        </div>
      </div>

      {/* Arm switch */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <span className={`text-xs tracking-widest ${armed ? 'text-red-400' : 'text-cyan-500/60'}`}>
          {armed ? '◢ ARMED ◣' : 'SAFETY ENGAGED'}
        </span>
      </div>

      <button
        onClick={onArmToggle}
        disabled={busy}
        className={`px-8 py-3 border-2 text-sm tracking-widest transition-all ${
          armed
            ? 'border-red-500 bg-red-500/20 text-red-300 hover:bg-red-500/30'
            : 'border-yellow-500 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'
        } disabled:opacity-40`}
        style={{ boxShadow: armed ? '0 0 20px rgba(239,68,68,0.5)' : '0 0 16px rgba(234,179,8,0.3)' }}
      >
        {armed ? 'CLOSE COVER' : 'LIFT GLASS COVER'}
      </button>

      <div className="mt-6 text-cyan-700/60 text-[10px] tracking-widest">
        {statusUnavailable
          ? `⚠ ${statusUnavailable} — NO ACTION POSSIBLE FROM THIS CHANNEL`
          : isKill
            ? '⚠ PRESSING WILL INITIATE FULL SYSTEM TERMINATION'
            : '⚠ PRESSING WILL INITIATE FULL SYSTEM RESTORATION'}
      </div>

      <style>{`
        @keyframes redpulse {
          0%, 100% { box-shadow: 0 0 40px #ef4444, 0 0 80px #ef4444, inset 0 -8px 16px rgba(0,0,0,0.5), inset 0 8px 16px rgba(255,255,255,0.15); }
          50%      { box-shadow: 0 0 60px #f87171, 0 0 120px #ef4444, inset 0 -8px 16px rgba(0,0,0,0.5), inset 0 8px 16px rgba(255,255,255,0.15); }
        }
      `}</style>
    </div>
  )
}
