export type SendReceiptInput = {
  mobile: string
  clientName: string
  packageName: string
  duration: string
  paymentDate: string
  paid: number
  remaining: number
  gymName?: string
  gymPhone?: string
}

const normalizeMobile = (raw: string): string => {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return '91' + digits
  return digits
}

const isMobile = (): boolean => {
  if (typeof navigator === 'undefined') return false
  if (/Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent)) return true
  if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return true
  return false
}

const fmtInr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const buildReceiptText = (input: SendReceiptInput): string => {
  const {
    clientName, packageName, duration, paymentDate, paid, remaining,
    gymName = 'Pro Gym, Kolhapur',
    gymPhone = '8796655176',
  } = input

  const balanceLine = remaining <= 0
    ? `💵 Remaining Balance: ₹0  ✓ Fully Paid`
    : `💵 Remaining Balance: ${fmtInr(remaining)}`

  return (
    `✅ *Payment Confirmed*\n` +
    `\n` +
    `Hi ${clientName}, your payment has been received successfully.\n` +
    `\n` +
    `💰 *Amount Paid: ${fmtInr(paid)}*\n` +
    `\n` +
    `📋 *Receipt Details*\n` +
    `📦 Package: ${packageName}\n` +
    `📅 Duration: ${duration}\n` +
    `🗓️ Payment Date: ${paymentDate}\n` +
    `✔️ Status: Success\n` +
    `${balanceLine}\n` +
    `\n` +
    `Track your workouts, diet & attendance on the ProGym app.\n` +
    `\n` +
    `— *${gymName}*\n` +
    `📞 ${gymPhone}`
  )
}

export const sendPaymentReceiptOnWhatsApp = (input: SendReceiptInput): void => {
  const text = buildReceiptText(input)
  const encoded = encodeURIComponent(text)
  const wa = normalizeMobile(input.mobile)

  if (isMobile()) {
    // whatsapp:// opens the installed WhatsApp app directly (not WhatsApp Web)
    const url = wa ? `whatsapp://send?phone=${wa}&text=${encoded}` : `whatsapp://send?text=${encoded}`
    window.location.href = url
  } else {
    // Desktop: wa.me opens WhatsApp Web / WhatsApp desktop app
    const url = wa ? `https://wa.me/${wa}?text=${encoded}` : `https://web.whatsapp.com/`
    window.open(url, '_blank')
  }
}
