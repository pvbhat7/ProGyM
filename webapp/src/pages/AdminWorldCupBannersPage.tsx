import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'

interface Banner {
  id: number
  image_url: string
  sponsor_name: string | null
  link_url: string | null
  display_order: number
  is_active: string
  created_at: string | null
  updated_at: string | null
}

function fileToBase64(file: File): Promise<{ base64: string; ext: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const idx = dataUrl.indexOf('base64,')
      if (idx < 0) { reject(new Error('Bad file')); return }
      const base64 = dataUrl.slice(idx + 7)
      const m = file.name.match(/\.([a-zA-Z0-9]+)$/)
      let ext = (m ? m[1] : 'png').toLowerCase()
      if (ext === 'jpeg') ext = 'jpg'
      resolve({ base64, ext })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function AdminWorldCupBannersPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // New banner form
  const [pickedFile, setPickedFile]   = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [sponsorName, setSponsorName] = useState('')
  const [linkUrl, setLinkUrl]         = useState('')
  const [displayOrder, setDisplayOrder] = useState('0')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/wc_banners/getAll.php`)
      const j = await r.json()
      setBanners(Array.isArray(j?.banners) ? j.banners : [])
    } catch {
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!/^image\//.test(f.type)) {
      setError('Please select an image file.')
      return
    }
    if (f.size > 4 * 1024 * 1024) {
      setError('Image too large — keep it under 4 MB.')
      return
    }
    setError('')
    setPickedFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function resetForm() {
    setPickedFile(null)
    setPreviewUrl(null)
    setSponsorName('')
    setLinkUrl('')
    setDisplayOrder('0')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpload() {
    if (!pickedFile) { setError('Please pick an image first.'); return }
    setError('')
    setUploading(true)
    try {
      const { base64, ext } = await fileToBase64(pickedFile)
      const res = await fetch(`${API_BASE}/wc_banners/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          extension:    ext,
          sponsor_name: sponsorName.trim() || null,
          link_url:     linkUrl.trim() || null,
          display_order: Number(displayOrder) || 0,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.message || `Upload failed (HTTP ${res.status})`)
      }
      resetForm()
      load()
    } catch (e: any) {
      setError(e?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function toggleActive(b: Banner) {
    const next = b.is_active === 'yes' ? 'no' : 'yes'
    await fetch(`${API_BASE}/wc_banners/update.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, is_active: next }),
    })
    load()
  }

  async function updateOrder(b: Banner, value: string) {
    const n = Number(value)
    if (Number.isNaN(n)) return
    await fetch(`${API_BASE}/wc_banners/update.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, display_order: n }),
    })
    load()
  }

  async function deleteBanner(b: Banner) {
    if (!confirm('Delete this banner? This is permanent.')) return
    await fetch(`${API_BASE}/wc_banners/delete.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id }),
    })
    load()
  }

  const activeCount = banners.filter(b => b.is_active === 'yes').length

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 text-base leading-tight truncate">World Cup Banners</h1>
            <p className="text-[11px] text-gray-400">Sponsored carousel shown on the wc2026 Matches page</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Upload card */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Add a new banner</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Image (16:6 ratio looks best)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFilePick}
                className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              {previewUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 aspect-[16/6] bg-gray-100">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sponsor name (optional)</label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={e => setSponsorName(e.target.value)}
                  placeholder="e.g. Royal Cafe"
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Click-through URL (optional)</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Display order (lower = first)</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={e => setDisplayOrder(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleUpload}
              disabled={!pickedFile || uploading}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload banner'}
            </button>
            {pickedFile && (
              <button
                onClick={resetForm}
                disabled={uploading}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {/* List */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">All banners</h2>
            <span className="text-[11px] text-gray-500">{activeCount} active · {banners.length} total</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
          ) : banners.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">🖼️</p>
              <p className="text-sm text-gray-600 font-semibold">No banners yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload one above to start showing the carousel.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {banners.map(b => (
                <li key={b.id} className="p-4 flex items-start gap-4">
                  <div className="w-28 aspect-[16/6] rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                    <img src={b.image_url} alt={b.sponsor_name || ''} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{b.sponsor_name || <span className="text-gray-400 italic">No sponsor name</span>}</p>
                    {b.link_url ? (
                      <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-orange-600 hover:underline truncate block">
                        {b.link_url}
                      </a>
                    ) : (
                      <p className="text-[11px] text-gray-400">No click-through URL</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${b.is_active === 'yes' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {b.is_active === 'yes' ? 'Active' : 'Inactive'}
                      </span>
                      <label className="text-gray-500">Order:</label>
                      <input
                        type="number"
                        defaultValue={b.display_order}
                        onBlur={e => {
                          const n = Number(e.target.value)
                          if (n !== b.display_order) updateOrder(b, e.target.value)
                        }}
                        className="w-14 px-1.5 py-0.5 border border-gray-200 rounded text-center"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      onClick={() => toggleActive(b)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                        b.is_active === 'yes'
                          ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {b.is_active === 'yes' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteBanner(b)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
