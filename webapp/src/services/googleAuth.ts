import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase'

const provider = new GoogleAuthProvider()

export interface GoogleAuthResult {
  googleUid: string
  email: string | null
  displayName: string | null
  /** Firebase ID token — lets the server verify the Google account (self sign-up). */
  idToken: string
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const result = await signInWithPopup(auth, provider)
  return {
    googleUid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    idToken: await result.user.getIdToken(),
  }
}
