import { NavLink } from 'react-router-dom'
import { useMenuGate } from '../hooks/useMenuGate'

const allTabs = [
  { to: '/matches',          label: 'Matches',  icon: '⚽', gated: true },
  { to: '/my-picks',         label: 'My Picks', icon: '🎯', gated: true },
  { to: '/leaderboard',      label: 'Ranking',  icon: '🏆', gated: true },
  { to: '/knockout-bonanza', label: 'Bonanza',  icon: '💎', gated: false },
  { to: '/profile',          label: 'Profile',  icon: '👤', gated: false },
]

export default function BottomNav() {
  const gate = useMenuGate()
  const tabs = gate.gated ? allTabs.filter(t => !t.gated) : allTabs

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive ? 'text-blue-700' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[10px] font-semibold tracking-wide">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
