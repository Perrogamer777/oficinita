import { ref, set, onValue, onDisconnect } from 'firebase/database'
import { db } from '@/shared/firebase'
import type { UserPresence } from './types'

export function publishPresence(userId: string, data: UserPresence) {
  set(ref(db, `presence/${userId}`), data)
}

export function setOfflineOnDisconnect(userId: string) {
  onDisconnect(ref(db, `presence/${userId}/online`)).set(false)
}

export function subscribeToPresence(
  callback: (presence: Record<string, UserPresence>) => void
): () => void {
  const presenceRef = ref(db, 'presence')
  return onValue(presenceRef, (snapshot) => {
    callback((snapshot.val() as Record<string, UserPresence>) ?? {})
  })
}
