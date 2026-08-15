import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import NotificationBell from '../components/NotificationBell'
import ImageCropModal from '../components/ImageCropModal'

type ClientProfile = {
  id: number
  name: string
  mobile: string
  gender: string
  birthDate: string
  email: string
  address: string
  bloodGroup: string
  occupation: string
  height: number
  weight: number
  photo: string
  profileActiveFlag: string
}

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

export default function MemberProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ birthDate: '', address: '', height: '', weight: '' })

  const loadProfile = () => {
    if (!user?.userId) return
    setLoading(true)
    fetch(`${API_BASE}/client/byId.php?id=${user.userId}`)
      .then(r => r.json())
      .then((d: ClientProfile) => {
        setProfile(d)
        setForm({
          birthDate: d.birthDate || '',
          address: d.address || '',
          height: d.height > 0 ? String(d.height) : '',
          weight: d.weight > 0 ? String(d.weight) : '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadProfile() }, [user?.userId])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected after cancel
    e.target.value = ''
    correctImageOrientation(file).then(dataUrl => {
      setCropSrc(dataUrl)
    })
  }

  const handleCropConfirm = (croppedDataUrl: string) => {
    setCropSrc(null)
    setPhotoPreview(croppedDataUrl)
    setPhotoBase64(croppedDataUrl.split(',')[1])
  }

  const handleCropCancel = () => {
    setCropSrc(null)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setPhotoBase64('')
    setPhotoPreview(null)
    if (profile) {
      setForm({
        birthDate: profile.birthDate || '',
        address: profile.address || '',
        height: profile.height > 0 ? String(profile.height) : '',
        weight: profile.weight > 0 ? String(profile.weight) : '',
      })
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`${API_BASE}/client/updateProfileWeb.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          name: profile.name,
          birthDate: form.birthDate,
          address: form.address,
          height: parseFloat(form.height) || 0,
          weight: parseFloat(form.weight) || 0,
          photo: photoBase64,
        }),
      })
      const data = await res.json()
      setSaveMsg('Profile updated!')
      setEditMode(false)
      setPhotoBase64('')
      setPhotoPreview(null)
      if (data.photo) setProfile(p => p ? { ...p, ...form, height: parseFloat(form.height) || 0, weight: parseFloat(form.weight) || 0, photo: data.photo } : p)
      else loadProfile()
    } catch {
      setSaveMsg('Failed to save. Please try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  const displayPhoto = photoPreview || profile?.photo || null

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    )}
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/member-dashboard')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-bold text-gray-800 text-lg">My Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="px-3.5 py-1.5 text-sm font-medium text-orange-500 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-3.5 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-sm disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-10">
        {loading ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-36 h-36 rounded-2xl bg-gray-200 animate-pulse" />
              <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : !profile ? (
          <p className="text-center py-12 text-gray-500">Unable to load profile.</p>
        ) : (
          <>
            {/* Photo + identity */}
            <div className="flex flex-col items-center py-5 mb-2">
              <div className="relative mb-3">
                <div className="w-36 h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-5xl font-bold text-white shadow-md">
                  {displayPhoto
                    ? <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : profile.name.charAt(0).toUpperCase()
                  }
                </div>
                {editMode && (
                  <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
              <h2 className="font-bold text-gray-800 text-xl">{profile.name}</h2>
              <p className="text-sm text-gray-400 mt-0.5">+91 {profile.mobile} · Member #{profile.id}</p>
              <span className={`mt-2 text-xs px-3 py-0.5 rounded-full font-medium border ${profile.profileActiveFlag === 'enable' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                {profile.profileActiveFlag === 'enable' ? '● Active Member' : '● Inactive'}
              </span>
            </div>

            {saveMsg && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center ${saveMsg.includes('success') || saveMsg === 'Profile updated!' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {saveMsg}
              </div>
            )}

            {/* Read-only info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
              <div className="px-5 py-3 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Personal Info</span>
              </div>
              <Row label="Gender" value={profile.gender || '—'} />
              <Row label="Blood Group" value={profile.bloodGroup || '—'} />
              <Row label="Occupation" value={profile.occupation || '—'} />
            </div>

            {/* Editable section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fitness Details</span>
                {!editMode && <span className="text-xs text-orange-400">Tap Edit to update</span>}
              </div>
              {editMode ? (
                <div className="p-5 space-y-4">
                  <Field label="Date of Birth" type="text" value={form.birthDate} placeholder="dd/mm/yyyy" onChange={v => setForm(f => ({ ...f, birthDate: v }))} />
                  <Field label="Address" type="text" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Height (cm)" type="number" value={form.height} onChange={v => setForm(f => ({ ...f, height: v }))} />
                    <Field label="Weight (kg)" type="number" value={form.weight} onChange={v => setForm(f => ({ ...f, weight: v }))} />
                  </div>
                </div>
              ) : (
                <>
                  <Row label="Email" value={profile.email || '—'} />
                  <Row label="Date of Birth" value={profile.birthDate || '—'} />
                  <Row label="Address" value={profile.address || '—'} />
                  <Row label="Height" value={profile.height ? `${profile.height} cm` : '—'} />
                  <Row label="Weight" value={profile.weight ? `${profile.weight} kg` : '—'} />
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}

function Field({ label, type, value, placeholder, onChange }: {
  label: string; type: string; value: string; placeholder?: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-400 outline-none transition-colors"
      />
    </div>
  )
}
