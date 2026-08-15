import { forwardRef, useImperativeHandle, useState } from 'react'
import { API_BASE } from '../api/config'

// Handle exposed to parents so they can persist the coupon redemption after
// a successful package create/renew. Kept minimal on purpose.
export interface CouponApplierHandle {
  redeem: () => Promise<void>
  code: string
  applied: boolean
}

interface Props {
  clientId: string | number
  // Called with a discount factor in (0, 1]. 1 = no discount, 0.5 = flat 50% off.
  onApply: (discountFactor: number) => void
}

const CouponApplier = forwardRef<CouponApplierHandle, Props>(function CouponApplier({ clientId, onApply }, ref) {
  const [code, setCode]   = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'valid' | 'error'>('idle')
  const [msg, setMsg]     = useState<string | null>(null)

  const applied = state === 'valid'

  useImperativeHandle(ref, () => ({
    code,
    applied,
    redeem: async () => {
      if (!applied) return
      try {
        await fetch(`${API_BASE}/wc_participants/redeemCoupon.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: Number(clientId), coupon_code: code.trim().toUpperCase() }),
        })
      } catch { /* non-fatal — package is already saved */ }
    },
  }), [applied, code, clientId])

  async function apply() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setState('loading'); setMsg(null)
    try {
      const r = await fetch(`${API_BASE}/wc_participants/validateCoupon.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: Number(clientId), coupon_code: trimmed }),
      })
      const j = await r.json()
      if (j?.ok) {
        setState('valid')
        setMsg(`Applied — flat ${j.discount_percent}% OFF`)
        onApply(1 - (Number(j.discount_percent) / 100))
      } else {
        setState('error')
        setMsg(j?.error || 'Invalid coupon')
        onApply(1)
      }
    } catch {
      setState('error'); setMsg('Network error'); onApply(1)
    }
  }

  function clear() {
    setCode(''); setState('idle'); setMsg(null); onApply(1)
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
      <label className="block text-xs font-semibold text-purple-800 mb-1.5">FIFA Coupon (optional · 50% off)</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => {
            setCode(e.target.value.toUpperCase())
            if (state !== 'idle') { setState('idle'); setMsg(null); onApply(1) }
          }}
          placeholder="PROGYM50-XXXXX"
          disabled={applied}
          className="flex-1 min-w-0 border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50 disabled:text-gray-500"
        />
        {!applied ? (
          <button
            type="button"
            onClick={apply}
            disabled={state === 'loading' || !code.trim()}
            className="px-3 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {state === 'loading' ? '…' : 'Apply'}
          </button>
        ) : (
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
      {msg && (
        <p className={`text-[11px] mt-1.5 ${state === 'valid' ? 'text-green-700 font-semibold' : 'text-red-600'}`}>
          {state === 'valid' ? '✓ ' : '✗ '}{msg}
        </p>
      )}
    </div>
  )
})

export default CouponApplier
