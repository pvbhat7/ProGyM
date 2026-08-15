import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

interface Client {
  id: string | number
  name: string
  mobile: string
  gender: string
  profileActiveFlag: string
  isGymClient: string
  discontinue: string
  reference: string | number
  referPoints: string
  admissionDate?: string
}

type FilterType = 'all' | 'referrers' | 'referred'

const sid = (v: string | number | undefined | null) => String(v ?? '').trim()
const hasRef = (c: Client) => { const r = sid(c.reference); return r !== '' && r !== '0' }

export default function AdminReferralsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [modal, setModal] = useState<{ memberName: string; referred: Client[] } | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/client/allForReferrals.php`)
      .then(r => r.json())
      .then((data: unknown) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  const { clientMap, referralsByMember } = useMemo(() => {
    const clientMap = new Map<string, Client>()
    const referralsByMember = new Map<string, Client[]>()
    clients.forEach(c => {
      const id = sid(c.id)
      clientMap.set(id, c)
      if (!referralsByMember.has(id)) referralsByMember.set(id, [])
    })
    clients.forEach(c => {
      if (hasRef(c)) {
        const refId = sid(c.reference)
        const list = referralsByMember.get(refId) ?? []
        list.push(c)
        referralsByMember.set(refId, list)
      }
    })
    return { clientMap, referralsByMember }
  }, [clients])

  const stats = useMemo(() => {
    const all = clients.filter(c => c.discontinue !== 'true')
    const totalReferrers = all.filter(c => (referralsByMember.get(sid(c.id))?.length ?? 0) > 0).length
    const totalReferred = all.filter(c => hasRef(c) && clientMap.has(sid(c.reference))).length
    const convertedToGym = all.filter(c => hasRef(c) && clientMap.has(sid(c.reference)) && c.isGymClient === 'yes').length
    const rate = totalReferred > 0 ? Math.round((convertedToGym / totalReferred) * 100) : 0
    return { totalReferrers, totalReferred, convertedToGym, rate }
  }, [clients, clientMap, referralsByMember])

  const rows = useMemo(() => {
    let list = clients.filter(c => c.discontinue !== 'true')
    if (filter === 'referrers') list = list.filter(c => (referralsByMember.get(sid(c.id))?.length ?? 0) > 0)
    if (filter === 'referred') list = list.filter(c => hasRef(c) && clientMap.has(sid(c.reference)))
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.mobile?.includes(q))
    }
    if (filter === 'referred') {
      return list.sort((a, b) => {
        const ra = clientMap.get(sid(a.reference))?.name ?? ''
        const rb = clientMap.get(sid(b.reference))?.name ?? ''
        return ra.localeCompare(rb) || a.name.localeCompare(b.name)
      })
    }
    return list.sort((a, b) => (referralsByMember.get(sid(b.id))?.length ?? 0) - (referralsByMember.get(sid(a.id))?.length ?? 0))
  }, [clients, filter, search, clientMap, referralsByMember])

  const filterOptions: { val: FilterType; label: string }[] = [
    { val: 'all',       label: 'All Members' },
    { val: 'referrers', label: 'Has Referred' },
    { val: 'referred',  label: 'Was Referred' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">Referrals</h1>
            <p className="text-xs text-gray-400">Member referral network</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? (
            [1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
                <div className="h-6 w-10 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            ))
          ) : (
            <>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xl font-bold text-blue-600">{stats.totalReferrers}</p>
                <p className="text-xs text-gray-500 mt-0.5">Active Referrers</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xl font-bold text-orange-500">{stats.totalReferred}</p>
                <p className="text-xs text-gray-500 mt-0.5">Referred Joiners</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xl font-bold text-green-600">{stats.convertedToGym}</p>
                <p className="text-xs text-gray-500 mt-0.5">Converted to Gym</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xl font-bold text-purple-600">{stats.rate}%</p>
                <p className="text-xs text-gray-500 mt-0.5">Conversion Rate</p>
              </div>
            </>
          )}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or mobile…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="flex gap-1.5">
            {filterOptions.map(opt => (
              <button
                key={opt.val}
                onClick={() => setFilter(opt.val)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filter === opt.val ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Referred By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Referred</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">People Referred</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-3 w-4 bg-gray-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-100 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-8 bg-gray-100 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-36 bg-gray-100 rounded" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-gray-400 text-sm">
                      No members found
                    </td>
                  </tr>
                ) : (
                  rows.map((client, idx) => {
                    const clientId = sid(client.id)
                    const referred = referralsByMember.get(clientId) ?? []
                    const referredCount = referred.length
                    const referrer = hasRef(client) ? clientMap.get(sid(client.reference)) : null
                    const isActive = client.profileActiveFlag === 'enable'
                    const isGym = client.isGymClient === 'yes'

                    return (
                        <tr
                          key={clientId}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* # */}
                          <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>

                          {/* Member */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`/members/${clientId}`)}
                              className="font-semibold text-gray-800 hover:text-orange-600 transition-colors text-left"
                            >
                              {client.name}
                            </button>
                            {client.admissionDate && (
                              <p className="text-xs text-gray-400 mt-0.5">{client.admissionDate}</p>
                            )}
                          </td>

                          {/* Mobile */}
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            +91 {client.mobile}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold w-fit ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold w-fit ${isGym ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                                {isGym ? 'Gym' : 'App Only'}
                              </span>
                            </div>
                          </td>

                          {/* Referred By */}
                          <td className="px-4 py-3">
                            {referrer ? (
                              <button
                                onClick={() => navigate(`/members/${sid(referrer.id)}`)}
                                className="text-xs text-purple-700 font-semibold hover:underline"
                              >
                                {referrer.name}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>

                          {/* Referred count */}
                          <td className="px-4 py-3">
                            {referredCount > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                                {referredCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">0</span>
                            )}
                          </td>

                          {/* People referred — modal trigger */}
                          <td className="px-4 py-3">
                            {referredCount === 0 ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : (
                              <button
                                onClick={() => setModal({ memberName: client.name, referred })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View {referredCount}
                              </button>
                            )}
                          </td>
                        </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!loading && rows.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">{rows.length} member{rows.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

      </main>

      {/* Referred People Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-base">People Referred</h3>
                <p className="text-xs text-gray-400 mt-0.5">by {modal.memberName} · {modal.referred.length} member{modal.referred.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {modal.referred.map((r, i) => {
                const rActive = r.profileActiveFlag === 'enable' && r.discontinue !== 'true'
                const rGym = r.isGymClient === 'yes'
                return (
                  <div key={sid(r.id)} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-gray-300 font-medium w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <button
                          onClick={() => { setModal(null); navigate(`/members/${sid(r.id)}`) }}
                          className="font-semibold text-gray-800 hover:text-orange-600 transition-colors text-sm text-left truncate block max-w-[180px]"
                        >
                          {r.name}
                        </button>
                        <p className="text-xs text-gray-400">+91 {r.mobile}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {rActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rGym ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                        {rGym ? 'Gym' : 'App'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
