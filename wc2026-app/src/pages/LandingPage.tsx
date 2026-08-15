import { useNavigate } from 'react-router-dom'
import { getSession } from '../services/wcSession'
import LaunchCountdown from '../components/LaunchCountdown'

export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()

  return (
    <div className="h-dvh min-h-[100svh] bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[420px] h-[420px] bg-indigo-400/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-[380px] h-[380px] bg-amber-300/25 rounded-full blur-3xl" />
      </div>

      {/* Top FIFA banner */}
      <div className="relative z-20 bg-gradient-to-r from-blue-800 via-indigo-700 to-blue-900 text-white py-2 text-center shadow-md flex-shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex items-center justify-center gap-1.5">
          <span className="text-amber-400">🏆</span>
          FIFA World Cup 2026 · Predict &amp; Earn
          <span className="text-amber-400">⚽</span>
        </p>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-sm px-6 text-center">
          <div className="mb-3"><LaunchCountdown variant="hero" /></div>

          {/* Hero — combined FIFA WC 2026 + ProGym mark */}
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src="/logo/fifa-progym.png"
              alt="ProGym FIFA World Cup 2026"
              className="h-48 w-auto object-contain drop-shadow-xl rounded-2xl"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>

          <h1 className="text-2xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700">
            FIFA World Cup 2026
          </h1>

          <h2 className="text-base font-bold text-gray-800 mt-4 leading-snug">
            Predict every match.<br />
            <span className="text-blue-700">Earn football coins.</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1.5">
            Free to play. Redeem coins at ProGym after the final.
          </p>

          <div className="mt-5 space-y-2">
            {session ? (
              <>
                <button
                  onClick={() => navigate('/matches')}
                  className="w-full py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-700/25 active:scale-[0.98] transition-all"
                >
                  Continue as {session.name}
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full py-1.5 text-xs font-semibold text-gray-500 hover:text-blue-700 transition-colors"
                >
                  Switch account
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-700/25 active:scale-[0.98] transition-all"
                >
                  Get Started
                </button>
                <p className="text-[10px] text-gray-400">
                  One-time OTP. No password. No payment.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer — Powered by (always visible, respects home-indicator safe area) */}
      <footer className="relative z-10 flex-shrink-0 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="max-w-sm mx-auto px-6">
          <p className="text-center text-[9px] uppercase tracking-[0.22em] text-gray-400 font-semibold mb-1.5">
            Powered by
          </p>
          <div className="flex items-center justify-center gap-5">
            <a
              href="https://tavrostechinfo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center group"
              aria-label="Tavros Tech Info"
            >
              <img
                src="https://tavrostechinfo.com/assets/img/tavroslogo.jpg"
                alt="Tavros Tech Info"
                className="h-9 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </a>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex flex-col items-center gap-1">
              <img
                src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
                alt="ProGym"
                className="h-9 w-9 rounded-lg object-cover border border-gray-200 opacity-90"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="text-[9px] font-semibold text-gray-500 leading-none">
                ProGym Kolhapur
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
