import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'

type Notif = {
  id: string
  type: string
  title: string
  message: string
  amount: string
  isRead: string
  createdAt: string
}

const TYPE_ICON: Record<string, string> = {
  coin_credit:            '🪙',
  coin_debit:             '💸',
  payment:                '💳',
  package:                '📦',
  merchandise_approved:   '✅',
  merchandise_rejected:   '❌',
}

function formatTs(raw: string): string {
  if (!raw) return ''
  const clean = raw.replace(/-/g, '/').split(' ')[0]
  const [d, m, y] = clean.split('/')
  if (!d || !m || !y) return raw
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen]             = useState(false)
  const [notifs, setNotifs]         = useState<Notif[]>([])
  const [unread, setUnread]         = useState(0)
  const [loading, setLoading]       = useState(false)

  const clientId = user?.userId

  const fetchNotifs = useCallback(() => {
    if (!clientId) return
    setLoading(true)
    fetch(`${API_BASE}/userNotifications/byClientId.php?cid=${clientId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Notif[]) => {
        const list = Array.isArray(data) ? data : []
        setNotifs(list)
        setUnread(list.filter(n => n.isRead === 'no').length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  function openPanel() {
    setOpen(true)
    if (unread > 0 && clientId) {
      setUnread(0)
      setNotifs(prev => prev.map(n => ({ ...n, isRead: 'yes' })))
      fetch(`${API_BASE}/userNotifications/markRead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      }).catch(() => {})
    }
  }

  return (
    <>
      {/* Bell button */}
      <button
        onClick={openPanel}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <div className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-base">Notifications</h2>
            {notifs.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{notifs.length} total</p>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifs.length === 0 && (
            <div className="space-y-3 p-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-2.5 w-48 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && notifs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <span className="text-5xl mb-3">🔔</span>
              <p className="font-semibold text-gray-700 text-sm">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">Earn ProCoins or make payments to see activity here</p>
            </div>
          )}

          {notifs.length > 0 && (
            <ul className="divide-y divide-gray-50">
              {notifs.map(n => (
                <li key={n.id} className={`flex gap-3 px-4 py-3.5 ${n.isRead === 'no' ? 'bg-orange-50/60' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">
                    {TYPE_ICON[n.type] ?? '📣'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800 text-sm leading-snug">{n.title}</p>
                      {n.amount && n.amount !== '0' && n.amount !== '' && (
                        <span className={`text-xs font-bold shrink-0 ${n.type === 'coin_credit' || n.type === 'merchandise_approved' ? 'text-green-600' : 'text-red-500'}`}>
                          {n.type === 'coin_debit' ? '-' : '+'}{n.amount} 🪙
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{formatTs(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
