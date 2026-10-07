import { useSearchParams, Link } from 'react-router-dom'

/** Razorpay payment-link callback landing. The payment itself is recorded by the webhook. */
export default function PaymentStatusPage() {
  const [params] = useSearchParams()
  const paid = params.get('razorpay_payment_link_status') === 'paid'
  const paymentId = params.get('razorpay_payment_id')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
        <span className="text-5xl block mb-4">{paid ? '✅' : '⚠️'}</span>
        <h1 className="font-bold text-gray-800 text-xl">{paid ? 'Payment successful' : 'Payment not completed'}</h1>
        <p className="text-sm text-gray-500 mt-2">
          {paid
            ? 'Thank you! Your membership will be updated in a minute and a receipt will be sent on WhatsApp/email.'
            : 'Your payment did not go through. You can open the link again to retry, or contact the gym.'}
        </p>
        {paymentId && <p className="text-xs text-gray-400 mt-4">Payment ID: {paymentId}</p>}
        <Link to="/" className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold">
          Open Pro Gym app
        </Link>
      </div>
    </div>
  )
}
