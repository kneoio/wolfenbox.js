import { TEX, TILE } from './constants.js'

function hash2(x, y) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

function createTexture(paint) {
  const data = new Uint8ClampedArray(TEX * TEX * 4)
  const set = (x, y, c) => {
    const px = x | 0
    const py = y | 0
    if (px < 0 || py < 0 || px >= TEX || py >= TEX) return
    const i = (py * TEX + px) * 4
    data[i] = c[0]
    data[i + 1] = c[1]
    data[i + 2] = c[2]
    data[i + 3] = c[3]
  }
  paint(set)
  return data
}

function rect(set, x, y, w, h, c) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) set(x + xx, y + yy, c)
  }
}

function blob(set, x, y, w, h, c) {
  rect(set, x - 1, y - 1, w + 2, h + 2, OUTLINE)
  rect(set, x, y, w, h, c)
}

const OUTLINE = [14, 10, 12, 255]
const HELM = [64, 78, 58, 255]
const HELM_HI = [102, 118, 84, 255]
const SKIN = [214, 166, 124, 255]
const EYE = [24, 18, 16, 255]
const JACKET = [58, 74, 102, 255]
const JACKET_DK = [36, 46, 66, 255]
const BELT = [96, 62, 42, 255]
const GUN = [154, 158, 164, 255]
const GUN_DK = [72, 76, 84, 255]
const PANTS = [38, 42, 52, 255]
const BOOT = [18, 18, 20, 255]
const FLASH = [255, 214, 110, 255]
const GRIP = [92, 58, 40, 255]

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

function paintSentry(pose) {
  return createTexture((set) => {
    const leg = pose.leg || 0
    blob(set, 22 + leg * 3, 40, 8, 16, PANTS)
    blob(set, 34 - leg * 3, 40, 8, 16, PANTS)
    blob(set, 22 + leg * 3, 54, 8, 8, BOOT)
    blob(set, 34 - leg * 3, 54, 8, 8, BOOT)
    blob(set, 18, 26, 28, 16, JACKET)
    rect(set, 20, 36, 24, 4, BELT)
    blob(set, 12, 28, 8, 14, JACKET_DK)
    if (pose.attack) {
      blob(set, 40, 24, 8, 10, JACKET)
      blob(set, 46, 22, 14, 6, GUN)
      rect(set, 48, 23, 6, 4, GUN_DK)
      rect(set, 58, 20, 5, 8, FLASH)
    } else {
      blob(set, 42, 28, 8, 14, JACKET)
      blob(set, 48, 36, 12, 5, GUN)
      rect(set, 50, 37, 6, 3, GUN_DK)
    }
    blob(set, 20, 6, 24, 16, HELM)
    rect(set, 24, 8, 16, 4, HELM_HI)
    rect(set, 24, 16, 16, 8, SKIN)
    rect(set, 26, 18, 3, 3, EYE)
    rect(set, 35, 18, 3, 3, EYE)
    rect(set, 22, 14, 20, 2, OUTLINE)
  })
}

function paintDead() {
  return createTexture((set) => {
    blob(set, 6, 44, 12, 12, HELM)
    rect(set, 10, 48, 6, 4, SKIN)
    blob(set, 16, 46, 26, 10, JACKET)
    blob(set, 40, 48, 12, 8, PANTS)
    blob(set, 50, 50, 8, 6, BOOT)
  })
}

function paintWeapon(firing) {
  return createTexture((set) => {
    blob(set, 28, 4, 8, 28, GUN_DK)
    rect(set, 30, 6, 4, 22, GUN)
    blob(set, 24, 28, 16, 14, GUN_DK)
    rect(set, 26, 30, 12, 4, GUN)
    blob(set, 27, 40, 10, 18, GRIP)
    blob(set, 20, 48, 8, 14, SKIN)
    blob(set, 36, 48, 8, 14, SKIN)
    if (firing) {
      rect(set, 26, 0, 12, 8, FLASH)
      rect(set, 29, 1, 6, 4, [255, 250, 220, 255])
    }
  })
}

function paintMed() {
  return createTexture((set) => {
    blob(set, 22, 36, 20, 18, [232, 232, 226, 255])
    rect(set, 29, 38, 6, 14, [176, 32, 32, 255])
    rect(set, 24, 42, 16, 6, [176, 32, 32, 255])
  })
}

function paintAmmo() {
  return createTexture((set) => {
    blob(set, 20, 42, 24, 14, [70, 78, 64, 255])
    rect(set, 24, 40, 16, 4, [176, 156, 72, 255])
    rect(set, 23, 46, 18, 3, [40, 44, 36, 255])
  })
}

function paintExit(lit) {
  return createTexture((set) => {
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
