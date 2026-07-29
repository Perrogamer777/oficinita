'use client'
import { useEffect, useRef, useState } from 'react'
import { subscribeToRoomChat, sendMessage } from './chat'
import type { ChatMessage } from './types'

const ROOM_LABELS: Record<string, string> = {
  lobby: 'Lobby',
  'dev-room': 'Dev Room',
  'design-room': 'Design Room',
  'meeting-room': 'Meeting Room',
}

interface Props {
  roomId: string
  userId: string
  displayName: string
}

export function ChatPanel({ roomId, userId, displayName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeToRoomChat(roomId, setMessages)
  }, [roomId])

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    sendMessage(roomId, {
      userId,
      displayName,
      text: trimmed,
      timestamp: Date.now(),
    })
    setText('')
  }

  return (
    <div className="flex flex-col border-t border-gray-800 mt-2 pt-2">
      <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
        {ROOM_LABELS[roomId] ?? roomId}
      </p>

      {/* Lista de mensajes */}
      <div className="flex flex-col gap-1 overflow-y-auto max-h-48 mb-2 pr-1">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs italic">Sin mensajes aún</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={msg.userId === userId ? 'text-right' : ''}>
            {msg.userId !== userId && (
              <span className="text-gray-500 text-xs block">{msg.displayName}</span>
            )}
            <span
              className={`inline-block text-xs px-2 py-1 rounded-lg max-w-[90%] break-words ${
                msg.userId === userId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-1">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe..."
          maxLength={300}
          className="flex-1 bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-2 py-1 rounded-md transition-colors shrink-0"
        >
          ↵
        </button>
      </form>
    </div>
  )
}
