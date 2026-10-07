import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { ACTIVITY_KEY, touchActivity } from '../api/config'
import { loadSettings } from '../pages/SettingsPage'
import { isTabDashboardMobile } from '../constants/tabDashboard'
import { disablePush, storedAdminPushClientId, clearAdminPushClientId } from '../services/pushNotifications'

const STORAGE_KEY = 'progym_auth'
const COOKIE_KEY  = 'progym_member_session'
const WARNING_BEFORE_MS = 60 * 1000  // warn 60 s before logout

// Cookies survive mobile-browser localStorage purges (iOS ITP, Android Chrome low-storage eviction)
function setMemberCookie(value: string): void {
  const expires = new Date(Date.now() + 30 * 864e5).toUTCString()
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`
}

function getMemberCookie(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

function clearMemberCookie(): void {
  document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`
}

export type UserRole = 'admin' | 'member' | 'trainer'

// Hardcoded trainer client id — auto-promoted from 'member' at login time.
// Extend this list (or replace with a DB flag) when there are more than one.
const TRAINER_CLIENT_IDS: ReadonlySet<number> = new Set([1408])

export function isTrainerClientId(userId: number | null | undefined): boolean {
  return userId != null && TRAINER_CLIENT_IDS.has(userId)
}

export interface AuthUser {
  mobile: string
  role: UserRole
  userId: number
  userName: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: AuthUser | null
  // kept for backward compat with components that just read mobile
  mobile: string | null
  login: (user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      let stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // localStorage was cleared by the browser (iOS ITP / Android low-storage eviction) —
        // fall back to the durable cookie and repopulate localStorage so future reads are fast.
        const cookie = getMemberCookie()
        if (cookie) {
          localStorage.setItem(STORAGE_KEY, cookie)
          stored = cookie
        }
      }
      if (!stored) return null
      const parsed = JSON.parse(stored) as AuthUser
      // Rehydrate existing sessions from before the trainer role existed.
      if (parsed?.role === 'member' && isTrainerClientId(parsed.userId)) {
        parsed.role = 'trainer'
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      }
      return parsed
    } catch { return null }
  })
  const [sessionWarning, setSessionWarning] = useState(false)

  const login = (u: AuthUser) => {
    // Auto-promote known trainer client ids so every login path (OTP, Google, cookie restore)
    // resolves to the trainer role without each caller having to know.
    const resolved: AuthUser = u.role === 'member' && isTrainerClientId(u.userId)
      ? { ...u, role: 'trainer' }
      : u
    const serialized = JSON.stringify(resolved)
    localStorage.setItem(STORAGE_KEY, serialized)
    if (resolved.role === 'member' || resolved.role === 'trainer') {
      setMemberCookie(serialized) // 30-day backup so mobile browsers can't silently log the user out
    }
    touchActivity()
    setUser(resolved)
    setSessionWarning(false)
  }

  const logout = () => {
    if (user && user.role !== 'admin') disablePush(user.userId)
    if (user && user.role === 'admin') {
      const cid = storedAdminPushClientId()
      if (cid) disablePush(cid)
      clearAdminPushClientId()
    }
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ACTIVITY_KEY)
    clearMemberCookie()
    setUser(null)
    setSessionWarning(false)
    signOut(auth).catch(() => { /* ignore */ })
  }

  // Auto-logout: only active for admin role — tablet-dashboard mobiles are exempt (stay logged in indefinitely)
  useEffect(() => {
    if (user?.role !== 'admin' || isTabDashboardMobile(user?.mobile)) {
      setSessionWarning(false)
      return
    }

    const interval = setInterval(() => {
      const { autoLogoutEnabled, autoLogoutMinutes } = loadSettings()
      if (!autoLogoutEnabled) { setSessionWarning(false); return }

      const timeoutMs = autoLogoutMinutes * 60 * 1000
      const lastStr = localStorage.getItem(ACTIVITY_KEY)
      if (!lastStr) return
      const elapsed = Date.now() - parseInt(lastStr, 10)
      if (elapsed >= timeoutMs) {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(ACTIVITY_KEY)
        clearMemberCookie()
        setUser(null)
        setSessionWarning(false)
        signOut(auth).catch(() => {})
      } else if (elapsed >= timeoutMs - WARNING_BEFORE_MS) {
        setSessionWarning(true)
      } else {
        setSessionWarning(false)
      }
    }, 15_000)

    return () => clearInterval(interval)
  }, [user?.role, user?.mobile])

  return (
    <AuthContext.Provider value={{
      isAuthenticated: user !== null,
      user,
      mobile: user?.mobile ?? null,
      login,
      logout,
    }}>
      {children}
      {sessionWarning && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-xl bg-amber-600 px-6 py-3 text-sm font-medium text-white shadow-xl">
          <span>Session expiring in ~1 min due to inactivity</span>
          <button
            onClick={() => { touchActivity(); setSessionWarning(false) }}
            className="rounded-lg bg-white px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50"
          >
            Stay Logged In
          </button>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
