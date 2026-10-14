import { SPRITE, TEX, TILE } from './constants.js'

function hash2(x, y) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

function createTexture(paint, size = TEX) {
  const data = new Uint8ClampedArray(size * size * 4)
  const set = (x, y, c) => {
    const px = x | 0
    const py = y | 0
    if (px < 0 || py < 0 || px >= size || py >= size) return
    const i = (py * size + px) * 4
    data[i] = c[0]
    data[i + 1] = c[1]
    data[i + 2] = c[2]
    data[i + 3] = c[3]
  }
  paint(set)
  return data
}

function mix(c, n) {
  const r = c[0] + n
  const g = c[1] + n
  const b = c[2] + n
  return [
    r < 0 ? 0 : r > 255 ? 255 : r,
    g < 0 ? 0 : g > 255 ? 255 : g,
    b < 0 ? 0 : b > 255 ? 255 : b,
    c[3],
  ]
}

function rect(set, x, y, w, h, c) {
  rectN(set, x, y, w, h, c, 0)
}

function rectN(set, x, y, w, h, c, vary) {
  if (w <= 0 || h <= 0) return
  const x0 = x | 0
  const y0 = y | 0
  const x1 = (x + w) | 0
  const y1 = (y + h) | 0
  const mid = (x0 + x1) / 2
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      if (!vary) {
        set(xx, yy, c)
        continue
      }
      const n = (hash2(xx, yy) - 0.5) * vary + (mid - xx) * 0.45
      set(xx, yy, mix(c, n))
    }
  }
}

function disc(set, cx, cy, rx, ry, c, vary = 0, light = 11) {
  if (rx < 0.5 || ry < 0.5) return
  const x0 = Math.floor(cx - rx)
  const y0 = Math.floor(cy - ry)
  const x1 = Math.ceil(cx + rx)
  const y1 = Math.ceil(cy + ry)
  for (let y = y0; y < y1; y++) {
    const ny = (y + 0.5 - cy) / ry
    const ny2 = ny * ny
    for (let x = x0; x < x1; x++) {
      const nx = (x + 0.5 - cx) / rx
      if (nx * nx + ny2 > 1) continue
      const n = (vary ? (hash2(x, y) - 0.5) * vary : 0) + (-nx - ny) * light
      set(x, y, mix(c, n))
    }
  }
}

function roundRect(set, x, y, w, h, r, c, vary = 0) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2))
  rectN(set, x + rad, y, w - rad * 2, h, c, vary)
  if (rad <= 0) return
  rectN(set, x, y + rad, rad, h - rad * 2, c, vary)
  rectN(set, x + w - rad, y + rad, rad, h - rad * 2, c, vary)
  disc(set, x + rad, y + rad, rad, rad, c, vary)
  disc(set, x + w - rad, y + rad, rad, rad, c, vary)
  disc(set, x + rad, y + h - rad, rad, rad, c, vary)
  disc(set, x + w - rad, y + h - rad, rad, rad, c, vary)
}

function panel(set, x, y, w, h, r, c, vary = 0) {
  roundRect(set, x - 1, y - 1, w + 2, h + 2, r + 1, OUTLINE, 0)
  roundRect(set, x, y, w, h, r, c, vary)
}

function mass(set, parts, c, vary = 0) {
  for (const [x, y, w, h, r] of parts) {
    roundRect(set, x - 1, y - 1, w + 2, h + 2, r + 1, OUTLINE, 0)
  }
  for (const [x, y, w, h, r] of parts) {
    roundRect(set, x, y, w, h, r, c, vary)
  }
}

function stroke(set, x0, y0, x1, y1, c, radius) {
  const dx = x1 - x0
  const dy = y1 - y0
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    disc(set, x0 + dx * t, y0 + dy * t, radius, radius, c, 0)
  }
}

function blob(set, x, y, w, h, c) {
  rect(set, x - 1, y - 1, w + 2, h + 2, OUTLINE)
  rect(set, x, y, w, h, c)
}

const OUTLINE = [14, 10, 12, 255]
const HELM = [62, 74, 56, 255]
const HELM_HI = [128, 144, 104, 255]
const HELM_DK = [32, 40, 30, 255]
const SKIN = [214, 164, 122, 255]
const SKIN_HI = [236, 198, 160, 255]
const SKIN_DK = [158, 108, 78, 255]
const EYE_W = [232, 226, 214, 255]
const EYE = [24, 18, 16, 255]
const JACKET = [52, 70, 104, 255]
const JACKET_HI = [86, 108, 146, 255]
const JACKET_DK = [30, 40, 62, 255]
const BELT = [96, 62, 40, 255]
const BUCKLE = [198, 170, 86, 255]
const GUN = [156, 160, 168, 255]
const GUN_HI = [208, 212, 218, 255]
const GUN_DK = [58, 62, 70, 255]
const WOOD = [118, 74, 44, 255]
const WOOD_DK = [72, 44, 26, 255]
const PANTS = [36, 40, 52, 255]
const PANTS_HI = [62, 68, 82, 255]
const BOOT = [24, 22, 24, 255]
const BOOT_HI = [58, 56, 60, 255]
const FLASH = [255, 196, 84, 255]
const FLASH_CORE = [255, 250, 226, 255]

function paintStone(set) {
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const bx = (x / 16) | 0
      const by = (y / 16) | 0
      const edge = x % 16 === 0 || y % 16 === 0
      const n = hash2(x, y)
      const block = hash2(bx + 3, by + 9)
      let v = 88 + block * 42 + n * 16
      if (edge) v = 46 + n * 10
      set(x, y, [v, v * 0.97, v * 0.9, 255])
    }
  }
}

function paintBrick(set) {
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const row = (y / 8) | 0
      const offset = (row % 2) * 16
      const lx = (x + offset) % 32
      const ly = y % 8
      const n = hash2(x, y)
      if (ly === 0 || ly === 7 || lx === 0 || lx === 1) {
        set(x, y, [78 + n * 10, 64 + n * 8, 54 + n * 6, 255])
      } else {
        const shade = (row % 3) * 8
        set(x, y, [132 + shade + n * 24, 62 + n * 14, 48 + n * 8, 255])
      }
    }
  }
}

function paintMoss(set) {
  paintStone(set)
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const n = hash2(x + 19, y + 4)
      if (n < 0.82) continue
      const g = 90 + hash2(x, y) * 50
      set(x, y, [46, g, 52, 255])
    }
  }
}

function paintMetal(set) {
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const ridge = (x % 8 === 0) || (x % 8 === 1)
      const n = hash2(x, y)
      const rivet = y % 16 === 8 && x % 16 === 8
      if (rivet) {
        set(x, y, [30, 34, 40, 255])
        continue
      }
      const v = ridge ? 62 + n * 10 : 118 + n * 20
      set(x, y, [v * 0.78, v * 0.84, v, 255])
    }
  }
}

function paintDoor(set) {
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const plank = (x / 8) | 0
      const n = hash2(x, y + plank * 17)
      const seam = x % 8 === 0
      const band = (y > 14 && y < 20) || (y > 44 && y < 50)
      if (band) {
        const v = 58 + n * 16
        set(x, y, [v, v + 4, v + 10, 255])
      } else if (seam) {
        set(x, y, [42, 28, 18, 255])
      } else {
        set(x, y, [96 + n * 28 + (plank % 2) * 8, 60 + n * 14, 36 + n * 8, 255])
      }
    }
  }
  rect(set, 40, 28, 6, 8, [186, 162, 72, 255])
}

function paintLeg(set, x, front) {
  panel(set, x, 84, 16, 28, 3, front ? PANTS_HI : PANTS, 8)
  rect(set, x + 2, 98, 12, 3, PANTS)
  panel(set, x - 1, 110, 18, 14, 3, BOOT, 5)
  rect(set, x + 1, 112, 10, 2, BOOT_HI)
  stroke(set, x + 4, 114, x + 4, 120, BOOT_HI, 0.6)
  stroke(set, x + 8, 114, x + 8, 120, BOOT_HI, 0.6)
  rect(set, x - 1, 122, 18, 4, [12, 10, 12, 255])
}

function paintHead(set) {
  rectN(set, 58, 50, 12, 10, SKIN_DK, 3)
  disc(set, 64, 22, 20, 14, HELM, 4, 5)
  roundRect(set, 50, 30, 28, 22, 7, SKIN, 3)
  roundRect(set, 46, 28, 36, 6, 2, HELM, 2)
  rect(set, 48, 32, 32, 2, HELM_DK)
  rectN(set, 52, 35, 24, 4, SKIN_DK, 2)
  disc(set, 57, 40, 3, 2, EYE_W, 0, 0)
  disc(set, 71, 40, 3, 2, EYE_W, 0, 0)
  disc(set, 57, 40, 1.3, 1.5, EYE, 0, 0)
  disc(set, 71, 40, 1.3, 1.5, EYE, 0, 0)
  rect(set, 54, 36, 7, 2, [42, 32, 28, 255])
  rect(set, 67, 36, 7, 2, [42, 32, 28, 255])
  rect(set, 63, 42, 2, 4, SKIN_DK)
  set(62, 46, SKIN_DK)
  set(65, 46, SKIN_DK)
  rect(set, 59, 49, 7, 2, [154, 90, 78, 255])
  rectN(set, 56, 51, 16, 2, SKIN_DK, 2)
  disc(set, 56, 16, 5, 2.5, HELM_HI, 0, 0)
  rect(set, 62, 17, 4, 4, BUCKLE)
}

function paintRifleLow(set, bob) {
  const y = bob | 0
  panel(set, 96, 78 + y, 12, 30, 2, WOOD, 7)
  rect(set, 97, 102 + y, 10, 4, WOOD_DK)
  panel(set, 93, 62 + y, 16, 20, 2, GUN_DK, 4)
  rect(set, 96, 65 + y, 10, 4, GUN)
  rectN(set, 98, 40 + y, 5, 26, GUN_DK, 3)
  rect(set, 99, 40 + y, 2, 24, GUN_HI)
  rect(set, 98, 37 + y, 5, 4, GUN)
  panel(set, 88, 74 + y, 8, 14, 1, GUN_DK, 3)
  stroke(set, 104, 46 + y, 112, 78 + y, WOOD_DK, 1)
  disc(set, 100, 90 + y, 7, 5, SKIN, 5)
  stroke(set, 96, 88 + y, 96, 94 + y, SKIN_DK, 0.7)
  stroke(set, 100, 87 + y, 100, 94 + y, SKIN_DK, 0.7)
  stroke(set, 104, 88 + y, 104, 94 + y, SKIN_DK, 0.7)
}

function paintRifleAimed(set) {
  panel(set, 16, 58, 24, 12, 2, WOOD, 6)
  rect(set, 16, 66, 8, 6, WOOD_DK)
  rectN(set, 36, 56, 42, 11, GUN_DK, 4)
  rect(set, 40, 57, 34, 3, GUN_HI)
  rectN(set, 76, 58, 30, 6, GUN_DK, 3)
  rect(set, 78, 59, 26, 2, GUN_HI)
  panel(set, 48, 66, 9, 14, 1, GUN_DK, 3)
  disc(set, 34, 66, 7, 5, SKIN, 5)
  disc(set, 64, 66, 6, 5, SKIN, 5)
  disc(set, 112, 60, 12, 9, FLASH, 0)
  disc(set, 114, 60, 6, 5, FLASH_CORE, 0)
  rect(set, 102, 52, 8, 2, FLASH)
  rect(set, 100, 68, 10, 2, FLASH)
}

function paintSentry(pose) {
  return createTexture((set) => {
    const stride = (pose.leg || 0) * 5
    const leftX = 40 + stride
    const rightX = 74 - stride
    if (stride >= 0) {
      paintLeg(set, rightX, false)
      paintLeg(set, leftX, true)
    } else {
      paintLeg(set, leftX, false)
      paintLeg(set, rightX, true)
    }

    panel(set, 38, 48, 52, 40, 5, JACKET, 10)
    rectN(set, 39, 54, 8, 28, JACKET_DK, 5)
    rectN(set, 78, 56, 10, 22, JACKET_HI, 5)
    panel(set, 42, 46, 14, 8, 2, JACKET_HI, 4)
    panel(set, 72, 46, 14, 8, 2, JACKET_HI, 4)
    rect(set, 62, 50, 3, 24, JACKET_DK)
    for (const by of [56, 64, 72]) disc(set, 63, by, 1.7, 1.7, BUCKLE, 0)
    panel(set, 44, 66, 14, 12, 2, JACKET_DK, 4)
    panel(set, 70, 66, 14, 12, 2, JACKET_DK, 4)
    rect(set, 44, 66, 14, 3, JACKET_HI)
    rect(set, 70, 66, 14, 3, JACKET_HI)
    rectN(set, 40, 82, 48, 8, BELT, 6)
    disc(set, 64, 86, 5, 4, BUCKLE, 0)
    rect(set, 63, 83, 2, 6, BELT)
    panel(set, 78, 84, 8, 10, 1, [70, 78, 62, 255], 4)

    if (pose.attack) {
      panel(set, 22, 50, 16, 22, 4, JACKET, 7)
      rect(set, 24, 68, 12, 4, JACKET_DK)
      paintRifleAimed(set)
    } else {
      const swing = -stride
      panel(set, 20, 48 + (swing > 0 ? 6 : 0), 16, 30, 4, JACKET, 7)
      rect(set, 22, 70 + (swing > 0 ? 4 : 0), 12, 4, JACKET_DK)
      disc(set, 28, 78 + (swing > 0 ? 8 : 0), 6, 5, SKIN, 5)
      panel(set, 90, 50, 14, 24, 4, JACKET_DK, 6)
      paintRifleLow(set, -stride * 0.4)
    }
    paintHead(set)
  }, SPRITE)
}

function paintDead() {
  return createTexture((set) => {
    panel(set, 86, 108, 28, 14, 3, PANTS, 6)
    panel(set, 108, 112, 16, 12, 2, BOOT, 4)
    rect(set, 108, 122, 16, 4, [12, 10, 12, 255])
    panel(set, 30, 100, 58, 22, 4, JACKET, 8)
    rectN(set, 40, 114, 36, 6, BELT, 4)
    disc(set, 62, 117, 3.5, 3, BUCKLE, 0)
    panel(set, 14, 112, 24, 10, 3, JACKET_DK, 4)
    disc(set, 14, 118, 6, 5, SKIN, 4)
    disc(set, 20, 106, 12, 10, HELM, 3, 4)
    disc(set, 28, 112, 7, 6, SKIN, 2, 3)
    disc(set, 18, 104, 9, 7, HELM, 2, 3)
    disc(set, 30, 112, 1.4, 1.4, EYE, 0, 0)
    rect(set, 28, 116, 5, 1, [154, 90, 78, 255])
    rect(set, 48, 122, 40, 4, GUN_DK)
    rect(set, 78, 120, 10, 4, WOOD)
  }, SPRITE)
}

function paintWeapon(firing) {
  return createTexture((set) => {
    panel(set, -6, 100, 46, 36, 8, JACKET, 8)
    panel(set, 88, 100, 46, 36, 8, JACKET, 8)
    rect(set, 4, 98, 28, 6, JACKET_HI)
    rect(set, 96, 98, 28, 6, JACKET_HI)

    rect(set, 60, 0, 8, 8, GUN)
    rectN(set, 59, 6, 10, 26, GUN_DK, 4)
    rect(set, 61, 8, 3, 22, GUN_HI)
    disc(set, 64, 12, 3.2, 3.2, [16, 16, 20, 255], 0)
    panel(set, 54, 28, 20, 22, 2, GUN, 6)
    rect(set, 57, 30, 14, 3, GUN_HI)
    for (let i = 0; i < 4; i++) rect(set, 58 + i * 3, 38, 1, 7, GUN_DK)
    rect(set, 59, 35, 8, 4, [24, 26, 30, 255])
    rect(set, 56, 26, 3, 5, GUN_DK)
    rect(set, 69, 26, 3, 5, GUN_DK)
    panel(set, 56, 48, 16, 14, 2, GUN_DK, 4)
    rect(set, 57, 58, 14, 2, GUN)
    rect(set, 57, 58, 2, 8, GUN)
    rect(set, 69, 58, 2, 8, GUN)
    rect(set, 57, 66, 14, 2, GUN)
    rect(set, 62, 60, 2, 5, GUN_HI)
    panel(set, 58, 64, 12, 40, 3, WOOD, 8)
    rect(set, 60, 76, 8, 2, WOOD_DK)
    rect(set, 60, 90, 8, 2, WOOD_DK)

    mass(set, [
      [8, 94, 20, 28, 6],
      [20, 76, 18, 26, 5],
      [32, 60, 26, 16, 4],
    ], SKIN, 5)
    rect(set, 36, 66, 18, 2, SKIN_DK)
    disc(set, 30, 74, 4, 5, SKIN_HI, 2)

    mass(set, [
      [76, 94, 18, 28, 6],
      [66, 72, 22, 36, 6],
      [50, 78, 22, 30, 4],
    ], SKIN, 5)
    rect(set, 52, 86, 16, 2, SKIN_DK)
    rect(set, 52, 98, 16, 2, SKIN_DK)
    disc(set, 66, 70, 6, 8, SKIN_HI, 3)

    if (firing) {
      disc(set, 64, 0, 13, 9, FLASH, 0)
      disc(set, 64, 0, 5, 4, FLASH_CORE, 0)
      rect(set, 44, 2, 10, 2, FLASH)
      rect(set, 78, 4, 10, 2, FLASH)
    }
  }, SPRITE)
}

function paintScaled(draw) {
  return createTexture((set) => {
    const k = SPRITE / TEX
    const block = (x, y, c) => {
      const x0 = (x * k) | 0
      const y0 = (y * k) | 0
      for (let yy = 0; yy < k; yy++) {
        for (let xx = 0; xx < k; xx++) set(x0 + xx, y0 + yy, c)
      }
    }
    draw(block)
  }, SPRITE)
}

function paintMed() {
  return paintScaled((set) => {
    blob(set, 22, 36, 20, 18, [232, 232, 226, 255])
    rect(set, 29, 38, 6, 14, [176, 32, 32, 255])
    rect(set, 24, 42, 16, 6, [176, 32, 32, 255])
  })
}

function paintAmmo() {
  return paintScaled((set) => {
    blob(set, 20, 42, 24, 14, [70, 78, 64, 255])
    rect(set, 24, 40, 16, 4, [176, 156, 72, 255])
    rect(set, 23, 46, 18, 3, [40, 44, 36, 255])
  })
}

function paintExit(lit) {
  return paintScaled((set) => {
    const gold = lit ? [232, 196, 96, 255] : [186, 146, 62, 255]
    blob(set, 16, 28, 32, 32, [48, 42, 36, 255])
    rect(set, 20, 34, 24, 4, gold)
    rect(set, 20, 42, 24, 4, gold)
    rect(set, 20, 50, 24, 4, gold)
    rect(set, 30, 32, 4, 22, [90, 70, 40, 255])
  })
}

let cache = null

export function buildAssets() {
  if (cache) return cache
  const walls = []
  walls[TILE.STONE] = createTexture(paintStone)
  walls[TILE.BRICK] = createTexture(paintBrick)
  walls[TILE.MOSS] = createTexture(paintMoss)
  walls[TILE.METAL] = createTexture(paintMetal)
  walls[TILE.DOOR] = createTexture(paintDoor)
  cache = {
    walls,
    enemy: {
      walk: [
        paintSentry({ leg: -2 }),
        paintSentry({ leg: -1 }),
        paintSentry({ leg: 2 }),
        paintSentry({ leg: 1 }),
      ],
      attack: paintSentry({ leg: 0, attack: true }),
      dead: paintDead(),
    },
    weapon: {
      idle: paintWeapon(false),
      fire: paintWeapon(true),
    },
    pickup: {
      med: paintMed(),
      ammo: paintAmmo(),
    },
    exit: [paintExit(false), paintExit(true)],
  }
  return cache
}
