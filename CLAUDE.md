# Oficinita — Project Context

Oficina virtual estilo Gather.town para equipo ≤5 personas.
Stack: Next.js 16 + Phaser 3 + Firebase (Auth/RTDB/Firestore) + Docker + Cloud Run.

## Architecture

Feature folders — `app/` es solo routing glue:
- `src/features/auth/` — AuthContext, LoginPage
- `src/features/presence/` — RTDB utils, Sidebar, types
- `src/features/office/` — OfficeScene (Phaser), GameCanvas, OfficePage
- `src/shared/firebase.ts` — Firebase init

## Key Constraints

- No SSR restriction — `output: standalone` (Docker/Cloud Run)
- Phaser siempre con `dynamic(() => import(...), { ssr: false })`
- RTDB positions throttled a 150ms
- Firebase SDK v10 modular
- No chat, no video, no admin UI en v1

## Dev

```bash
# Con Docker (recomendado)
docker compose up

# Sin Docker
npm run dev
```

## Deploy

```bash
GCP_PROJECT_ID=xxx ./deploy.sh
```

## Commits

Sin `Co-Authored-By` en los mensajes. Mensajes en español o inglés, formato convencional (`feat:`, `fix:`, `chore:`).

## Out of scope v1

Chat, video/audio, admin UI, registro público, notificaciones push.
