import { useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

interface Props {
  title: string
  subtitle?: string
  showBack?: boolean
  rightCoins?: number | null
  showReferShortcut?: boolean
}

export default function AppHeader({ title, subtitle, showBack = false, rightCoins = null, showReferShortcut = false }: Props) {
  const navigate = useNavigate()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-800 text-base leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
        </div>
        {rightCoins != null && (
          <button
            type="button"
            onClick={() => navigate('/coins')}
            className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm hover:bg-blue-100 transition-colors"
            title="View football coin history"
          >
            <span>⚽</span>
            <span className="text-sm font-bold text-blue-700">{Math.round(rightCoins)}</span>
          </button>
        )}
        {showReferShortcut && (
          <button
            type="button"
            onClick={() => navigate('/refer')}
            className="bg-amber-50 border border-amber-200 rounded-full w-9 h-9 flex items-center justify-center shadow-sm hover:bg-amber-100 transition-colors"
            title="Refer & Earn Stars"
            aria-label="Refer & Earn"
          >
            <span className="text-base">⭐</span>
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
