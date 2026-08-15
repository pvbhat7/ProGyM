import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'
import ImageCropModal from '../components/ImageCropModal'

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur)
    }
    play(523, 0, 0.15); play(659, 0.15, 0.15); play(784, 0.3, 0.35)
  } catch { /* AudioContext may be blocked */ }
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

type AttPhase = 'idle' | 'checking' | 'success' | 'already' | 'notFound' | 'error'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string
  name: string
  mobile: string
  email: string
  gender: string
  photo: string | null
  profileActiveFlag: string
  admissionDate: string
  pkgId: string | null
  pkgFees: string | null
  pkgAmountPaid: string | null
  pkgStartDate: string | null
  pkgEndDate: string | null
  pkgStatus: string | null
  pkgName: string | null
}

interface ClientProfile {
  id: string; name: string; mobile: string; email: string; gender: string
  birthDate: string; address: string; bloodGroup: string; occupation: string
  height: string; weight: string; photo: string; profileActiveFlag: string
  admissionDate: string; isPTClient: string; isGymClient: string
  creationSource: string; remarks: string; previousGym: string
  adp: string; awp: string
}

interface MemberDetail {
  client: ClientProfile
  dietName: string | null
  workoutName: string | null
}

interface PackageDetail {
  id: string
  packageId: string
  clientId: string
  startDate: string | null
  endDate: string | null
  fees: string
  amountPaid: string
  paymentDate: string | null
  status: string | null
  description: string | null
  discontinue: string
}

interface PaymentTxn {
  id: string
  packageDetailsId: string
  clientId: string
  feesPaid: string
  paymentDate: string | null
  paymentMode: string | null
  isApproved: string
  discontinue: string
}

interface WorkoutExercise {
  id: string
  wsoid: string
  twsid: string
  maxReps: string
  sets: string
  clientPerformance: string
  image: string
  discontinue: string
}

type RightTab = 'profile' | 'gympackage' | 'workout'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDMY(s: string | null): Date | null {
  if (!s) return null
  const p = s.split('/')
  if (p.length !== 3) return null
  return new Date(+p[2], +p[1] - 1, +p[0])
}

function calcDaysLeft(endDate: string | null): number | null {
  const end = parseDMY(endDate)
  if (!end) return null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / 86400000)
}

function getZone(days: number | null): 'green' | 'yellow' | 'red' | 'none' {
  if (days === null) return 'none'
  if (days > 5) return 'green'
  if (days >= 0) return 'yellow'
  return 'red'
}

function inr(n: number) { return '₹' + n.toLocaleString('en-IN') }

const MONTH_NAMES_PUB = ['January','February','March','April','May','June','July','August','September','October','November','December']
function fmtDMY(s: string | null | undefined): string {
  if (!s) return ''
  const [d, m, y] = s.split('/').map(Number)
  if (isNaN(d + m + y)) return ''
  const sfx = ['th','st','nd','rd']
  const v = d % 100
  const ord = sfx[(v - 20) % 10] || sfx[v] || sfx[0]
  return `${d}${ord} ${MONTH_NAMES_PUB[m - 1]} ${y}`
}

function formatDate(s: string | null) {
  if (!s) return '—'
  const d = parseDMY(s)
  if (!d) return s
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

const IMG_BASE = MEDIA_BASE

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, photo, size = 'md', memberId }: { name: string; photo: string | null; size?: 'sm' | 'md' | 'lg'; memberId?: string }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
  let src: string | null = null
  if (photo) {
    const base = photo.startsWith('http') ? photo.split('?')[0] : `${IMG_BASE}/${photo}`
    const bust = memberId ? localStorage.getItem(`photo_bust_${memberId}`) : null
    src = bust ? `${base}?t=${bust}` : base
  }
  return (
    <div className={`relative ${sz} rounded-full ${avatarColor(name)} flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden`}>
      <span className="select-none">{name.charAt(0).toUpperCase()}</span>
      {src && (
        <img
          src={src} alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  )
}

function ProfileTab({ member, detail, loading }: {
  member: Member; detail: MemberDetail | null; loading: boolean
}) {
  const c = detail?.client
  const isFemale = member.gender?.toLowerCase() === 'female'
  const displayMobile = isFemale ? '***' : member.mobile
  const displayEmail = isFemale ? '***' : (c?.email ?? member.email)

  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function buildPhotoSrc(raw: string | null | undefined): string | null {
    if (!raw) return null
    const base = raw.startsWith('http') ? raw.split('?')[0] : `${IMG_BASE}/${raw}`
    const bust = localStorage.getItem(`photo_bust_${member.id}`)
    return bust ? `${base}?t=${bust}` : base
  }

  // Sync photoSrc when detail loads, applying any stored cache-bust timestamp
  useEffect(() => {
    setPhotoSrc(buildPhotoSrc(c?.photo ?? member.photo))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.photo, member.photo])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleCropConfirm(croppedDataUrl: string) {
    setCropSrc(null)
    setPhotoSrc(croppedDataUrl)
    const base64 = croppedDataUrl.split(',')[1]
    setUploading(true)
    setUploadMsg(null)
    try {
      await fetch(`${API_BASE}/client/updateProfilePhoto.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, name: member.name, photo: base64 }),
      })
      localStorage.setItem(`photo_bust_${member.id}`, String(Date.now()))
      setUploadMsg({ ok: true, text: 'Photo updated' })
    } catch {
      setUploadMsg({ ok: false, text: 'Upload failed' })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadMsg(null), 3000)
    }
  }

  function handleCropCancel() {
    setCropSrc(null)
  }

  const initials = member.name.charAt(0).toUpperCase()
  const bgColor = avatarColor(member.name)

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    )}
    <div className="max-w-lg">
      {/* ── Large square photo ── */}
      <div className="relative mb-5 rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ aspectRatio: '3/4', background: '#1a1a2e' }}>
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={member.name}
            className="w-full h-full object-contain"
            onError={() => setPhotoSrc(null)}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-white text-8xl font-black ${bgColor}`}>
            {initials}
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Name + status over photo */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-4">
          <h3 className="text-xl font-black text-white leading-tight drop-shadow">{member.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              member.profileActiveFlag === 'enable'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {member.profileActiveFlag === 'enable' ? 'Active' : 'Inactive'}
            </span>
            {member.gender && (
              <span className="text-xs text-white/80 font-medium">{member.gender}</span>
            )}
          </div>
        </div>

        {/* Upload status message */}
        {uploadMsg && (
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
            uploadMsg.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {uploadMsg.text}
          </div>
        )}

        {/* Camera edit button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-all shadow-md"
          title="Change photo"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* ── Info rows ── */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-28 h-4 bg-gray-100 rounded animate-pulse" />
              <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 divide-y divide-gray-50">
          <InfoRow label="Mobile" value={displayMobile} />
          <InfoRow label="Email" value={displayEmail} />
          <InfoRow label="Gender" value={c?.gender ?? member.gender} />
          <InfoRow label="Date of Birth" value={c?.birthDate} />
          <InfoRow label="Blood Group" value={c?.bloodGroup} />
          <InfoRow label="Address" value={c?.address} />
          <InfoRow label="Occupation" value={c?.occupation} />
          <InfoRow label="Height" value={c?.height ? `${c.height} cm` : undefined} />
          <InfoRow label="Weight" value={c?.weight ? `${c.weight} kg` : undefined} />
          <InfoRow label="Admission Date" value={formatDate(member.admissionDate)} />
          <InfoRow label="Previous Gym" value={c?.previousGym} />
          <InfoRow label="Remarks" value={c?.remarks} />
        </div>
      )}
    </div>
    </>
  )
}

function GymPackageTab({ memberId }: { memberId: string }) {
  const [packages, setPackages] = useState<PackageDetail[]>([])
  const [txnsMap, setTxnsMap] = useState<Record<string, PaymentTxn[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedTxns, setExpandedTxns] = useState<Set<string>>(new Set())

  function toggleTxns(pkgId: string) {
    setExpandedTxns(prev => {
      const next = new Set(prev)
      next.has(pkgId) ? next.delete(pkgId) : next.add(pkgId)
      return next
    })
  }

  useEffect(() => {
    setLoading(true)
    setPackages([])
    setTxnsMap({})
    fetch(`${API_BASE}/packageDetails/byClientId.php?clientId=${memberId}`)
      .then(r => r.json())
      .then(async (pkgs: PackageDetail[]) => {
        const data = Array.isArray(pkgs) ? pkgs.filter(p => p.discontinue !== 'true') : []
        setPackages(data)
        const txnResults = await Promise.all(
          data.map(p =>
            fetch(`${API_BASE}/paymentTransaction/byPackageDetailsId.php?packageDetailsId=${p.id}`)
              .then(r => r.json())
              .then(t => ({ id: p.id, txns: Array.isArray(t) ? t : [] }))
              .catch(() => ({ id: p.id, txns: [] as PaymentTxn[] }))
          )
        )
        const map: Record<string, PaymentTxn[]> = {}
        txnResults.forEach(r => { map[r.id] = r.txns })
        setTxnsMap(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [memberId])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">📦</span>
        <p className="font-semibold text-gray-500">No packages found</p>
        <p className="text-sm mt-1">This member has no membership history.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {packages.map(pkg => {
        const days = calcDaysLeft(pkg.endDate)
        const zone = getZone(days)
        const fees = parseFloat(pkg.fees || '0')
        const paid = parseFloat(pkg.amountPaid || '0')
        const dues = fees > 0 && paid < fees ? fees - paid : 0
        const txns = (txnsMap[pkg.id] || []).filter(t => t.discontinue !== 'true')

        const zoneBg = {
          green:  'border-green-200 bg-green-50',
          yellow: 'border-yellow-200 bg-yellow-50',
          red:    'border-red-200 bg-red-50',
          none:   'border-gray-100 bg-white',
        }[zone]

        const zoneDays = {
          green:  'text-green-600',
          yellow: 'text-yellow-600',
          red:    'text-red-500',
          none:   'text-gray-400',
        }[zone]

        return (
          <div key={pkg.id} className={`rounded-2xl border overflow-hidden ${zoneBg}`}>
            {/* Package header */}
            <div className="px-4 py-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Package</p>
                <p className="font-bold text-gray-800 mt-0.5">{pkg.description || `#${pkg.id}`}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                {pkg.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    pkg.status?.toLowerCase() === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {pkg.status}
                  </span>
                )}
                {days !== null && (
                  <p className={`text-xs font-semibold ${zoneDays}`}>
                    {days < 0 ? `${Math.abs(days)}d expired` : `${days}d left`}
                  </p>
                )}
              </div>
            </div>

            {/* Dates + fees */}
            <div className="px-4 pb-3 space-y-2 border-t border-black/5">
              <div className="flex items-center justify-between pt-2 text-sm">
                <span className="text-gray-500">
                  {formatDate(pkg.startDate)} → {formatDate(pkg.endDate)}
                </span>
                <span className="font-semibold text-gray-800">{inr(fees)}</span>
              </div>

              {fees > 0 && (
                <>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {inr(paid)} paid
                      {dues > 0 && <span className="text-orange-500 font-medium"> · {inr(dues)} due</span>}
                      {dues === 0 && <span className="text-green-600 font-medium"> · fully paid ✓</span>}
                    </span>
                    <span>{Math.round((paid / fees) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${dues > 0 ? 'bg-orange-400' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, (paid / fees) * 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Transactions — collapsible */}
            {txns.length > 0 && (
              <div className="border-t border-black/5 bg-white/60">
                <button
                  onClick={() => toggleTxns(pkg.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-black/5 transition-colors"
                >
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Payment Transactions ({txns.length})
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedTxns.has(pkg.id) ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedTxns.has(pkg.id) && txns.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5 border-t border-black/5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {inr(parseFloat(t.feesPaid || '0'))}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(t.paymentDate)} · {t.paymentMode || 'Cash'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.isApproved === 'YES' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t.isApproved === 'YES' ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function WorkoutTab({ memberId, detail }: { memberId: string; detail: MemberDetail | null }) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [wsoLoading, setWsoLoading] = useState(true)
  const [wsoError, setWsoError] = useState(false)
  const [workoutCategoryName, setWorkoutCategoryName] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    const { signal } = ctrl

    setWsoLoading(true)
    setWsoError(false)
    setExercises([])
    setWorkoutCategoryName(null)

    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dateStr = `${dd}/${mm}/${now.getFullYear()}`

    fetch(`${API_BASE}/workoutScheduleObject/byClientIdAndDate.php?cid=${memberId}&date=${encodeURIComponent(dateStr)}`, { signal })
      .then(r => r.json())
      .then(wso => {
        const wsoItem = Array.isArray(wso) ? wso[0] : wso
        const wsoid = wsoItem?.id
        const mtid = wsoItem?.mtid
        if (!wsoid) { setWsoLoading(false); return }
        if (mtid) {
          fetch(`${API_BASE}/t_workoutmaintype/single_read.php?id=${mtid}`, { signal })
            .then(r => r.json())
            .then(mt => { if (mt?.name) setWorkoutCategoryName(mt.name) })
            .catch(() => {})
        }
        return fetch(`${API_BASE}/workoutSubType/getSubWorkoutPlansByWsoId.php?wsoid=${wsoid}`, { signal })
          .then(r => r.json())
          .then(exs => {
            setExercises(Array.isArray(exs) ? exs.filter((e: WorkoutExercise) => e.discontinue !== 'true') : [])
            setWsoLoading(false)
          })
      })
      .catch(err => { if (err.name !== 'AbortError') { setWsoError(true); setWsoLoading(false) } })

    return () => ctrl.abort()
  }, [memberId])

  if (wsoLoading) {
    return (
      <div className="flex gap-4 items-start">
        <div className="flex-1 grid grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden bg-gray-100 animate-pulse">
              <div className="h-36 bg-gray-200" />
              <div className="p-3 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="w-44 flex-shrink-0 bg-white rounded-2xl border border-gray-100 animate-pulse h-96" />
      </div>
    )
  }

  if (wsoError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-4xl mb-3">😕</span>
        <p className="font-semibold text-gray-500">Could not load workout</p>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-gray-400">
        <span className="text-4xl mb-3">🏋️</span>
        <p className="font-semibold text-gray-500">No workout assigned for today</p>
        {!detail?.workoutName && (
          <p className="text-sm mt-1 text-gray-400">No workout plan set for this member</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Today's Workout</p>
          {workoutCategoryName && (
            <p className="text-base font-bold text-gray-800 mt-0.5">{workoutCategoryName}</p>
          )}
        </div>
        <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
          {exercises.length} exercises
        </span>
      </div>

      {/* ── Grid + sidebar layout ── */}
      <div className="flex gap-4 items-start">

        {/* 2-column grid of exercise cards */}
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
          {exercises.map((ex, idx) => {
            const imgSrc = ex.image
              ? (ex.image.startsWith('http') ? ex.image : `${IMG_BASE}/${ex.image}`)
              : null
            const done = ex.clientPerformance === 'true'

            return (
              <div
                key={ex.id}
                className={`relative rounded-2xl overflow-hidden border shadow-sm transition-all ${
                  done ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-md'
                }`}
              >
                {/* Sequence badge */}
                <span className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow z-10 ${
                  done ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-700 border border-gray-200'
                }`}>
                  {done ? '✓' : idx + 1}
                </span>

                {/* GIF image — fills full card width, height is natural (no side white space) */}
                <div className={`w-full overflow-hidden ${done ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={ex.twsid}
                      className="w-full h-auto block"
                      onError={e => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        const fallback = document.createElement('div')
                        fallback.className = 'h-28 flex items-center justify-center text-4xl'
                        fallback.textContent = '🏋️'
                        el.parentElement!.appendChild(fallback)
                      }}
                    />
                  ) : (
                    <div className="h-28 flex items-center justify-center text-4xl">🏋️</div>
                  )}
                </div>

                {/* Info bar */}
                <div className={`px-3 py-2.5 ${done ? 'bg-green-500' : 'bg-white border-t border-gray-50'}`}>
                  <p className={`text-xs font-bold leading-snug truncate ${done ? 'text-white' : 'text-gray-800'}`}>
                    {ex.twsid}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${done ? 'text-white/80' : 'text-gray-400'}`}>
                    {ex.sets} sets · {ex.maxReps} reps
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: exercise list sidebar (sticky) */}
        <div className="w-56 flex-shrink-0 sticky top-0 flex flex-col gap-2">
          {workoutCategoryName && (
            <div className="bg-orange-500 rounded-2xl px-3 py-3 shadow-sm">
              <p className="text-xs text-orange-100 font-semibold uppercase tracking-wide mb-0.5">Workout Plan</p>
              <p className="text-sm font-extrabold text-white leading-snug">{workoutCategoryName}</p>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Exercise List</p>
            </div>
            <div className="divide-y divide-gray-50">
              {exercises.map((ex, idx) => {
                const done = ex.clientPerformance === 'true'
                return (
                  <div key={ex.id} className={`flex items-center gap-2 px-3 py-2 ${done ? 'bg-green-50' : ''}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {done ? '✓' : idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${done ? 'text-green-700' : 'text-gray-700'}`}>
                        {ex.twsid}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ex.sets}s · {ex.maxReps}r
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'progym_searched_members_v2'

function loadStoredMembers(): Member[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : []
  } catch { return [] }
}

function saveStoredMembers(members: Member[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(members)) } catch {}
}

export default function PublicMembersPage() {
  const navigate = useNavigate()

  // Persistent searched members list (starts empty, grows as user searches)
  const [recentMembers, setRecentMembers] = useState<Member[]>(loadStoredMembers)

  // Search
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Right panel
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('workout')
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Attendance marking
  const [attMobile, setAttMobile] = useState('')
  const [attPhase, setAttPhase] = useState<AttPhase>('idle')
  const [attMemberName, setAttMemberName] = useState('')
  const [attMemberPhoto, setAttMemberPhoto] = useState('')
  const [attCheckinTime, setAttCheckinTime] = useState('')
  const [attPresentDays, setAttPresentDays] = useState<Set<string>>(new Set())
  const [attDaysLeft, setAttDaysLeft] = useState<number | null>(null)
  const [attPkgStartDate, setAttPkgStartDate] = useState('')
  const [attPkgEndDate, setAttPkgEndDate] = useState('')
  const [attCountdown, setAttCountdown] = useState(0)
  const [attCoinBalance, setAttCoinBalance] = useState<number | null>(null)
  const [attCoinCredited, setAttCoinCredited] = useState(false)
  const attCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attSubmittingRef = useRef(false)

  useEffect(() => () => { if (attCountdownRef.current) clearInterval(attCountdownRef.current) }, [])

  useEffect(() => {
    if (attMobile.length === 10 && attPhase === 'idle') handleAttendanceSubmit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attMobile])

  function closeAttDialog() {
    if (attCountdownRef.current) { clearInterval(attCountdownRef.current); attCountdownRef.current = null }
    attSubmittingRef.current = false
    setAttPhase('idle')
    setAttMobile('')
    setAttMemberName(''); setAttMemberPhoto(''); setAttCheckinTime('')
    setAttPresentDays(new Set()); setAttDaysLeft(null); setAttPkgStartDate(''); setAttPkgEndDate(''); setAttCountdown(0)
    setAttCoinBalance(null); setAttCoinCredited(false)
  }

  async function handleAttendanceSubmit() {
    const mobile = attMobile.trim()
    if (mobile.length < 10 || attSubmittingRef.current) return
    attSubmittingRef.current = true
    setAttPhase('checking')
    try {
      const clientRes = await fetch(`${API_BASE}/client/existsByMobile.php?mobile=${mobile}`)
      const clientData = await clientRes.json()
      if (!clientData.id || clientData.id === 0) {
        attSubmittingRef.current = false
        setAttPhase('notFound')
        setTimeout(() => setAttPhase('idle'), 3000)
        return
      }
      const cid: number = clientData.id
      setAttMemberName(clientData.name || 'Member')

      const todayRes = await fetch(`${API_BASE}/attendance/byToday.php?cid=${cid}`)
      const alreadyMarked = todayRes.ok && todayRes.status !== 404
      if (!alreadyMarked) await fetch(`${API_BASE}/attendance/create.php?cid=${cid}`)

      const now = new Date()
      setAttCheckinTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))

      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const [attRes, pkgRes, profRes, coinRes] = await Promise.all([
        fetch(`${API_BASE}/attendance/byMonthAndYear.php?month=${month}&year=${year}&cid=${cid}`),
        fetch(`${API_BASE}/packageDetails/byClientId.php?clientId=${cid}`),
        fetch(`${API_BASE}/client/byId.php?id=${cid}`),
        fetch(`${API_BASE}/procointransaction/retrieve.php?clientId=${cid}`),
      ])

      const presentSet = new Set<string>()
      if (attRes.ok) {
        const att = await attRes.json()
        if (Array.isArray(att)) {
          att.filter((r: { day?: number }) => r?.day).forEach((r: { day: number }) => {
            presentSet.add(`${year}-${String(month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`)
          })
        }
      }
      presentSet.add(`${year}-${String(month).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`)
      setAttPresentDays(presentSet)

      if (pkgRes.ok) {
        const pkgs = await pkgRes.json()
        if (Array.isArray(pkgs) && pkgs.length > 0) {
          const active = (pkgs as PackageDetail[]).find(p => {
            const end = parseDMY(p.endDate); return end && end >= new Date()
          }) || pkgs[0]
          const end = parseDMY(active.endDate)
          if (end) setAttDaysLeft(Math.ceil((end.getTime() - Date.now()) / 86400000))
          setAttPkgStartDate(fmtDMY(active.startDate))
          setAttPkgEndDate(fmtDMY(active.endDate))
        }
      }

      if (profRes.ok) {
        const prof = await profRes.json()
        if (prof.photo) setAttMemberPhoto(prof.photo)
      }

      if (coinRes.ok) {
        try {
          const txns = await coinRes.json()
          if (Array.isArray(txns)) {
            const bal = txns.reduce((acc: number, t: { creditDebit: string; amount: string }) =>
              t.creditDebit === '1'
                ? acc + parseFloat(t.amount || '0')
                : acc - parseFloat(t.amount || '0'), 0)
            setAttCoinBalance(Math.max(0, Math.round(bal)))
          }
        } catch {}
      }
      setAttCoinCredited(!alreadyMarked)

      playSuccessSound()
      setAttPhase(alreadyMarked ? 'already' : 'success')

      let secs = 10
      setAttCountdown(secs)
      attCountdownRef.current = setInterval(() => {
        secs -= 1
        setAttCountdown(secs)
        if (secs <= 0) closeAttDialog()
      }, 1000)
    } catch {
      attSubmittingRef.current = false
      setAttPhase('error')
      setTimeout(() => setAttPhase('idle'), 3000)
    }
  }

  // Debounced search fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      fetch(`${API_BASE}/client/searchWithPackages.php?name=${encodeURIComponent(search.trim())}`)
        .then(r => r.json())
        .then((data: Member[]) => {
          setSearchResults(Array.isArray(data) ? data : [])
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // Fetch detail when member selected
  useEffect(() => {
    if (!selectedMember) { setDetail(null); return }
    setDetail(null)
    setDetailLoading(true)
    fetch(`${API_BASE}/client/singleClientDataEagerLoadingById.php?id=${selectedMember.id}`)
      .then(r => r.json())
      .then((d: MemberDetail) => { setDetail(d); setDetailLoading(false) })
      .catch(() => setDetailLoading(false))
  }, [selectedMember?.id])

  // List shown: search results when searching, else recent list
  const displayList = search.trim() ? searchResults : recentMembers

  function selectMember(m: Member) {
    setSelectedMember(m)
    setRightTab('workout')
    setSearch('')
    setRecentMembers(prev => {
      const filtered = prev.filter(r => r.id !== m.id)
      const next = [m, ...filtered]
      saveStoredMembers(next)
      return next
    })
  }

  const ZONE_LEFT_BORDER: Record<string, string> = {
    green:  'border-l-green-400',
    yellow: 'border-l-yellow-400',
    red:    'border-l-red-400',
    none:   'border-l-transparent',
  }

  const attLast7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return { key, day: DAY_LABELS[d.getDay()], date: d.getDate(), isToday: i === 6 }
  })

  const attIsSuccess = attPhase === 'success'
  const showAttDialog = attPhase === 'success' || attPhase === 'already'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Attendance result dialog ── */}
      {showAttDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-50 rounded-3xl shadow-2xl p-6 select-none">

            {/* Avatar + name */}
            <div className="text-center mb-5">
              <div className="relative inline-block mb-3">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-white mx-auto">
                  {attMemberPhoto
                    ? <img src={attMemberPhoto.startsWith('http') ? attMemberPhoto : `${IMG_BASE}/${attMemberPhoto}`} alt=""
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                    : attMemberName.charAt(0).toUpperCase()
                  }
                </div>
                <div className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center text-lg border-4 border-gray-50 ${attIsSuccess ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {attIsSuccess ? '✓' : '!'}
                </div>
              </div>
              <h2 className="text-2xl font-black text-gray-900">
                {attIsSuccess ? `Welcome, ${attMemberName}!` : `Hi, ${attMemberName}!`}
              </h2>
              <p className={`text-base font-semibold mt-1 ${attIsSuccess ? 'text-green-600' : 'text-yellow-600'}`}>
                {attIsSuccess ? `✅  Attendance marked · ${attCheckinTime}` : `⚠️  Already checked in today`}
              </p>
            </div>

            {/* Package days */}
            {attDaysLeft !== null && (
              <div className={`rounded-2xl p-3 flex items-center justify-center gap-2 border mb-3 ${
                attDaysLeft > 10 ? 'bg-green-50 border-green-200' :
                attDaysLeft > 0  ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
              }`}>
                <span className="text-xl">📦</span>
                <div className="text-center">
                  <p className={`text-sm font-black ${attDaysLeft > 10 ? 'text-green-600' : attDaysLeft > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {attDaysLeft > 0 ? `${attDaysLeft} days remaining in current package` : `Package expired on ${attPkgEndDate}`}
                  </p>
                  {(attPkgStartDate || attPkgEndDate) && (
                    <p className="text-gray-500 text-xs mt-1">
                      {attPkgStartDate && `Start: ${attPkgStartDate}`}{attPkgStartDate && attPkgEndDate && ' · '}{attPkgEndDate && `End: ${attPkgEndDate}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Last 7 days */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-4">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 text-center">Last 7 Days</p>
              <div className="flex justify-center gap-2">
                {attLast7.map(d => {
                  const present = attPresentDays.has(d.key)
                  return (
                    <div key={d.key} className="flex flex-col items-center gap-1.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        present ? 'bg-green-500 text-white shadow-md shadow-green-500/30'
                          : d.isToday ? 'bg-transparent text-gray-700 border-2 border-gray-400'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {d.date}
                      </div>
                      <span className={`text-xs font-semibold ${d.isToday ? 'text-green-600' : 'text-gray-400'}`}>{d.day}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ProCoin Banner */}
            {attCoinBalance !== null && (
              attCoinCredited ? (
                <div className="mb-4 rounded-2xl overflow-hidden shadow-lg shadow-amber-700/25">
                  <div className="bg-gradient-to-br from-yellow-600 via-amber-600 to-orange-600 p-4">

                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white/80 text-xs font-bold uppercase tracking-widest">ProCoins Balance</p>
                      <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1">
                        <span className="text-yellow-200 text-sm leading-none">⭐</span>
                        <span className="text-white text-xs font-semibold">+1 Coin Earned!</span>
                      </div>
                    </div>

                    {/* Coin + balance */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl shadow-lg">
                          🪙
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-yellow-300 rounded-full flex items-center justify-center shadow font-black text-yellow-800 leading-none" style={{ width: '18px', height: '18px', fontSize: '9px' }}>
                          +1
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-black text-4xl leading-none tracking-tight">{attCoinBalance}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/70 text-xs">ProCoins</span>
                          <span className="bg-white/20 rounded-full px-2 py-0.5 text-white text-xs font-semibold">1 ProCoin = ₹1</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="flex items-center gap-2 pt-2.5 border-t border-white/20">
                      <span className="text-sm flex-shrink-0">🔐</span>
                      <p className="text-white/90 text-xs font-semibold">Login to the ProGym app to redeem your ProCoins</p>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-2xl overflow-hidden shadow-lg shadow-amber-700/25">
                  <div className="bg-gradient-to-br from-yellow-600 via-amber-600 to-orange-600 p-4">

                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white/80 text-xs font-bold uppercase tracking-widest">ProCoins Balance</p>
                      <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1">
                        <svg className="w-3 h-3 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white text-xs font-semibold">Credited today</span>
                      </div>
                    </div>

                    {/* Coin + balance */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl shadow-lg">
                          🪙
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-emerald-400 rounded-full flex items-center justify-center shadow" style={{ width: '18px', height: '18px' }}>
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-black text-4xl leading-none tracking-tight">{attCoinBalance}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/70 text-xs">ProCoins</span>
                          <span className="bg-white/20 rounded-full px-2 py-0.5 text-white text-xs font-semibold">1 ProCoin = ₹1</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="flex items-center gap-2 pt-2.5 border-t border-white/20">
                      <span className="text-sm flex-shrink-0">🔐</span>
                      <p className="text-white/90 text-xs font-semibold">Login to the ProGym app to redeem your ProCoins</p>
                    </div>

                  </div>
                </div>
              )
            )}

            {/* Countdown + close */}
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-2">
                Closing in <span className="text-gray-800 font-bold">{attCountdown}s</span>
              </p>
              <button onClick={closeAttDialog}
                className="px-8 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-xl transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">

        {/* Left header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="font-bold text-gray-800">Members</h1>
            <span className="ml-auto text-xs text-gray-400">{recentMembers.length}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >✕</button>
            ) : searching && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          {searching && searchResults.length === 0 && (
            <div className="pt-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searching && displayList.length === 0 && (
            <div className="text-center py-14 text-gray-400 text-sm px-4">
              {search.trim() ? (
                <>
                  <p className="text-3xl mb-2">🔍</p>
                  No members match
                </>
              ) : (
                <>
                  <p className="text-3xl mb-3">🔎</p>
                  <p className="font-medium text-gray-500">Search for a member</p>
                  <p className="text-xs mt-1 text-gray-400">Members you search will appear here</p>
                </>
              )}
            </div>
          )}

          {displayList.map((m: Member) => {
            const zone = getZone(calcDaysLeft(m.pkgEndDate))
            const isSelected = selectedMember?.id === m.id

            return (
              <button
                key={m.id}
                onClick={() => selectMember(m)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-l-4 transition-all ${ZONE_LEFT_BORDER[zone]} ${
                  isSelected
                    ? 'bg-orange-50 border-b-orange-100'
                    : 'bg-white border-b-gray-50 hover:bg-gray-50'
                }`}
              >
                <Avatar name={m.name} photo={m.photo} size="sm" memberId={m.id} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isSelected ? 'text-orange-700' : 'text-gray-800'}`}>
                    {m.name}
                  </p>
                </div>
                <svg className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-orange-500' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/>
                </svg>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          {/* Attendance input */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Mobile number"
                value={attMobile}
                onChange={e => setAttMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => { if (e.key === 'Enter') handleAttendanceSubmit() }}
                disabled={attPhase === 'checking'}
                className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none transition-colors ${
                  attPhase === 'notFound' || attPhase === 'error'
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : 'border-gray-200 bg-gray-50 focus:border-violet-400 focus:bg-white'
                }`}
              />
            </div>
            <button
              onClick={handleAttendanceSubmit}
              disabled={attMobile.length < 10 || attPhase === 'checking'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
            >
              {attPhase === 'checking' ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Marking…
                </span>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark Attendance
                </>
              )}
            </button>
            {(attPhase === 'notFound') && (
              <span className="text-xs text-red-500 font-medium">Mobile not registered</span>
            )}
            {(attPhase === 'error') && (
              <span className="text-xs text-red-500 font-medium">Something went wrong</span>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm text-sm font-medium flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
        </div>

        {/* Right content */}
        {!selectedMember ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 select-none">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-lg font-medium text-gray-400">Select a member</p>
            <p className="text-sm text-gray-300 mt-1">Choose from the list to view details</p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-1">
              {([
                { key: 'profile',    label: 'Profile',     icon: '👤' },
                { key: 'gympackage', label: 'Gym Package',  icon: '📦' },
                { key: 'workout',    label: 'Workout',      icon: '🏋️' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setRightTab(t.key)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                    rightTab === t.key
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-1.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {rightTab === 'profile' && (
                <ProfileTab member={selectedMember} detail={detail} loading={detailLoading} />
              )}
              {rightTab === 'gympackage' && (
                <GymPackageTab memberId={selectedMember.id} />
              )}
              {rightTab === 'workout' && (
                <WorkoutTab memberId={selectedMember.id} detail={detail} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
