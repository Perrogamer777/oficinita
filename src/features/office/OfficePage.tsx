'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth'
import { Sidebar } from '@/features/presence'

// Phaser depende de APIs de browser — nunca importar en SSR
const GameCanvas = dynamic(
  () => import('./GameCanvas').then((m) => ({ default: m.GameCanvas })),
  { ssr: false }
)

export function OfficePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading || !user) return null

  const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'Usuario'

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <GameCanvas userId={user.uid} displayName={displayName} avatar="character_1" />
    </div>
  )
}
