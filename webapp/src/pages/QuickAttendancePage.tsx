import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

type PackageDetail = { id: number; startDate: string; endDate: string; status: string }

const parseDate = (s: string) => {
  if (!s) return null
  const [d, m, y] = s.split('/').map(Number)
  return isNaN(d + m + y) ? null : new Date(y, m - 1, d)
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
function fmtDMY(s: string | null | undefined): string {
  if (!s) return ''
  const [d, m, y] = s.split('/').map(Number)
  if (isNaN(d + m + y)) return ''
  const sfx = ['th','st','nd','rd']
  const v = d % 100
  const ord = sfx[(v - 20) % 10] || sfx[v] || sfx[0]
  return `${d}${ord} ${MONTH_NAMES[m - 1]} ${y}`
}

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur)
    }
    play(523, 0, 0.15)
    play(659, 0.15, 0.15)
    play(784, 0.3, 0.35)
  } catch { /* AudioContext blocked until user gesture — that's fine */ }
}

type Phase = 'input' | 'checking' | 'success' | 'already' | 'notFound' | 'error'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const NUM_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function QuickAttendancePage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('input')
  const [digits, setDigits] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberPhoto, setMemberPhoto] = useState('')
  const [checkinTime, setCheckinTime] = useState('')
  const [presentDays, setPresentDays] = useState<Set<string>>(new Set())
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [pkgStartDate, setPkgStartDate] = useState('')
  const [pkgEndDate, setPkgEndDate] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [coinBalance, setCoinBalance] = useState<number | null>(null)
  const [coinCredited, setCoinCredited] = useState(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittingRef = useRef(false)

  const clearCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }

  const reset = () => {
    clearCountdown()
    submittingRef.current = false
    setPhase('input'); setDigits(''); setMemberName(''); setMemberPhoto('')
    setCheckinTime(''); setPresentDays(new Set()); setDaysLeft(null); setPkgStartDate(''); setPkgEndDate(''); setCountdown(0)
    setCoinBalance(null); setCoinCredited(false)
  }

  useEffect(() => () => clearCountdown(), [])

  const startCountdown = (secs: number) => {
    setCountdown(secs)
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearCountdown(); navigate('/'); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const addDigit = (k: string) => { if (digits.length < 10) setDigits(d => d + k) }
  const delDigit = () => setDigits(d => d.slice(0, -1))

  const handleSubmit = async (mobile: string) => {
    if (mobile.length < 10 || submittingRef.current) return
    submittingRef.current = true
    setPhase('checking')
    try {
      const clientRes = await fetch(`${API_BASE}/client/existsByMobile.php?mobile=${mobile}`)
      const clientData = await clientRes.json()
      if (!clientData.id || clientData.id === 0) {
        submittingRef.current = false
        setPhase('notFound')
        return
      }
      const cid: number = clientData.id
      setMemberName(clientData.name || 'Member')

      const todayRes = await fetch(`${API_BASE}/attendance/byToday.php?cid=${cid}`)
      const alreadyMarked = todayRes.ok && todayRes.status !== 404
      if (!alreadyMarked) await fetch(`${API_BASE}/attendance/create.php?cid=${cid}`)

      const now = new Date()
      setCheckinTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))

      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const [attRes, pkgRes, profRes, coinRes] = await Promise.all([
        fetch(`${API_BASE}/attendance/byMonthAndYear.php?month=${month}&year=${year}&cid=${cid}`),
        fetch(`${API_BASE}/packageDetails/byClientId.php?clientId=${cid}`),
        fetch(`${API_BASE}/client/byId.php?id=${cid}`),
        fetch(`${API_BASE}/procointransaction/retrieve.php?clientId=${cid}`),
      ])

      const presentSet = new Set<string>()
      if (attRes.ok) {
        const att = await attRes.json()
        if (Array.isArray(att)) {
          att.filter(r => r && r.day).forEach(r => {
            presentSet.add(`${year}-${String(month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`)
          })
        }
      }
      presentSet.add(
        `${year}-${String(month).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      )
      setPresentDays(presentSet)

      if (pkgRes.ok) {
        const pkgs = await pkgRes.json()
        if (Array.isArray(pkgs) && pkgs.length > 0) {
          const active = (pkgs as PackageDetail[]).find(p => {
            const end = parseDate(p.endDate)
            return end && end >= new Date()
          }) || pkgs[0]
          const end = parseDate(active.endDate)
          if (end) setDaysLeft(Math.ceil((end.getTime() - Date.now()) / 86400000))
          setPkgStartDate(fmtDMY(active.startDate))
          setPkgEndDate(fmtDMY(active.endDate))
        }
      }

      if (profRes.ok) {
        const prof = await profRes.json()
        if (prof.photo) setMemberPhoto(prof.photo)
      }

      if (coinRes.ok) {
        try {
          const txns = await coinRes.json()
          if (Array.isArray(txns)) {
            const bal = txns.reduce((acc: number, t: { creditDebit: string; amount: string }) =>
              t.creditDebit === '1'
                ? acc + parseFloat(t.amount || '0')
                : acc - parseFloat(t.amount || '0'), 0)
            setCoinBalance(Math.max(0, Math.round(bal)))
          }
        } catch {}
      }
      setCoinCredited(!alreadyMarked)

      playSuccessSound()
      setPhase(alreadyMarked ? 'already' : 'success')
      startCountdown(10)
    } catch {
      submittingRef.current = false
      setPhase('error')
      setTimeout(reset, 3000)
    }
  }

  // Auto-submit when 10 digits entered
  useEffect(() => {
    if (digits.length === 10 && (phase === 'input' || phase === 'notFound')) {
      handleSubmit(digits)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  // Reset submittingRef when phase goes back to input/notFound
  useEffect(() => {
    if (phase === 'input' || phase === 'notFound') submittingRef.current = false
  }, [phase])

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return { key, day: DAY_LABELS[d.getDay()], date: d.getDate(), isToday: i === 6 }
  })

  // 10 digit boxes
  const DigitBoxes = () => (
    <div className="flex gap-1.5 justify-center mb-5">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`w-7 h-9 rounded-lg flex items-center justify-center text-sm font-bold border transition-all ${
          i < digits.length
            ? 'bg-violet-600 border-violet-500 text-white'
            : phase === 'notFound' || phase === 'error'
              ? 'bg-red-50 border-red-300 text-red-300'
              : 'bg-gray-100 border-gray-300 text-gray-400'
        }`}>
          {i < digits.length ? digits[i] : '·'}
        </div>
      ))}
    </div>
  )

  /* ── Input screen ── */
  if (phase === 'input' || phase === 'notFound' || phase === 'error') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center pt-10 px-6 select-none">
        <button onClick={() => navigate('/')}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg shadow-violet-500/30">
              📍
            </div>
            <h1 className="text-2xl font-black text-gray-900">Quick Check-In</h1>
            <p className="text-gray-500 text-sm mt-1">Enter your 10-digit mobile number</p>
          </div>

          {/* Digit boxes */}
          <DigitBoxes />

          {/* Error message */}
          {phase === 'notFound' && (
            <p className="text-red-500 text-sm text-center mb-4 font-medium">Mobile not registered. Try again.</p>
          )}
          {phase === 'error' && (
            <p className="text-red-500 text-sm text-center mb-4 font-medium">Something went wrong. Retrying…</p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-4">
            {NUM_KEYS.map((k, i) => (
              <button key={i}
                onClick={() => { if (k === '⌫') delDigit(); else if (k) addDigit(k) }}
                disabled={!k}
                className={`h-20 rounded-2xl text-4xl font-bold transition-all active:scale-90 ${
                  !k ? 'invisible' :
                  k === '⌫' ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' :
                  'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200 shadow-sm'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── Checking screen ── */
  if (phase === 'checking') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-900 text-xl font-semibold">Marking attendance…</p>
      </div>
    )
  }

  /* ── Success / Already-marked screen ── */
  const isSuccess = phase === 'success'
  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-lg">

        {/* Avatar + name */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-5xl font-black text-white shadow-2xl border-4 border-white mx-auto">
              {memberPhoto
                ? <img src={memberPhoto} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                : memberName.charAt(0).toUpperCase()
              }
            </div>
            <div className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center text-xl border-4 border-gray-50 ${isSuccess ? 'bg-green-500' : 'bg-yellow-500'}`}>
              {isSuccess ? '✓' : '!'}
            </div>
          </div>

          <h2 className="text-4xl font-black text-gray-900 leading-tight">
            {isSuccess ? `Welcome, ${memberName}!` : `Hi, ${memberName}!`}
          </h2>
          <p className={`text-lg font-semibold mt-2 ${isSuccess ? 'text-green-600' : 'text-yellow-600'}`}>
            {isSuccess ? `✅  Attendance marked · ${checkinTime}` : `⚠️  Already checked in today`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Package remaining */}
          {daysLeft !== null && (() => {
            const isCritical = daysLeft < 5   // blinking red when fewer than 5 days left (incl. expired)
            const isWarn     = daysLeft >= 5 && daysLeft <= 10
            const cardCls =
              isCritical ? 'bg-red-50 border-red-300 animate-pulse' :
              isWarn     ? 'bg-yellow-50 border-yellow-200'         :
                           'bg-green-50 border-green-200'
            const textCls =
              isCritical ? 'text-red-600' :
              isWarn     ? 'text-yellow-600' :
                           'text-green-600'
            return (
              <div className={`rounded-2xl p-4 flex items-center justify-center gap-3 border ${cardCls}`}>
                <span className="text-2xl">📦</span>
                <div className="text-center">
                  <p className={`text-lg font-black ${textCls}`}>
                    {daysLeft > 0 ? `${daysLeft} days remaining in current package` : `Package expired on ${pkgEndDate}`}
                  </p>
                  {(pkgStartDate || pkgEndDate) && (
                    <p className="text-gray-500 text-xs mt-1">
                      {pkgStartDate && `Start: ${pkgStartDate}`}{pkgStartDate && pkgEndDate && ' · '}{pkgEndDate && `End: ${pkgEndDate}`}
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Last 7 days attendance */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4 text-center">
              Last 7 Days Attendance
            </p>
            <div className="flex justify-center gap-3">
              {last7.map(d => {
                const present = presentDays.has(d.key)
                return (
                  <div key={d.key} className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      present
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : d.isToday
                          ? 'bg-transparent text-gray-700 border-2 border-gray-400'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {d.date}
                    </div>
                    <span className={`text-xs font-semibold ${d.isToday ? 'text-green-600' : 'text-gray-400'}`}>
                      {d.day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ProCoin Banner */}
        {coinBalance !== null && (
          coinCredited ? (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-xl shadow-amber-700/25">
              <div className="bg-gradient-to-br from-yellow-600 via-amber-600 to-orange-600 p-5">

                {/* Top row */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">ProCoins Balance</p>
                  <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                    <span className="text-yellow-200 text-sm leading-none">⭐</span>
                    <span className="text-white text-xs font-semibold">+1 Coin Earned!</span>
                  </div>
                </div>

                {/* Coin + balance */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl shadow-lg">
                      🪙
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-300 rounded-full flex items-center justify-center shadow text-xs font-black text-yellow-800 leading-none">
                      +1
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-black text-5xl leading-none tracking-tight">{coinBalance}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-white/70 text-xs">ProCoins</span>
                      <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-white text-xs font-semibold">1 ProCoin = ₹1</span>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/20">
                  <span className="text-base flex-shrink-0">🔐</span>
                  <p className="text-white/90 text-xs font-semibold">Login to the ProGym app to redeem your ProCoins</p>
                </div>

              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-xl shadow-amber-700/25">
              <div className="bg-gradient-to-br from-yellow-600 via-amber-600 to-orange-600 p-5">

                {/* Top row */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">ProCoins Balance</p>
                  <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                    <svg className="w-3.5 h-3.5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white text-xs font-semibold">Credited today</span>
                  </div>
                </div>

                {/* Coin + balance */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl shadow-lg">
                      🪙
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center shadow">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-black text-5xl leading-none tracking-tight">{coinBalance}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-white/70 text-xs">ProCoins</span>
                      <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-white text-xs font-semibold">1 ProCoin = ₹1</span>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/20">
                  <span className="text-base flex-shrink-0">🔐</span>
                  <p className="text-white/90 text-xs font-semibold">Login to the ProGym app to redeem your ProCoins</p>
                </div>

              </div>
            </div>
          )
        )}

        {/* Countdown + Done */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">
            Returning to home in <span className="text-gray-900 font-bold">{countdown}s</span>
          </p>
          <button onClick={() => navigate('/')}
            className="px-10 py-3.5 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-xl transition-colors active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
