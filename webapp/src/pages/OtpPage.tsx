import { useState, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import type { ClipboardEvent, ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import { verifyOtp, sendOtp } from '../services/phoneAuth'
import { isTabDashboardMobile } from '../constants/tabDashboard'

const OTP_LENGTH = 6

export default function OtpPage() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendCount, setResendCount] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const mobile: string = location.state?.mobile ?? ''
  const next: string | undefined = location.state?.next

  useEffect(() => {
    if (!mobile) navigate('/login', { replace: true })
    else inputRefs.current[0]?.focus()
  }, [mobile, navigate])

  useEffect(() => {
    if (resendCount <= 0) return
    const t = setTimeout(() => setResendCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCount])

  useEffect(() => {
    if (!verifying && digits.every(d => d !== '')) {
      handleVerify()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  useEffect(() => {
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
      .catch(() => { /* user cancelled or no SMS — ignore */ })
    return () => ac.abort()
  }, [])

  const focusIndex = (index: number) => {
    const el = inputRefs.current[index]
    if (el) { el.focus(); el.select() }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        next[index - 1] = ''
        setDigits(next)
        focusIndex(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusIndex(index - 1)
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      focusIndex(index + 1)
    }
  }

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '')
    if (!cleaned) return

    if (cleaned.length >= OTP_LENGTH) {
      const filled = cleaned.slice(0, OTP_LENGTH).split('')
      setDigits(filled)
      focusIndex(OTP_LENGTH - 1)
      return
    }

    if (cleaned.length > 1) {
      const next = [...digits]
      for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i++) {
        next[index + i] = cleaned[i]
      }
      setDigits(next)
      focusIndex(Math.min(index + cleaned.length, OTP_LENGTH - 1))
      return
    }

    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    if (index < OTP_LENGTH - 1) focusIndex(index + 1)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    focusIndex(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  const determineRoleAndLogin = async () => {
    const isTabDashboard = isTabDashboardMobile(mobile)

    const adminRes = await fetch(`${API_BASE}/adminuser/getByMobile.php?mobile=${encodeURIComponent(mobile)}`)
    const adminData = await adminRes.json()
    if (adminData.id) {
      flushSync(() => login({ mobile, role: 'admin', userId: adminData.id, userName: adminData.name }))
      navigate(isTabDashboard ? '/tab' : '/dashboard', { replace: true })
      return
    }

    const clientRes = await fetch(`${API_BASE}/client/existsByMobile.php?mobile=${encodeURIComponent(mobile)}`)
    const clientData = await clientRes.json()
    if (clientData.id && clientData.id > 0) {
      flushSync(() => login({ mobile, role: 'member', userId: clientData.id, userName: clientData.name || '' }))
      fetch(`${API_BASE}/client/recordLogin.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientData.id })
      }).catch(() => {})
      navigate(isTabDashboard ? '/tab' : (next || '/member-dashboard'), { replace: true })
      return
    }

    throw new Error('Mobile not registered')
  }

  const handleVerify = async () => {
    setError('')
    const filled = digits.filter(d => d !== '')
    if (filled.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP')
      return
    }
    const otp = digits.join('')
    setVerifying(true)
    try {
      await verifyOtp(otp)
      await determineRoleAndLogin()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('No OTP')) {
        setError('Session expired. Please go back and request a new OTP.')
      } else if (msg.includes('not registered')) {
        setError('Mobile number not registered. Please contact your gym.')
      } else {
        setError('Invalid OTP. Please try again.')
      }
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => focusIndex(0), 0)
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCount > 0) return
    setError('')
    setDigits(Array(OTP_LENGTH).fill(''))
    try {
      await sendOtp(mobile, 'recaptcha-container-otp')
      setResendCount(30)
      focusIndex(0)
    } catch {
      setError('Could not resend OTP. Please go back and try again.')
    }
  }

  const maskedMobile = mobile.length >= 5
    ? mobile.slice(0, 2) + 'XXXXX' + mobile.slice(-3)
    : mobile

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden select-none">

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-amber-300/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-[450px] h-[450px] bg-red-300/15 rounded-full blur-3xl" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-orange-400/20 rounded-2xl blur-2xl scale-125" />
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
              <img
                src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
                alt="ProGym"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Pro<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Gym</span>
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm tracking-wide">Your fitness journey starts here</p>
        </div>

        {/* Card */}
        <div className="relative bg-white border border-gray-200 rounded-3xl shadow-xl p-8 overflow-hidden">
          {/* Top glowing border accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />
          {/* Bottom corner accent */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-100 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            {/* Back button */}
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Verify OTP</h2>
              <p className="text-gray-500 text-sm">
                We've sent a 6-digit code to{' '}
                <span className="font-medium text-gray-700">+91 {maskedMobile}</span>
              </p>
            </div>

            {/* OTP inputs */}
            <div className="flex gap-2.5 justify-between mb-2">
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
                  onChange={e => handleChange(i, e)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onFocus={e => e.target.select()}
                  onPaste={handlePaste}
                  className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all cursor-pointer bg-gray-50
                    ${d
                      ? 'border-orange-400 text-orange-600'
                      : 'border-gray-200 text-gray-900'}
                    focus:border-orange-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]`}
                />
              ))}
            </div>

            {error && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </p>
            )}

            {/* Verify button */}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="relative w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 hover:from-orange-400 hover:to-red-400 active:scale-[0.98] transition-all duration-200 text-base mt-5 overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-600 pointer-events-none" />
              <span className="relative flex items-center justify-center gap-2">
                {verifying ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify & Login
                  </>
                )}
              </span>
            </button>

            {/* Invisible reCAPTCHA container for resend */}
            <div id="recaptcha-container-otp" />

            {/* Resend */}
            <div className="text-center mt-5">
              {resendCount > 0 ? (
                <p className="text-sm text-gray-400">
                  Resend OTP in <span className="font-medium text-gray-600">{resendCount}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp support */}
        <div className="mt-5 text-center">
          <p className="text-xs text-gray-500 mb-2">Didn't receive OTP or facing trouble?</p>
          <a
            href={`https://wa.me/918796655176?text=${encodeURIComponent("Hi, I'm unable to verify OTP on ProGym. Kindly help.")}`}
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
