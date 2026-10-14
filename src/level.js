import { TILE } from './constants.js'

function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function carveMaze(map, rng) {
  const h = map.length
  const w = map[0].length
  const stack = [[1, 1]]
  map[1][1] = TILE.FLOOR
  const steps = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ]
  while (stack.length) {
    const [x, y] = stack[stack.length - 1]
    const options = []
    for (const [dx, dy] of steps) {
      const nx = x + dx
      const ny = y + dy
      if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && map[ny][nx] !== TILE.FLOOR) {
        options.push([nx, ny, dx, dy])
      }
    }
    if (!options.length) {
      stack.pop()
      continue
    }
    const pick = options[(rng() * options.length) | 0]
    map[y + pick[3] / 2][x + pick[2] / 2] = TILE.FLOOR
    map[pick[1]][pick[0]] = TILE.FLOOR
    stack.push([pick[0], pick[1]])
  }
}

function carveRoom(map, rng) {
  const h = map.length
  const w = map[0].length
  const rooms = 2 + ((rng() * 2) | 0)
  for (let r = 0; r < rooms; r++) {
    const rw = 3 + ((rng() * 2) | 0)
    const rh = 3 + ((rng() * 2) | 0)
    const x0 = 1 + ((rng() * Math.max(1, w - rw - 2)) | 0)
    const y0 = 1 + ((rng() * Math.max(1, h - rh - 2)) | 0)
    for (let y = y0; y < y0 + rh && y < h - 1; y++) {
      for (let x = x0; x < x0 + rw && x < w - 1; x++) map[y][x] = TILE.FLOOR
    }
  }
}

function punchLoops(map, rng) {
  const h = map.length
  const w = map[0].length
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (map[y][x] === TILE.FLOOR) continue
      const ns = map[y - 1][x] === TILE.FLOOR && map[y + 1][x] === TILE.FLOOR
      const ew = map[y][x - 1] === TILE.FLOOR && map[y][x + 1] === TILE.FLOOR
      if ((ns || ew) && rng() < 0.08) map[y][x] = TILE.FLOOR
    }
  }
}

function recolor(map, rng) {
  const h = map.length
  const w = map[0].length
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (map[y][x] === TILE.FLOOR) continue
      const n = rng()
      map[y][x] = n < 0.55 ? TILE.STONE : n < 0.78 ? TILE.BRICK : n < 0.9 ? TILE.MOSS : TILE.METAL
    }
  }
}

function furthestFloor(map, sx, sy) {
  const h = map.length
  const w = map[0].length
  const seen = new Uint8Array(w * h)
  const queue = [[sx, sy]]
  seen[sy * w + sx] = 1
  let last = [sx, sy]
  let head = 0
  while (head < queue.length) {
    const [x, y] = queue[head++]
    last = [x, y]
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      if (map[ny][nx] !== TILE.FLOOR) continue
      const key = ny * w + nx
      if (seen[key]) continue
      seen[key] = 1
      queue.push([nx, ny])
    }
  }
  return { x: last[0] + 0.5, y: last[1] + 0.5, cellX: last[0], cellY: last[1] }
}

function isCorridor(map, x, y) {
  const n = map[y - 1][x] === TILE.FLOOR
  const s = map[y + 1][x] === TILE.FLOOR
  const e = map[y][x + 1] === TILE.FLOOR
  const w = map[y][x - 1] === TILE.FLOOR
  return (n && s && !e && !w) || (e && w && !n && !s)
}

function nearDoor(doors, x, y) {
  return (
    doors.has(x + ',' + y) ||
    doors.has(x + 1 + ',' + y) ||
    doors.has(x - 1 + ',' + y) ||
    doors.has(x + ',' + (y + 1)) ||
    doors.has(x + ',' + (y - 1))
  )
}

function placeDoors(map, exit, rng) {
  const h = map.length
  const w = map[0].length
  const doors = new Map()
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (map[y][x] !== TILE.FLOOR) continue
      if (x <= 5 && y <= 5) continue
      if (x === exit.cellX && y === exit.cellY) continue
      if (!isCorridor(map, x, y)) continue
      if (rng() > 0.2) continue
      if (nearDoor(doors, x, y)) continue
      map[y][x] = TILE.DOOR
      doors.set(x + ',' + y, { x, y, open: 0, target: 0 })
    }
  }
  return doors
}

function facing(map) {
  for (const [dx, dy] of DIRS) {
    const tile = map[1 + dy][1 + dx]
    if (tile === TILE.FLOOR || tile === TILE.DOOR) return { dirX: dx, dirY: dy }
  }
  return { dirX: 1, dirY: 0 }
}

/**
 * Build one maze floor. `seed` keeps a retry of the same floor identical.
 */
export function generateLevel(floor = 1, seed = (Math.max(1, floor) * 7919) >>> 0) {
  const level = Math.max(1, floor | 0)
  let size = 15 + Math.min(6, level - 1) * 2
  if (size % 2 === 0) size += 1
  const map = Array.from({ length: size }, () => Array(size).fill(TILE.STONE))
  const rng = mulberry32(seed >>> 0)

  carveMaze(map, rng)
  for (let y = 1; y <= 5; y++) {
    for (let x = 1; x <= 5; x++) map[y][x] = TILE.FLOOR
  }
  carveRoom(map, rng)
  punchLoops(map, rng)
  recolor(map, rng)

  const exit = furthestFloor(map, 1, 1)
  const doors = placeDoors(map, exit, rng)
  const face = facing(map)

  const spots = []
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (map[y][x] !== TILE.FLOOR) continue
      if (x <= 6 && y <= 6) continue
      const dx = x + 0.5 - exit.x
      const dy = y + 0.5 - exit.y
      if (dx * dx + dy * dy < 4) continue
      spots.push([x, y])
    }
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0
    const tmp = spots[i]
    spots[i] = spots[j]
    spots[j] = tmp
  }

  const want = Math.min(14, 3 + level)
  const hp = 2 + Math.floor((level - 1) / 2)
  const speed = 1.05 + Math.min(0.7, (level - 1) * 0.06)
  const damage = 6 + Math.min(8, level)
  const chosen = []
  for (const spot of spots) {
    if (chosen.length >= want) break
    if (chosen.some(([cx, cy]) => Math.abs(cx - spot[0]) + Math.abs(cy - spot[1]) < 4)) continue
    chosen.push(spot)
  }
  const enemies = chosen.map(([x, y]) => ({
    x: x + 0.5,
    y: y + 0.5,
    hp,
    speed,
    damage,
  }))

  const pickups = [
    { kind: 'med', x: 4.5, y: 2.5 },
    { kind: 'ammo', x: 2.5, y: 4.5 },
  ]
  let meds = 0
  let ammos = 0
  const medCap = 1 + Math.floor(level / 2)
  const ammoCap = 2 + Math.floor(level / 2)
  for (const [x, y] of spots) {
    if (rng() > 0.12) continue
    const kind = rng() < 0.45 ? 'med' : 'ammo'
    if (kind === 'med' && meds >= medCap) continue
    if (kind === 'ammo' && ammos >= ammoCap) continue
    if (kind === 'med') meds += 1
    else ammos += 1
    pickups.push({ kind, x: x + 0.5, y: y + 0.5 })
  }

  return {
    map,
    doors,
    spawn: { x: 1.5, y: 1.5, dirX: face.dirX, dirY: face.dirY },
    exit: { x: exit.x, y: exit.y },
    enemies,
    pickups,
  }
}
