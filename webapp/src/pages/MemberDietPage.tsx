import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import { getIdTokenOrThrow } from '../firebase'
import NotificationBell from '../components/NotificationBell'
import { PlanView, type Plan } from '../components/DietPlanPanel'

// Member's own diet plan — read-only. Plans are created and assigned by the gym admin
// (member profile → 🥗 Diet tab); api/aidiet/my.php only returns the logged-in member's own plan.

type MyPlan = { id: number; title: string; created_at: string; plan: Plan; inputs: Record<string, string | boolean> }

export default function MemberDietPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<MyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.userId) return
    ;(async () => {
      try {
        const token = await getIdTokenOrThrow('your diet plan')
        const r = await fetch(`${API_BASE}/aidiet/my.php?clientId=${encodeURIComponent(user.userId)}`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json().catch(() => ({ error: 'Server did not respond. Please try again.' }))
        if (!r.ok || d.error) throw new Error(d.error || 'Could not load your diet plan.')
        setData(d.plan)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your diet plan.') }
      finally { setLoading(false) }
    })()
  }, [user?.userId])

  const needsLogin = /log (out|in)/i.test(error)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/member-dashboard')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">My Diet</h1>
            <p className="text-xs text-gray-400">Your meal plan from Pro Gym</p>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-36 rounded-3xl bg-emerald-100" />
            <div className="h-20 rounded-2xl bg-white" />
            <div className="h-28 rounded-2xl bg-white" />
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="text-sm text-gray-700 mt-2">{error}</p>
            {needsLogin && (
              <button onClick={() => { logout(); navigate('/login', { replace: true }) }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold">Log in again</button>
            )}
          </div>
        ) : data ? (
          <PlanView plan={data.plan} inputs={data.inputs as never}
            badge={<span className="text-[10px] font-bold uppercase tracking-widest bg-white text-emerald-700 rounded-full px-2.5 py-1">
              Since {data.created_at.slice(0, 10).split('-').reverse().join('/')}</span>} />
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 text-center shadow-md">
            <div className="absolute -right-6 -top-6 text-[110px] opacity-15 select-none">🥗</div>
            <div className="relative">
              <div className="text-5xl">🥗</div>
              <p className="font-extrabold text-lg mt-2">No diet plan yet</p>
              <p className="text-sm text-emerald-50/90 mt-1">Ask your trainer at the gym — they'll create a personal meal plan for your goal, and it will appear here.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
