// Reuses the same Firebase project as the main ProGym webapp, so OTP messages
// are billed to the same account and a phone is recognized across both apps.
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

export default app
