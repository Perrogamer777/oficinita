# Oficinita — Virtual Office Design

**Date:** 2026-07-29
**Team size:** up to 5 users
**Stack:** Next.js + Phaser 3 + Firebase (Auth + RTDB + Firestore + Hosting)

---

## Objetivo

Oficina virtual estilo Gather.town para equipo pequeño (≤5 personas). Mapa pixel art top-down donde los usuarios ven en tiempo real quién está en qué sala y pueden mover su avatar por el espacio.

---

## Arquitectura

```
Next.js (Firebase Hosting)
├── /login          Firebase Auth (email/password)
├── /office         GameCanvas + Sidebar
└── /admin          (fuera de scope v1)

Firebase Realtime Database  → posiciones en vivo (throttle 150ms)
Firestore                   → perfiles de usuario, config de salas
Firebase Auth               → sesión
Tiled (herramienta externa) → diseño del mapa pixel art → JSON estático
Phaser 3                    → render del mapa, movimiento, detección de zonas
```

---

## Modelo de datos

### Firebase Realtime Database
```json
/presence/{userId}: {
  "x": 320,
  "y": 180,
  "room": "dev-room",
  "displayName": "Luis",
  "avatar": "character_1",
  "online": true
}
```

### Firestore
```
/users/{userId}
  displayName: string
  email: string
  avatar: string        (sprite key elegido al registrarse)

/rooms/{roomId}
  name: string
  x, y, width, height: number   (zona en el mapa, en píxeles)
  description: string
```

El mapa es un JSON exportado desde Tiled, cargado como asset estático.
Las zonas de sala son rectángulos definidos en Tiled — Phaser detecta colisión y actualiza `room` en RTDB.

---

## Componentes

### GameCanvas (Phaser 3)
- Carga tilemap JSON + tilesets pixel art
- Avatar local: movimiento WASD/flechas
- Publica posición en RTDB cada 150ms (throttled)
- Escucha `/presence` → renderiza avatares de otros usuarios
- Detecta zona de sala → actualiza `room` al entrar/salir
- Al cerrar sesión → `online: false` en RTDB

### Sidebar (React)
- Escucha `/presence` con `onValue`
- Agrupa usuarios por sala
- Muestra sprite/nombre por usuario
- Badge "en tránsito" para usuarios sin sala asignada

### Auth flow
- `/office` protegida — redirige a `/login` sin sesión activa
- Login con email/password via Firebase Auth

---

## Costo estimado

Firebase Spark plan (gratuito). Con ≤5 usuarios el bandwidth de RTDB (~6 GB/mes) no supera el free tier (10 GB/mes). Costo: **$0/mes**.

Si el equipo crece a 20+ usuarios: migrar a Blaze plan (~$10–20 USD/mes).

---

## Fuera de scope v1

Estas features quedan deliberadamente excluidas. Agregar solo si el equipo las pide explícitamente:

| Feature | Razón para excluir |
|---|---|
| Chat en tiempo real | La presencia visual cubre la necesidad inmediata |
| Admin UI de salas | Los rooms se configuran en Tiled directamente |
| Notificaciones push | Ver el mapa es suficiente para ≤5 personas |
| Video/audio nativo (WebRTC) | Para llamadas usar Meet/Zoom; no justifica la complejidad |
| Emojis de reacción / estados | Agregar en v2 si se pide |
| Registro público / invitaciones | Cuentas creadas manualmente por admin en v1 |

---

## Decisiones tomadas

- **Phaser 3 sobre Pixi.js:** soporte nativo de tilemaps Tiled y movimiento — evita reinventar lo que Phaser da gratis.
- **RTDB para posiciones, Firestore para el resto:** RTDB está optimizada para alta frecuencia; Firestore para datos estructurados con queries.
- **Firebase free tier:** con ≤5 usuarios no se supera el límite nunca en condiciones normales.
- **Throttle 150ms:** equilibrio entre fluidez visual y bandwidth — se ve suave sin desperdiciar recursos.
