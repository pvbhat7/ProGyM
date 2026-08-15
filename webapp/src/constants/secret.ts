// Two unrecognizable hacker-style URLs — neither path contains words that
// hint at what they do. Write these down somewhere safe.
//
//   KILL    = /progym/q3h8-2fnw-6z9k-4y7r-5m1p   (turns system OFF)
//   RESTORE = /progym/p2d5-8cx4-j7m9-b1v3-a6t8   (turns system ON)

export const KILL_PATH    = '/q3h8-2fnw-6z9k-4y7r-5m1p'
export const RESTORE_PATH = '/p2d5-8cx4-j7m9-b1v3-a6t8'

// Convenience helper used by the lock-guard to decide whether to bypass
// the takeover (so neither special page can ever be locked out).
export function isOverridePath(pathname: string): boolean {
  return pathname.endsWith(KILL_PATH) || pathname.endsWith(RESTORE_PATH)
}
