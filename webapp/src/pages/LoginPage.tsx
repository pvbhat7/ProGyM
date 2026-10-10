import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { sendOtp } from '../services/phoneAuth'
import { signInWithGoogle } from '../services/googleAuth'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'

export default function LoginPage() {
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const [sending, setSending] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'info' } | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const next: string | undefined = (location.state as { next?: string } | null)?.next

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }
    setSending(true)
    try {
      await sendOtp(mobile, 'recaptcha-container')
      navigate('/otp', { state: { mobile, next } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Firebase OTP error]', err)
      setError(
        msg.includes('too-many-requests') || msg.includes('TOO_MANY')
          ? 'Too many OTP requests for this number. Please wait 1–2 hours before trying again.'
          : msg.includes('TOO_SHORT') || msg.includes('INVALID_PHONE') || msg.includes('invalid-phone')
            ? 'Invalid mobile number. Please check and try again.'
            : msg.includes('billing-not-enabled') || msg.includes('BILLING')
              ? 'SMS service not enabled. Please contact support.'
              : msg.includes('reCAPTCHA') || msg.includes('recaptcha') || msg.includes('captcha-check-failed')
                ? 'Verification failed. Please refresh the page and try again.'
                : 'Could not send OTP. Please try again.'
      )
    } finally {
      setSending(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleError('')
    setGoogleLoading(true)
    try {
      const { googleUid, email, displayName, idToken } = await signInWithGoogle()
      const goSignup = () => navigate('/signup', {
        state: { method: 'google', googleIdToken: idToken, email: email ?? '', displayName: displayName ?? '', next },
      })

      // 1. Already linked via googleUid → login directly
      const uidRes = await fetch(`${API_BASE}/client/byGoogleUid.php?googleUid=${encodeURIComponent(googleUid)}`)
      const uidData = await uidRes.json()
      if (uidData.id && uidData.id > 0) {
        flushSync(() => login({ mobile: uidData.mobile, role: 'member', userId: uidData.id, userName: uidData.name || '' }))
        navigate(next || '/member-dashboard', { replace: true })
        return
      }

      // 2. Not linked yet — try matching by email silently
      // Not a member yet → self sign-up (asks name + OTP-verified mobile)
      if (!email) { goSignup(); return }
      const emailRes = await fetch(`${API_BASE}/client/byEmail.php?email=${encodeURIComponent(email)}`)
      const emailData = await emailRes.json()

      if (!emailData.id || emailData.id === 0) { goSignup(); return }

      // Auto-link in background, then login
      fetch(`${API_BASE}/client/linkGoogleUid.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: emailData.id, googleUid }),
      }).catch(() => {})

      flushSync(() => login({ mobile: emailData.mobile, role: 'member', userId: emailData.id, userName: emailData.name || '' }))
      navigate(next || '/member-dashboard', { replace: true })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setGoogleError(
        msg.includes('popup-closed') || msg.includes('cancelled')
          ? 'Sign-in cancelled.'
          : msg.includes('popup-blocked')
            ? 'Popup was blocked. Please allow popups for this site.'
            : 'Google sign-in failed. Please try again.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <>
      {/* Centered popup dialog */}
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setToast(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 flex flex-col items-center text-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              toast.type === 'error' ? 'bg-red-50' : 'bg-green-50'
            }`}>
              {toast.type === 'error' ? (
                <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              ) : (
                <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
            </div>

            {/* Message */}
            <p className="text-gray-800 font-medium text-sm leading-relaxed">{toast.msg}</p>

            {/* Dismiss button */}
            <button
              onClick={() => setToast(null)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-orange-500/20 hover:from-orange-400 hover:to-red-400 active:scale-[0.98] transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex items-center justify-center p-4 relative overflow-hidden select-none">

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-amber-300/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 w-[450px] h-[450px] bg-red-300/15 rounded-full blur-3xl" />
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

            {/* Google login in-progress overlay */}
            {googleLoading && (
              <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm">
                  <svg className="w-7 h-7 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm">Signing you in…</p>
                  <p className="text-xs text-gray-400 mt-1">Verifying your Google account</p>
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-100 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
                <p className="text-gray-500 text-sm">Enter your mobile number to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 tracking-[0.15em] uppercase">
                    Mobile Number
                  </label>
                  <div
                    className={`flex items-center bg-gray-50 border rounded-xl transition-all duration-300 ${
                      focused
                        ? 'border-orange-400 shadow-[0_0_0_3px_rgba(249,115,22,0.15)] bg-white'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="pl-4 text-orange-500 font-mono font-bold text-sm select-none tracking-wide">+91</span>
                    <div className="w-px h-5 bg-gray-300 mx-3 flex-shrink-0" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="Enter mobile number"
                      maxLength={10}
                      className="flex-1 py-3.5 text-gray-900 placeholder-gray-300 bg-transparent outline-none text-base font-medium"
                      autoFocus
                    />
                    {mobile.length === 10 && (
                      <div className="pr-3.5 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                          <svg className="w-3 h-3 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  {error && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>

                <div id="recaptcha-container" />

                <button
                  type="submit"
                  disabled={sending}
                  className="relative w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 hover:from-orange-400 hover:to-red-400 active:scale-[0.98] transition-all duration-200 text-base overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-600 pointer-events-none" />
                  <span className="relative flex items-center justify-center gap-2">
                    {sending ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Sending OTP…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Send OTP
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Google Sign-In button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-semibold py-3.5 rounded-xl transition-all duration-200 text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </button>

              {googleError && (
                <p className="mt-3 text-xs text-red-500 flex items-center gap-1.5 justify-center">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  {googleError}
                </p>
              )}

              <p className="text-center text-xs text-gray-500 mt-5">
                <b className="text-gray-700">New to ProGym?</b> Use your mobile or Google above — we'll create your account after verification.
              </p>

              <p className="text-center text-xs text-gray-400 mt-3">
                By continuing, you agree to our Terms &amp; Privacy Policy
              </p>
            </div>
          </div>

          {/* WhatsApp support */}
          <div className="mt-5 text-center">
            <p className="text-xs text-gray-500 mb-2">Having trouble logging in?</p>
            <a
              href={`https://wa.me/918796655176?text=${encodeURIComponent("Hi, I'm unable to login to ProGym. Kindly help.")}`}
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
    </>
  )
}
