import { useEffect, useState } from 'react'
import { useLaunchGate } from '../services/launchGate'

function chunks(ms: number): { d: number; h: number; m: number; s: number } {
  const safe = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(safe / 86400),
    h: Math.floor((safe % 86400) / 3600),
    m: Math.floor((safe % 3600) / 60),
    s: safe % 60,
  }
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5 min-w-[48px]">
      <span className="text-lg font-extrabold leading-tight tabular-nums">{String(value).padStart(2, '0')}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-80 font-semibold">{label}</span>
    </div>
  )
}

interface Props {
  variant?: 'banner' | 'hero'
}

export default function LaunchCountdown({ variant = 'banner' }: Props) {
  const gate = useLaunchGate()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (gate.isLive || gate.launchAtMs == null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [gate.isLive, gate.launchAtMs])

  if (gate.loading || gate.isLive || gate.launchAtMs == null) return null

  const { d, h, m, s } = chunks(gate.launchAtMs - now)

  if (variant === 'hero') {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold opacity-90">Predictions go live in</p>
            <p className="text-xs font-medium opacity-90 mt-0.5">{gate.launchAtLabel} IST</p>
          </div>
          <span className="text-xl">🚀</span>
        </div>
        <div className="flex items-center justify-between gap-1.5">
          <Cell value={d} label="Days" />
          <span className="text-lg font-bold opacity-60">:</span>
          <Cell value={h} label="Hrs" />
          <span className="text-lg font-bold opacity-60">:</span>
          <Cell value={m} label="Min" />
          <span className="text-lg font-bold opacity-60">:</span>
          <Cell value={s} label="Sec" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white px-4 py-2 flex items-center gap-3">
      <span className="text-base">🚀</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold opacity-90 leading-tight">Predictions go live in</p>
        <p className="text-[11px] opacity-80 leading-tight truncate">{gate.launchAtLabel} IST</p>
      </div>
      <div className="flex items-center gap-1">
        <Cell value={d} label="D" />
        <Cell value={h} label="H" />
        <Cell value={m} label="M" />
        <Cell value={s} label="S" />
      </div>
    </div>
  )
}
