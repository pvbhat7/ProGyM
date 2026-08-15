import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'

type PhotoEntry = {
  id: string
  clientId: string
  week_label: string
  week_start_date: string
  week_end_date: string
  after_photo: string
  upload_date: string
  coins_credited: string
  clientName: string
  clientPhoto: string
  beforePhotoPath: string
}

type RejectionEntry = {
  id: string
  clientId: string
  clientName: string
  week_label: string
  week_start_date: string
  week_end_date: string
  before_photo: string
  after_photo: string
  upload_date: string
  rejected_at: string
}

function imgUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${MEDIA_BASE}/${path}`
}

function initials(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function PhotoPlaceholder() {
  return (
    <div className="w-full aspect-square rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

export default function AdminBeforeAfterPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab]       = useState<'active' | 'rejected'>('active')
  const [photos, setPhotos]             = useState<PhotoEntry[] | null>(null)
  const [rejections, setRejections]     = useState<RejectionEntry[] | null>(null)
  const [nameFilter, setNameFilter]     = useState('')
  const [monthFilter, setMonthFilter]   = useState('all')
  const [confirmEntry, setConfirmEntry] = useState<PhotoEntry | null>(null)
  const [rejecting, setRejecting]       = useState(false)

  async function rejectEntry() {
    if (!confirmEntry) return
    setRejecting(true)
    try {
      const res = await fetch(`${API_BASE}/beforeAfterPhotos/reject.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmEntry.id, clientId: confirmEntry.clientId, week_label: confirmEntry.week_label }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setPhotos(prev => prev ? prev.filter(p => p.id !== confirmEntry.id) : prev)
        setConfirmEntry(null)
      }
    } catch {
      // silently ignore
    } finally {
      setRejecting(false)
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/beforeAfterPhotos/getAll.php`)
      .then(r => r.json())
      .then((d: PhotoEntry[]) => setPhotos(Array.isArray(d) ? d : []))
      .catch(() => setPhotos([]))
  }, [])

  useEffect(() => {
    if (activeTab !== 'rejected' || rejections !== null) return
    fetch(`${API_BASE}/beforeAfterPhotos/getRejectionLog.php`)
      .then(r => r.json())
      .then((d: RejectionEntry[]) => setRejections(Array.isArray(d) ? d : []))
      .catch(() => setRejections([]))
  }, [activeTab, rejections])

  // Derive month pills from whichever list is active
  const activeList = activeTab === 'active' ? photos : rejections
  const months: string[] = activeList
    ? ['all', ...Array.from(new Set(activeList.map(p => p.week_label.split(' Week ')[0])))]
    : ['all']

  const filteredActive: PhotoEntry[] = (photos ?? []).filter(p => {
    const matchesName  = !nameFilter || p.clientName.toLowerCase().includes(nameFilter.toLowerCase())
    const matchesMonth = monthFilter === 'all' || p.week_label.startsWith(monthFilter + ' ')
    return matchesName && matchesMonth
  })

  const filteredRejected: RejectionEntry[] = (rejections ?? []).filter(r => {
    const matchesName  = !nameFilter || r.clientName.toLowerCase().includes(nameFilter.toLowerCase())
    const matchesMonth = monthFilter === 'all' || r.week_label.startsWith(monthFilter + ' ')
    return matchesName && matchesMonth
  })

  const isLoading = activeTab === 'active' ? photos === null : rejections === null
  const isEmpty   = activeTab === 'active' ? filteredActive.length === 0 : filteredRejected.length === 0
  const totalCount = activeTab === 'active' ? filteredActive.length : filteredRejected.length

  function switchTab(tab: 'active' | 'rejected') {
    setActiveTab(tab)
    setNameFilter('')
    setMonthFilter('all')
  }

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
            <h1 className="font-bold text-gray-800 text-lg leading-tight">📸 Before / After Wall</h1>
            <p className="text-xs text-gray-400">Member transformation photos</p>
          </div>
          {!isLoading && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
              {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {/* Tab strip */}
        <div className="max-w-3xl mx-auto px-4 flex border-t border-gray-100">
          <button
            onClick={() => switchTab('active')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'active'
                ? 'text-orange-600 border-orange-500'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => switchTab('rejected')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'rejected'
                ? 'text-red-600 border-red-500'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            Rejected History
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* Filters */}
        <div className="space-y-3">
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

          {months.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {months.map(m => (
                <button
                  key={m}
                  onClick={() => setMonthFilter(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    monthFilter === m ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {m === 'all' ? 'All Months' : m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-36 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
                  <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && isEmpty && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{activeTab === 'rejected' ? '🚫' : '📸'}</p>
            <p className="font-semibold text-gray-700">
              {nameFilter || monthFilter !== 'all'
                ? 'No matches found'
                : activeTab === 'rejected' ? 'No rejected photos yet' : 'No photos yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {nameFilter || monthFilter !== 'all'
                ? 'Try a different name or month filter'
                : activeTab === 'rejected'
                  ? 'Rejected entries will appear here with full photo history'
                  : 'Members will appear here once they upload their weekly after photos'}
            </p>
            {(nameFilter || monthFilter !== 'all') && (
              <button
                onClick={() => { setNameFilter(''); setMonthFilter('all') }}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── ACTIVE CARDS ── */}
        {activeTab === 'active' && !isLoading && filteredActive.length > 0 && (
          <ul className="space-y-4">
            {filteredActive.map(entry => (
              <li key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
                  <div className="w-9 h-9 rounded-full bg-orange-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {entry.clientPhoto ? (
                      <img src={imgUrl(entry.clientPhoto)} alt={entry.clientName} className="w-full h-full object-cover"
                        onError={e => { const t = e.target as HTMLImageElement; t.style.display = 'none'; if (t.parentElement) t.parentElement.textContent = initials(entry.clientName) }} />
                    ) : (
                      <span className="text-orange-600 font-bold text-sm">{initials(entry.clientName)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{entry.clientName || `Client #${entry.clientId}`}</p>
                    <p className="text-xs text-gray-400 truncate">{entry.week_start_date} – {entry.week_end_date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-semibold bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full border border-orange-100">
                      {entry.week_label}
                    </span>
                    {entry.coins_credited === 'yes' && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">+5 coins</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                  <div className="p-3">
                    <p className="text-xs text-gray-400 font-medium text-center mb-2">Before</p>
                    {entry.beforePhotoPath
                      ? <img src={imgUrl(entry.beforePhotoPath)} alt="Before" className="w-full aspect-square object-cover rounded-xl bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <PhotoPlaceholder />}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 font-medium text-center mb-2">After</p>
                    {entry.after_photo
                      ? <img src={imgUrl(entry.after_photo)} alt={entry.week_label} className="w-full aspect-square object-cover rounded-xl bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <PhotoPlaceholder />}
                  </div>
                </div>

                <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-300">{entry.upload_date ? `Uploaded ${entry.upload_date}` : ''}</p>
                  <button
                    onClick={() => setConfirmEntry(entry)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ── REJECTED HISTORY CARDS ── */}
        {activeTab === 'rejected' && !isLoading && filteredRejected.length > 0 && (
          <ul className="space-y-4">
            {filteredRejected.map(entry => (
              <li key={entry.id} className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden opacity-90">
                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
                  <div className="w-9 h-9 rounded-full bg-red-100 shrink-0 flex items-center justify-center">
                    <span className="text-red-500 font-bold text-sm">{initials(entry.clientName)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{entry.clientName || `Client #${entry.clientId}`}</p>
                    <p className="text-xs text-gray-400 truncate">{entry.week_start_date} – {entry.week_end_date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-semibold bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full border border-orange-100">
                      {entry.week_label}
                    </span>
                    <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      Rejected
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                  <div className="p-3">
                    <p className="text-xs text-gray-400 font-medium text-center mb-2">Before</p>
                    {entry.before_photo
                      ? <img src={imgUrl(entry.before_photo)} alt="Before" className="w-full aspect-square object-cover rounded-xl bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <PhotoPlaceholder />}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 font-medium text-center mb-2">After</p>
                    {entry.after_photo
                      ? <img src={imgUrl(entry.after_photo)} alt={entry.week_label} className="w-full aspect-square object-cover rounded-xl bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <PhotoPlaceholder />}
                  </div>
                </div>

                <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">{entry.upload_date ? `Uploaded ${entry.upload_date}` : ''}</p>
                  <p className="text-xs text-red-400 font-medium">{entry.rejected_at ? `Rejected ${entry.rejected_at}` : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

      </main>

      {/* Reject confirmation modal */}
      {confirmEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => !rejecting && setConfirmEntry(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 text-center">Reject this entry?</h3>
            <p className="text-sm text-gray-500 text-center mt-1.5">
              <span className="font-semibold text-gray-700">{confirmEntry.clientName}</span>'s{' '}
              {confirmEntry.week_label} photos will be removed and they will be notified.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmEntry(null)} disabled={rejecting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={rejectEntry} disabled={rejecting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {rejecting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {rejecting ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
