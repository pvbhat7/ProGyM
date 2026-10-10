import { initializeApp } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyC14zzhI5JQvJS_GCSaWLoSRWRE3KQ5G2I',
  authDomain: 'progym-web.firebaseapp.com',
  projectId: 'progym-web',
  storageBucket: 'progym-web.firebasestorage.app',
  messagingSenderId: '552542942423',
  appId: '1:552542942423:web:7e0b4199467836acc52c92',
  measurementId: 'G-M5B6BGMWK4',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)

/**
 * Firebase ID token for server calls that verify the login (AI Search, AI Diet Plans).
 * After a page refresh Firebase restores the session asynchronously — wait for it,
 * otherwise auth.currentUser is still null for the first moments.
 */
export async function getIdTokenOrThrow(feature: string): Promise<string> {
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) throw new Error(`Please log out and log in again (with OTP) to use ${feature}.`)
  return user.getIdToken()
}

export default app
