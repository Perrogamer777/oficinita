'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { ChatMessage } from '@/features/chat'

const GameCanvas = dynamic(
  () => import('@/features/office/GameCanvas').then((m) => ({ default: m.GameCanvas })),
  { ssr: false }
)

// Datos falsos para previsualizar el diseño sin Firebase
const FAKE_USERS = [
  { uid: 'u1', displayName: 'Luis',   room: 'dev-room',     avatar: 'char1', online: true, x: 0, y: 0 },
  { uid: 'u2', displayName: 'María',  room: 'dev-room',     avatar: 'char2', online: true, x: 0, y: 0 },
  { uid: 'u3', displayName: 'Carlos', room: 'meeting-room', avatar: 'char3', online: true, x: 0, y: 0 },
]

const FAKE_MESSAGES: ChatMessage[] = [
  { id: '1', userId: 'u2', displayName: 'María',  text: 'Hola equipo! 👋',          timestamp: 1 },
  { id: '2', userId: 'u1', displayName: 'Luis',   text: 'Buenos días!',              timestamp: 2 },
  { id: '3', userId: 'u2', displayName: 'María',  text: 'Arrancamos el standup?',   timestamp: 3 },
  { id: '4', userId: 'u1', displayName: 'Luis',   text: 'Sí, en 5 minutos.',        timestamp: 4 },
]

const ROOM_LABELS: Record<string, string> = {
  'dev-room': 'Dev Room',
  'design-room': 'Design Room',
  'meeting-room': 'Meeting Room',
  lobby: 'Lobby',
  '': 'En tránsito',
}

const byRoom = FAKE_USERS.reduce<Record<string, typeof FAKE_USERS>>((acc, u) => {
  const r = u.room ?? ''
  if (!acc[r]) acc[r] = []
  acc[r].push(u)
  return acc
}, {})

export default function DemoPage() {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(FAKE_MESSAGES)
  const myRoom = 'dev-room'

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages(prev => [...prev, {
      id: String(Date.now()),
      userId: 'u1',
      displayName: 'Luis',
      text: trimmed,
      timestamp: Date.now(),
    }])
    setText('')
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 flex flex-col p-4 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-400 text-xs uppercase tracking-widest">Oficina</h2>
          <span className="text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded">demo</span>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          {Object.entries(byRoom).map(([room, users]) => (
            <div key={room}>
              <p className="text-gray-500 text-xs uppercase mb-2">
                {ROOM_LABELS[room] ?? room}
              </p>
              {users.map((u) => (
                <div key={u.uid} className="flex items-center gap-2 py-1">
                  <span className="text-lg">🧑</span>
                  <span className="text-gray-200 text-sm truncate">
                    {u.displayName}
                    {u.uid === 'u1' && (
                      <span className="text-gray-500 text-xs ml-1">(tú)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Chat demo */}
        <div className="flex flex-col border-t border-gray-800 mt-2 pt-2">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
            {ROOM_LABELS[myRoom]}
          </p>
          <div className="flex flex-col gap-1 overflow-y-auto max-h-48 mb-2 pr-1">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.userId === 'u1' ? 'text-right' : ''}>
                {msg.userId !== 'u1' && (
                  <span className="text-gray-500 text-xs block">{msg.displayName}</span>
                )}
                <span className={`inline-block text-xs px-2 py-1 rounded-lg max-w-[90%] break-words ${
                  msg.userId === 'u1'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-200'
                }`}>
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="flex gap-1">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Escribe..."
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

        <div className="mt-4 pt-2 border-t border-gray-800">
          <span className="text-gray-600 text-xs">Modo demo — sin Firebase</span>
        </div>
      </aside>

      {/* Mapa — canvas real con assets generados, sin RTDB */}
      <GameCanvas userId="" displayName="Luis" avatar="character_1" />
    </div>
  )
}
