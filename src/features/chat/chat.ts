import { ref, push, query, limitToLast, onValue } from 'firebase/database'
import { db } from '@/shared/firebase'
import type { ChatMessage } from './types'

export function sendMessage(
  roomId: string,
  payload: Omit<ChatMessage, 'id'>
) {
  push(ref(db, `chat/${roomId}`), payload)
}

export function subscribeToRoomChat(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const chatRef = query(ref(db, `chat/${roomId}`), limitToLast(50))
  return onValue(chatRef, (snapshot) => {
    const val = snapshot.val() as Record<string, Omit<ChatMessage, 'id'>> | null
    if (!val) { callback([]); return }
    const messages = Object.entries(val)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.timestamp - b.timestamp)
    callback(messages)
  })
}
