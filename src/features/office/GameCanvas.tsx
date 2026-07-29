'use client'
import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { OfficeScene } from './OfficeScene'

interface Props {
  userId: string
  displayName: string
  avatar: string
}

export function GameCanvas({ userId, displayName, avatar }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: '100%',
      height: '100%',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: new OfficeScene({ userId, displayName, avatar, onError: setError }),
      pixelArt: true,
      backgroundColor: '#1a1a2e',
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [userId, displayName, avatar])

  return (
    <div className="flex-1 h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/90">
          <div className="bg-gray-900 border border-red-800 rounded-lg p-6 max-w-sm text-center">
            <p className="text-red-400 text-sm font-medium mb-2">Error al cargar el mapa</p>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
