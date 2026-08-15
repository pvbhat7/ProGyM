import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'

type ReviewEntry = {
  id: string
  clientId: string
  clientName: string
  photo_path: string
  uploaded_at: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_at: string | null
}

function imgUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${MEDIA_BASE}/${path}`
}

function initials(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

const STATUS_STYLE: Record<string, string> = {
  approved: 'bg-green-50 text-green-600 border-green-100',
  rejected: 'bg-red-50 text-red-500 border-red-100',
  pending:  'bg-amber-50 text-amber-600 border-amber-100',
}

export default function AdminProfilePhotoReviewPage() {
  const navigate = useNavigate()
  const [tab, setTab]                   = useState<'pending' | 'history'>('pending')
  const [pending, setPending]           = useState<ReviewEntry[] | null>(null)
  const [history, setHistory]           = useState<ReviewEntry[] | null>(null)
  const [nameFilter, setNameFilter]     = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmEntry, setConfirmEntry] = useState<{ entry: ReviewEntry; action: 'approve' | 'reject' } | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/profilePhotoReview/getPending.php`)
      .then(r => r.json())
      .then((d: ReviewEntry[]) => setPending(Array.isArray(d) ? d : []))
      .catch(() => setPending([]))
  }, [])

  useEffect(() => {
    if (tab !== 'history' || history !== null) return
    fetch(`${API_BASE}/profilePhotoReview/getHistory.php`)
      .then(r => r.json())
      .then((d: ReviewEntry[]) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
  }, [tab, history])

  async function handleAction(entry: ReviewEntry, action: 'approve' | 'reject') {
    setActionLoading(entry.id)
    setConfirmEntry(null)
    try {
      const res = await fetch(`${API_BASE}/profilePhotoReview/${action}.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, clientId: entry.clientId }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setPending(prev => prev ? prev.filter(p => p.id !== entry.id) : prev)
        setHistory(null) // force history to reload next time tab is opened
      }
    } catch {
      // silently ignore
    } finally {
      setActionLoading(null)
    }
  }

  function switchTab(t: 'pending' | 'history') {
    setTab(t)
    setNameFilter('')
  }

  const isLoading = tab === 'pending' ? pending === null : history === null
  const list      = (tab === 'pending' ? pending : history) ?? []
  const filtered  = list.filter(e => !nameFilter || e.clientName.toLowerCase().includes(nameFilter.toLowerCase()))
  const pendingCount = pending?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">🖼️ Profile Photo Review</h1>
            <p className="text-xs text-gray-400">Approve or reject member profile pictures</p>
          </div>
          {!isLoading && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {/* Tab strip */}
        <div className="max-w-3xl mx-auto px-4 flex border-t border-gray-100">
          <button
            onClick={() => switchTab('pending')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-2 ${
              tab === 'pending' ? 'text-orange-600 border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => switchTab('history')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === 'history' ? 'text-gray-700 border-gray-700' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            History
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="Search by member name…"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors pr-9"
          />
          {nameFilter ? (
            <button onClick={() => setNameFilter('')} className="absolute right-3 top-2.5 text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
          ) : (
            <svg className="absolute right-3 top-3 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{tab === 'pending' ? '✅' : '📋'}</p>
            <p className="font-semibold text-gray-700">
              {nameFilter
                ? 'No matches found'
                : tab === 'pending' ? 'All caught up! No pending photos.' : 'No history yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {nameFilter
                ? 'Try a different name'
                : tab === 'pending'
                  ? 'New uploads will appear here for review'
                  : 'Approved and rejected photos will appear here'}
            </p>
            {nameFilter && (
              <button onClick={() => setNameFilter('')} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {!isLoading && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map(entry => (
              <li key={entry.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                entry.status === 'rejected' ? 'border-red-100' : entry.status === 'approved' ? 'border-green-100' : 'border-gray-100'
              }`}>
                <div className="flex gap-4 p-4">

                  {/* Photo */}
                  <div className="shrink-0">
                    {entry.photo_path ? (
                      <img
                        src={imgUrl(entry.photo_path)}
                        alt={entry.clientName}
                        className="w-20 h-20 rounded-xl object-cover bg-gray-100"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-orange-100 flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-2xl">{initials(entry.clientName)}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-800 text-sm truncate">{entry.clientName || `Client #${entry.clientId}`}</p>
                      {tab === 'history' && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[entry.status]}`}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-1">Uploaded: {entry.uploaded_at}</p>
                    {entry.reviewed_at && (
                      <p className="text-xs text-gray-400">
                        {entry.status === 'approved' ? 'Approved' : 'Rejected'}: {entry.reviewed_at}
                      </p>
                    )}

                    {/* Pending action buttons */}
                    {tab === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setConfirmEntry({ entry, action: 'approve' })}
                          disabled={actionLoading === entry.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-all disabled:opacity-50"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {actionLoading === entry.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setConfirmEntry({ entry, action: 'reject' })}
                          disabled={actionLoading === entry.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {actionLoading === entry.id ? '…' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

      </main>

      {/* Confirmation modal */}
      {confirmEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setConfirmEntry(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>

            {/* Photo preview */}
            <div className="flex justify-center mb-4">
              {confirmEntry.entry.photo_path ? (
                <img
                  src={imgUrl(confirmEntry.entry.photo_path)}
                  alt={confirmEntry.entry.clientName}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-3xl">{initials(confirmEntry.entry.clientName)}</span>
                </div>
              )}
            </div>

            <h3 className="text-base font-bold text-gray-800 text-center">
              {confirmEntry.action === 'approve' ? 'Approve this photo?' : 'Reject this photo?'}
            </h3>
            <p className="text-sm text-gray-500 text-center mt-1.5">
              <span className="font-semibold text-gray-700">{confirmEntry.entry.clientName}</span>
              {confirmEntry.action === 'reject'
                ? "'s profile picture will be removed."
                : "'s profile picture will be marked as approved."}
            </p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmEntry(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmEntry.entry, confirmEntry.action)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                  confirmEntry.action === 'approve'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {confirmEntry.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
