import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../api/config'

interface Banner {
  id: number
  image_url: string
  sponsor_name: string | null
  link_url: string | null
}

const ROTATE_MS = 2500   // 2.5 s per slide
const FADE_MS   = 400    // crossfade duration

export default function SponsorCarousel() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [active, setActive]   = useState(0)
  const [loaded, setLoaded]   = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/wc_banners/getActive.php`)
      .then(r => r.ok ? r.json() : null)
      .then(j => setBanners(Array.isArray(j?.banners) ? j.banners : []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    timer.current = setInterval(() => {
      setActive(i => (i + 1) % banners.length)
    }, ROTATE_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [banners.length])

  if (!loaded || banners.length === 0) return null

  function onClick(b: Banner) {
    if (b.link_url) window.open(b.link_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="max-w-md mx-auto px-3 mt-4 mb-2">
      <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-1.5 px-1">Sponsored</p>
      <div className="relative w-full aspect-[16/6] bg-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-200">
        {banners.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onClick(b)}
            aria-label={b.sponsor_name || 'Sponsored banner'}
            disabled={!b.link_url}
            className={`absolute inset-0 w-full h-full transition-opacity ease-in-out ${
              i === active ? 'opacity-100 z-10' : 'opacity-0 z-0'
            } ${b.link_url ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
          >
            <img
              src={b.image_url}
              alt={b.sponsor_name || ''}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            {b.sponsor_name && (
              <span className="absolute bottom-1.5 right-2 text-[10px] font-semibold text-white bg-black/40 backdrop-blur px-2 py-0.5 rounded-full">
                {b.sponsor_name}
              </span>
            )}
          </button>
        ))}
        {banners.length > 1 && (
          <div className="absolute bottom-1.5 left-2 z-20 flex items-center gap-1">
            {banners.map((_, i) => (
              <span
                key={i}
                className={`block h-1 rounded-full transition-all ${
                  i === active ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
