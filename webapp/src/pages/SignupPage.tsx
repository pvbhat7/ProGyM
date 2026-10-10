import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import { sendOtp, verifyOtp, clearPhoneAuth } from '../services/phoneAuth'

// Self sign-up for people who aren't gym members yet. Reached from the login screen:
//   method 'mobile' — mobile already OTP-verified → ask first/last name (+ optional email)
//   method 'google' — Google account verified    → ask first/last name + mobile with OTP
// The server (client/createSelfSignup.php) re-verifies the Firebase tokens, so the
// mobile/Google identity can't be faked from the browser.

type SignupState = {
  method: 'mobile' | 'google'
  mobile?: string
  phoneIdToken?: string
  googleIdToken?: string
  email?: string
  displayName?: string
  next?: string
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500'

export default function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const st = (location.state as SignupState | null) ?? null

  const [first, setFirst] = useState(() => (st?.displayName ?? '').trim().split(/\s+/)[0] ?? '')
  const [last, setLast]   = useState(() => (st?.displayName ?? '').trim().split(/\s+/).slice(1).join(' '))
  const [email, setEmail] = useState(st?.email ?? '')

  // Mobile verification (Google route only)
  const [mobile, setMobile]       = useState(st?.mobile ?? '')
  const [phoneToken, setPhoneToken] = useState(st?.phoneIdToken ?? '')
  const [otpSent, setOtpSent]     = useState(false)
  const [otp, setOtp]             = useState('')
  const [otpBusy, setOtpBusy]     = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [errorCode, setErrorCode] = useState('')

  useEffect(() => {
    if (!st || (st.method === 'mobile' && !st.phoneIdToken) || (st.method === 'google' && !st.googleIdToken)) {
      navigate('/login', { replace: true })
    }
    return () => clearPhoneAuth()
  }, [st, navigate])

  if (!st) return null
  const isGoogle = st.method === 'google'

  async function handleSendOtp() {
    setError(''); setErrorCode('')
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Enter a valid 10-digit mobile number'); return }
    setOtpBusy(true)
    try {
      const r = await fetch(`${API_BASE}/client/existsByMobile.php?mobile=${encodeURIComponent(mobile)}`)
      const d = await r.json()
      if (d.id && d.id > 0) {
        setErrorCode('mobile_exists')
        setError('This mobile number is already registered. Please log in with mobile OTP.')
        return
      }
      await sendOtp(mobile, 'recaptcha-signup')
      setOtpSent(true); setOtp('')
    } catch {
      setError('Could not send OTP. Please try again.')
    } finally {
      setOtpBusy(false)
    }
  }

  async function handleVerifyOtp() {
    setError('')
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return }
    setOtpBusy(true)
    try {
      const cred = await verifyOtp(otp)
      setPhoneToken(await cred.user.getIdToken())
    } catch {
      setError('Incorrect OTP. Please try again.')
    } finally {
      setOtpBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setErrorCode('')
    if (!first.trim()) { setError('Please enter your first name'); return }
    if (!last.trim())  { setError('Please enter your last name'); return }
    if (!phoneToken)   { setError('Please verify your mobile number'); return }
    if (!isGoogle && email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Please enter a valid email or leave it blank'); return }
    setSaving(true)
    try {
      const r = await fetch(`${API_BASE}/client/createSelfSignup.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: st!.method,
          phoneIdToken: phoneToken,
          googleIdToken: st!.googleIdToken,
          firstName: first.trim(),
          lastName: last.trim(),
          email: isGoogle ? '' : email.trim(),
        }),
      })
      if (r.status === 423) return   // service paused — global popup explains
      const d = await r.json()
      if (!d.success) {
        setErrorCode(d.code || '')
        setError(d.code === 'bad_phone_token' || d.code === 'bad_google_token'
          ? 'Your verification expired. Please start again from the login screen.'
          : d.error || 'Could not create your account.')
        return
      }
      clearPhoneAuth()
      flushSync(() => login({ mobile: d.mobile, role: 'member', userId: d.id, userName: d.name }))
      navigate(st!.next || '/member-dashboard', { replace: true })
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  const showLoginLink = ['mobile_exists', 'google_exists', 'bad_phone_token', 'bad_google_token'].includes(errorCode)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Pro<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Gym</span>
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl shadow-xl p-6 space-y-4">
          <button type="button" onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to login
          </button>

          <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 text-xs text-orange-800">
            {isGoogle
              ? <>Signed in with Google{st.email ? <> as <b>{st.email}</b></> : null}. Just a few details to finish.</>
              : <>Mobile <b>+91 {st.mobile}</b> verified ✓. Just a few details to finish.</>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-600">First name *</span>
              <input value={first} onChange={e => setFirst(e.target.value)} className={inputCls} autoComplete="given-name" maxLength={60} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-600">Last name *</span>
              <input value={last} onChange={e => setLast(e.target.value)} className={inputCls} autoComplete="family-name" maxLength={60} />
            </label>
          </div>

          {isGoogle ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-600">Mobile number *</span>
              {phoneToken ? (
                <p className="text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  ✓ +91 {mobile} verified
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">+91</div>
                    <input
                      type="tel" inputMode="numeric" value={mobile} disabled={otpSent || otpBusy}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={inputCls} placeholder="10-digit mobile" autoComplete="tel-national" />
                  </div>
                  {!otpSent ? (
                    <button type="button" onClick={handleSendOtp} disabled={otpBusy || mobile.length !== 10}
                      className="w-full py-2.5 rounded-xl border-2 border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-50 disabled:opacity-50">
                      {otpBusy ? 'Sending OTP…' : 'Send OTP'}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text" inputMode="numeric" autoComplete="one-time-code" value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={`${inputCls} text-center tracking-[0.4em] font-semibold`} placeholder="OTP" />
                      <button type="button" onClick={handleVerifyOtp} disabled={otpBusy || otp.length !== 6}
                        className="px-4 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50">
                        {otpBusy ? '…' : 'Verify'}
                      </button>
                    </div>
                  )}
                  {otpSent && (
                    <button type="button" onClick={() => { setOtpSent(false); setOtp('') }} className="text-xs text-gray-400 underline">
                      Change number / resend
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-600">Email <span className="font-normal text-gray-400">(optional)</span></span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} autoComplete="email" placeholder="you@example.com" />
            </label>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
              {showLoginLink && (
                <button type="button" onClick={() => navigate('/login')} className="block mt-1 font-semibold underline">Go to login</button>
              )}
            </div>
          )}

          <button type="submit" disabled={saving || !phoneToken}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold shadow-lg shadow-orange-200 hover:opacity-90 disabled:opacity-50">
            {saving ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-[11px] text-gray-400 text-center">🎁 100 ProCoins welcome bonus on sign-up</p>
          <div id="recaptcha-signup" />
        </form>
      </div>
    </div>
  )
}
