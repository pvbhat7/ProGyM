import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FullscreenButton from '../components/FullscreenButton'
import { API_BASE } from '../api/config'
import PublicDashboardFifaPage from './PublicDashboardFifaPage'

interface BirthdayClient {
  id: number
  name: string
  photo: string
  birthDate: string
}

interface MerchandiseItem {
  id: number
  productName: string
  newPrice: number
  oldPrice: number
  productPhoto: string
  discontinue: string
}

const EARNING_RULES = [
  { icon: '🏆', label: 'Signup Bonus',        coins: 100 },
  { icon: '💰', label: 'Full Payment',         coins: 25  },
  { icon: '👤', label: 'Profile Photo',        coins: 10  },
  { icon: '📸', label: 'Progress Photo',       coins: 5   },
  { icon: '⚖️', label: 'Weight Update',       coins: 2   },
  { icon: '✅', label: 'Daily Check-in',       coins: 1   },
  { icon: '📱', label: 'Daily App Login',      coins: 1   },
]

function getPhotoUrl(photo: string): string {
  if (!photo) return ''
  if (photo.startsWith('http')) return photo
  if (photo.startsWith('/')) return `https://tavrostechinfo.com${photo}`
  return `https://tavrostechinfo.com/PROGYM/ggs/${photo}`
}

function BirthdayAvatar({ client }: { client: BirthdayClient }) {
  const [imgError, setImgError] = useState(false)
  const photoUrl = getPhotoUrl(client.photo)
  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const media = (!photoUrl || imgError) ? (
    <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-3xl">
      {initials}
    </div>
  ) : (
    <img
      src={photoUrl}
      alt={client.name}
      className="w-full h-full rounded-xl object-cover block"
      onError={() => setImgError(true)}
    />
  )

  return (
    <div className="relative flex-shrink-0" style={{ width: 88, height: 88, perspective: '380px', perspectiveOrigin: '50% 110%' }}>
      {/* 3D floating frame */}
      <div style={{
        width: '100%', height: '100%', position: 'relative',
        animation: 'bday-3d-float 2.8s ease-in-out infinite',
        filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.92)) drop-shadow(0 0 16px rgba(245,158,11,0.55))',
        transformStyle: 'preserve-3d',
      }}>
        {media}
        {/* scan line */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '40%', top: '-40%',
            background: 'linear-gradient(to bottom, transparent, rgba(251,191,36,0.32), transparent)',
            animation: 'bday-scan 2.2s linear infinite',
          }} />
        </div>
        {/* holographic border */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          border: '1.5px solid',
          animation: 'holo-border 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      </div>
      {/* base projection glow */}
      <div style={{
        position: 'absolute', bottom: -10, left: '10%', right: '10%', height: 12,
        background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.75) 0%, transparent 70%)',
        filter: 'blur(6px)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

function BirthdayBanner({ clients }: { clients: BirthdayClient[] }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (clients.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % clients.length), 3500)
    return () => clearInterval(t)
  }, [clients.length])

  const client = clients[idx]

  return (
    <>
      <style>{`
        @keyframes bday-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes bday-ring { 0%,100%{box-shadow:0 0 0 2px #f59e0b,0 0 14px #f59e0b55} 50%{box-shadow:0 0 0 4px #fbbf24,0 0 26px #fbbf2488} }
        @keyframes bday-3d-float { 0%,100%{transform:translateZ(22px) translateY(0) rotateX(-11deg) scale(1.09)} 50%{transform:translateZ(40px) translateY(-8px) rotateX(-6deg) scale(1.14)} }
        @keyframes bday-scan { 0%{top:-40%} 100%{top:140%} }
        @keyframes holo-border { 0%,100%{border-color:rgba(251,191,36,0.95);box-shadow:0 0 10px rgba(251,191,36,0.65),inset 0 0 10px rgba(251,191,36,0.12)} 50%{border-color:rgba(251,191,36,0.45);box-shadow:0 0 22px rgba(251,191,36,1),inset 0 0 14px rgba(251,191,36,0.22)} }
        @keyframes bday-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes bday-slide { from{opacity:0;transform:scale(0.92) translateY(4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes bday-sparkle { 0%,100%{opacity:1;transform:scale(1) rotate(0deg)} 50%{opacity:0.6;transform:scale(1.4) rotate(20deg)} }
        @keyframes bday-confetti { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(60px) rotate(360deg);opacity:0} }
        @keyframes merch-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes coin-glow { 0%,100%{filter:drop-shadow(0 0 6px #f59e0b88)} 50%{filter:drop-shadow(0 0 14px #fbbf24cc)} }
        @keyframes coin-spin { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(360deg)} }
      `}</style>
      <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/70 via-yellow-950/50 to-orange-950/70 backdrop-blur-sm p-3.5" style={{ overflow: 'visible' }}>
        {/* clipped background effects */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.12) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'bday-shimmer 2.5s linear infinite',
            }}
          />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: ['#f59e0b','#ef4444','#10b981','#8b5cf6','#f59e0b','#3b82f6'][i],
                left: `${10 + i * 15}%`,
                top: `${10 + (i % 3) * 15}%`,
                animation: `bday-confetti ${1.5 + i * 0.4}s ease-in ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>
        {/* floating celebration icons */}
        {[
          { icon: '🎈', top: '8%',  left: '38%', delay: '0s',    dur: '2.2s', size: '13px' },
          { icon: '🎊', top: '12%', left: '55%', delay: '0.4s',  dur: '1.9s', size: '12px' },
          { icon: '⭐', top: '6%',  left: '70%', delay: '0.8s',  dur: '2.5s', size: '11px' },
          { icon: '🎈', top: '70%', left: '42%', delay: '1.1s',  dur: '2.0s', size: '11px' },
          { icon: '✨', top: '65%', left: '62%', delay: '0.3s',  dur: '1.7s', size: '12px' },
          { icon: '🎊', top: '75%', left: '75%', delay: '0.9s',  dur: '2.3s', size: '10px' },
          { icon: '⭐', top: '20%', left: '90%', delay: '0.6s',  dur: '2.1s', size: '10px' },
          { icon: '🎈', top: '60%', left: '88%', delay: '1.4s',  dur: '1.8s', size: '11px' },
        ].map((item, i) => (
          <div
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              top: item.top, left: item.left,
              fontSize: item.size,
              animation: `bday-float ${item.dur} ease-in-out ${item.delay} infinite`,
              opacity: 0.75,
            }}
          >{item.icon}</div>
        ))}
        <div className="relative flex items-center gap-5">
          <div key={idx} style={{ animation: 'bday-slide 0.4s ease-out' }}>
            <BirthdayAvatar client={client} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col items-center" key={`t${idx}`} style={{ animation: 'bday-slide 0.4s ease-out' }}>
            <p className="text-amber-600/80 font-bold text-[10px] uppercase tracking-widest">🎉 Happy Birthday!</p>
            <p
              className="font-black text-base mt-1 truncate w-full text-center"
              style={{
                background: 'linear-gradient(90deg, #ffffff 0%, #fde68a 40%, #ffffff 60%, #fde68a 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'bday-shimmer 2.5s linear infinite',
                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.6)) drop-shadow(0 0 20px rgba(251,191,36,0.5))',
              }}
            >{client.name}</p>
            <p className="text-amber-300/60 text-[11px] mt-1">Wishing you a wonderful day ✨</p>
          </div>
          <div className="text-3xl flex-shrink-0" style={{ animation: 'bday-float 1.8s ease-in-out infinite' }}>🎂</div>
        </div>
        {clients.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2.5">
            {clients.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`rounded-full transition-all duration-300 ${i === idx ? 'w-4 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-amber-400/30'}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function MerchCard({ item }: { item: MerchandiseItem }) {
  const [imgError, setImgError] = useState(false)
  const photoUrl = getPhotoUrl(item.productPhoto)
  return (
    <div className="flex-shrink-0 w-28 flex flex-col items-center gap-1.5 bg-white/5 border border-amber-400/15 rounded-xl p-2.5 hover:border-amber-400/40 transition-colors">
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={item.productName}
          className="w-16 h-16 object-cover rounded-lg"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-amber-900/30 flex items-center justify-center text-2xl">🛒</div>
      )}
      <p className="text-white/80 text-[10px] font-semibold text-center leading-tight line-clamp-2">{item.productName}</p>
      <div className="flex items-center gap-1">
        <span className="text-amber-400 text-[10px]">🪙</span>
        <span className="text-amber-400 text-xs font-black">{item.newPrice}</span>
        <span className="text-amber-400/50 text-[9px]">coins</span>
      </div>
    </div>
  )
}

function ProCoinsSection({ onLogin }: { onLogin: () => void }) {
  const [merchandise, setMerchandise] = useState<MerchandiseItem[]>([])
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_BASE}/merchandise/getAllMerchandise.php`)
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setMerchandise((data as MerchandiseItem[]).filter(m => m.discontinue !== 'true' && m.discontinue !== '1'))
        }
      })
      .catch(() => {})
  }, [])

  // Duplicate items for seamless loop
  const scrollItems = merchandise.length > 0 ? [...merchandise, ...merchandise] : []
  const animDuration = Math.max(12, merchandise.length * 3)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-amber-950/50 backdrop-blur-sm">
      {/* Top shimmer line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="flex items-stretch min-h-[120px]">

        {/* LEFT — ProCoins identity + earning rules */}
        <div className="flex-shrink-0 flex flex-col justify-center gap-2.5 px-4 py-3 border-r border-amber-400/15 w-44">
          <div className="flex items-center gap-2">
            <span className="text-3xl leading-none" style={{ animation: 'coin-glow 2s ease-in-out infinite' }}>🪙</span>
            <div>
              <p className="text-amber-400 font-black text-sm leading-none tracking-wide">ProCoins</p>
              <p className="text-amber-400/50 text-[10px] mt-0.5 font-semibold">1 Coin = ₹1</p>
            </div>
          </div>
          <div className="space-y-1">
            {EARNING_RULES.map(rule => (
              <div key={rule.label} className="flex items-center justify-between gap-2">
                <span className="text-white/50 text-[10px] truncate">{rule.icon} {rule.label}</span>
                <span className="text-amber-400 text-[10px] font-black flex-shrink-0">+{rule.coins}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — scrolling merchandise */}
        <div className="flex-1 overflow-hidden relative flex flex-col justify-center py-3">
          <div className="text-center mb-2.5 px-4">
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 font-black text-lg sm:text-xl tracking-tight leading-none">
              ✦ Introducing ProCoins ✦
            </p>
            <p className="text-amber-400/50 text-[9px] font-semibold uppercase tracking-widest mt-1">
              Earn · Redeem · Reward
            </p>
          </div>
          {scrollItems.length > 0 ? (
            <div className="overflow-hidden">
              <div
                ref={trackRef}
                className="flex gap-3 px-3"
                style={{
                  width: 'max-content',
                  animation: `merch-scroll ${animDuration}s linear infinite`,
                }}
                onMouseEnter={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused' }}
                onMouseLeave={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running' }}
              >
                {scrollItems.map((item, i) => (
                  <MerchCard key={`${item.id}-${i}`} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 px-6 py-2">
              {['👕', '🧢', '🥤', '🎽', '🏋️'].map((emoji, i) => (
                <div key={i} className="w-14 h-14 rounded-xl bg-white/5 border border-amber-400/10 flex items-center justify-center text-2xl animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
                  {emoji}
                </div>
              ))}
              <p className="text-white/30 text-xs ml-2">Merchandise coming soon…</p>
            </div>
          )}
        </div>

        {/* RIGHT — CTA */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-3 px-4 py-3 border-l border-amber-400/15 w-40">
          <div className="text-center">
            <p className="text-white/80 text-xs font-bold leading-snug">Earn coins.</p>
            <p className="text-white/80 text-xs font-bold leading-snug">Redeem in shop.</p>
            <p className="text-amber-400/70 text-[10px] mt-1 leading-snug">Log in to check your ProCoins balance</p>
          </div>
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all duration-200 whitespace-nowrap"
          >
            Login to Redeem
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p className="text-amber-400/40 text-[9px] font-semibold tracking-wide uppercase text-center">1 Coin = ₹1 value</p>
        </div>

      </div>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
    </div>
  )
}

function SocialModal({ open, onClose, title, images }: { open: boolean; onClose: () => void; title: string; images: string[] }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/10 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-bold text-base">{title}</p>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`grid gap-6 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {images.map((src, i) => (
            <img key={i} src={src} alt={`QR ${i + 1}`} className="w-full rounded-2xl border border-white/10 object-contain" />
          ))}
        </div>
      </div>
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right">
      <p className="text-white font-bold text-lg leading-none tabular-nums tracking-wide">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </p>
      <p className="text-white/50 text-xs mt-0.5">
        {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
    </div>
  )
}

const AdminIcon = () => (
  <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
)

const DumbbellIcon = () => (
  <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z" />
  </svg>
)

const MembersIcon = () => (
  <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
)

const AttendanceIcon = () => (
  <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
)

export default function PublicDashboardPage() {
  const navigate = useNavigate()
  const [modal, setModal] = useState<'instagram' | 'whatsapp' | null>(null)
  const [birthdayClients, setBirthdayClients] = useState<BirthdayClient[]>([])
  const [showProCoinsPanel, setShowProCoinsPanel] = useState(true)
  const [showFifaUi, setShowFifaUi] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/client/todayBirthdays.php`)
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setBirthdayClients(data as BirthdayClient[])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/settings/getFeatureFlags.php`)
      .then(r => r.json())
      .then((d: { showProCoinsPanel?: boolean; showFifaUi?: boolean }) => {
        setShowProCoinsPanel(d.showProCoinsPanel ?? true)
        setShowFifaUi(d.showFifaUi ?? false)
      })
      .catch(() => setShowFifaUi(false))
  }, [])

  if (showFifaUi === null) {
    return <div className="h-screen bg-gradient-to-br from-blue-950 via-slate-950 to-red-950" />
  }
  if (showFifaUi) {
    return <PublicDashboardFifaPage />
  }

  // FIFA WC 2026 host-nation palette: Green (Mexico), Red (Canada/Mexico flags), Blue (USA), Gold (trophy)
  const tiles = [
    {
      label: 'Members',
      sub: 'Member portal & profile',
      gradient: 'from-green-500 to-emerald-700',
      glowColor: 'hover:shadow-green-500/40',
      icon: <MembersIcon />,
      action: () => navigate('/public-members'),
    },
    {
      label: 'Workouts',
      sub: 'Exercise plans & routines',
      gradient: 'from-red-500 to-rose-700',
      glowColor: 'hover:shadow-red-500/40',
      icon: <DumbbellIcon />,
      action: () => navigate('/workouts'),
    },
    {
      label: 'Admin Zone',
      sub: 'Staff login & management',
      gradient: 'from-blue-600 to-indigo-800',
      glowColor: 'hover:shadow-blue-500/40',
      icon: <AdminIcon />,
      action: () => navigate('/admin-panel'),
    },
    {
      label: 'Attendance',
      sub: 'Quick check-in — tap here',
      gradient: 'from-amber-400 to-yellow-600',
      glowColor: 'hover:shadow-amber-500/50',
      icon: <AttendanceIcon />,
      action: () => navigate('/quick-attendance'),
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-950 via-slate-950 to-red-950 select-none relative overflow-hidden">

      <style>{`
        @keyframes wc-float-slow { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(8deg)} }
        @keyframes wc-twinkle { 0%,100%{opacity:0.25;transform:scale(1)} 50%{opacity:0.9;transform:scale(1.25)} }
        @keyframes wc-badge-shine { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes wc-emblem-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes wc-emblem-glow { 0%,100%{filter:drop-shadow(0 0 12px rgba(251,191,36,0.6)) drop-shadow(0 0 4px rgba(239,68,68,0.4))} 50%{filter:drop-shadow(0 0 22px rgba(251,191,36,0.9)) drop-shadow(0 0 10px rgba(59,130,246,0.5))} }
      `}</style>

      {/* Ambient background — FIFA WC 2026 palette (USA blue, Mexico/Canada red, Mexico green, trophy gold) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-red-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />

        {/* Subtle stars (WC 2026 logo features stars over the trophy) */}
        {[
          { top: '8%',  left: '12%', size: 3, delay: '0s'   },
          { top: '14%', left: '78%', size: 2, delay: '0.6s' },
          { top: '26%', left: '6%',  size: 2, delay: '1.2s' },
          { top: '34%', left: '88%', size: 3, delay: '0.3s' },
          { top: '58%', left: '4%',  size: 2, delay: '0.9s' },
          { top: '70%', left: '92%', size: 3, delay: '1.5s' },
          { top: '82%', left: '20%', size: 2, delay: '0.4s' },
          { top: '88%', left: '70%', size: 2, delay: '1.1s' },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              boxShadow: '0 0 6px rgba(255,255,255,0.85)',
              animation: `wc-twinkle 2.6s ease-in-out ${s.delay} infinite`,
            }}
          />
        ))}

        {/* Floating football & trophy decor — visible WC 2026 mood */}
        <div className="absolute text-[80px] opacity-[0.18] select-none drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]" style={{ top: '18%', left: '3%', animation: 'wc-float-slow 7s ease-in-out infinite' }}>⚽</div>
        <div className="absolute text-[110px] opacity-[0.22] select-none drop-shadow-[0_0_24px_rgba(251,191,36,0.6)]" style={{ bottom: '6%', right: '3%', animation: 'wc-float-slow 9s ease-in-out 1s infinite' }}>🏆</div>
        <div className="absolute text-[60px] opacity-[0.15] select-none drop-shadow-[0_0_16px_rgba(59,130,246,0.4)]" style={{ top: '55%', right: '6%', animation: 'wc-float-slow 6s ease-in-out 0.5s infinite' }}>⚽</div>
        <div className="absolute text-[70px] opacity-[0.14] select-none drop-shadow-[0_0_18px_rgba(239,68,68,0.4)]" style={{ top: '70%', left: '5%', animation: 'wc-float-slow 8s ease-in-out 1.5s infinite' }}>🥅</div>

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/45 rounded-2xl blur-lg" />
            <img
              src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
              alt="ProGym"
              className="relative w-10 h-10 rounded-xl object-cover shadow-lg border border-amber-300/30"
            />
          </div>
          <div>
            <p className="font-black text-white text-base leading-none tracking-wide">ProGym</p>
            <p className="text-white/40 text-xs mt-0.5 tracking-wider">KOLHAPUR</p>
          </div>
          {/* FIFA WC 2026 official emblem */}
          <div className="hidden sm:flex items-center gap-3 ml-3">
            <img
              src="https://tavrostechinfo.com/wc2026/fifa.png"
              alt="FIFA World Cup 2026"
              className="w-14 h-14 object-contain flex-shrink-0"
              style={{ animation: 'wc-emblem-glow 2.6s ease-in-out infinite' }}
            />
            <div className="flex flex-col leading-tight">
              <span
                className="text-[11px] font-black tracking-[0.22em] uppercase"
                style={{
                  background: 'linear-gradient(90deg, #fde68a, #ffffff, #fde68a)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'wc-badge-shine 3s linear infinite',
                }}
              >FIFA World Cup</span>
              <span className="text-white/70 text-[10px] font-bold tracking-[0.18em] uppercase">2026 Edition</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FullscreenButton />
          <Clock />
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 via-blue-500 to-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:via-blue-400 hover:to-red-400 active:scale-95 transition-all duration-200 ring-1 ring-amber-300/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
        <div className="w-full max-w-5xl flex flex-col gap-4 mx-auto my-auto">

          {/* Top row: Hero + Tiles */}
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-12">

            {/* Hero / Brand Panel */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-shrink-0">
              <div className="relative mb-4 hidden sm:block">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/55 via-blue-500/30 to-red-500/45 rounded-3xl blur-3xl scale-125" />
                <img
                  src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
                  alt="ProGym"
                  className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-3xl shadow-2xl object-cover border border-amber-300/30"
                />
              </div>

              <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight whitespace-nowrap">
                Pranav Shivaji{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-amber-300 to-red-500">Mohite Patil</span>
              </h1>
              <p className="text-amber-300/60 text-xs mt-2 font-semibold tracking-[0.2em] uppercase">Kolhapur</p>

              <a
                href="tel:+918796655176"
                className="flex items-center gap-2 mt-2 sm:mt-3 text-white/70 hover:text-white transition-colors group"
              >
                <svg className="w-4 h-4 text-amber-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                <span className="text-sm font-semibold tabular-nums">+91 8796655176</span>
              </a>

              <div className="flex items-center gap-3 mt-2 sm:mt-3">
                <button
                  onClick={() => setModal('instagram')}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-lg hover:scale-110 active:scale-95 transition-transform"
                  title="Instagram"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </button>
                <button
                  onClick={() => setModal('whatsapp')}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg hover:scale-110 active:scale-95 transition-transform"
                  title="WhatsApp"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </button>
              </div>

              {/* QR Code */}
              <div className="mt-3 sm:mt-4 relative">
                <div className="absolute inset-0 bg-amber-400/15 rounded-2xl blur-xl scale-110 pointer-events-none" />
                <div className="relative flex items-center gap-3 bg-white/5 border border-amber-300/20 rounded-2xl px-3 sm:px-4 py-2.5 backdrop-blur-sm">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-red-500/20 rounded-xl blur-sm" />
                    <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-amber-300/30 bg-white p-1 shadow-lg">
                      <img
                        src="https://tavrostechinfo.com/PROGYM/img/progym_web_qr_code.png"
                        alt="ProGym App QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 rounded-tl-sm" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 rounded-tr-sm" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 rounded-bl-sm" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 rounded-br-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-xs leading-tight">Scan to open app</p>
                    <p className="text-white/45 text-[11px] mt-0.5 leading-snug">Point your camera at the QR code to login instantly</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-amber-300/80 text-[10px] font-semibold tracking-wide uppercase">ProGym Web App · WC 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden sm:block w-px h-72 bg-gradient-to-b from-transparent via-white/15 to-transparent flex-shrink-0" />

            {/* Right column: Birthday banner + Navigation Tiles */}
            <div className="flex flex-col gap-3 sm:gap-4 flex-1 w-full max-w-xs sm:max-w-sm">
              {birthdayClients.length > 0 && <BirthdayBanner clients={birthdayClients} />}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {tiles.map(tile => (
                  <button
                    key={tile.label}
                    onClick={tile.action}
                    className={`
                      relative bg-gradient-to-br ${tile.gradient}
                      rounded-2xl p-4 sm:p-5 flex flex-col items-start gap-3 sm:gap-4
                      shadow-xl ${tile.glowColor} hover:shadow-2xl
                      hover:scale-[1.04] active:scale-[0.97]
                      transition-all duration-300 overflow-hidden group text-left
                    `}
                  >
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-2xl pointer-events-none" />
                    <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-black/15 pointer-events-none" />
                    <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-black/10 pointer-events-none" />
                    <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-xl p-2.5 shadow-inner ring-1 ring-white/20">
                      {tile.icon}
                    </div>
                    <div className="relative z-10">
                      <p className="font-bold text-white text-base leading-none">{tile.label}</p>
                      <p className="text-white/65 text-xs mt-1.5 leading-snug">{tile.sub}</p>
                    </div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* ProCoins Section */}
          {showProCoinsPanel && <ProCoinsSection onLogin={() => navigate('/login')} />}

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-3 text-center text-white/20 text-xs tracking-wide flex items-center justify-center gap-2">
        <span>ProGym · Powered by Tavros Tech Info</span>
        <span className="text-amber-400/40">·</span>
        <span className="text-amber-300/50 font-bold tracking-widest">🏆 FIFA WC 2026 EDITION</span>
      </footer>

      <SocialModal
        open={modal === 'instagram'}
        onClose={() => setModal(null)}
        title="Follow on Instagram"
        images={[
          'https://tavrostechinfo.com/PROGYM/img/instagram_qr_1.jpg',
          'https://tavrostechinfo.com/PROGYM/img/instagram_qr_2.jpg',
        ]}
      />
      <SocialModal
        open={modal === 'whatsapp'}
        onClose={() => setModal(null)}
        title="WhatsApp"
        images={['https://tavrostechinfo.com/PROGYM/img/whatsapp_qr_1.jpg']}
      />

    </div>
  )
}
