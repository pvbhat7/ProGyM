import { useEffect, useState } from 'react'
import { getSession } from '../services/wcSession'

// Users whose footballs were reduced when the per-match score cap was fixed
// (some legacy categories were paying out extra coins on top of the intended
// 20-per-match base). Each entry: { id: clientId, amt: footballs removed }.
const AFFECTED: Record<number, number> = {
  118: 13, 1225: 12, 534: 12, 931: 12, 1214: 11, 945: 11, 1206: 11,
  1216: 10, 1218: 8, 1205: 8, 1151: 8, 464: 7, 365: 6, 1275: 5.5,
  1227: 5.5, 1299: 4.5, 1184: 4.5, 1278: 3.5, 1256: 3.5, 865: 3.5,
  1239: 3.5, 1207: 2, 1286: 2, 82: 2, 1080: 2,
}

const STORAGE_KEY = 'wc_points_correction_notice_v1'

export default function PointsCorrectionNotice() {
  const [open, setOpen] = useState(false)
  const [amt, setAmt]   = useState(0)

  useEffect(() => {
    const session = getSession()
    if (!session?.clientId) return
    const cid = Number(session.clientId)
    const myAmt = AFFECTED[cid]
    if (!myAmt) return
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return
    } catch { /* ignore */ }
    setAmt(myAmt)
    setOpen(true)
  }, [])

  function dismiss() {
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:m-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚙️</div>
          <div className="flex-1">
            <h3 className="font-black text-gray-900 text-base leading-tight">Footballs corrected</h3>
            <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
              Due to a technical glitch, a few scoring categories were paying
              out extra footballs. The score engine has been fixed so every
              match now awards a flat <b>20 footballs</b> maximum.
            </p>
            <p className="text-[13px] text-gray-700 mt-2 leading-relaxed">
              <b>{amt} extra football{amt === 1 ? '' : 's'}</b> {amt === 1 ? 'has' : 'have'} been removed from your balance.
              Sorry for the confusion!
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="mt-4 w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-xl shadow active:scale-[0.98] transition-transform"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
