import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'
import { auth } from '../firebase'

let confirmationResult: ConfirmationResult | null = null
let recaptchaVerifier: RecaptchaVerifier | null = null

export async function sendOtp(mobile: string, containerId: string): Promise<void> {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch { /* ignore */ }
    recaptchaVerifier = null
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
  confirmationResult = await signInWithPhoneNumber(auth, `+91${mobile}`, recaptchaVerifier)
}

export async function verifyOtp(otp: string) {
  if (!confirmationResult) throw new Error('No OTP pending. Please request OTP first.')
  return confirmationResult.confirm(otp)
}

export function clearPhoneAuth(): void {
  confirmationResult = null
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch { /* ignore */ }
    recaptchaVerifier = null
  }
}
