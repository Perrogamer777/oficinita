# Oficinita

Oficina virtual para equipos pequeños, inspirada en Gather.town. Mapa pixel art top-down donde cada miembro del equipo ve en tiempo real quién está en qué sala y puede mover su avatar por el espacio.

---

## Qué hace

### Presencia en tiempo real
Cada usuario tiene un avatar en el mapa. Al moverse, su posición se sincroniza con el resto del equipo en menos de 150ms. La barra lateral muestra quién está en cada sala en todo momento.

### Mapa pixel art
La oficina es un mapa top-down diseñado en Tiled, con salas diferenciadas (Lobby, Dev Room, Design Room, Meeting Room). El avatar se mueve con `WASD` o las flechas del teclado.

### Salas con contexto
El mapa está dividido en zonas. Al entrar a una sala, el sistema detecta automáticamente la ubicación del usuario y actualiza la sidebar para todos. Los compañeros de equipo saben de inmediato en qué área estás trabajando.

### Autenticación
Login con email y contraseña via Firebase Auth. Las cuentas se crean manualmente por el administrador — no hay registro público.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind CSS |
| Motor de juego | Phaser 3 (mapa, movimiento, sprites) |
| Auth | Firebase Authentication |
| Presencia en tiempo real | Firebase Realtime Database |
| Datos estructurados | Firestore |
| Dev | Docker Compose |
| Producción | Google Cloud Run |

---

## Estructura del proyecto

```
src/
├── app/                  Routing Next.js (glue únicamente)
│   ├── login/page.tsx
│   └── office/page.tsx
├── features/
│   ├── auth/             Login, AuthContext, useAuth hook
│   ├── presence/         Sincronización RTDB, Sidebar, tipos
│   └── office/           OfficeScene (Phaser), GameCanvas, OfficePage
└── shared/
    └── firebase.ts       Inicialización Firebase
```

---

## Cómo correr localmente

### Requisitos
- Docker Desktop
- Proyecto Firebase con Auth + Realtime Database habilitados

### 1. Configura las variables de entorno

Crea `.env.local` en la raíz con los valores de tu proyecto Firebase:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 2. Agrega los assets del mapa

Descarga tilesets gratuitos de [kenney.nl](https://kenney.nl/assets) y colócalos en:

```
public/assets/
├── tilemaps/office.json        exportado desde Tiled
├── tilesets/office_tileset.png
└── sprites/characters.png      spritesheet 16×16, 4 filas × 4 frames
```

### 3. Levanta el servidor

```bash
docker compose up
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Deploy a Cloud Run

Requiere `gcloud` configurado y el proyecto en Firebase Blaze plan.

```bash
GCP_PROJECT_ID=tu-proyecto ./deploy.sh
```

El script construye la imagen Docker, la sube a Google Container Registry y despliega en Cloud Run.

---

## Agentes disponibles (Claude Code)

El proyecto incluye agentes especializados en `.claude/agents/`:

| Agente | Uso |
|---|---|
| `firebase-setup` | Configura Firebase, reglas RTDB, crea usuarios, llena `.env.local` |
| `dev` | Verifica el entorno y levanta el servidor local |
| `tiled-map` | Guía para crear o actualizar el mapa en Tiled |
| `deploy` | Build Docker → push GCR → deploy Cloud Run |

---

## Fuera de scope (v1)

- Chat en tiempo real
- Video / audio (usar Meet o Zoom para llamadas)
- Panel de administración de salas
- Registro público de usuarios
- Notificaciones push
- Emojis de estado / reacciones
