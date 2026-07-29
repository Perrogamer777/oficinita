# Oficinita Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oficina virtual tipo Gather.town para ≤5 personas con mapa pixel art top-down, movimiento de avatares en tiempo real y sidebar de presencia por sala.

**Architecture:** Next.js static export alojado en Firebase Hosting. Phaser 3 embebido en un componente React (dynamic import, sin SSR). Firebase RTDB para posiciones en vivo, Firestore para perfiles, Firebase Auth para sesión.

**Tech Stack:** Next.js 14, TypeScript, Phaser 3, Firebase 10 (Auth + RTDB + Firestore + Hosting), Tiled (herramienta externa para el mapa).

## Global Constraints

- TypeScript strict mode activado
- Firebase SDK v10 (modular, no compat)
- `output: 'export'` en next.config.js — no SSR, deploy estático
- Phaser importado solo en cliente — siempre con `dynamic(() => import(...), { ssr: false })`
- Posiciones publicadas en RTDB con throttle de 150ms (no por frame)
- Sprites de 16×16px, mapa Tiled exportado como JSON embebido
- No chat, no video, no admin UI en v1

---

## Code Architecture

**Feature folders** — todo lo relacionado a una feature vive junto. `app/` es solo glue de routing.

```
oficinita/
├── src/
│   ├── app/                              Next.js routing (solo glue)
│   │   ├── layout.tsx
│   │   ├── page.tsx                      redirige a /login
│   │   ├── login/page.tsx                → renderiza LoginPage de features/auth
│   │   └── office/page.tsx              → renderiza OfficePage de features/office
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx           context + useAuth hook
│   │   │   ├── LoginPage.tsx             componente de login
│   │   │   └── index.ts                 exports públicos del feature
│   │   │
│   │   ├── office/
│   │   │   ├── OfficePage.tsx           layout principal (sidebar + canvas)
│   │   │   ├── GameCanvas.tsx           wrapper React → Phaser (client-only)
│   │   │   ├── OfficeScene.ts           toda la lógica Phaser
│   │   │   └── index.ts                 exports públicos del feature
│   │   │
│   │   └── presence/
│   │       ├── presence.ts              read/write RTDB presencia
│   │       ├── Sidebar.tsx              sidebar con presencia agrupada
│   │       ├── types.ts                 interfaces UserPresence, RoomZone
│   │       └── index.ts                 exports públicos del feature
│   │
│   └── shared/
│       └── firebase.ts                  init Firebase + exports auth/db/firestore
│
├── public/
│   └── assets/
│       ├── tilemaps/office.json         exportado desde Tiled
│       ├── tilesets/office_tileset.png  tileset pixel art
│       └── sprites/characters.png       spritesheet 16×16, 4 filas × 4 frames
├── .env.local
├── firebase.json
├── .firebaserc
└── next.config.js
```

**Regla de imports:** los features se importan solo desde su `index.ts`. `app/` nunca importa archivos internos de un feature directamente.

---

### Task 1: Project Bootstrap

**Files:**
- Create: `next.config.js`
- Create: `.env.local`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Crear proyecto Next.js**

```bash
npx create-next-app@latest oficinita \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*" \
  --no-turbopack
cd oficinita
```

- [ ] **Step 2: Instalar dependencias**

```bash
npm install phaser firebase
npm install -D @types/node
```

- [ ] **Step 3: Configurar next.config.js**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Phaser usa `self` globalmente — necesita client-only
  transpilePackages: ['phaser'],
}
module.exports = nextConfig
```

- [ ] **Step 4: Crear .env.local**

```bash
# .env.local — completar con valores reales del proyecto Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

- [ ] **Step 5: Crear app/layout.tsx**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Oficinita' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: Crear app/page.tsx (redirect root)**

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/login')
}
```

- [ ] **Step 7: Verificar que el proyecto corre**

```bash
npm run dev
```

Abrir http://localhost:3000 — debe redirigir a `/login` (404 por ahora, está bien).

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: project bootstrap — next.js + phaser + firebase deps"
```

---

### Task 2: Firebase Config & Auth Context

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `src/lib/auth-context.tsx`
- Create: `src/types/index.ts`

**Produces:**
- `auth`, `db`, `firestore` — exports de firebase.ts usados en toda la app
- `AuthContext`, `useAuth()` — hook con `{ user, loading, signOut }`

- [ ] **Step 1: Crear lib/firebase.ts**

```ts
// src/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app'
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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getDatabase(app)
export const firestore = getFirestore(app)
```

- [ ] **Step 2: Crear types/index.ts**

```ts
// src/types/index.ts
export interface UserPresence {
  x: number
  y: number
  room: string
  displayName: string
  avatar: string
  online: boolean
}

export interface RoomZone {
  id: string
  name: string
}
```

- [ ] **Step 3: Crear lib/auth-context.tsx**

```tsx
// src/lib/auth-context.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth'
import { auth } from './firebase'

interface AuthCtx {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signOut: () => firebaseSignOut(auth) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 4: Envolver app en AuthProvider — modificar layout.tsx**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = { title: 'Oficinita' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase.ts src/lib/auth-context.tsx src/types/index.ts src/app/layout.tsx
git commit -m "feat: firebase config + auth context"
```

---

### Task 3: Login Page

**Files:**
- Create: `src/app/login/page.tsx`

**Consumes:** `useAuth()` de auth-context.tsx, `auth` de firebase.ts
**Produces:** Ruta `/login` — redirige a `/office` si ya hay sesión

- [ ] **Step 1: Crear login/page.tsx**

```tsx
// src/app/login/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/office')
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/office')
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <main style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 280 }}>
        <h1 style={{ margin: 0 }}>Oficinita</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: 8, fontSize: 14 }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: 8, fontSize: 14 }}
        />
        {error && <p style={{ color: 'red', margin: 0, fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ padding: 8 }}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Crear usuarios en Firebase Console**

En la consola de Firebase → Authentication → Users → Add user.
Crear uno por miembro del equipo (email + password temporal).

- [ ] **Step 3: Verificar login funciona**

```bash
npm run dev
```

Ir a http://localhost:3000/login → ingresar credenciales → debe redirigir a `/office` (404 aún, está bien).

- [ ] **Step 4: Commit**

```bash
git add src/app/login/
git commit -m "feat: login page con firebase auth"
```

---

### Task 4: Presence Utilities

**Files:**
- Create: `src/lib/presence.ts`

**Consumes:** `db` de firebase.ts, `UserPresence` de types/index.ts
**Produces:**
- `publishPresence(userId, data: UserPresence): void`
- `setOfflineOnDisconnect(userId): void`
- `subscribeToPresence(cb): () => void` — retorna unsubscribe

- [ ] **Step 1: Crear lib/presence.ts**

```ts
// src/lib/presence.ts
import { ref, set, onValue, onDisconnect } from 'firebase/database'
import { db } from './firebase'
import type { UserPresence } from '@/types'

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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/presence.ts
git commit -m "feat: presence utilities — publish, disconnect, subscribe"
```

---

### Task 5: Mapa Pixel Art con Tiled

> Esta tarea es manual. Requiere Tiled (gratuito: mapeditor.org) y assets de tilesets/sprites.

**Files:**
- Create: `public/assets/tilemaps/office.json`
- Create: `public/assets/tilesets/office_tileset.png`
- Create: `public/assets/sprites/characters.png`

- [ ] **Step 1: Descargar assets gratuitos**

Ir a https://kenney.nl/assets y descargar:
- **Tileset:** "Tiny Town" o "Micro Roguelike" (tiles 16×16)
- **Sprites personajes:** "Tiny Dungeon" o cualquier spritesheet 16×16 top-down

Guardar tileset en `public/assets/tilesets/office_tileset.png`
Guardar spritesheet en `public/assets/sprites/characters.png`

- [ ] **Step 2: Crear el mapa en Tiled**

1. Abrir Tiled → New Map
   - Orientation: Orthogonal
   - Tile size: 16×16
   - Map size: 40×30 tiles (640×480px)

2. Agregar tileset: Map → Add Tileset → seleccionar `office_tileset.png`

3. Crear 2 tile layers:
   - `Floor` — pintar el piso de toda la oficina
   - `Walls` — pintar paredes internas dividiendo áreas

4. Crear 1 object layer llamado `Rooms`:
   - Insert Rectangle en cada área de sala
   - Nombrar cada rectángulo (Name property): `lobby`, `dev-room`, `design-room`, `meeting-room`

5. File → Export As → `public/assets/tilemaps/office.json`
   - Asegurarse de marcar "Embed tilesets" en las opciones de export

- [ ] **Step 3: Verificar el JSON**

Abrir `public/assets/tilemaps/office.json` y confirmar que contiene:
- `"layers"` con al menos `Floor`, `Walls`, y `Rooms` (type: `objectgroup`)
- `"tilesets"` con el tileset embebido o referenciado

- [ ] **Step 4: Commit**

```bash
git add public/assets/
git commit -m "feat: mapa pixel art y assets — tiled export + tilesets"
```

---

### Task 6: Phaser Scene — Mapa, Player y Movimiento

**Files:**
- Create: `src/game/scenes/OfficeScene.ts`

**Consumes:**
- `publishPresence(userId, data)` de presence.ts
- `setOfflineOnDisconnect(userId)` de presence.ts
- `UserPresence` de types/index.ts

**Produces:** `OfficeScene` — clase Phaser.Scene exportada, recibe `{ userId, displayName, avatar }` en constructor

- [ ] **Step 1: Crear OfficeScene.ts**

```ts
// src/game/scenes/OfficeScene.ts
import Phaser from 'phaser'
import { publishPresence, setOfflineOnDisconnect } from '@/lib/presence'
import type { UserPresence } from '@/types'

interface SceneConfig {
  userId: string
  displayName: string
  avatar: string
}

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>
  private currentRoom = ''
  private lastPublish = 0
  private roomZones: Array<{ bounds: Phaser.Geom.Rectangle; id: string }> = []
  private sceneConfig: SceneConfig

  constructor(config: SceneConfig) {
    super('OfficeScene')
    this.sceneConfig = config
  }

  preload() {
    this.load.tilemapTiledJSON('office', '/assets/tilemaps/office.json')
    this.load.image('tiles', '/assets/tilesets/office_tileset.png')
    this.load.spritesheet('characters', '/assets/sprites/characters.png', {
      frameWidth: 16,
      frameHeight: 16,
    })
  }

  create() {
    const map = this.make.tilemap({ key: 'office' })
    const tileset = map.addTilesetImage('office_tileset', 'tiles')!
    map.createLayer('Floor', tileset)
    const wallsLayer = map.createLayer('Walls', tileset)!
    wallsLayer.setCollisionByExclusion([-1])

    // Room zones from Tiled object layer
    const objectLayer = map.getObjectLayer('Rooms')
    if (objectLayer) {
      objectLayer.objects.forEach((obj) => {
        this.roomZones.push({
          id: obj.name ?? '',
          bounds: new Phaser.Geom.Rectangle(obj.x!, obj.y!, obj.width!, obj.height!),
        })
      })
    }

    // Player spawn at center of map
    const spawnX = (map.widthInPixels / 2)
    const spawnY = (map.heightInPixels / 2)
    this.player = this.physics.add.sprite(spawnX, spawnY, 'characters', 0)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, wallsLayer)

    // Player name label
    this.add.text(0, -12, this.sceneConfig.displayName, {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#00000099',
    }).setOrigin(0.5).setName('playerLabel')

    // Camera
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true)

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey('W'),
      down: this.input.keyboard!.addKey('S'),
      left: this.input.keyboard!.addKey('A'),
      right: this.input.keyboard!.addKey('D'),
    }

    // Animations (asume spritesheet 4 filas × 4 frames, 16×16)
    this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers('characters', { start: 0, end: 3 }), frameRate: 8, repeat: -1 })
    this.anims.create({ key: 'walk-left', frames: this.anims.generateFrameNumbers('characters', { start: 4, end: 7 }), frameRate: 8, repeat: -1 })
    this.anims.create({ key: 'walk-right', frames: this.anims.generateFrameNumbers('characters', { start: 8, end: 11 }), frameRate: 8, repeat: -1 })
    this.anims.create({ key: 'walk-up', frames: this.anims.generateFrameNumbers('characters', { start: 12, end: 15 }), frameRate: 8, repeat: -1 })

    // Presence: mark offline on tab close
    setOfflineOnDisconnect(this.sceneConfig.userId)
  }

  update(time: number) {
    const speed = 80
    const { left, right, up, down } = this.wasd
    const cursors = this.cursors

    this.player.setVelocity(0)

    if (cursors.left.isDown || left.isDown) {
      this.player.setVelocityX(-speed)
      this.player.anims.play('walk-left', true)
    } else if (cursors.right.isDown || right.isDown) {
      this.player.setVelocityX(speed)
      this.player.anims.play('walk-right', true)
    } else if (cursors.up.isDown || up.isDown) {
      this.player.setVelocityY(-speed)
      this.player.anims.play('walk-up', true)
    } else if (cursors.down.isDown || down.isDown) {
      this.player.setVelocityY(speed)
      this.player.anims.play('walk-down', true)
    } else {
      this.player.anims.stop()
    }

    this.currentRoom = this.detectRoom()

    // Throttled publish (150ms)
    if (time - this.lastPublish > 150) {
      this.lastPublish = time
      publishPresence(this.sceneConfig.userId, {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        room: this.currentRoom,
        displayName: this.sceneConfig.displayName,
        avatar: this.sceneConfig.avatar,
        online: true,
      })
    }
  }

  private detectRoom(): string {
    const px = this.player.x
    const py = this.player.y
    for (const zone of this.roomZones) {
      if (zone.bounds.contains(px, py)) return zone.id
    }
    return ''
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Debe pasar sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/game/
git commit -m "feat: OfficeScene — tilemap, player movement, room detection, presence publish"
```

---

### Task 7: Avatares Remotos en Phaser

**Files:**
- Modify: `src/game/scenes/OfficeScene.ts`

**Consumes:** `subscribeToPresence` de presence.ts, `UserPresence` de types/index.ts

- [ ] **Step 1: Agregar mapa de avatares remotos y subscripción en OfficeScene**

Agregar en la clase, después de `private roomZones`:

```ts
private remoteAvatars: Map<string, { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }> = new Map()
private unsubPresence?: () => void
```

Al final de `create()`, agregar:

```ts
import { subscribeToPresence } from '@/lib/presence'

// al final de create():
this.unsubPresence = subscribeToPresence((presence) => {
  this.syncRemoteAvatars(presence)
})
```

- [ ] **Step 2: Agregar método syncRemoteAvatars**

```ts
private syncRemoteAvatars(presence: Record<string, UserPresence>) {
  const { userId } = this.sceneConfig

  // Remove avatars that went offline or disconnected
  for (const [uid, { sprite, label }] of this.remoteAvatars) {
    if (!presence[uid] || !presence[uid].online) {
      sprite.destroy()
      label.destroy()
      this.remoteAvatars.delete(uid)
    }
  }

  // Create or update avatars
  for (const [uid, data] of Object.entries(presence)) {
    if (uid === userId || !data.online) continue

    if (this.remoteAvatars.has(uid)) {
      const { sprite, label } = this.remoteAvatars.get(uid)!
      sprite.setPosition(data.x, data.y)
      label.setPosition(data.x, data.y - 12)
    } else {
      const sprite = this.add.sprite(data.x, data.y, 'characters', 1)
      const label = this.add.text(data.x, data.y - 12, data.displayName, {
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#00000099',
      }).setOrigin(0.5)
      this.remoteAvatars.set(uid, { sprite, label })
    }
  }
}
```

- [ ] **Step 3: Limpiar subscripción al destruir la escena**

```ts
shutdown() {
  this.unsubPresence?.()
}
```

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/OfficeScene.ts
git commit -m "feat: remote avatars — sync positions from RTDB"
```

---

### Task 8: Sidebar de Presencia

**Files:**
- Create: `src/components/Sidebar.tsx`

**Consumes:** `subscribeToPresence` de presence.ts, `UserPresence` de types/index.ts, `useAuth()` de auth-context.tsx
**Produces:** `<Sidebar />` — componente que muestra quién está en cada sala

- [ ] **Step 1: Crear Sidebar.tsx**

```tsx
// src/components/Sidebar.tsx
'use client'
import { useEffect, useState } from 'react'
import { subscribeToPresence } from '@/lib/presence'
import { useAuth } from '@/lib/auth-context'
import type { UserPresence } from '@/types'

const ROOM_LABELS: Record<string, string> = {
  'lobby': 'Lobby',
  'dev-room': 'Dev Room',
  'design-room': 'Design Room',
  'meeting-room': 'Meeting Room',
  '': 'En tránsito',
}

export function Sidebar() {
  const { user } = useAuth()
  const [presence, setPresence] = useState<Record<string, UserPresence>>({})

  useEffect(() => {
    return subscribeToPresence(setPresence)
  }, [])

  // Group by room
  const byRoom: Record<string, Array<UserPresence & { uid: string }>> = {}
  for (const [uid, data] of Object.entries(presence)) {
    if (!data.online) continue
    const room = data.room || ''
    if (!byRoom[room]) byRoom[room] = []
    byRoom[room].push({ ...data, uid })
  }

  return (
    <aside style={{
      width: 200,
      background: '#1a1a2e',
      color: '#eee',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      overflowY: 'auto',
    }}>
      <h2 style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>Oficina</h2>
      {Object.entries(byRoom).map(([room, users]) => (
        <div key={room}>
          <p style={{ margin: '0 0 6px', fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>
            {ROOM_LABELS[room] ?? room}
          </p>
          {users.map(u => (
            <div key={u.uid} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              opacity: u.uid === user?.uid ? 1 : 0.85,
            }}>
              <span style={{ fontSize: 18 }}>🧑</span>
              <span style={{ fontSize: 13 }}>
                {u.displayName}
                {u.uid === user?.uid && ' (tú)'}
              </span>
            </div>
          ))}
        </div>
      ))}
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: sidebar — presencia agrupada por sala en tiempo real"
```

---

### Task 9: GameCanvas + Página /office

**Files:**
- Create: `src/app/office/GameCanvas.tsx`
- Create: `src/app/office/page.tsx`

**Consumes:**
- `OfficeScene` de game/scenes/OfficeScene.ts
- `Sidebar` de components/Sidebar.tsx
- `useAuth()` de auth-context.tsx

- [ ] **Step 1: Crear GameCanvas.tsx**

```tsx
// src/app/office/GameCanvas.tsx
'use client'
import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { OfficeScene } from '@/game/scenes/OfficeScene'

interface Props {
  userId: string
  displayName: string
  avatar: string
}

export default function GameCanvas({ userId, displayName, avatar }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: '100%',
      height: '100%',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: new OfficeScene({ userId, displayName, avatar }),
      pixelArt: true,
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [userId, displayName, avatar])

  return <div ref={containerRef} style={{ flex: 1, height: '100%' }} />
}
```

- [ ] **Step 2: Crear office/page.tsx**

```tsx
// src/app/office/page.tsx
'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/Sidebar'

// Phaser usa APIs de browser — nunca en SSR
const GameCanvas = dynamic(() => import('./GameCanvas'), { ssr: false })

export default function OfficePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading || !user) return null

  const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'Usuario'

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '6px 12px', background: '#222', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={signOut} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
        <GameCanvas userId={user.uid} displayName={displayName} avatar="character_1" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build de verificación**

```bash
npm run build
```

Debe completar sin errores TypeScript ni errores de build.

- [ ] **Step 4: Probar localmente**

```bash
npm run dev
```

1. Ir a http://localhost:3000/login → ingresar credenciales
2. Debe cargar `/office` con el mapa y la sidebar
3. Moverse con WASD → la sidebar debe actualizarse con la sala actual
4. Abrir segunda ventana con otro usuario → ver ambos avatares en el mapa

- [ ] **Step 5: Commit**

```bash
git add src/app/office/
git commit -m "feat: office page — gamecavas + sidebar integrados"
```

---

### Task 10: Deploy a Firebase Hosting

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`

- [ ] **Step 1: Instalar Firebase CLI (si no está)**

```bash
npm install -g firebase-tools
firebase login
```

- [ ] **Step 2: Inicializar Firebase Hosting**

```bash
firebase init hosting
```

Opciones a seleccionar:
- Use an existing project → seleccionar tu proyecto
- Public directory: `out`
- Configure as SPA: **Yes**
- Set up automatic builds: **No**

O crear los archivos manualmente:

```json
// firebase.json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

```json
// .firebaserc
{
  "projects": {
    "default": "TU_PROYECTO_ID"
  }
}
```

- [ ] **Step 3: Build + Deploy**

```bash
npm run build
firebase deploy --only hosting
```

Firebase imprimirá la URL pública (ej: `https://oficinita-xxxxx.web.app`).

- [ ] **Step 4: Verificar deploy**

Abrir la URL en dos tabs con distintos usuarios. Ambos avatares deben aparecer y sincronizarse.

- [ ] **Step 5: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "feat: firebase hosting deploy config"
```

---

## Post-Launch (fuera de scope v1)

Agregar solo si el equipo lo pide explícitamente:

| Feature | Esfuerzo estimado |
|---|---|
| Chat por sala | 1 día — Firestore collection `messages/{roomId}/msgs` |
| Admin UI de salas | 1 día — form que escribe en Firestore `/rooms` |
| Notificaciones cuando alguien entra a tu sala | ½ día — evento RTDB + toast |
| Video/audio (WebRTC o link a Meet) | 3 días (WebRTC) / 2h (link Meet automático) |
| Emojis de estado / reacciones | ½ día |
| Registro de usuarios con invitación | 1 día |
