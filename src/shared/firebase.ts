import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Firebase no soporta SSR — solo inicializar en el browser
const isBrowser = typeof window !== 'undefined'
const app: FirebaseApp | null = isBrowser
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null

export const auth = app ? getAuth(app) : ({} as ReturnType<typeof getAuth>)
export const db = app ? getDatabase(app) : ({} as ReturnType<typeof getDatabase>)
export const firestore = app ? getFirestore(app) : ({} as ReturnType<typeof getFirestore>)
