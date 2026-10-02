import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import { enablePush, getPushStatus, PUSH_RECEIVED_EVENT } from '../services/pushNotifications'
import type { PushStatus } from '../services/pushNotifications'

type Notif = {
  id: string
  type: string
  title: string
  message: string
  amount: string
  isRead: string
  createdAt: string
  image?: string | null
  link?: string | null
}

const TYPE_ICON: Record<string, string> = {
  coin_credit:            '🪙',
  coin_debit:             '💸',
  payment:                '💳',
  package:                '📦',
  merchandise_approved:   '✅',
  merchandise_rejected:   '❌',
  broadcast:              '📢',
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
  const [open, setOpen]             = useState(() => new URLSearchParams(window.location.search).get('notifications') === 'open')
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

  // Refetch when a push arrives while this page is open.
  useEffect(() => {
    window.addEventListener(PUSH_RECEIVED_EVENT, fetchNotifs)
    return () => window.removeEventListener(PUSH_RECEIVED_EVENT, fetchNotifs)
  }, [fetchNotifs])

  // iPhone image pushes open the app with ?notifications=open (iOS can't show
  // the image in the notification itself) — clean the URL once the panel is open.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('notifications')) {
      url.searchParams.delete('notifications')
      window.history.replaceState(window.history.state, '', url.toString())
    }
  }, [])

  const navigate = useNavigate()
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null)
  useEffect(() => { getPushStatus().then(setPushStatus).catch(() => {}) }, [])

  async function turnOnPush() {
    if (!clientId) return
    setPushStatus(await enablePush(clientId).catch(() => 'unsupported' as const))
  }

  function openLink(link: string) {
    setOpen(false)
    if (/^https:\/\//i.test(link)) window.open(link, '_blank', 'noopener')
    else navigate(link)
  }

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

        {/* Push opt-in */}
        {pushStatus === 'default' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border-b border-orange-100">
            <span className="text-xl">🔔</span>
            <p className="flex-1 text-xs text-gray-700 leading-snug">Get gym updates & offers even when the app is closed.</p>
            <button onClick={turnOnPush} className="shrink-0 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700">
              Turn on
            </button>
          </div>
        )}
        {pushStatus === 'ios-needs-install' && (
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 text-xs text-gray-700 leading-snug">
            📲 To get notifications on iPhone, tap <b>Share</b> → <b>Add to Home Screen</b>, then open ProGym from the home screen.
          </div>
        )}
        {pushStatus === 'denied' && (
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 leading-snug">
            Notifications are blocked for this site. Allow them in your browser's site settings to get alerts.
          </div>
        )}

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
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug whitespace-pre-line">{n.message}</p>
                    {n.image && (
                      <img src={n.image} alt="" loading="lazy" className="mt-2 w-full rounded-lg border border-gray-100 object-cover max-h-48" />
                    )}
                    {n.link && (
                      <button onClick={() => openLink(n.link!)} className="mt-1.5 text-xs font-semibold text-orange-600 hover:underline">
                        Open →
                      </button>
                    )}
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
