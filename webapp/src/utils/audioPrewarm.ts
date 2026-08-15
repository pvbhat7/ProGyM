// Pre-warms a single shared AudioContext at app boot so any sound triggered
// later in the same tab (siren, beeps, drone) plays instantly — no tap needed.
//
// Why this exists: browsers block all audio until the document has received
// a real user gesture. We can't fake one. But once we DO catch a gesture
// (the friend logging in, hitting fullscreen, scrolling, anything), we can
// resume the AudioContext and keep it alive forever in this tab.
//
// Limitation: page refresh resets this. Fresh-loaded locked page still needs
// one tap to unlock audio — that's a hard browser security rule.

let cached: AudioContext | null = null

export function getSharedAudioContext(): AudioContext | null {
  try {
    if (!cached) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      cached = new AC()
    }
    if (cached.state === 'suspended') cached.resume().catch(() => {})
    return cached
  } catch { return null }
}

let installed = false

export function installAudioPrewarm(): void {
  if (installed) return
  installed = true

  const arm = () => {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    // iOS needs an actual buffer to play within the gesture to fully unlock
    try {
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
    } catch { /* noop */ }
  }

  const events: (keyof DocumentEventMap)[] = ['click', 'touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown']
  events.forEach(ev => document.addEventListener(ev, arm, { passive: true } as AddEventListenerOptions))
}
