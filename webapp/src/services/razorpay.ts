import { API_BASE } from '../api/config'

export type PayRequest =
  | { clientId: number; purpose: 'renew'; packageId: number }
  | { clientId: number; purpose: 'balance'; packageDetailsId: number }

export type RenewOption = {
  packageId: number
  days: number
  fees: number
  description: string
  startDate: string
  endDate: string
}

export type BalanceOption = {
  packageDetailsId: number
  name: string
  startDate: string
  endDate: string
  amount: number
}

export type PayResult = { ok: true; amount: number } | { ok: false; cancelled?: boolean; error: string }

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve()
      s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Razorpay')) }
      document.body.appendChild(s)
    })
  }
  return scriptPromise
}

export type PayOptions = { enabled: boolean; memberVisible: boolean; renew: RenewOption[]; balances: BalanceOption[] }

export async function fetchPayOptions(clientId: number | string): Promise<PayOptions> {
  const r = await fetch(`${API_BASE}/razorpay/renewOptions.php?clientId=${clientId}`)
  const d = await r.json()
  if (!d?.ok) throw new Error(d?.error || 'Could not load payment options')
  return { enabled: !!d.enabled, memberVisible: !!d.memberVisible, renew: d.renew ?? [], balances: d.balances ?? [] }
}

/** Opens Razorpay Checkout and records the payment on success. Never throws. */
export async function payOnline(req: PayRequest): Promise<PayResult> {
  try {
    await loadCheckout()
    const r = await fetch(`${API_BASE}/razorpay/createOrder.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    const order = await r.json()
    if (!order?.ok) return { ok: false, error: order?.error || order?.message || 'Could not start payment' }

    const response = await new Promise<RazorpayResponse | { error: string; cancelled?: boolean }>(resolve => {
      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Pro Gym',
        description: order.description,
        prefill: order.prefill,
        theme: { color: '#f97316' },
        handler: (resp: RazorpayResponse) => resolve(resp),
        modal: { ondismiss: () => resolve({ error: 'Payment cancelled', cancelled: true }) },
      })
      rzp.on('payment.failed', resp => resolve({ error: resp.error?.description || 'Payment failed' }))
      rzp.open()
    })
    if ('error' in response) return { ok: false, error: response.error, cancelled: response.cancelled }

    const v = await fetch(`${API_BASE}/razorpay/verify.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    }).then(x => x.json())
    if (!v?.ok) {
      return { ok: false, error: `${v?.error || 'Verification failed'}. If money was deducted it will be recorded automatically — please contact the gym if not updated in 30 minutes.` }
    }
    return { ok: true, amount: Number(v.amount) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Payment failed' }
  }
}

export async function createPaymentLink(req: PayRequest & { notify: boolean; whatsapp: boolean }) {
  const r = await fetch(`${API_BASE}/razorpay/createLink.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const d = await r.json()
  if (!d?.ok) throw new Error(d?.error || d?.message || 'Could not create payment link')
  return d as {
    url: string; amount: number; description: string; mobile: string | null; name: string; expiresDays: number
    whatsappSent: boolean | null; whatsappError: string | null
  }
}
