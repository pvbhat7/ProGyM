// Web Audio synthesized siren — no asset file needed. Frequency sweeps between
// two tones to mimic a police/red-alert siren. Plays until stop() is called.
// Uses the shared pre-warmed AudioContext so it plays instantly without
// requiring a user gesture on the lockdown screen itself.

import { getSharedAudioContext } from '../utils/audioPrewarm'

export class SirenAudio {
  private ctx: AudioContext | null = null
  private osc: OscillatorNode | null = null
  private gain: GainNode | null = null
  private interval: number | null = null

  start() {
    try {
      this.ctx = getSharedAudioContext()
      if (!this.ctx) return

      if (this.osc) return // already playing

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      gain.gain.value = 0.18

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()

      let high = true
      const sweep = () => {
        if (!this.ctx || !this.osc) return
        const target = high ? 880 : 440
        this.osc.frequency.linearRampToValueAtTime(target, this.ctx.currentTime + 0.45)
        high = !high
      }
      sweep()
      this.interval = window.setInterval(sweep, 450)

      this.osc = osc
      this.gain = gain
    } catch {
      // Autoplay blocked — caller may retry after a user gesture
    }
  }

  stop() {
    if (this.interval !== null) { clearInterval(this.interval); this.interval = null }
    try {
      this.osc?.stop()
      this.osc?.disconnect()
      this.gain?.disconnect()
    } catch { /* noop */ }
    this.osc = null
    this.gain = null
    // Note: do NOT close this.ctx — it's the shared, app-wide AudioContext.
    this.ctx = null
  }
}
