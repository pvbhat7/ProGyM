import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE, MEDIA_BASE } from '../api/config'
import NotificationBell from '../components/NotificationBell'

type AfterPhoto = {
  id: number
  week_label: string
  week_start_date: string
  week_end_date: string
  after_photo: string
  upload_date: string
  coins_credited: string
}

function imgUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${MEDIA_BASE}/${path}`
}

function beforePhotoDate(path: string): string {
  const match = path.match(/before_\d+_(\d+)\.jpg/)
  if (!match) return ''
  const d = new Date(parseInt(match[1]) * 1000)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getCurrentWeek(): { label: string; startDate: string; endDate: string } {
  const now = new Date()
  const d = now.getDate()
  const m = now.getMonth() + 1
  const y = now.getFullYear()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long' })
  const pad = (n: number) => String(n).padStart(2, '0')
  const mm = pad(m)
  const daysInMonth = new Date(y, m, 0).getDate()

  let wn: number, s: number, e: number
  if (d <= 7)       { wn = 1; s = 1;  e = 7 }
  else if (d <= 14) { wn = 2; s = 8;  e = 14 }
  else if (d <= 21) { wn = 3; s = 15; e = 21 }
  else if (d <= 28) { wn = 4; s = 22; e = 28 }
  else              { wn = 5; s = 29; e = daysInMonth }

  return {
    label:     `${monthName} Week ${wn}`,
    startDate: `${pad(s)}/${mm}/${y}`,
    endDate:   `${pad(e)}/${mm}/${y}`,
  }
}

function compressToBase64(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1024
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
          else { width = Math.round(width * maxDim / height); height = maxDim }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function MemberBeforeAfterPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const cid = user?.userId

  const [beforePath, setBeforePath] = useState<string | null>(null)
  const [afterPhotos, setAfterPhotos] = useState<AfterPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [beforePreview, setBeforePreview] = useState('')
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [beforeMsg, setBeforeMsg] = useState('')

  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [afterPreview, setAfterPreview] = useState('')
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const [afterMsg, setAfterMsg] = useState('')

  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef  = useRef<HTMLInputElement>(null)

  const week = getCurrentWeek()

  const load = async () => {
    if (!cid) return
    setLoading(true)
    try {
      const [profileRes, photosRes] = await Promise.all([
        fetch(`${API_BASE}/client/byId.php?id=${cid}`),
        fetch(`${API_BASE}/beforeAfterPhotos/byClientId.php?cid=${cid}`),
      ])
      if (profileRes.ok) {
        const profile = await profileRes.json()
        setBeforePath(profile?.before_photo_path || null)
      }
      if (photosRes.ok) {
        const data = await photosRes.json()
        setAfterPhotos(Array.isArray(data) ? data : [])
      }
    } catch { /* leave defaults */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleBeforeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBeforeFile(file)
    setBeforePreview(await compressToBase64(file))
  }

  const handleBeforeUpload = async () => {
    if (!beforeFile || !cid) return
    setUploadingBefore(true)
    setBeforeMsg('')
    try {
      const base64 = await compressToBase64(beforeFile)
      const res = await fetch(`${API_BASE}/client/uploadBeforePhoto.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cid, photo: base64 }),
      })
      const json = await res.json()
      if (json.status === 'success') {
        setBeforePath(json.path)
        setBeforeFile(null)
        setBeforePreview('')
        setBeforeMsg('✓ Before photo saved!')
      } else {
        setBeforeMsg('Upload failed. Try again.')
      }
    } catch {
      setBeforeMsg('Network error.')
    }
    setUploadingBefore(false)
    setTimeout(() => setBeforeMsg(''), 4000)
  }

  const handleAfterSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAfterFile(file)
    setAfterPreview(await compressToBase64(file))
  }

  const handleAfterUpload = async () => {
    if (!afterFile || !cid) return
    setUploadingAfter(true)
    setAfterMsg('')
    try {
      const base64 = await compressToBase64(afterFile)
      const res = await fetch(`${API_BASE}/beforeAfterPhotos/upload.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:        cid,
          week_label:      week.label,
          week_start_date: week.startDate,
          week_end_date:   week.endDate,
          after_photo:     base64,
        }),
      })
      const json = await res.json()
      if (json.status === 'success') {
        const extra = json.coinsCredited ? ' +5 ProCoins earned!' : ''
        setAfterMsg(`✓ Photo saved!${extra}`)
        setAfterFile(null)
        setAfterPreview('')
        if (afterInputRef.current) afterInputRef.current.value = ''
        await load()
      } else {
        setAfterMsg('Upload failed. Try again.')
      }
    } catch {
      setAfterMsg('Network error.')
    }
    setUploadingAfter(false)
    setTimeout(() => setAfterMsg(''), 6000)
  }

  const clearAfterSelection = () => {
    setAfterFile(null)
    setAfterPreview('')
    if (afterInputRef.current) afterInputRef.current.value = ''
  }

  const thisWeekPhoto = afterPhotos.find(p => p.week_label === week.label)
  const pastPhotos = afterPhotos.filter(p => p.week_label !== week.label)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/member-dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">Progress Photos</h1>
            <p className="text-xs text-gray-400">Track your transformation</p>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── STEP 1: No before photo — simple one-time setup ── */}
        {!beforePath && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">📷</div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Set Your Before Photo</h2>
                <p className="text-xs text-gray-500">Upload once — it's your starting point</p>
              </div>
            </div>

            {beforePreview ? (
              <>
                <img src={beforePreview} alt="Preview" className="w-full max-h-64 object-contain rounded-xl bg-gray-50 mb-4" />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setBeforeFile(null); setBeforePreview(''); if (beforeInputRef.current) beforeInputRef.current.value = '' }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleBeforeUpload}
                    disabled={uploadingBefore}
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all active:scale-95"
                  >
                    {uploadingBefore ? 'Saving…' : 'Save Before Photo'}
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => beforeInputRef.current?.click()}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
              >
                Select Photo
              </button>
            )}

            <input ref={beforeInputRef} type="file" accept="image/*" className="hidden" onChange={handleBeforeSelect} />

            {beforeMsg && (
              <p className={`mt-3 text-sm text-center font-medium ${beforeMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                {beforeMsg}
              </p>
            )}
          </div>
        )}

        {/* ── MAIN VIEW: Before + After side by side ── */}
        {beforePath && (
          <>
            {/* Side-by-side comparison */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-2">
                {/* Before */}
                <div className="p-3 border-r border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 text-center mb-2 uppercase tracking-wide">Before</p>
                  <img
                    src={imgUrl(beforePath)}
                    alt="Before"
                    className="w-full aspect-square object-cover rounded-xl bg-gray-100"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {beforePhotoDate(beforePath) && (
                    <p className="text-xs text-gray-400 text-center mt-1.5">{beforePhotoDate(beforePath)}</p>
                  )}
                </div>

                {/* After (this week) */}
                <div className="p-3">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">After</p>
                    {!thisWeekPhoto && (
                      <span className="text-xs bg-orange-100 text-orange-600 font-medium px-1.5 py-0.5 rounded-full">+5 coins</span>
                    )}
                    {thisWeekPhoto?.coins_credited === 'yes' && (
                      <span className="text-xs bg-green-100 text-green-600 font-medium px-1.5 py-0.5 rounded-full">✓ +5</span>
                    )}
                  </div>

                  {afterPreview ? (
                    <img src={afterPreview} alt="Preview" className="w-full aspect-square object-cover rounded-xl bg-gray-100" />
                  ) : thisWeekPhoto ? (
                    <img
                      src={imgUrl(thisWeekPhoto.after_photo)}
                      alt="After"
                      className="w-full aspect-square object-cover rounded-xl bg-gray-100"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div
                      onClick={() => afterInputRef.current?.click()}
                      className="w-full aspect-square rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-orange-300 transition-colors"
                    >
                      <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-gray-400 font-medium">Add photo</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-center mt-1.5">{week.label}</p>
                </div>
              </div>
            </div>

            {/* Upload / change after photo */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {thisWeekPhoto ? "Update This Week's Photo" : "Upload This Week's After Photo"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{week.startDate} – {week.endDate}</p>
                </div>
                {!thisWeekPhoto && (
                  <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2.5 py-1 rounded-full">+5 coins</span>
                )}
              </div>

              <input ref={afterInputRef} type="file" accept="image/*" className="hidden" onChange={handleAfterSelect} />

              {afterPreview ? (
                <div className="flex gap-3">
                  <button
                    onClick={clearAfterSelection}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleAfterUpload}
                    disabled={uploadingAfter}
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-50 transition-all active:scale-95"
                  >
                    {uploadingAfter ? 'Saving…' : 'Save Photo'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => afterInputRef.current?.click()}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  {thisWeekPhoto ? "Change Photo" : "Select Photo"}
                </button>
              )}

              {afterMsg && (
                <p className={`mt-3 text-sm text-center font-medium ${afterMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {afterMsg}
                </p>
              )}
            </div>

            {/* Past weeks timeline */}
            {pastPhotos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Past Weeks</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {pastPhotos.map(photo => (
                    <div key={photo.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-700">{photo.week_label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{photo.week_start_date} – {photo.week_end_date}</span>
                          {photo.coins_credited === 'yes' && (
                            <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">+5</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-400 mb-1 text-center">Before</p>
                          <img
                            src={imgUrl(beforePath)}
                            alt="Before"
                            className="w-full aspect-square object-cover rounded-xl bg-gray-100"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1 text-center">After</p>
                          <img
                            src={imgUrl(photo.after_photo)}
                            alt={photo.week_label}
                            className="w-full aspect-square object-cover rounded-xl bg-gray-100"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {afterPhotos.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm text-gray-500 font-medium">No weekly photos yet</p>
                <p className="text-xs mt-1">Upload your first after photo above to earn 5 ProCoins.</p>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}
