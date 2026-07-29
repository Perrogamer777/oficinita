'use client'
import { useEffect, useRef } from 'react'
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
      scene: new OfficeScene({ userId, displayName, avatar }),
      pixelArt: true,
      backgroundColor: '#1a1a2e',
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [userId, displayName, avatar])

  return <div ref={containerRef} className="flex-1 h-full" />
}
