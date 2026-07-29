'use client'
import { useEffect, useState } from 'react'
import { subscribeToPresence } from './presence'
import { useAuth } from '@/features/auth'
import type { UserPresence } from './types'

const ROOM_LABELS: Record<string, string> = {
  lobby: 'Lobby',
  'dev-room': 'Dev Room',
  'design-room': 'Design Room',
  'meeting-room': 'Meeting Room',
  '': 'En tránsito',
}

export function Sidebar() {
  const { user, signOut } = useAuth()
  const [presence, setPresence] = useState<Record<string, UserPresence>>({})

  useEffect(() => subscribeToPresence(setPresence), [])

  const byRoom: Record<string, Array<UserPresence & { uid: string }>> = {}
  for (const [uid, data] of Object.entries(presence)) {
    if (!data.online) continue
    const room = data.room ?? ''
    if (!byRoom[room]) byRoom[room] = []
    byRoom[room].push({ ...data, uid })
  }

  return (
    <aside className="w-52 bg-gray-900 flex flex-col gap-4 p-4 overflow-y-auto shrink-0">
      <h2 className="text-gray-400 text-xs uppercase tracking-widest">Oficina</h2>

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
                {u.uid === user?.uid && (
                  <span className="text-gray-500 text-xs ml-1">(tú)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}

      <div className="mt-auto">
        <button
          onClick={signOut}
          className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
        >
          Salir
        </button>
      </div>
    </aside>
  )
}
