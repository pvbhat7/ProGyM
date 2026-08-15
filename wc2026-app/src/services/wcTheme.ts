// Tiny theme manager — persists user choice in localStorage, toggles the
// `dark` class on <html>. Index.css owns the dark-mode CSS variables and
// utility overrides; this hook only flips the class.

import { useEffect, useState } from 'react'

const KEY = 'wc_theme_v1'
type Theme = 'light' | 'dark'

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(KEY)
  if (stored === 'light' || stored === 'dark') return stored
  // Fall back to OS preference — once user toggles, we never read prefers again.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

// Apply on import so the first paint already matches user choice (no flash).
if (typeof window !== 'undefined') {
  try { applyTheme(readInitial()) } catch { /* ignore */ }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitial)

  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])

  return {
    theme,
    isDark: theme === 'dark',
    toggle: () => setThemeState(t => (t === 'dark' ? 'light' : 'dark')),
    setTheme: setThemeState,
  }
}
