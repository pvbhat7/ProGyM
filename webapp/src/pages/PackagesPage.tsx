import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

interface Package {
  id: string
  days: string
  fees: string
  gender: string
  description: string
}

interface FormData {
  description: string
  days: string
  fees: string
  gender: string
}

const EMPTY_FORM: FormData = { description: '', days: '', fees: '', gender: 'any' }

type GenderFilter = 'all' | 'male' | 'female' | 'any'

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

function genderBadge(g: string) {
  const lower = g?.toLowerCase()
  if (lower === 'male') return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Male</span>
  if (lower === 'female') return <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 font-medium">Female</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Any</span>
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}

export default function PackagesPage() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editPkg, setEditPkg] = useState<Package | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null)
  const [deleting, setDeleting] = useState(false)

  function loadPackages() {
    setLoading(true)
    fetch(`${API_BASE}/package/all.php`)
      .then(r => r.json())
      .then(d => { setPackages(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { loadPackages() }, [])

  const filtered = useMemo(() => {
    if (genderFilter === 'all') return packages
    if (genderFilter === 'any') return packages.filter(p => !p.gender || p.gender.toLowerCase() === 'any')
    return packages.filter(p => p.gender?.toLowerCase() === genderFilter)
  }, [packages, genderFilter])

  function openAdd() {
    setEditPkg(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setShowModal(true)
  }

  function openEdit(pkg: Package) {
    setEditPkg(pkg)
    setForm({ description: pkg.description, days: pkg.days, fees: pkg.fees, gender: pkg.gender?.toLowerCase() || 'any' })
    setSaveError('')
    setShowModal(true)
  }

  function closeModal() {
    if (saving) return
    setShowModal(false)
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim() || !form.days || !form.fees) {
      setSaveError('All fields are required.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const body = {
        ...(editPkg ? { id: editPkg.id } : {}),
        description: form.description.trim(),
        days: Number(form.days),
        fees: Number(form.fees),
        gender: form.gender,
      }
      const url = editPkg ? `${API_BASE}/package/update.php` : `${API_BASE}/package/create.php`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setShowModal(false)
      loadPackages()
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`${API_BASE}/package/delete.php?id=${deleteTarget.id}`)
      setDeleteTarget(null)
      loadPackages()
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Packages</h1>
            {!loading && <p className="text-xs text-gray-400">{filtered.length} of {packages.length} plans</p>}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </header>

      {/* Gender filter */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
            <FilterChip active={genderFilter === 'all'} onClick={() => setGenderFilter('all')}>All</FilterChip>
            <FilterChip active={genderFilter === 'male'} onClick={() => setGenderFilter('male')}>Male</FilterChip>
            <FilterChip active={genderFilter === 'female'} onClick={() => setGenderFilter('female')}>Female</FilterChip>
            <FilterChip active={genderFilter === 'any'} onClick={() => setGenderFilter('any')}>Any</FilterChip>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-4 pb-8">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-5 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">😕</p>
            <p className="font-semibold text-gray-600">Could not load packages</p>
            <p className="text-sm mt-1">Upload all.php and try again</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-semibold text-gray-600">No packages found</p>
            <p className="text-sm mt-1">Add a package using the button above</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(pkg => {
              const fees = parseFloat(pkg.fees)
              const days = parseInt(pkg.days)
              const months = days >= 30 ? Math.round(days / 30) : null
              return (
                <div key={pkg.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{pkg.description}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {genderBadge(pkg.gender)}
                          <span className="text-xs text-gray-500">
                            {days}d{months ? ` · ${months} month${months > 1 ? 's' : ''}` : ''}
                          </span>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-orange-500 whitespace-nowrap">{inr(fees)}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 flex">
                    <button
                      onClick={() => openEdit(pkg)}
                      className="flex-1 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={() => setDeleteTarget(pkg)}
                      className="flex-1 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-base">{editPkg ? 'Edit Package' : 'Add Package'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Package Name</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="e.g. Monthly Basic"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Duration (days)</label>
                  <input
                    name="days"
                    type="number"
                    min="1"
                    value={form.days}
                    onChange={handleFormChange}
                    placeholder="30"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Fees (₹)</label>
                  <input
                    name="fees"
                    type="number"
                    min="0"
                    value={form.fees}
                    onChange={handleFormChange}
                    placeholder="1500"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="any">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {saveError && <p className="text-xs text-red-500">{saveError}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60 mt-1"
              >
                {saving ? 'Saving…' : editPkg ? 'Save Changes' : 'Add Package'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm">
            <p className="font-bold text-gray-800 text-base mb-1">Delete package?</p>
            <p className="text-sm text-gray-500 mb-4">
              "{deleteTarget.description}" will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
