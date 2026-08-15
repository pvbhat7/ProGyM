import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

type AdminUser = {
  id: number
  name: string
  username: string
  mobile: string
  password: string
  authorizedToApprovePayment: string
}

type FormData = {
  name: string
  username: string
  mobile: string
  password: string
  authorizedToApprovePayment: 'YES' | 'NO'
}

const emptyForm: FormData = { name: '', username: '', mobile: '', password: '', authorizedToApprovePayment: 'NO' }

export default function RolesPage() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchAdmins = () => {
    setLoading(true)
    fetch(`${API_BASE}/adminuser/getAll.php`)
      .then(r => r.json())
      .then(setAdmins)
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAdmins() }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (a: AdminUser) => {
    setEditTarget(a)
    setForm({ name: a.name, username: a.username, mobile: a.mobile, password: a.password, authorizedToApprovePayment: a.authorizedToApprovePayment === 'YES' ? 'YES' : 'NO' })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setFormError('')
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.username.trim()) { setFormError('Username is required'); return }
    if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile.trim())) { setFormError('Enter a valid 10-digit mobile number'); return }
    if (!editTarget && !form.password.trim()) { setFormError('Password is required'); return }

    setSaving(true)
    try {
      const url = editTarget
        ? `${API_BASE}/adminuser/update.php`
        : `${API_BASE}/adminuser/create.php`
      const body = editTarget
        ? { ...form, id: editTarget.id }
        : form

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      let data: { message?: string } = {}
      try { data = await res.json() } catch { /* non-JSON response */ }
      if (!res.ok) { setFormError(data.message || `Server error ${res.status}`); return }
      setShowModal(false)
      fetchAdmins()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`${API_BASE}/adminuser/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      setDeleteTarget(null)
      fetchAdmins()
    } catch { /* ignore */ }
    finally { setDeleting(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">Role Management</h1>
              <p className="text-xs text-gray-400">Manage admin users & permissions</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Admin
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Info card */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5 flex gap-3 items-start">
          <span className="text-blue-500 mt-0.5 flex-shrink-0">ℹ️</span>
          <p className="text-xs text-blue-700 leading-relaxed">
            Admin users log in with their registered mobile number. Gym members log in with their client mobile — they automatically get the member dashboard. Add a mobile here to grant admin access.
          </p>
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-lg mb-2">🛡️</div>
            <p className="font-semibold text-gray-800 text-sm">Admin</p>
            <p className="text-xs text-gray-400 mt-0.5">Full dashboard, members, reports, settings</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center text-lg mb-2">🏃</div>
            <p className="font-semibold text-gray-800 text-sm">Member</p>
            <p className="text-xs text-gray-400 mt-0.5">Personal workout, diet, attendance & profile</p>
          </div>
        </div>

        {/* Admin list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">Admin Users</span>
            <span className="text-xs text-gray-400">{admins.length} total</span>
          </div>

          {loading && (
            <div className="divide-y divide-gray-50">
              {[1,2,3].map(i => (
                <div key={i} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && admins.length === 0 && (
            <div className="px-5 py-12 text-center">
              <span className="text-4xl block mb-3">👤</span>
              <p className="text-gray-500 text-sm font-medium">No admin users yet</p>
              <p className="text-gray-400 text-xs mt-1">Add the first admin to get started</p>
            </div>
          )}

          {!loading && admins.length > 0 && (
            <ul className="divide-y divide-gray-50">
              {admins.map(a => (
                <li key={a.id} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800 text-sm">{a.name}</p>
                      {a.authorizedToApprovePayment === 'YES' && (
                        <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium border border-green-100">
                          💳 Can Approve Payments
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">@{a.username} · 📱 +91 {a.mobile}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Add / Edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editTarget ? 'Edit Admin User' : 'Add Admin User'}</h3>
              <button onClick={() => !saving && setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-400 outline-none"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. rahul123"
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-400 outline-none"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Mobile Number (login ID)</label>
                <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-orange-400">
                  <span className="pl-3.5 text-gray-400 text-sm select-none">+91</span>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={e => setForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    className="flex-1 px-2 py-2.5 text-sm text-gray-800 bg-transparent outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Set a password"
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-400 outline-none"
                />
              </div>

              {/* Can approve payments */}
              <div
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 cursor-pointer select-none"
                onClick={() => setForm(f => ({ ...f, authorizedToApprovePayment: f.authorizedToApprovePayment === 'YES' ? 'NO' : 'YES' }))}
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">Can Approve Payments</p>
                  <p className="text-xs text-gray-400 mt-0.5">Allow this admin to approve payment transactions</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${form.authorizedToApprovePayment === 'YES' ? 'bg-orange-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.authorizedToApprovePayment === 'YES' ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => !saving && setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-60"
              >
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🗑️</div>
            <h3 className="font-semibold text-gray-800 text-center mb-1">Remove Admin Access?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              <span className="font-medium text-gray-700">{deleteTarget.name}</span> (+91 {deleteTarget.mobile}) will no longer have admin access.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => !deleting && setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-60"
              >
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
