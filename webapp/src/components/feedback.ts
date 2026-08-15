// Short tactile/audio feedback for the kill-switch UI.
// Uses the app-wide pre-warmed AudioContext (see utils/audioPrewarm.ts).

import { getSharedAudioContext } from '../utils/audioPrewarm'

const getCtx = getSharedAudioContext

export function beep(opts: { freq?: number; durationMs?: number; volume?: number; type?: OscillatorType } = {}) {
  const { freq = 880, durationMs = 80, volume = 0.15, type = 'square' } = opts
  const ac = getCtx()
  if (!ac) return
  try {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    // Short attack + decay envelope to avoid click
    gain.gain.setValueAtTime(0.0001, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(volume, ac.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + durationMs / 1000 + 0.02)
  } catch { /* noop */ }
}

// Frequency sweep — used for mechanical "whoosh" effects (lifting/closing the glass cover)
export function sweep(opts: { from: number; to: number; durationMs: number; volume?: number; type?: OscillatorType } = { from: 200, to: 800, durationMs: 350 }) {
  const { from, to, durationMs, volume = 0.18, type = 'sawtooth' } = opts
  const ac = getCtx()
  if (!ac) return
  try {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), ac.currentTime + durationMs / 1000)
    gain.gain.setValueAtTime(0.0001, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(volume, ac.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + durationMs / 1000 + 0.02)
  } catch { /* noop */ }
}

export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch { /* noop */ }
}

// Convenience presets
export const fb = {
  digit:    () => { beep({ freq: 1200, durationMs: 60, type: 'square', volume: 0.12 }); vibrate(20) },
  bigPress: () => { beep({ freq: 220,  durationMs: 180, type: 'sawtooth', volume: 0.2 }); vibrate([40, 30, 60]) },
  tick:     () => { beep({ freq: 760,  durationMs: 60, type: 'square', volume: 0.12 }); vibrate(15) },
  launch:   () => { beep({ freq: 140,  durationMs: 500, type: 'sawtooth', volume: 0.25 }); vibrate([100, 60, 200]) },
  // Glass cover effects — rising sweep + servo click for "lift", falling sweep + thud for "close"
  liftCover:  () => {
    sweep({ from: 180, to: 900, durationMs: 380, type: 'sawtooth', volume: 0.18 })
    setTimeout(() => beep({ freq: 1400, durationMs: 40, type: 'square', volume: 0.15 }), 380)
    vibrate([30, 40, 80])
  },
  closeCover: () => {
    sweep({ from: 900, to: 160, durationMs: 350, type: 'sawtooth', volume: 0.18 })
    setTimeout(() => beep({ freq: 90, durationMs: 120, type: 'sine', volume: 0.25 }), 350)
    vibrate([60, 30, 90])
  },
  // Harsh "wrong passcode" buzzer — low dissonant double-buzz + sharp vibration
  error: () => {
    beep({ freq: 180, durationMs: 220, type: 'sawtooth', volume: 0.22 })
    setTimeout(() => beep({ freq: 140, durationMs: 260, type: 'sawtooth', volume: 0.22 }), 230)
    vibrate([120, 60, 120])
  },
  // Sharp mechanical keystroke click for the fake hacker terminal
  keystroke: () => {
    beep({ freq: 2400, durationMs: 18, type: 'square', volume: 0.07 })
  },
  // Confirm chirp for "command executed" lines
  ok: () => {
    beep({ freq: 1400, durationMs: 35, type: 'square', volume: 0.1 })
  }
}
