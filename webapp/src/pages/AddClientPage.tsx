import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_BASE } from '../api/config'
import SecurityPinDialog from '../components/SecurityPinDialog'

// Set by DeviceAccessGate when the device is admin-approved. If absent,
// treat this as a public/QR self-registration flow (no admin session).
const DEVICE_CACHE_KEY = 'progym_device_approved'
function isDeviceApproved(): boolean {
  try { return sessionStorage.getItem(DEVICE_CACHE_KEY) === '1' } catch { return false }
}

// ── EXIF / orientation correction (reused from MemberProfilePage) ─────────────

function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) return 1
  let offset = 2
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false)
    const segLen = view.getUint16(offset + 2, false)
    if (marker === 0xFFE1 && view.byteLength > offset + 10) {
      if (view.getUint32(offset + 4, false) === 0x45786966) {
        const tiffBase = offset + 10
        const little = view.getUint16(tiffBase, false) === 0x4949
        const ifdOffset = view.getUint32(tiffBase + 4, little)
        const numTags = view.getUint16(tiffBase + ifdOffset, little)
        for (let i = 0; i < numTags; i++) {
          const tagOffset = tiffBase + ifdOffset + 2 + i * 12
          if (view.getUint16(tagOffset, little) === 0x0112) {
            return view.getUint16(tagOffset + 8, little)
          }
        }
      }
    }
    if ((marker & 0xFF00) !== 0xFF00) break
    offset += 2 + segLen
  }
  return 1
}

function correctImageOrientation(file: File): Promise<string> {
  return new Promise(resolve => {
    const arrReader = new FileReader()
    arrReader.onload = ae => {
      const orientation = readExifOrientation(ae.target!.result as ArrayBuffer)
      const urlReader = new FileReader()
      urlReader.onload = ue => {
        const dataUrl = ue.target!.result as string
        const img = new Image()
        img.onload = () => {
          const swap = orientation >= 5 && orientation <= 8
          const canvas = document.createElement('canvas')
          canvas.width = swap ? img.height : img.width
          canvas.height = swap ? img.width : img.height
          const ctx = canvas.getContext('2d')!
          switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, img.width, 0); break
            case 3: ctx.transform(-1, 0, 0, -1, img.width, img.height); break
            case 4: ctx.transform(1, 0, 0, -1, 0, img.height); break
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
            case 6: ctx.transform(0, 1, -1, 0, img.height, 0); break
            case 7: ctx.transform(0, -1, -1, 0, img.height, img.width); break
            case 8: ctx.transform(0, -1, 1, 0, 0, img.width); break
          }
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.src = dataUrl
      }
      urlReader.readAsDataURL(file)
    }
    arrReader.readAsArrayBuffer(file)
  })
}

// ── Date helpers (DB format dd/mm/yyyy ↔ input format yyyy-mm-dd) ─────────────

function toInputDate(dmy: string): string {
  const p = dmy.split('/')
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ''
}

function fromInputDate(ymd: string): string {
  const p = ymd.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = [
  { value: 'A_plus',  label: 'A+' },
  { value: 'A_minus', label: 'A−' },
  { value: 'B_plus',  label: 'B+' },
  { value: 'B_minus', label: 'B−' },
  { value: 'AB_plus', label: 'AB+' },
  { value: 'AB_minus',label: 'AB−' },
  { value: 'O_plus',  label: 'O+' },
  { value: 'O_minus', label: 'O−' },
]

interface FormState {
  name: string
  mobile: string
  gender: string
  email: string
  bloodGroup: string
  birthDate: string
  address: string
}

interface MemberOption {
  id: string
  name: string
}

interface Errors {
  name?: string
  mobile?: string
  gender?: string
  birthDate?: string
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, type = 'text', error, autoComplete,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; error?: boolean; autoComplete?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={e => onChange(e.target.value)}
      className={`w-full rounded-xl px-4 py-3 text-sm text-gray-800 border-2 outline-none transition-all placeholder:text-gray-300
        ${error
          ? 'border-red-300 bg-red-50 focus:border-red-400'
          : 'border-gray-200 bg-white focus:border-orange-400 focus:bg-orange-50/30'
        }`}
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AddClientPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const referenceDropdownRef = useRef<HTMLDivElement>(null)

  // Device-approved (admin) devices go through the PIN gate and land back on
  // /members after a save. Unapproved devices — QR self-registration from a
  // new prospect's phone — skip the PIN gate and see a success modal with a
  // "Continue to Login" button (they can't reach /admin-panel anyway).
  const deviceApproved = isDeviceApproved()

  // ── Security PIN gate ───────────────────────────────────────────────────
  // The /members/new route is reachable by direct URL. Without this, anyone
  // who knows the URL can skip the PIN prompt shown on the Admin Panel.
  //
  // The PIN pass is delivered via React Router navigation state (one-time —
  // clears on refresh, forcing re-entry) instead of sessionStorage. This
  // prevents the "PIN required on first open but skipped after refresh" bug.
  const location = useLocation()
  const pinFromNav = (location.state as { pinJustPassed?: boolean } | null)?.pinJustPassed === true
  const [pinPassed, setPinPassed] = useState<boolean>(() => !deviceApproved || pinFromNav)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Consume the navigation-state PIN pass immediately so a refresh (which
  // preserves history state in some browsers) can't reuse it. After first
  // read we replace the state with an empty object.
  useEffect(() => {
    if (pinFromNav) {
      window.history.replaceState({}, '')
    }
  }, [pinFromNav])

  const [form, setForm] = useState<FormState>({
    name: '', mobile: '', gender: '', email: '',
    bloodGroup: '', birthDate: '', address: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  const [allMembers, setAllMembers] = useState<MemberOption[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)
  const [refSearch, setRefSearch] = useState('')
  const [refDropdownOpen, setRefDropdownOpen] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/client/allForReferral.php`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setAllMembers(data.map((m: MemberOption) => ({ id: String(m.id), name: m.name }))) : setAllMembers([]))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (referenceDropdownRef.current && !referenceDropdownRef.current.contains(e.target as Node)) {
        setRefDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredMembers = allMembers
    .filter(m => m.name.toLowerCase().includes(refSearch.toLowerCase()))
    .slice(0, 20)

  const handleRefSearchInput = (value: string) => {
    setRefSearch(value)
    if (selectedMember && value !== selectedMember.name) setSelectedMember(null)
    setRefDropdownOpen(true)
  }

  const selectMember = (m: MemberOption) => {
    setSelectedMember(m)
    setRefSearch(m.name)
    setRefDropdownOpen(false)
  }

  const clearReference = () => {
    setSelectedMember(null)
    setRefSearch('')
  }

  const set = (key: keyof FormState) => (val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key as keyof Errors]) setErrors(e => ({ ...e, [key]: undefined }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    correctImageOrientation(file).then(dataUrl => {
      setPhotoPreview(dataUrl)
      setPhotoBase64(dataUrl.split(',')[1])
    })
  }

  const validate = (): boolean => {
    const e: Errors = {}
    if (!form.name.trim())   e.name   = 'Full name is required'
    if (!form.mobile.trim()) e.mobile = 'Mobile number is required'
    else if (!/^\d{10}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid 10-digit mobile number'
    if (!form.gender)        e.gender = 'Please select a gender'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    setApiError('')
    try {
      const res = await fetch(`${API_BASE}/client/createClientWeb.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       form.name.trim(),
          mobile:     form.mobile.trim(),
          gender:     form.gender,
          email:      form.email.trim(),
          birthDate:  form.birthDate.trim(),
          address:    form.address.trim(),
          bloodGroup: form.bloodGroup,
          reference:  selectedMember ? selectedMember.id : '',
          photo:      photoBase64,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setApiError(data.message || 'Failed to create client'); return }
      setShowSuccessModal(true)
    } catch {
      setApiError('Network error. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  const initials = form.name.trim()
    ? form.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : null

  // Block render until the security PIN has been validated in this session.
  if (!pinPassed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <SecurityPinDialog
          onSuccess={() => setPinPassed(true)}
          onCancel={() => navigate('/admin-panel', { replace: true })}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 text-base">Add New Member</h1>
            <p className="text-xs text-gray-400">Fill in the details below</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-60 transition-all active:scale-95"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-16 space-y-4">

        {/* ── API error banner ── */}
        {apiError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{apiError}</p>
          </div>
        )}

        {/* ── Photo upload ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center shadow-md ring-4 ring-orange-100 group-hover:ring-orange-200 transition-all">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : initials ? (
                  <span className="text-3xl font-bold text-white">{initials}</span>
                ) : (
                  <svg className="w-10 h-10 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-md border-2 border-white group-hover:bg-orange-600 transition-colors">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {photoPreview ? 'Photo selected' : 'Add profile photo'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Tap to upload from your device</p>
            </div>
            {photoPreview && (
              <button
                onClick={() => { setPhotoPreview(null); setPhotoBase64('') }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* ── Required fields ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-orange-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Required Info</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <Field label="Full Name" required error={errors.name}>
                <TextInput
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Prashant Bhat"
                  autoComplete="name"
                  error={!!errors.name}
                />
              </Field>

              <Field label="Mobile Number" required error={errors.mobile}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none select-none">+91</span>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={e => set('mobile')(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    autoComplete="tel"
                    className={`w-full rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 border-2 outline-none transition-all placeholder:text-gray-300
                      ${errors.mobile
                        ? 'border-red-300 bg-red-50 focus:border-red-400'
                        : 'border-gray-200 bg-white focus:border-orange-400 focus:bg-orange-50/30'
                      }`}
                  />
                </div>
                {errors.mobile && <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.mobile}
                </p>}
              </Field>

              <div className="sm:col-span-2">
                <Field label="Gender" required error={errors.gender}>
                  <div className="grid grid-cols-2 gap-3">
                    {(['male', 'female'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { set('gender')(g); setErrors(e => ({ ...e, gender: undefined })) }}
                        className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all
                          ${form.gender === g
                            ? g === 'male'
                              ? 'border-blue-400 bg-blue-50 text-blue-600'
                              : 'border-pink-400 bg-pink-50 text-pink-600'
                            : errors.gender
                              ? 'border-red-200 bg-red-50/50 text-gray-500 hover:border-gray-300'
                              : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'
                          }`}
                      >
                        <span className="text-lg">{g === 'male' ? '♂' : '♀'}</span>
                        <span className="capitalize">{g}</span>
                      </button>
                    ))}
                  </div>
                  {errors.gender && <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.gender}
                  </p>}
                </Field>
              </div>

            </div>
          </div>
        </div>

        {/* ── Optional fields ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-gray-300" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Personal Details</span>
            <span className="ml-auto text-xs text-gray-300">Optional</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <Field label="Email Address">
                <TextInput
                  value={form.email}
                  onChange={set('email')}
                  placeholder="member@example.com"
                  type="email"
                  autoComplete="email"
                />
              </Field>

              <Field label="Date of Birth" error={errors.birthDate}>
                <input
                  type="date"
                  value={toInputDate(form.birthDate)}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => set('birthDate')(fromInputDate(e.target.value))}
                  className={`w-full rounded-xl px-4 py-3 text-sm text-gray-800 border-2 outline-none transition-all
                    ${errors.birthDate
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 bg-white focus:border-orange-400 focus:bg-orange-50/30'
                    }`}
                />
              </Field>

              <Field label="Referred By">
                <div className="relative" ref={referenceDropdownRef}>
                  <div className={`flex items-center w-full rounded-xl border-2 bg-white transition-all ${refDropdownOpen ? 'border-orange-400 bg-orange-50/30' : 'border-gray-200'}`}>
                    <input
                      type="text"
                      value={refSearch}
                      onChange={e => handleRefSearchInput(e.target.value)}
                      onFocus={() => setRefDropdownOpen(true)}
                      placeholder="Search by name or mobile…"
                      className="flex-1 px-4 py-3 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-300 min-w-0"
                    />
                    {selectedMember ? (
                      <button
                        type="button"
                        onClick={clearReference}
                        className="flex-shrink-0 mr-3 text-gray-400 hover:text-red-500 transition-colors"
                        title="Clear"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>
                  {refDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                      {filteredMembers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">No members found</div>
                      ) : (
                        filteredMembers.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); selectMember(m) }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 ${selectedMember?.id === m.id ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700'}`}
                          >
                            {m.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedMember && (
                  <p className="mt-1.5 text-xs text-orange-500 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Referred by {selectedMember.name}
                  </p>
                )}
              </Field>

              <Field label="Address">
                <textarea
                  value={form.address}
                  onChange={e => set('address')(e.target.value)}
                  placeholder="Street, area, city…"
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm text-gray-800 border-2 border-gray-200 bg-white outline-none resize-none transition-all placeholder:text-gray-300 focus:border-orange-400 focus:bg-orange-50/30"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Blood Group">
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map(bg => (
                      <button
                        key={bg.value}
                        type="button"
                        onClick={() => set('bloodGroup')(form.bloodGroup === bg.value ? '' : bg.value)}
                        className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all
                          ${form.bloodGroup === bg.value
                            ? 'border-red-400 bg-red-50 text-red-600 shadow-sm'
                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'
                          }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

            </div>
          </div>
        </div>

        {/* ── Bottom save button ── */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-orange-200 disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Creating Member…
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Register Member
            </>
          )}
        </button>

      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.25s_ease-out]">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-[popIn_0.45s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500" />
            <div className="relative pt-8 pb-7 px-7 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mb-5 ring-4 ring-white/50">
                <svg className="w-11 h-11 text-green-500 animate-[checkPop_0.6s_cubic-bezier(0.34,1.56,0.64,1)_0.15s_both]" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="24" fill="none" stroke="#22c55e" strokeWidth="3"
                    strokeDasharray="153"
                    className="animate-[drawCircle_0.5s_ease-out_forwards]" />
                  <path fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
                    d="M14 27 l8 8 l16 -18"
                    strokeDasharray="48" strokeDashoffset="48"
                    className="animate-[drawCheck_0.35s_ease-out_0.45s_forwards]" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {deviceApproved ? 'Member Added!' : 'Account Created!'}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                {deviceApproved ? (
                  <>
                    <span className="font-semibold text-gray-700">{form.name.trim()}</span> has been registered as a new member successfully.
                  </>
                ) : (
                  <>
                    Welcome to <span className="font-semibold text-gray-700">ProGym</span>, {form.name.trim().split(' ')[0]}!<br />
                    Your member account has been created successfully.
                  </>
                )}
              </p>

              <button
                onClick={() => {
                  if (deviceApproved) {
                    navigate('/admin-panel', { replace: true })
                  } else {
                    navigate('/login', { replace: true })
                  }
                }}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {deviceApproved ? 'Back to Admin Panel' : 'Continue to Login'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes popIn {
              0%   { opacity: 0; transform: scale(0.85) translateY(20px) }
              100% { opacity: 1; transform: scale(1) translateY(0) }
            }
            @keyframes drawCircle {
              from { stroke-dashoffset: 153 }
              to   { stroke-dashoffset: 0 }
            }
            @keyframes drawCheck {
              from { stroke-dashoffset: 48 }
              to   { stroke-dashoffset: 0 }
            }
            @keyframes checkPop {
              0%   { transform: scale(0) }
              70%  { transform: scale(1.15) }
              100% { transform: scale(1) }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
