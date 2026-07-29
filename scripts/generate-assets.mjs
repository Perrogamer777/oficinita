/**
 * Genera los assets de Oficinita sin dependencias externas.
 * Crea: office_tileset.png, characters.png, office.json
 *
 * Uso: node scripts/generate-assets.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// ─── PNG utils ────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u32be(n) {
  const b = Buffer.allocUnsafe(4)
  b.writeUInt32BE(n >>> 0)
  return b
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  return Buffer.concat([u32be(data.length), t, data, u32be(crc32(Buffer.concat([t, data])))])
}

/**
 * Crea un PNG RGB desde un array de píxeles RGBA (Uint8ClampedArray).
 * pixels[i*4+0] = R, [+1] = G, [+2] = B, [+3] = A (ignorado, fondo negro)
 */
function makePNG(w, h, pixels) {
  const rowStride = w * 3 + 1  // filter byte + RGB
  const raw = Buffer.allocUnsafe(h * rowStride)
  for (let y = 0; y < h; y++) {
    raw[y * rowStride] = 0  // filter: None
    for (let x = 0; x < w; x++) {
      const pi = (y * w + x) * 4
      const ri = y * rowStride + 1 + x * 3
      raw[ri]     = pixels[pi]
      raw[ri + 1] = pixels[pi + 1]
      raw[ri + 2] = pixels[pi + 2]
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', Buffer.concat([u32be(w), u32be(h), Buffer.from([8, 2, 0, 0, 0])])),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function px(pixels, w, x, y, r, g, b) {
  const i = (y * w + x) * 4
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255
}

function fillRect(pixels, w, x0, y0, x1, y1, r, g, b) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      px(pixels, w, x, y, r, g, b)
}

// ─── Tileset (128×16px — 8 tiles de 16×16) ───────────────────────────────────
// Tile IDs (1-indexed en Tiled):
//  1=floor  2=floor-alt  3=wall  4=wall-top  5=wall-h  6=carpet  7=door  8=void
//
// Paleta inspirada en interiores de oficina pixel art

const TILES = [
  // R    G    B     descripción
  [210, 190, 155],  // 1: floor — parquet beige cálido
  [200, 178, 140],  // 2: floor-alt — parquet más oscuro (patrón tablero)
  [ 58,  52,  72],  // 3: wall — pared oscura
  [ 80,  72,  95],  // 4: wall-top — borde superior de pared
  [ 95,  85, 110],  // 5: wall-h — pared horizontal
  [110, 140, 175],  // 6: carpet — alfombra azul-gris (meeting room)
  [130,  90,  55],  // 7: door — puerta madera
  [ 25,  22,  35],  // 8: void — fuera del mapa
]

const TILE_W = 16
const TSET_W = TILES.length * TILE_W  // 128
const TSET_H = TILE_W                 // 16

const tsetPixels = new Uint8ClampedArray(TSET_W * TSET_H * 4)

for (let t = 0; t < TILES.length; t++) {
  const [r, g, b] = TILES[t]
  const tx = t * TILE_W

  for (let y = 0; y < TILE_W; y++) {
    for (let x = 0; x < TILE_W; x++) {
      // Patrón de tablero sutil para floor tiles
      const checker = (t === 0 || t === 1) && (x + y) % 4 === 0 ? -15 : 0
      // Borde oscuro en tiles de pared
      const edge = (t === 2 || t === 3 || t === 4) &&
        (x === 0 || y === 0 || x === 15 || y === 15) ? -20 : 0
      // Highlight superior en pared
      const top = (t === 3 || t === 4) && y === 0 ? 30 : 0

      const dr = Math.min(255, Math.max(0, r + checker + edge + top))
      const dg = Math.min(255, Math.max(0, g + checker + edge + top))
      const db = Math.min(255, Math.max(0, b + checker + edge + top))
      px(tsetPixels, TSET_W, tx + x, y, dr, dg, db)
    }
  }
}

// ─── Characters (64×64px — 4 frames × 4 dir, cada sprite 16×16) ──────────────
// Row 0: walk-down  Row 1: walk-left  Row 2: walk-right  Row 3: walk-up
// 4 frames de animación por dirección

const CHAR_W = 64
const CHAR_H = 64
const charPixels = new Uint8ClampedArray(CHAR_W * CHAR_H * 4)

// Fondo transparente → negro en PNG RGB
fillRect(charPixels, CHAR_W, 0, 0, 63, 63, 25, 22, 35)

// Paleta personaje: cuerpo azul-índigo, cara skin, pelo oscuro
const SKIN  = [255, 218, 180]
const HAIR  = [ 60,  45,  30]
const SHIRT = [ 80, 110, 200]  // azul
const PANTS = [ 50,  60,  90]
const SHOES = [ 30,  25,  20]

function drawCharacter(baseX, baseY, dir, frame) {
  // dir: 0=down, 1=left, 2=right, 3=up
  // frame: 0-3 (animación de caminar)
  const legOffset = [0, -1, 1, 0][frame % 4]
  const armOffset = frame % 2 === 0 ? 0 : 1

  // --- Cuerpo (8×8 en el centro del sprite 16×16) ---
  // Sprite centrado en (8,8) dentro del tile

  // Pelo / cabeza  (4×4 en fila 2-5, col 6-9)
  fillRect(charPixels, CHAR_W, baseX+5, baseY+2, baseX+10, baseY+3, ...HAIR)
  // Cara
  fillRect(charPixels, CHAR_W, baseX+5, baseY+4, baseX+10, baseY+7, ...SKIN)
  // Ojos — dependen de dirección
  if (dir !== 3) {  // no mostrar ojos de espalda
    const eyeY = baseY + 5
    px(charPixels, CHAR_W, baseX+6,  eyeY, 30, 20, 20)
    px(charPixels, CHAR_W, baseX+9,  eyeY, 30, 20, 20)
  }
  // Camisa / torso
  fillRect(charPixels, CHAR_W, baseX+5, baseY+8, baseX+10, baseY+11, ...SHIRT)
  // Brazos
  const armL = baseX + 4
  const armR = baseX + 11
  fillRect(charPixels, CHAR_W, armL, baseY+8+armOffset,  armL+0, baseY+10+armOffset,  ...SHIRT)
  fillRect(charPixels, CHAR_W, armR, baseY+8-armOffset, armR+0, baseY+10-armOffset, ...SHIRT)
  // Pantalón
  fillRect(charPixels, CHAR_W, baseX+5, baseY+12, baseX+10, baseY+13, ...PANTS)
  // Piernas (animadas)
  const legL = baseX + 5
  const legR = baseX + 8
  fillRect(charPixels, CHAR_W, legL, baseY+13, legL+1, baseY+14+legOffset,   ...PANTS)
  fillRect(charPixels, CHAR_W, legR, baseY+13, legR+1, baseY+14-legOffset,   ...PANTS)
  // Zapatos
  fillRect(charPixels, CHAR_W, legL, baseY+14+legOffset+1,   legL+1, baseY+15, ...SHOES)
  fillRect(charPixels, CHAR_W, legR, baseY+14-legOffset+1, legR+1, baseY+15, ...SHOES)
}

for (let dir = 0; dir < 4; dir++) {
  for (let frame = 0; frame < 4; frame++) {
    drawCharacter(frame * 16, dir * 16, dir, frame)
  }
}

// ─── Mapa Tiled JSON (40×30 tiles) ───────────────────────────────────────────
// Salas:
//   LOBBY       : cols 1-38, rows 1-8
//   DEV ROOM    : cols 1-18, rows 10-28
//   DESIGN ROOM : cols 21-38, rows 10-19
//   MEETING ROOM: cols 21-38, rows 21-28
// Paredes en los bordes de cada sala y del mapa

const MAP_W = 40
const MAP_H = 30
const T_FLOOR   = 1
const T_FLOOR2  = 2
const T_WALL    = 3
const T_WALLT   = 4
const T_WALLH   = 5
const T_CARPET  = 6
const T_DOOR    = 7
const T_VOID    = 8

function makeFloor(w, h) {
  return Array.from({ length: h * w }, (_, i) => {
    const x = i % w
    const y = Math.floor(i / w)
    // Carpet en meeting room
    if (x >= 21 && x <= 38 && y >= 21 && y <= 28) return T_CARPET
    // Patrón tablero de parquet sutil en el resto
    return (x + y) % 2 === 0 ? T_FLOOR : T_FLOOR2
  })
}

function makeWalls(w, h) {
  const d = new Array(h * w).fill(0)
  const set = (x, y, t) => { if (x >= 0 && x < w && y >= 0 && y < h) d[y * w + x] = t }

  // Borde del mapa
  for (let x = 0; x < w; x++) { set(x, 0, T_WALL); set(x, h-1, T_WALL) }
  for (let y = 0; y < h; y++) { set(0, y, T_WALL); set(w-1, y, T_WALL) }

  // Divisor horizontal entre LOBBY y salas inferiores (fila 9)
  for (let x = 1; x < w-1; x++) set(x, 9, T_WALLH)

  // Divisor vertical entre DEV y DESIGN/MEETING (col 19-20)
  for (let y = 10; y < h-1; y++) { set(19, y, T_WALL); set(20, y, T_WALL) }

  // Divisor horizontal entre DESIGN y MEETING (fila 20)
  for (let x = 21; x < w-1; x++) set(x, 20, T_WALLH)

  // Puertas (quitar un tile de la pared para que sea transitable)
  set(9,  9, T_DOOR)   // puerta lobby → dev room
  set(29, 9, T_DOOR)   // puerta lobby → design room
  set(19, 15, T_DOOR)  // puerta dev → meeting (lateral)
  set(20, 15, T_DOOR)
  set(29, 20, T_DOOR)  // puerta design → meeting

  return d
}

const floorData = makeFloor(MAP_W, MAP_H)
const wallsData = makeWalls(MAP_W, MAP_H)

// Zona de spawn en el centro del Lobby
const SPAWN_X = 19 * 16   // px
const SPAWN_Y =  4 * 16   // px

const officeMap = {
  height: MAP_H,
  width: MAP_W,
  tileheight: TILE_W,
  tilewidth: TILE_W,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.10.0',
  type: 'map',
  version: '1.10',
  nextlayerid: 4,
  nextobjectid: 10,
  layers: [
    {
      id: 1,
      name: 'Floor',
      type: 'tilelayer',
      width: MAP_W,
      height: MAP_H,
      x: 0, y: 0,
      opacity: 1,
      visible: true,
      data: floorData,
    },
    {
      id: 2,
      name: 'Walls',
      type: 'tilelayer',
      width: MAP_W,
      height: MAP_H,
      x: 0, y: 0,
      opacity: 1,
      visible: true,
      data: wallsData,
    },
    {
      id: 3,
      name: 'Rooms',
      type: 'objectgroup',
      x: 0, y: 0,
      opacity: 1,
      visible: true,
      objects: [
        { id: 1, name: 'spawn',        x: SPAWN_X, y: SPAWN_Y, width: 16, height: 16 },
        { id: 2, name: 'lobby',        x: 16,  y: 16,  width: 576, height: 112 },
        { id: 3, name: 'dev-room',     x: 16,  y: 160, width: 272, height: 288 },
        { id: 4, name: 'design-room',  x: 336, y: 160, width: 272, height: 144 },
        { id: 5, name: 'meeting-room', x: 336, y: 336, width: 272, height: 128 },
      ],
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'office_tileset',
      tilewidth: TILE_W,
      tileheight: TILE_W,
      spacing: 0,
      margin: 0,
      tilecount: 8,
      columns: 8,
      image: '../tilesets/office_tileset.png',
      imagewidth: TSET_W,
      imageheight: TILE_W,
    },
  ],
}

// ─── Write files ──────────────────────────────────────────────────────────────

const BASE = 'public/assets'
mkdirSync(`${BASE}/tilesets`, { recursive: true })
mkdirSync(`${BASE}/sprites`,  { recursive: true })
mkdirSync(`${BASE}/tilemaps`, { recursive: true })

writeFileSync(`${BASE}/tilesets/office_tileset.png`, makePNG(TSET_W, TSET_H, tsetPixels))
writeFileSync(`${BASE}/sprites/characters.png`,      makePNG(CHAR_W, CHAR_H, charPixels))
writeFileSync(`${BASE}/tilemaps/office.json`,        JSON.stringify(officeMap, null, 2))

console.log('✓ office_tileset.png  (128×16, 8 tiles)')
console.log('✓ characters.png      (64×64, 4 dir × 4 frames)')
console.log('✓ office.json         (40×30 tiles, 4 salas + spawn)')
