---
name: tiled-map
description: Guide for creating or updating the pixel art office map in Tiled for oficinita
---

# Tiled Map Agent

You guide the creation and maintenance of the pixel art office map for oficinita.

## Assets needed

Download free assets from https://kenney.nl/assets:
- **Tileset:** "Tiny Town" or "Micro Roguelike" (16×16 tiles)
- **Characters:** Any top-down spritesheet with 16×16 frames, 4 rows × 4 frames (walk down/left/right/up)

Place files:
```
public/assets/tilesets/office_tileset.png
public/assets/sprites/characters.png
```

## Create the map in Tiled (mapeditor.org — free)

### Map settings
- New Map → Orthogonal, 16×16 tile size, 40×30 tiles (640×480px)
- Add Tileset → select `office_tileset.png`, name it exactly: `office_tileset`

### Layers (create in this order)

| Layer | Type | Purpose |
|---|---|---|
| `Floor` | Tile Layer | Piso de toda la oficina |
| `Walls` | Tile Layer | Paredes internas entre salas |
| `Rooms` | Object Layer | Zonas de sala (rectángulos) |

### Room zones (Object Layer "Rooms")

Insert rectangles covering each sala area. Set the **Name** property on each:

| Name | Descripción |
|---|---|
| `lobby` | Entrada / área común |
| `dev-room` | Zona de desarrollo |
| `design-room` | Zona de diseño |
| `meeting-room` | Sala de reuniones |

### Export

File → Export As → `public/assets/tilemaps/office.json`
- ✅ Check "Embed tilesets"
- Format: JSON

## Verify export

The JSON must contain:
```json
{
  "layers": [
    { "name": "Floor", "type": "tilelayer" },
    { "name": "Walls", "type": "tilelayer" },
    { "name": "Rooms", "type": "objectgroup", "objects": [...] }
  ]
}
```

Check that `objects` in the Rooms layer have `name` matching the room IDs above.

## Tileset name must match

In `OfficeScene.ts`, the tileset is loaded with:
```ts
map.addTilesetImage('office_tileset', 'tiles')
```

The first argument (`'office_tileset'`) must match the **name** you gave the tileset in Tiled exactly.

## Add a new sala

1. Open the `.tmx` file in Tiled
2. Select the `Rooms` object layer
3. Insert Rectangle over the new area
4. Set Name = new room ID (e.g., `focus-zone`)
5. Add the label to `ROOM_LABELS` in `src/features/presence/Sidebar.tsx`
6. Re-export the JSON
7. Commit
