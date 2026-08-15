import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api/config'
import ImageCropModal from '../components/ImageCropModal'

type ClientProfile = {
  id: number
  name: string
  email: string
  birthDate: string
  address: string
  height: number
  weight: number
  photo: string
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

export default function UploadProfilePhotoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    fetch(`${API_BASE}/client/byId.php?id=${user.userId}`)
      .then(r => r.json())
      .then((d: ClientProfile) => setProfile(d))
      .catch(() => {})
  }, [user?.userId])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    correctImageOrientation(file).then(dataUrl => setCropSrc(dataUrl))
  }

  const handleCropConfirm = (croppedDataUrl: string) => {
    setCropSrc(null)
    setPreview(croppedDataUrl)
    setPhotoBase64(croppedDataUrl.split(',')[1])
  }

  const handleUpload = async () => {
    if (!profile || !photoBase64) return
    setUploading(true)
    try {
      await fetch(`${API_BASE}/client/updateProfileWeb.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          name: user?.userName || '',
          email: profile.email || '',
          birthDate: profile.birthDate || '',
          address: profile.address || '',
          height: profile.height || 0,
          weight: profile.weight || 0,
          photo: photoBase64,
        }),
      })
      showToast('Profile photo updated!', 'success')
      setTimeout(() => navigate('/member-dashboard', { replace: true }), 1800)
    } catch {
      showToast('Upload failed. Please try again.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const displayPhoto = preview || profile?.photo || null
  const initial = (user?.userName || '?').charAt(0).toUpperCase()

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all
          ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-amber-300/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 w-[450px] h-[450px] bg-red-300/15 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <div className="w-full max-w-sm relative z-10">

          {/* Brand */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-orange-400/20 rounded-2xl blur-2xl scale-125" />
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                <img
                  src="https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg"
                  alt="ProGym"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Pro<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Gym</span>
            </h1>
            <p className="text-gray-400 mt-1.5 text-sm tracking-wide">Upload your profile photo</p>
          </div>

          {/* Card */}
          <div className="relative bg-white border border-gray-200 rounded-3xl shadow-xl p-8 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-100 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">

              {/* Avatar */}
              <button
                onClick={() => fileRef.current?.click()}
                className="relative mb-5 group"
                aria-label="Choose photo"
              >
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-4xl font-bold text-white shadow-lg border-4 border-white ring-2 ring-orange-200 transition-transform group-active:scale-95">
                  {displayPhoto
                    ? <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : initial
                  }
                </div>
                <div className="absolute bottom-0 right-0 w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>

              <p className="font-bold text-gray-800 text-lg mb-0.5">{user?.userName || ''}</p>
              <p className="text-sm text-gray-400 mb-6">+91 {user?.mobile || ''}</p>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {!preview ? (
                /* Choose photo button */
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-orange-300 rounded-2xl py-5 flex flex-col items-center gap-2 text-orange-400 hover:bg-orange-50 hover:border-orange-400 active:scale-[0.98] transition-all duration-200 mb-4"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold">Tap to choose a photo</span>
                  <span className="text-xs text-orange-300">Crop, zoom & rotate after selecting</span>
                </button>
              ) : (
                /* Upload button after crop */
                <div className="w-full space-y-3 mb-4">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="relative w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 hover:from-orange-400 hover:to-red-400 active:scale-[0.98] transition-all duration-200 text-base overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-600 pointer-events-none" />
                    <span className="relative flex items-center justify-center gap-2">
                      {uploading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Uploading…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload Photo
                        </>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => { setPreview(null); setPhotoBase64('') }}
                    className="w-full py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Choose different photo
                  </button>
                </div>
              )}

              <button
                onClick={() => navigate('/member-dashboard', { replace: true })}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now →
              </button>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
