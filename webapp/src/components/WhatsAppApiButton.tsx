import { useState } from 'react'
import { API_BASE } from '../api/config'

export type WhatsAppKind = 'welcome' | 'reminder' | 'photo_reminder' | 'app_launch' | 'birthday' | 'payment_receipt'

export async function sendWhatsAppToClient(
  kind: WhatsAppKind,
  ids: { clientId?: string | number; txnId?: string | number },
): Promise<{ success: boolean; error: string | null }> {
  try {
    const r = await fetch(`${API_BASE}/whatsapp/sendToClient.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, clientId: ids.clientId, txnId: ids.txnId }),
    })
    return await r.json()
  } catch {
    return { success: false, error: 'Network error' }
  }
}

const WA_ICON = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'

/**
 * Sends an approved WhatsApp template to a member through the WhatsApp Business API
 * (from the PRO GYM number) — replaces the old wa.me / WhatsApp Web links.
 * Pass className to match the surrounding button style; the icon turns into ✓ / ! after sending.
 */
export default function WhatsAppApiButton({
  kind, clientId, txnId, className, iconClassName = 'w-4 h-4', title = 'Send on WhatsApp (PRO GYM)', onSent,
}: {
  kind: WhatsAppKind
  clientId?: string | number
  txnId?: string | number
  className: string
  iconClassName?: string
  title?: string
  onSent?: () => void
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function send(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (state === 'sending') return
    if (state === 'sent' && !window.confirm('Already sent just now. Send again?')) return
    setState('sending')
    const res = await sendWhatsAppToClient(kind, { clientId, txnId })
    if (res.success) {
      setState('sent')
      onSent?.()
    } else {
      setState('error')
      setError(res.error || 'Send failed')
      window.alert(`WhatsApp not sent: ${res.error || 'Send failed'}`)
    }
  }

  const tip = state === 'sent' ? 'Sent on WhatsApp ✓' : state === 'error' ? `Failed: ${error}` : title

  return (
    <button type="button" onClick={send} disabled={state === 'sending'} title={tip} className={className}>
      {state === 'sending' ? (
        <svg className={`${iconClassName} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : state === 'sent' ? (
        <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : state === 'error' ? (
        <span className="font-black leading-none">!</span>
      ) : (
        <svg viewBox="0 0 24 24" className={iconClassName} fill="currentColor"><path d={WA_ICON} /></svg>
      )}
    </button>
  )
}
