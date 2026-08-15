import { useState, useRef, useEffect } from 'react'
import type { ClipboardEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOtp, verifyOtp } from '../services/phoneAuth'
import { setSession } from '../services/wcSession'
import { clearStoredRefCode, getStoredRefCode } from '../services/referralCapture'
import { API_BASE } from '../api/config'

const OTP_LENGTH = 6
const SUPPORT_WA_NUMBER = '918796655176'

type Step = 'mobile' | 'otp' | 'name'

export default function SignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('mobile')

  const [mobile, setMobile] = useState('')
  const [name, setName]     = useState('')

  // Referral code — auto-prefilled from ?ref=... URL param (captured in main.tsx).
  // Shown on the very first screen so users who used a link see "Referred by"
  // confirmation; users who only have a code can paste it manually here.
  const [refCode, setRefCode] = useState(() => getStoredRefCode() || '')
  const [refExpanded, setRefExpanded] = useState(() => !!getStoredRefCode())

  // Whether the typed mobile is already a returning wc2026 participant.
  // null = unknown / not yet checked; true = brand-new; false = returning.
  // Used to hide the referral-code UI for returning users (they can't trigger
  // referral credit anyway — see register.php).
  const [mobileIsFresh, setMobileIsFresh] = useState<boolean | null>(null)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [resendCount, setResendCount] = useState(30)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Resend countdown
  useEffect(() => {
    if (step !== 'otp' || resendCount <= 0) return
    const t = setTimeout(() => setResendCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCount, step])

  // Once the user types a full 10-digit mobile, quickly check whether they
  // already have a wc2026 participant row. Hides the referral-code UI for
  // returning users. Debounced (~300ms) so partial-typing doesn't thrash.
  useEffect(() => {
    if (!/^\d{10}$/.test(mobile)) {
      setMobileIsFresh(null)
      return
    }
    const ac = new AbortController()
    const t = setTimeout(() => {
      fetch(`${API_BASE}/client/existsByMobile.php?mobile=${encodeURIComponent(mobile)}`, { signal: ac.signal })
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          // Returning wc2026 participant → hide the field. Unknown / fresh → show.
          if (j && j.is_wc_participant === true) setMobileIsFresh(false)
          else setMobileIsFresh(true)
        })
        .catch(() => { /* network / abort — fail open, leave the field visible */ })
    }, 300)
    return () => { clearTimeout(t); ac.abort() }
  }, [mobile])

  // Focus first OTP input when step becomes otp
  useEffect(() => {
    if (step === 'otp') setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }, [step])

  // Auto-verify when all 6 digits filled
  useEffect(() => {
    if (step === 'otp' && !busy && digits.every(d => d !== '')) {
      handleVerifyOtp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  // WebOTP API — Android Chrome can deliver the SMS code directly
  useEffect(() => {
    if (step !== 'otp') return
    if (typeof window === 'undefined') return
    if (!('OTPCredential' in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
      .then(cred => {
        const code = (cred as unknown as { code?: string } | null)?.code
        if (!code) return
        const cleaned = code.replace(/\D/g, '').slice(0, OTP_LENGTH)
        if (cleaned.length === OTP_LENGTH) {
          setDigits(cleaned.split(''))
          focusIndex(OTP_LENGTH - 1)
        }
      })
      .catch(() => { /* user dismissed or no matching SMS — ignore */ })
    return () => ac.abort()
  }, [step])

  function focusIndex(i: number) {
    const el = inputRefs.current[i]
    if (el) { el.focus(); el.select() }
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[i]) {
        next[i] = ''
        setDigits(next)
      } else if (i > 0) {
        next[i - 1] = ''
        setDigits(next)
        focusIndex(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) focusIndex(i - 1)
    else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) focusIndex(i + 1)
  }

  function handleOtpChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/\D/g, '')
    if (!cleaned) return

    if (cleaned.length >= OTP_LENGTH) {
      setDigits(cleaned.slice(0, OTP_LENGTH).split(''))
      focusIndex(OTP_LENGTH - 1)
      return
    }

    if (cleaned.length > 1) {
      const next = [...digits]
      for (let k = 0; k < cleaned.length && i + k < OTP_LENGTH; k++) {
        next[i + k] = cleaned[k]
      }
      setDigits(next)
      focusIndex(Math.min(i + cleaned.length, OTP_LENGTH - 1))
      return
    }

    const next = [...digits]
    next[i] = cleaned
    setDigits(next)
    if (i < OTP_LENGTH - 1) focusIndex(i + 1)
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    focusIndex(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  // ----- Step 1: mobile -----
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^\d{10}$/.test(mobile)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    setBusy(true)
    try {
      await sendOtp(mobile, 'recaptcha-container')
      setStep('otp')
      setResendCount(30)
    } catch (err: any) {
      setError(err?.message || 'Could not send OTP. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // ----- Step 2: OTP -----
  async function handleVerifyOtp() {
    setError('')
    const otp = digits.join('')
    if (otp.length !== OTP_LENGTH) return
    setBusy(true)
    try {
      await verifyOtp(otp)
      // OTP good — check if mobile already exists in client; if so skip name step.
      const existsRes = await fetch(`${API_BASE}/client/existsByMobile.php?mobile=${encodeURIComponent(mobile)}`)
      const exists = await existsRes.json()
      if (exists?.id && exists.id > 0) {
        // Existing client — register with their stored name and go straight in
        await registerAndPersist(exists.name || 'Player')
      } else {
        setStep('name')
      }
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('No OTP')) setError('Session expired. Go back and try again.')
      else setError('Invalid OTP. Please try again.')
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => focusIndex(0), 0)
    } finally {
      setBusy(false)
    }
  }

  async function handleResendOtp() {
    if (resendCount > 0 || busy) return
    setError('')
    setDigits(Array(OTP_LENGTH).fill(''))
    setBusy(true)
    try {
      await sendOtp(mobile, 'recaptcha-container')
      setResendCount(30)
      focusIndex(0)
    } catch {
      setError('Could not resend OTP. Try going back to mobile screen.')
    } finally {
      setBusy(false)
    }
  }

  // ----- Step 3: name (new users only) -----
  async function handleSubmitName(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (name.trim().length < 2) {
      setError('Please enter your name.')
      return
    }
    setBusy(true)
    try {
      await registerAndPersist(name.trim())
    } catch (err: any) {
      setError(err?.message || 'Could not complete signup.')
    } finally {
      setBusy(false)
    }
  }

  async function registerAndPersist(submittedName: string) {
    const cleanedRef = refCode.replace(/\s+/g, '').toUpperCase()
    const res = await fetch(`${API_BASE}/wc_signup/register.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: submittedName,
        mobile,
        referred_by_code: cleanedRef || undefined
      })
    })
    const j = await res.json()
    if (!res.ok || !j.client_id) {
      throw new Error(j?.message || 'Signup failed.')
    }
    // Referral code consumed (or rejected) — either way, clear the persisted
    // value so it doesn't get re-applied to a future signup on the same device.
    clearStoredRefCode()

    setSession({
      clientId: Number(j.client_id),
      name:     j.name || submittedName,
      mobile,
      joinedAt: Date.now()
    })

    // Note: push permission is requested on /matches mount, NOT here. Mobile
    // Chrome silently discards permission prompts whose originating page is
    // unmounting (we navigate away one tick after this). /matches is stable.
    navigate('/matches', { replace: true })
  }

  const maskedMobile = mobile.length >= 5 ? mobile.slice(0, 2) + 'XXXXX' + mobile.slice(-3) : mobile

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-sky-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-300/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] bg-amber-300/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <button
          onClick={() => step === 'mobile' ? navigate('/') : setStep('mobile')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-white p-7">
          {/* ----- STEP: mobile ----- */}
          {step === 'mobile' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <p className="text-3xl mb-2">📱</p>
                <h2 className="text-xl font-bold text-gray-900">Your mobile number</h2>
                <p className="text-sm text-gray-500 mt-1">We'll send a one-time OTP. No spam.</p>
              </div>

              <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
                <span className="px-3 py-3 text-sm text-gray-600 bg-gray-50 border-r border-gray-200">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="flex-1 px-3 py-3 text-base outline-none"
                  autoFocus
                />
              </div>

              {/* Referral code — only for first-time wc2026 joiners. Hidden
                  as soon as we learn this mobile is already a returning user
                  (mobileIsFresh === false). Default state: visible. */}
              {mobileIsFresh !== false && (
                !refExpanded ? (
                  <button
                    type="button"
                    onClick={() => setRefExpanded(true)}
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline self-start"
                  >
                    Have a referral code?
                  </button>
                ) : (
                  <div className="space-y-1">
                    <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <span>🎁 Referral code (optional)</span>
                      {refCode && (
                        <button
                          type="button"
                          onClick={() => { setRefCode(''); clearStoredRefCode() }}
                          className="text-[10px] font-semibold text-gray-400 hover:text-red-500 normal-case tracking-normal"
                        >Clear</button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={refCode}
                      onChange={e => setRefCode(e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 10))}
                      placeholder="e.g. ABC123"
                      className="w-full px-3 py-2.5 text-sm font-mono tracking-wider border border-amber-200 bg-amber-50 rounded-xl outline-none focus:border-amber-500 transition-colors"
                    />
                    <p className="text-[10px] text-gray-400">
                      Your friend earns 1 ⭐ star as soon as you sign up.
                    </p>
                  </div>
                )
              )}
              {mobileIsFresh === false && (
                <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  👋 Welcome back! Just verify OTP to continue.
                </p>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div id="recaptcha-container" />

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {busy ? 'Sending OTP…' : 'Send OTP'}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                By continuing, you agree to receive prediction-campaign messages from ProGym.
              </p>
            </form>
          )}

          {/* ----- STEP: otp ----- */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div>
                <p className="text-3xl mb-2">🔐</p>
                <h2 className="text-xl font-bold text-gray-900">Verify OTP</h2>
                <p className="text-sm text-gray-500 mt-1">
                  6-digit code sent to <span className="font-medium text-gray-700">+91 {maskedMobile}</span>
                </p>
              </div>

              <div className="flex gap-2 justify-between">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={i === 0 ? OTP_LENGTH : 1}
                    value={d}
                    onChange={e => handleOtpChange(i, e)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    onPaste={handleOtpPaste}
                    className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all bg-gray-50 ${d ? 'border-blue-500 text-blue-700' : 'border-gray-200 text-gray-900'} focus:border-blue-500 focus:bg-white`}
                  />
                ))}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div id="recaptcha-container" />

              <button
                onClick={handleVerifyOtp}
                disabled={busy || digits.some(d => d === '')}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {busy ? 'Verifying…' : 'Verify OTP'}
              </button>

              <div className="text-center">
                {resendCount > 0 ? (
                  <p className="text-xs text-gray-400">Resend OTP in <span className="font-medium text-gray-600">{resendCount}s</span></p>
                ) : (
                  <button onClick={handleResendOtp} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ----- STEP: name ----- */}
          {step === 'name' && (
            <form onSubmit={handleSubmitName} className="space-y-4">
              <div>
                <p className="text-3xl mb-2">👋</p>
                <h2 className="text-xl font-bold text-gray-900">What's your name?</h2>
                <p className="text-sm text-gray-500 mt-1">We'll show it on the leaderboard.</p>
              </div>

              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value.slice(0, 50))}
                placeholder="Your full name"
                className="w-full px-3 py-3 text-base border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {busy ? 'Finishing up…' : 'Start Predicting →'}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                🎁 You'll get a <span className="font-bold text-blue-700">100 football welcome bonus</span>.
              </p>
            </form>
          )}
        </div>

        {/* WhatsApp support */}
        <div className="mt-5 text-center">
          <p className="text-xs text-gray-500 mb-2">
            {step === 'otp' ? "Didn't receive OTP or facing trouble?" : 'Having trouble signing up?'}
          </p>
          <a
            href={`https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(
              step === 'otp'
                ? "Hi, I'm unable to verify OTP on ProGym World Cup 2026. Kindly help."
                : "Hi, I'm unable to sign up on ProGym World Cup 2026. Kindly help."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] active:scale-[0.98] text-white text-sm font-semibold shadow-md shadow-green-500/20 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.52 3.48A11.86 11.86 0 0012.04 0C5.5 0 .2 5.3.2 11.85c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 005.64 1.43h.01c6.54 0 11.84-5.3 11.84-11.85 0-3.16-1.23-6.13-3.37-8.42zM12.05 21.7h-.01a9.83 9.83 0 01-5.01-1.37l-.36-.21-3.8 1 1.01-3.7-.23-.38a9.83 9.83 0 01-1.5-5.19c0-5.43 4.42-9.85 9.86-9.85 2.63 0 5.1 1.03 6.96 2.89a9.78 9.78 0 012.89 6.96c0 5.44-4.43 9.85-9.81 9.85zm5.4-7.37c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.95-.93 1.15-.17.2-.34.22-.63.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.9-2.19-.24-.57-.49-.5-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35z"/>
            </svg>
            Contact Support on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
