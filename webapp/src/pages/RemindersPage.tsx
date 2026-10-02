import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

type BulkMember = {
  id: string
  name: string
  email: string
  fees: number
  paid: number
  dues: number
}

type PackageMember = {
  id: string
  name: string
  email: string
  endDate: string
  daysExpired: number
}

type LaunchMember = {
  id: string
  name: string
  email: string
  status: 'pending' | 'sent' | 'skipped'
}

type PhotoMember = {
  id: string
  name: string
  mobile: string
  email: string
}

type BatchLog = {
  id: string
  batch_type: string
  created_at: string
  total_selected: number
  sent_count: number
  skipped_count: number
  pending_count: number
  status: 'running' | 'completed' | 'partial'
}

function parseDMY(s: string): Date {
  const p = s ? s.split('/') : []
  if (p.length !== 3) return new Date(NaN)
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
}

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function StatusBadge({ status }: { status: 'pending' | 'sent' | 'skipped' }) {
  if (status === 'sent')    return <span className="text-xs font-semibold text-green-600">✓ Sent</span>
  if (status === 'skipped') return <span className="text-xs font-semibold text-amber-500">No email</span>
  return <span className="text-xs text-gray-300">—</span>
}

function BatchStatusBadge({ status }: { status: BatchLog['status'] }) {
  if (status === 'completed') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Completed</span>
  if (status === 'partial')   return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Partial</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Running</span>
}

function batchTypeLabel(t: string) {
  if (t === 'app_launch')          return '🚀 App Launch'
  if (t === 'payment_reminder')    return '💰 Payment Reminder'
  if (t === 'package_reminder')    return '📅 Package Reminder'
  return t
}

export default function RemindersPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'payment' | 'package' | 'launch' | 'logs' | 'photo' | null>(null)

  // Payment state
  const [bulkMembers, setBulkMembers] = useState<BulkMember[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ sent: number; skipped: number } | null>(null)

  // Package state
  const [pkgMembers, setPkgMembers] = useState<PackageMember[]>([])
  const [pkgLoading, setPkgLoading] = useState(false)
  const [pkgExcluded, setPkgExcluded] = useState<Set<string>>(new Set())
  const [showPkgConfirm, setShowPkgConfirm] = useState(false)
  const [pkgSending, setPkgSending] = useState(false)
  const [pkgResult, setPkgResult] = useState<{ sent: number; skipped: number } | null>(null)

  // Launch state — simple positive-selection model
  const [launchMembers, setLaunchMembers] = useState<LaunchMember[]>([])
  const [launchLoading, setLaunchLoading] = useState(false)
  const [launchSelected, setLaunchSelected] = useState<Set<string>>(new Set())
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false)
  const [launchSending, setLaunchSending] = useState(false)
  const [launchProgress, setLaunchProgress] = useState(0)
  const [launchSentCount, setLaunchSentCount] = useState(0)
  const [launchDone, setLaunchDone] = useState(false)

  // Batch logs state
  const [batchLogs, setBatchLogs] = useState<BatchLog[]>([])
  const [batchLogsLoading, setBatchLogsLoading] = useState(false)
  const [retriggerLoading, setRetriggerLoading] = useState<string | null>(null)

  // Photo reminder state
  const [photoMembers, setPhotoMembers] = useState<PhotoMember[]>([])
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoSearch, setPhotoSearch] = useState('')
  const [photoReminders, setPhotoReminders] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('progym_photo_reminders') || '{}') }
    catch { return {} }
  })
  const [emailSending, setEmailSending] = useState<Set<string>>(new Set())
  const [emailResults, setEmailResults] = useState<Record<string, 'sent' | 'error'>>({})

  const [bulkSearch, setBulkSearch]     = useState('')
  const [pkgSearch, setPkgSearch]       = useState('')
  const [launchSearch, setLaunchSearch] = useState('')

  const q = (s: string) => s.toLowerCase()
  const filteredBulk   = bulkMembers.filter(m => !bulkSearch   || q(m.name).includes(q(bulkSearch))   || q(m.email).includes(q(bulkSearch)))
  const filteredPkg    = pkgMembers.filter(m  => !pkgSearch    || q(m.name).includes(q(pkgSearch))    || q(m.email).includes(q(pkgSearch)))
  const filteredLaunch = launchMembers.filter(m => !launchSearch || q(m.name).includes(q(launchSearch)) || q(m.email).includes(q(launchSearch)))
  const filteredPhoto  = photoMembers.filter(m => !photoSearch  || q(m.name).includes(q(photoSearch))  || m.mobile.includes(photoSearch))

  const selectedCount    = bulkMembers.filter(m => !excluded.has(m.id)).length
  const pkgSelectedCount = pkgMembers.filter(m => !pkgExcluded.has(m.id)).length
  const launchWithEmail  = launchMembers.filter(m => m.email).length

  function loadPaymentReminders() {
    setBulkLoading(true); setBulkMembers([]); setExcluded(new Set()); setBulkResult(null)
    fetch(`${API_BASE}/client/allWithPackages.php`)
      .then(r => r.json())
      .then((data: Record<string, string>[]) => {
        const withDues: BulkMember[] = (Array.isArray(data) ? data : [])
          .filter(m => {
            const fees = parseFloat(m.pkgFees || '0')
            const paid = parseFloat(m.pkgAmountPaid || '0')
            return m.profileActiveFlag === 'enable' && fees > 0 && paid < fees
          })
          .map(m => {
            const fees = parseFloat(m.pkgFees || '0')
            const paid = parseFloat(m.pkgAmountPaid || '0')
            return { id: String(m.id), name: m.name, email: m.email || '', fees, paid, dues: fees - paid }
          })
        setBulkMembers(withDues)
      })
      .catch(() => setBulkMembers([]))
      .finally(() => setBulkLoading(false))
  }

  function loadPackageReminders() {
    setPkgLoading(true); setPkgMembers([]); setPkgExcluded(new Set()); setPkgResult(null)
    const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
    fetch(`${API_BASE}/client/allWithPackages.php`)
      .then(r => r.json())
      .then((data: Record<string, string>[]) => {
        const expired: PackageMember[] = (Array.isArray(data) ? data : [])
          .filter(m => {
            if (m.profileActiveFlag !== 'enable') return false
            const end = parseDMY(m.pkgEndDate || '')
            return !isNaN(end.getTime()) && end.getTime() < todayMs
          })
          .map(m => {
            const end = parseDMY(m.pkgEndDate)
            const daysExpired = Math.floor((todayMs - end.getTime()) / 86400000)
            return { id: String(m.id), name: m.name, email: m.email || '', endDate: m.pkgEndDate, daysExpired }
          })
          .sort((a, b) => b.daysExpired - a.daysExpired)
        setPkgMembers(expired)
      })
      .catch(() => setPkgMembers([]))
      .finally(() => setPkgLoading(false))
  }

  function loadLaunchMembers(overrideSelectedIds?: string[]) {
    setLaunchLoading(true)
    setLaunchMembers([])
    setLaunchSelected(new Set())
    setLaunchDone(false)
    setLaunchSentCount(0)
    setLaunchProgress(0)
    fetch(`${API_BASE}/client/getAllByFilter.php?filter=all`)
      .then(r => r.json())
      .then((data: Record<string, string>[]) => {
        const members: LaunchMember[] = (Array.isArray(data) ? data : [])
          .map(m => ({ id: String(m.id), name: m.name || '', email: m.email || '', status: 'pending' as const }))
        setLaunchMembers(members)
        if (overrideSelectedIds) {
          setLaunchSelected(new Set(overrideSelectedIds))
        } else {
          setLaunchSelected(new Set(members.map(m => m.id)))
        }
      })
      .catch(() => setLaunchMembers([]))
      .finally(() => setLaunchLoading(false))
  }

  function loadPhotoMembers() {
    setPhotoLoading(true)
    setPhotoMembers([])
    fetch(`${API_BASE}/client/getAllByFilter.php?filter=enable`)
      .then(r => r.json())
      .then((data: Record<string, string>[]) => {
        const without = (Array.isArray(data) ? data : [])
          .filter(m => !m.photo || m.photo.trim() === '' || m.photo.toLowerCase() === 'null')
          .map(m => ({ id: String(m.id), name: m.name || '', mobile: m.mobile || '', email: m.email || '' }))
        setPhotoMembers(without)
      })
      .catch(() => setPhotoMembers([]))
      .finally(() => setPhotoLoading(false))
  }

  function markReminded(id: string) {
    const updated = { ...photoReminders, [id]: new Date().toISOString() }
    setPhotoReminders(updated)
    localStorage.setItem('progym_photo_reminders', JSON.stringify(updated))
  }

  async function sendPhotoEmail(id: string) {
    setEmailSending(prev => new Set(prev).add(id))
    setEmailResults(prev => { const r = { ...prev }; delete r[id]; return r })
    try {
      const res = await fetch(`${API_BASE}/client/sendPhotoReminderEmail.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id }),
      })
      const json = await res.json()
      if (json.error) console.error('Photo reminder email error:', json.error)
      const status = json.sent === 1 ? 'sent' : 'error'
      setEmailResults(prev => ({ ...prev, [id]: status }))
      if (status === 'sent') markReminded(id)
    } catch (e) {
      console.error('Photo reminder email fetch error:', e)
      setEmailResults(prev => ({ ...prev, [id]: 'error' }))
    } finally {
      setEmailSending(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  function loadBatchLogs() {
    setBatchLogsLoading(true)
    fetch(`${API_BASE}/emailbatch/getAll.php`)
      .then(r => r.json())
      .then((data: BatchLog[]) => setBatchLogs(Array.isArray(data) ? data : []))
      .catch(() => setBatchLogs([]))
      .finally(() => setBatchLogsLoading(false))
  }

  function handleSectionSelect(section: 'payment' | 'package' | 'launch' | 'logs' | 'photo') {
    if (activeSection === section) return
    setActiveSection(section)
    if (section === 'payment')      loadPaymentReminders()
    else if (section === 'package') loadPackageReminders()
    else if (section === 'launch')  loadLaunchMembers()
    else if (section === 'photo')   loadPhotoMembers()
    else                            loadBatchLogs()
  }

  function toggleExcluded(id: string) {
    setExcluded(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }
  function togglePkgExcluded(id: string) {
    setPkgExcluded(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }
  function toggleLaunchSelected(id: string) {
    setLaunchSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  async function sendBulkReminders() {
    const toSend = bulkMembers.filter(m => !excluded.has(m.id)).map(m => m.id)
    if (!toSend.length) return
    setShowBulkConfirm(false); setBulkSending(true)
    try {
      const res = await fetch(`${API_BASE}/client/sendBulkPaymentReminder.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: toSend }),
      })
      const data = await res.json()
      setBulkResult({ sent: data.sent ?? 0, skipped: data.skipped ?? 0 })
    } catch {
      setBulkResult({ sent: 0, skipped: toSend.length })
    } finally { setBulkSending(false) }
  }

  async function sendBulkPackageReminders() {
    const toSend = pkgMembers.filter(m => !pkgExcluded.has(m.id)).map(m => m.id)
    if (!toSend.length) return
    setShowPkgConfirm(false); setPkgSending(true)
    try {
      const res = await fetch(`${API_BASE}/client/sendBulkPaymentReminder.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: toSend }),
      })
      const data = await res.json()
      setPkgResult({ sent: data.sent ?? 0, skipped: data.skipped ?? 0 })
    } catch {
      setPkgResult({ sent: 0, skipped: toSend.length })
    } finally { setPkgSending(false) }
  }

  async function sendBulkLaunchEmails() {
    setShowLaunchConfirm(false)
    setLaunchSending(true)

    const ids = [...launchSelected]
    const chunks = chunkArray(ids, 50)
    let totalSent = 0

    // Create batch log record before sending
    let batchId: string | null = null
    try {
      const res = await fetch(`${API_BASE}/emailbatch/create.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_type: 'app_launch', total_selected: ids.length, pending_ids: ids }),
      })
      const data = await res.json()
      if (data.id) batchId = String(data.id)
    } catch { /* send without tracking if this fails */ }

    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await fetch(`${API_BASE}/client/sendBulkAppLaunchEmail.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientIds: chunks[i] }),
        })
        const data = await res.json()
        const results: Record<string, string> = data.results ?? {}
        totalSent += data.sent ?? 0
        setLaunchSentCount(totalSent)
        setLaunchProgress(Math.round(((i + 1) / chunks.length) * 100))
        setLaunchMembers(prev => prev.map(m =>
          results[m.id] ? { ...m, status: results[m.id] as 'sent' | 'skipped' } : m
        ))

        // Update batch log with this chunk's results
        if (batchId) {
          const sentIds    = Object.entries(results).filter(([, v]) => v === 'sent').map(([k]) => k)
          const skippedIds = Object.entries(results).filter(([, v]) => v === 'skipped').map(([k]) => k)
          fetch(`${API_BASE}/emailbatch/updateChunk.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch_id: batchId, sent_ids: sentIds, skipped_ids: skippedIds }),
          }).catch(() => {})
        }
      } catch { /* chunk failed — these IDs remain pending in batch log */ }
    }

    setLaunchSending(false)
    setLaunchDone(true)
  }

  async function retriggerBatch(batchId: string) {
    setRetriggerLoading(batchId)
    try {
      const res = await fetch(`${API_BASE}/emailbatch/getPendingIds.php?id=${batchId}`)
      const data = await res.json()
      const pendingIds: string[] = data.pending_ids ?? []
      if (pendingIds.length === 0) {
        alert('No pending members in this batch.')
        return
      }
      setActiveSection('launch')
      loadLaunchMembers(pendingIds)
    } catch {
      alert('Failed to load pending members. Please try again.')
    } finally {
      setRetriggerLoading(null)
    }
  }

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">Send Reminders</h1>
            <p className="text-xs text-gray-400">Choose a reminder type to send</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Reminder type cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <button onClick={() => handleSectionSelect('payment')}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              activeSection === 'payment' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md'
            }`}>
            <span className="text-3xl block mb-2">💰</span>
            <p className={`font-bold text-sm ${activeSection === 'payment' ? 'text-blue-700' : 'text-gray-800'}`}>Payment Reminder</p>
            <p className="text-xs text-gray-400 mt-0.5">Members with pending dues</p>
          </button>

          <button onClick={() => handleSectionSelect('package')}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              activeSection === 'package' ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-gray-100 bg-white hover:border-orange-300 hover:shadow-md'
            }`}>
            <span className="text-3xl block mb-2">📅</span>
            <p className={`font-bold text-sm ${activeSection === 'package' ? 'text-orange-700' : 'text-gray-800'}`}>Package Reminder</p>
            <p className="text-xs text-gray-400 mt-0.5">Members with expired packages</p>
          </button>

          <button onClick={() => handleSectionSelect('launch')}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              activeSection === 'launch' ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-400 hover:shadow-md'
            }`}>
            <span className="text-3xl block mb-2">🚀</span>
            <p className={`font-bold text-sm ${activeSection === 'launch' ? 'text-blue-700' : 'text-gray-800'}`}>App Launch Mails</p>
            <p className="text-xs text-gray-400 mt-0.5">Announce ProGym to members</p>
          </button>

          <button onClick={() => handleSectionSelect('logs')}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              activeSection === 'logs' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-100 bg-white hover:border-purple-300 hover:shadow-md'
            }`}>
            <span className="text-3xl block mb-2">📋</span>
            <p className={`font-bold text-sm ${activeSection === 'logs' ? 'text-purple-700' : 'text-gray-800'}`}>Batch Logs</p>
            <p className="text-xs text-gray-400 mt-0.5">View history &amp; re-trigger</p>
          </button>

          <button onClick={() => handleSectionSelect('photo')}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              activeSection === 'photo' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-gray-100 bg-white hover:border-teal-300 hover:shadow-md'
            }`}>
            <span className="text-3xl block mb-2">🖼️</span>
            <p className={`font-bold text-sm ${activeSection === 'photo' ? 'text-teal-700' : 'text-gray-800'}`}>Profile Photo</p>
            <p className="text-xs text-gray-400 mt-0.5">Members without a photo</p>
          </button>
        </div>

        {/* ── Payment Section ── */}
        {activeSection === 'payment' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">📨 Bulk Payment Reminder</h3>
              {!bulkLoading && <p className="text-xs text-gray-400 mt-0.5">{bulkMembers.length} active member{bulkMembers.length !== 1 ? 's' : ''} with pending dues</p>}
            </div>

            {!bulkLoading && bulkMembers.length > 0 && (
              <div className="px-5 pt-4">
                <SearchInput value={bulkSearch} onChange={setBulkSearch} placeholder="Search by name or email…" />
              </div>
            )}

            {bulkResult && (
              <div className={`mx-5 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 ${bulkResult.sent > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <span className="text-2xl">{bulkResult.sent > 0 ? '✅' : '❌'}</span>
                <div>
                  <p className={`text-sm font-semibold ${bulkResult.sent > 0 ? 'text-green-700' : 'text-red-700'}`}>{bulkResult.sent} email{bulkResult.sent !== 1 ? 's' : ''} sent successfully</p>
                  {bulkResult.skipped > 0 && <p className="text-xs text-gray-500 mt-0.5">{bulkResult.skipped} skipped (no email or no package)</p>}
                </div>
              </div>
            )}

            {!bulkLoading && bulkMembers.length > 0 && !bulkResult && (
              <div className="px-5 pt-3 pb-2 flex items-center justify-between">
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-800">{selectedCount}</span> of {bulkMembers.length} selected{bulkSearch && ` · showing ${filteredBulk.length}`}</p>
                <div className="flex gap-2">
                  <button onClick={() => setExcluded(new Set())} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors">Select All</button>
                  <button onClick={() => setExcluded(new Set(bulkMembers.map(m => m.id)))} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors">Deselect All</button>
                </div>
              </div>
            )}

            <div className="px-5 py-2">
              {bulkLoading && <LoadingSkeleton />}
              {!bulkLoading && bulkMembers.length === 0 && (
                <div className="text-center py-14"><p className="text-4xl mb-3">🎉</p><p className="font-semibold text-gray-700">No pending dues!</p><p className="text-sm text-gray-400 mt-1">All active members are fully paid up.</p></div>
              )}
              {!bulkLoading && bulkMembers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-2 pr-3 text-left font-semibold">Member</th>
                        <th className="py-2 px-3 text-right font-semibold">Total Fees</th>
                        <th className="py-2 px-3 text-right font-semibold">Paid</th>
                        <th className="py-2 px-3 text-right font-semibold text-red-500">Pending</th>
                        <th className="py-2 pl-3 text-center font-semibold">Include</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredBulk.map(m => {
                        const included = !excluded.has(m.id)
                        return (
                          <tr key={m.id} className={`transition-colors ${included ? '' : 'opacity-40'}`}>
                            <td className="py-3 pr-3">
                              <p className="font-semibold text-gray-800 truncate max-w-[140px]">{m.name}</p>
                              <p className={`text-xs mt-0.5 truncate max-w-[160px] ${m.email ? 'text-gray-400' : 'text-red-400 italic'}`}>{m.email || 'No email'}</p>
                            </td>
                            <td className="py-3 px-3 text-right text-gray-600 whitespace-nowrap">{inr(m.fees)}</td>
                            <td className="py-3 px-3 text-right text-green-600 font-medium whitespace-nowrap">{inr(m.paid)}</td>
                            <td className="py-3 px-3 text-right text-red-500 font-bold whitespace-nowrap">{inr(m.dues)}</td>
                            <td className="py-3 pl-3 text-center">
                              <Toggle on={included} disabled={bulkSending} onClick={() => toggleExcluded(m.id)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!bulkLoading && bulkMembers.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100">
                {bulkResult
                  ? <button onClick={() => { setBulkResult(null); setExcluded(new Set()) }} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Send Again</button>
                  : <button onClick={() => setShowBulkConfirm(true)} disabled={selectedCount === 0 || bulkSending}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {bulkSending ? <><Spinner /> Sending…</> : `Send Reminders to ${selectedCount} Member${selectedCount !== 1 ? 's' : ''}`}
                    </button>
                }
              </div>
            )}
          </div>
        )}

        {/* ── Package Section ── */}
        {activeSection === 'package' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">📅 Bulk Package Reminder</h3>
              {!pkgLoading && <p className="text-xs text-gray-400 mt-0.5">{pkgMembers.length} active member{pkgMembers.length !== 1 ? 's' : ''} with expired packages</p>}
            </div>

            {!pkgLoading && pkgMembers.length > 0 && (
              <div className="px-5 pt-4">
                <SearchInput value={pkgSearch} onChange={setPkgSearch} placeholder="Search by name or email…" />
              </div>
            )}

            {pkgResult && (
              <div className={`mx-5 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 ${pkgResult.sent > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <span className="text-2xl">{pkgResult.sent > 0 ? '✅' : '❌'}</span>
                <div>
                  <p className={`text-sm font-semibold ${pkgResult.sent > 0 ? 'text-green-700' : 'text-red-700'}`}>{pkgResult.sent} email{pkgResult.sent !== 1 ? 's' : ''} sent successfully</p>
                  {pkgResult.skipped > 0 && <p className="text-xs text-gray-500 mt-0.5">{pkgResult.skipped} skipped (no email or no package)</p>}
                </div>
              </div>
            )}

            {!pkgLoading && pkgMembers.length > 0 && !pkgResult && (
              <div className="px-5 pt-3 pb-2 flex items-center justify-between">
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-800">{pkgSelectedCount}</span> of {pkgMembers.length} selected{pkgSearch && ` · showing ${filteredPkg.length}`}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPkgExcluded(new Set())} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors">Select All</button>
                  <button onClick={() => setPkgExcluded(new Set(pkgMembers.map(m => m.id)))} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors">Deselect All</button>
                </div>
              </div>
            )}

            <div className="px-5 py-2">
              {pkgLoading && <LoadingSkeleton />}
              {!pkgLoading && pkgMembers.length === 0 && (
                <div className="text-center py-14"><p className="text-4xl mb-3">🎉</p><p className="font-semibold text-gray-700">No expired packages!</p><p className="text-sm text-gray-400 mt-1">All active members have valid packages.</p></div>
              )}
              {!pkgLoading && pkgMembers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-2 pr-3 text-left font-semibold">Member</th>
                        <th className="py-2 px-3 text-right font-semibold">End Date</th>
                        <th className="py-2 px-3 text-right font-semibold text-red-500">Expired</th>
                        <th className="py-2 pl-3 text-center font-semibold">Include</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredPkg.map(m => {
                        const included = !pkgExcluded.has(m.id)
                        const expiredLabel = m.daysExpired === 0 ? 'Today' : m.daysExpired === 1 ? '1 day ago' : `${m.daysExpired} days ago`
                        return (
                          <tr key={m.id} className={`transition-colors ${included ? '' : 'opacity-40'}`}>
                            <td className="py-3 pr-3">
                              <p className="font-semibold text-gray-800 truncate max-w-[140px]">{m.name}</p>
                              <p className={`text-xs mt-0.5 truncate max-w-[160px] ${m.email ? 'text-gray-400' : 'text-red-400 italic'}`}>{m.email || 'No email'}</p>
                            </td>
                            <td className="py-3 px-3 text-right text-gray-600 whitespace-nowrap">{m.endDate}</td>
                            <td className="py-3 px-3 text-right text-red-500 font-bold whitespace-nowrap">{expiredLabel}</td>
                            <td className="py-3 pl-3 text-center">
                              <Toggle on={included} disabled={pkgSending} onClick={() => togglePkgExcluded(m.id)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!pkgLoading && pkgMembers.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100">
                {pkgResult
                  ? <button onClick={() => { setPkgResult(null); setPkgExcluded(new Set()) }} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Send Again</button>
                  : <button onClick={() => setShowPkgConfirm(true)} disabled={pkgSelectedCount === 0 || pkgSending}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {pkgSending ? <><Spinner /> Sending…</> : `Send Reminders to ${pkgSelectedCount} Member${pkgSelectedCount !== 1 ? 's' : ''}`}
                    </button>
                }
              </div>
            )}
          </div>
        )}

        {/* ── App Launch Section ── */}
        {activeSection === 'launch' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">🚀 Send App Launch Mails</h3>
              {!launchLoading && launchMembers.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {launchMembers.length} total members &bull; {launchWithEmail} with email
                </p>
              )}
            </div>

            {launchSending && (
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Sending in batches of 50… {launchSentCount} sent so far</span>
                  <span className="font-semibold text-blue-600">{launchProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${launchProgress}%` }} />
                </div>
              </div>
            )}

            {launchDone && (
              <div className="mx-5 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 bg-green-50 border border-green-200">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-700">{launchSentCount} email{launchSentCount !== 1 ? 's' : ''} sent successfully</p>
                  <p className="text-xs text-gray-500 mt-0.5">{launchMembers.filter(m => m.status === 'skipped').length} skipped (no email registered)</p>
                </div>
              </div>
            )}

            {!launchLoading && launchMembers.length > 0 && (
              <div className="px-5 pt-4">
                <SearchInput value={launchSearch} onChange={setLaunchSearch} placeholder="Search by name or email…" />
              </div>
            )}

            {!launchLoading && launchMembers.length > 0 && !launchDone && (
              <div className="px-5 pt-3 pb-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-800">{launchSelected.size}</span> of {launchMembers.length} selected{launchSearch && ` · showing ${filteredLaunch.length}`}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setLaunchSelected(new Set(launchMembers.map(m => m.id)))} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors">Select All</button>
                  <button onClick={() => setLaunchSelected(new Set())} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors">Deselect All</button>
                </div>
              </div>
            )}

            <div className="px-5 py-2">
              {launchLoading && <LoadingSkeleton />}
              {!launchLoading && launchMembers.length === 0 && (
                <div className="text-center py-14"><p className="text-4xl mb-3">😕</p><p className="font-semibold text-gray-700">No members found</p></div>
              )}
              {!launchLoading && launchMembers.length > 0 && (
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-2 pr-3 text-left font-semibold">Member</th>
                        <th className="py-2 px-3 text-center font-semibold">Include</th>
                        <th className="py-2 pl-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredLaunch.map(m => {
                        const included = launchSelected.has(m.id)
                        return (
                          <tr key={m.id} className={`transition-colors ${included ? '' : 'opacity-40'}`}>
                            <td className="py-3 pr-3">
                              <p className="font-semibold text-gray-800 truncate max-w-[160px]">{m.name}</p>
                              <p className={`text-xs mt-0.5 truncate max-w-[200px] ${m.email ? 'text-gray-400' : 'text-red-400 italic'}`}>{m.email || 'No email'}</p>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Toggle on={included} disabled={launchSending || launchDone} onClick={() => toggleLaunchSelected(m.id)} />
                            </td>
                            <td className="py-3 pl-3 text-center">
                              <StatusBadge status={m.status} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!launchLoading && launchMembers.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100">
                {launchDone
                  ? <button onClick={() => loadLaunchMembers()} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Reload Members</button>
                  : <button onClick={() => setShowLaunchConfirm(true)} disabled={launchSelected.size === 0 || launchSending}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {launchSending
                        ? <><Spinner /> Sending batch {Math.round(launchProgress / 100 * Math.ceil(launchSelected.size / 50))} of {Math.ceil(launchSelected.size / 50)}…</>
                        : `Send App Launch Mail to ${launchSelected.size} Member${launchSelected.size !== 1 ? 's' : ''}`
                      }
                    </button>
                }
              </div>
            )}
          </div>
        )}

        {/* ── Profile Photo Section ── */}
        {activeSection === 'photo' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">🖼️ Profile Photo Completion Reminders</h3>
              {!photoLoading && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {photoMembers.length} active member{photoMembers.length !== 1 ? 's' : ''} without a profile photo
                </p>
              )}
            </div>

            {!photoLoading && photoMembers.length > 0 && (
              <div className="px-5 pt-4">
                <SearchInput value={photoSearch} onChange={setPhotoSearch} placeholder="Search by name or mobile…" />
              </div>
            )}

            <div className="px-5 py-2">
              {photoLoading && <LoadingSkeleton />}

              {!photoLoading && photoMembers.length === 0 && (
                <div className="text-center py-14">
                  <p className="text-4xl mb-3">🎉</p>
                  <p className="font-semibold text-gray-700">All members have a profile photo!</p>
                  <p className="text-sm text-gray-400 mt-1">No reminders needed at this time.</p>
                </div>
              )}

              {!photoLoading && photoMembers.length > 0 && (
                <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-2 pr-3 text-left font-semibold">Member</th>
                        <th className="py-2 px-3 text-left font-semibold">Mobile</th>
                        <th className="py-2 px-3 text-center font-semibold">Last Reminded</th>
                        <th className="py-2 pl-3 text-center font-semibold">Notify Via</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredPhoto.map(m => {
                        const remindedAt = photoReminders[m.id]
                        const remindedLabel = (() => {
                          if (!remindedAt) return null
                          const days = Math.floor((Date.now() - new Date(remindedAt).getTime()) / 86400000)
                          if (days === 0) return 'Today'
                          if (days === 1) return 'Yesterday'
                          return `${days} days ago`
                        })()

                        const uploadUrl = 'https://progym.co.in/upload-photo'
                        const waMsg = `Hi ${m.name}! 👋 Warm greetings from ProGym!\n\nWe noticed your profile is missing a photo. 📸\n\n🎁 *Upload your photo & earn 10 ProCoins instantly!*\n\n💡 *What are ProCoins?*\n→ 100 Welcome Coins already credited to your account\n→ Earn more by completing your profile & gym activities\n→ Redeem them for discounts in the ProGym Shop 🛍️\n\n📸 Upload your photo here 👇\n${uploadUrl}\n\nSee you at the gym! 💪\n— ProGym Team`
                        const smsMsg = `Hi ${m.name}! Greetings from ProGym. Your profile photo is missing - upload it & earn 10 ProCoins (redeemable in our shop)! 📸 Upload your photo here: ${uploadUrl} - ProGym Team`

                        const mobile10 = m.mobile.replace(/\D/g, '').slice(-10)

                        return (
                          <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 pr-3">
                              <p className="font-semibold text-gray-800 truncate max-w-[140px]">{m.name}</p>
                              {m.email
                                ? <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{m.email}</p>
                                : <p className="text-xs text-red-400 italic mt-0.5">No email</p>
                              }
                            </td>
                            <td className="py-3 px-3 text-gray-600 whitespace-nowrap font-mono text-xs">{m.mobile || '—'}</td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {remindedLabel
                                ? <span className={`text-xs font-semibold ${remindedLabel === 'Today' ? 'text-teal-600' : 'text-amber-500'}`}>{remindedLabel}</span>
                                : <span className="text-xs text-gray-300">Not yet</span>
                              }
                            </td>
                            <td className="py-3 pl-3">
                              <div className="flex items-center justify-center gap-2">
                                {/* WhatsApp */}
                                {mobile10 && (
                                  <a
                                    href={`https://wa.me/91${mobile10}?text=${encodeURIComponent(waMsg)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    onClick={() => markReminded(m.id)}
                                    title="Send via WhatsApp"
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                  </a>
                                )}
                                {/* SMS */}
                                {mobile10 && (
                                  <a
                                    href={`sms:+91${mobile10}?body=${encodeURIComponent(smsMsg)}`}
                                    onClick={() => markReminded(m.id)}
                                    title="Send via SMS"
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                  </a>
                                )}
                                {/* Email */}
                                {m.email && (
                                  emailResults[m.id] === 'sent' ? (
                                    <span title="Email sent!" className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </span>
                                  ) : emailResults[m.id] === 'error' ? (
                                    <button onClick={() => sendPhotoEmail(m.id)} title="Failed — click to retry" className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  ) : emailSending.has(m.id) ? (
                                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-50">
                                      <svg className="w-4 h-4 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                      </svg>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => sendPhotoEmail(m.id)}
                                      title="Send via Email"
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                  )
                                )}
                                {!mobile10 && !m.email && <span className="text-xs text-gray-300">No contact</span>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!photoLoading && photoMembers.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  Tap <span className="font-medium text-green-600">WhatsApp</span>, <span className="font-medium text-blue-600">SMS</span>, or <span className="font-medium text-orange-500">Email</span> to notify — reminder date is recorded automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Batch Logs Section ── */}
        {activeSection === 'logs' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-base">📋 Batch Logs</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 50 email batch jobs</p>
              </div>
              <button onClick={loadBatchLogs} disabled={batchLogsLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                {batchLogsLoading ? <><Spinner /> Refreshing…</> : '↻ Refresh'}
              </button>
            </div>

            <div className="px-5 py-4">
              {batchLogsLoading && <LoadingSkeleton />}

              {!batchLogsLoading && batchLogs.length === 0 && (
                <div className="text-center py-14">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="font-semibold text-gray-700">No batch logs yet</p>
                  <p className="text-sm text-gray-400 mt-1">Logs will appear here after your first bulk send.</p>
                </div>
              )}

              {!batchLogsLoading && batchLogs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="py-2 pr-4 text-left font-semibold">Date &amp; Type</th>
                        <th className="py-2 px-3 text-right font-semibold">Total</th>
                        <th className="py-2 px-3 text-right font-semibold text-green-600">Sent</th>
                        <th className="py-2 px-3 text-right font-semibold text-amber-500">Skipped</th>
                        <th className="py-2 px-3 text-right font-semibold text-red-500">Pending</th>
                        <th className="py-2 px-3 text-center font-semibold">Status</th>
                        <th className="py-2 pl-3 text-center font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {batchLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-gray-800">{batchTypeLabel(log.batch_type)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{log.created_at}</p>
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600 font-medium">{log.total_selected}</td>
                          <td className="py-3 px-3 text-right text-green-600 font-semibold">{log.sent_count}</td>
                          <td className="py-3 px-3 text-right text-amber-500 font-medium">{log.skipped_count}</td>
                          <td className="py-3 px-3 text-right text-red-500 font-bold">{log.pending_count ?? 0}</td>
                          <td className="py-3 px-3 text-center">
                            <BatchStatusBadge status={log.status} />
                          </td>
                          <td className="py-3 pl-3 text-center">
                            {log.status === 'partial' ? (
                              <button
                                onClick={() => retriggerBatch(log.id)}
                                disabled={retriggerLoading === log.id}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors disabled:opacity-40 flex items-center gap-1 mx-auto">
                                {retriggerLoading === log.id ? <><Spinner /> Loading…</> : '⚡ Re-trigger'}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Payment confirm */}
      {showBulkConfirm && (
        <ConfirmDialog
          emoji="📨" title="Send Bulk Reminders?"
          message={<>Payment reminder emails will be sent to <strong className="text-gray-800">{selectedCount} member{selectedCount !== 1 ? 's' : ''}</strong> with pending dues. Members without email will be skipped.</>}
          onCancel={() => setShowBulkConfirm(false)} onConfirm={sendBulkReminders}
        />
      )}

      {/* Package confirm */}
      {showPkgConfirm && (
        <ConfirmDialog
          emoji="📅" title="Send Package Reminders?"
          message={<>Package expiry reminder emails will be sent to <strong className="text-gray-800">{pkgSelectedCount} member{pkgSelectedCount !== 1 ? 's' : ''}</strong> with expired memberships. Members without email will be skipped.</>}
          onCancel={() => setShowPkgConfirm(false)} onConfirm={sendBulkPackageReminders}
        />
      )}

      {/* Launch confirm */}
      {showLaunchConfirm && (
        <ConfirmDialog
          emoji="🚀" title="Send App Launch Emails?"
          message={<>App launch emails will be sent to <strong className="text-gray-800">{launchSelected.size} member{launchSelected.size !== 1 ? 's' : ''}</strong> in <strong className="text-gray-800">{Math.ceil(launchSelected.size / 50)} batch{Math.ceil(launchSelected.size / 50) !== 1 ? 'es' : ''}</strong> of 50. Members without email will be skipped automatically.</>}
          onCancel={() => setShowLaunchConfirm(false)} onConfirm={sendBulkLaunchEmails}
        />
      )}
    </div>
  )
}

function Toggle({ on, disabled, onClick }: { on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed ${on ? 'bg-blue-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function ConfirmDialog({ emoji, title, message, onCancel, onConfirm }: {
  emoji: string; title: string; message: React.ReactNode
  onCancel: () => void; onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <span className="text-4xl block mb-3">{emoji}</span>
          <h4 className="font-bold text-gray-800 text-lg">{title}</h4>
          <p className="text-sm text-gray-500 mt-2">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors">Yes, Send</button>
        </div>
      </div>
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-2">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
