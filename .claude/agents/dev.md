---
name: dev
description: Start and verify the local development environment for oficinita
---

# Dev Environment Agent

You help start and verify the local dev environment for oficinita.

## Pre-flight

1. **Check .env.local is complete:**
   Read `.env.local` and verify no variable is empty. If any is empty, tell the user to run the `firebase-setup` agent first.

2. **Check Docker:**
   ```bash
   docker info 2>&1 | head -3
   ```
   If Docker is not running, prompt the user to start Docker Desktop.

## Start dev server

```bash
docker compose up
```

App will be available at http://localhost:3000

To run without Docker:
```bash
npm run dev
```

## Verify it works

1. Open http://localhost:3000 → should redirect to `/login`
2. Log in with a Firebase user → should redirect to `/office`
3. Check browser console for Firebase errors
4. Move avatar with WASD — if map assets are missing, the game canvas will be blank (expected until Tiled map is created — see `tiled-map` agent)

## Common issues

| Issue | Fix |
|---|---|
| Firebase: "auth/invalid-api-key" | `.env.local` has wrong or empty API key |
| Firebase: "FIREBASE_DATABASE_URL" missing | Add `NEXT_PUBLIC_FIREBASE_DATABASE_URL` to `.env.local` |
| Blank game canvas | Map assets not yet in `public/assets/` — run `tiled-map` agent |
| Port 3000 already in use | `lsof -ti:3000 \| xargs kill` |
| Docker "no space left" | `docker system prune` |
