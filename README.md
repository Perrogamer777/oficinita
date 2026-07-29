<div align="center">

# 🏢 Oficinita

**Oficina virtual para equipos remotos pequeños**

Una experiencia tipo Gather.town — mapa pixel art top-down, avatares en tiempo real y presencia por sala, sin la complejidad ni el costo.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Phaser](https://img.shields.io/badge/Phaser-3-blue?logo=phaser)](https://phaser.io)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange?logo=firebase)](https://firebase.google.com)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://docker.com)
[![Cloud Run](https://img.shields.io/badge/GCP-Cloud%20Run-4285F4?logo=google-cloud)](https://cloud.google.com/run)

</div>

---

## ¿Qué es Oficinita?

Oficinita es una oficina virtual ligera pensada para equipos de hasta 5 personas que trabajan en remoto. A diferencia de herramientas como Zoom o Slack, Oficinita te da **contexto espacial**: ves en un mapa dónde está cada persona, en qué sala está trabajando, y puedes moverte por el espacio con tu avatar.

Sin suscripciones, sin límites de tiempo, sin reuniones agendadas — solo presencia.

---

## Funcionalidades

### 🗺️ Mapa pixel art interactivo
La oficina es un mapa top-down diseñado en [Tiled](https://mapeditor.org), con salas separadas por área de trabajo. El mapa es completamente personalizable.

### 👤 Avatares en tiempo real
Cada usuario controla su avatar con `WASD` o las flechas del teclado. Las posiciones se sincronizan entre todos los miembros del equipo en menos de **150ms**, con throttling inteligente para mantener el consumo de Firebase Realtime Database dentro del free tier.

### 🚪 Detección de sala automática
Al entrar a una zona (Dev Room, Design Room, Meeting Room, Lobby), el sistema actualiza automáticamente tu ubicación. Los compañeros ven en qué sala estás sin necesidad de actualizar manualmente.

### 📋 Sidebar de presencia
Panel lateral en tiempo real que muestra a cada miembro del equipo agrupado por sala. Sabes de un vistazo quién está disponible, quién está en una reunión, y quién está en tránsito.

### 🔐 Acceso controlado
Login con email y contraseña via Firebase Auth. Las cuentas se crean manualmente — no hay registro público ni acceso no autorizado.

---

## Tech Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 16 + React 19 | SSR, routing, App Router |
| Estilos | Tailwind CSS | Utilidades, sin CSS custom |
| Motor de juego | Phaser 3 | Tilemaps, sprites, física arcade |
| Auth | Firebase Authentication | Email/password, gratis para ≤5 usuarios |
| Presencia RT | Firebase Realtime Database | Baja latencia, ideal para posiciones frecuentes |
| Base de datos | Firestore | Perfiles y configuración estática |
| Dev | Docker Compose | Entorno reproducible |
| Producción | Google Cloud Run | Escala a cero, pago por uso |

**Costo estimado con ≤5 usuarios: $0/mes** (Firebase Spark plan gratuito + Cloud Run scale-to-zero)

---

## Arquitectura

```
src/
├── app/                    Routing Next.js (thin glue)
│   ├── login/page.tsx
│   └── office/page.tsx
│
├── features/               Lógica por dominio
│   ├── auth/               AuthContext, LoginPage, useAuth
│   ├── presence/           RTDB sync, Sidebar, tipos
│   └── office/             OfficeScene (Phaser), GameCanvas, OfficePage
│
└── shared/
    └── firebase.ts         Init Firebase
```

> **Regla:** `app/` solo importa desde el `index.ts` de cada feature. Nunca desde archivos internos.

---

## Primeros pasos

### Requisitos

- [Docker Desktop](https://docker.com/products/docker-desktop)
- Proyecto en [Firebase](https://console.firebase.google.com) con **Authentication** y **Realtime Database** habilitados
- Assets del mapa (ver sección [Mapa](#mapa))

### 1. Clonar el repositorio

```bash
git clone https://github.com/Perrogamer777/oficinita.git
cd oficinita
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz con los valores de tu proyecto Firebase:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

> Los valores los encuentras en Firebase Console → Configuración del proyecto → Tu app web.

### 3. Agregar assets del mapa

```
public/assets/
├── tilemaps/office.json          Exportado desde Tiled (ver sección Mapa)
├── tilesets/office_tileset.png   Tileset pixel art 16×16
└── sprites/characters.png        Spritesheet 16×16, 4 filas × 4 frames
```

Descarga tilesets gratuitos de [kenney.nl/assets](https://kenney.nl/assets) — recomendamos "Tiny Town" o "Micro Roguelike".

### 4. Levantar el servidor

```bash
docker compose up
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con las credenciales creadas en Firebase Authentication.

---

## Mapa

El mapa se crea con [Tiled](https://mapeditor.org) (gratuito) y se exporta como JSON.

**Configuración mínima:**

| Setting | Valor |
|---|---|
| Orientación | Orthogonal |
| Tamaño del tile | 16×16 px |
| Tamaño del mapa | 40×30 tiles |

**Layers requeridas:**

| Layer | Tipo | Descripción |
|---|---|---|
| `Floor` | Tile Layer | Piso de la oficina |
| `Walls` | Tile Layer | Paredes internas |
| `Rooms` | Object Layer | Zonas de sala (rectángulos con nombre) |

**Nombres de salas disponibles:** `lobby`, `dev-room`, `design-room`, `meeting-room`

Exportar como: `public/assets/tilemaps/office.json` con **"Embed tilesets"** activado.

---

## Deploy a producción

Requiere `gcloud` CLI configurado y el proyecto Firebase en **Blaze plan**.

```bash
GCP_PROJECT_ID=tu-proyecto-id ./deploy.sh
```

El script hace build de la imagen Docker, la sube a Google Container Registry y despliega en Cloud Run. Al finalizar imprime la URL pública del servicio.

> Recuerda agregar la URL al listado de **Authorized domains** en Firebase Console → Authentication.

---

## Agentes Claude Code

El proyecto incluye agentes especializados para las tareas más comunes:

```bash
# Invocar desde Claude Code
"usa el agente firebase-setup"
"usa el agente dev"
"usa el agente tiled-map"
"usa el agente deploy"
```

| Agente | Descripción |
|---|---|
| `firebase-setup` | Configura Firebase paso a paso, reglas RTDB, crea usuarios, llena `.env.local` |
| `dev` | Verifica el entorno local y levanta el servidor de desarrollo |
| `tiled-map` | Guía completa para crear o modificar el mapa de la oficina |
| `deploy` | Build → push → deploy a Cloud Run con checklist de pre-vuelo |

---

## Fuera de scope — v1

Las siguientes features están deliberadamente excluidas. Se agregarán solo si el equipo las necesita:

- 💬 Chat en tiempo real
- 🎥 Video / audio nativo (usar Meet o Zoom)
- ⚙️ Panel de administración de salas
- 📧 Registro público / invitaciones
- 🔔 Notificaciones push
- 😄 Emojis de estado / reacciones

---

<div align="center">

Hecho para equipos que prefieren trabajar juntos, aunque estén lejos.

</div>
