import { FOV, PLAYER_RADIUS, TILE } from './constants.js'
import { generateLevel } from './level.js'

export function face(player, dirX, dirY) {
  const len = Math.hypot(dirX, dirY) || 1
  player.dirX = dirX / len
  player.dirY = dirY / len
  player.planeX = -player.dirY * FOV
  player.planeY = player.dirX * FOV
}

export function makeEnemy(x, y, extra = {}) {
  const hp = extra.hp ?? 2
  return {
    x,
    y,
    hp,
    maxHp: hp,
    speed: extra.speed ?? 1.15,
    damage: extra.damage ?? 8,
    hurt: 0,
    attackCd: Math.random() * 0.4,
    swing: 0,
    didHit: false,
    thinkT: Math.random() * 0.2,
    see: false,
    seeDist: 99,
    wander: Math.random() * Math.PI * 2,
    wanderT: 1,
    dead: false,
    deathT: 0,
    moving: false,
  }
}

export function emptyInput() {
  return {
    forward: 0,
    back: 0,
    strafe: 0,
    turnLeft: 0,
    turnRight: 0,
    mouseTurn: 0,
    run: 0,
    useEdge: false,
    fireEdge: false,
    mapEdge: false,
  }
}

function setMessage(world, text, seconds) {
  world.message = text
  world.messageT = seconds
}

export function createWorld(floor = 1) {
  const level = generateLevel(floor)
  const player = {
    x: level.spawn.x,
    y: level.spawn.y,
    dirX: level.spawn.dirX,
    dirY: level.spawn.dirY,
    planeX: 0,
    planeY: 0,
    health: 100,
    ammo: 32,
    hurt: 0,
    alive: true,
    shotCd: 0,
    shotFlash: 0,
    markT: 0,
    moving: false,
  }
  face(player, player.dirX, player.dirY)
  return {
    floor: Math.max(1, floor | 0),
    map: level.map,
    doors: level.doors,
    enemies: level.enemies.map((e) => makeEnemy(e.x, e.y, e)),
    pickups: level.pickups.map((p) => ({ kind: p.kind, x: p.x, y: p.y })),
    exit: { x: level.exit.x, y: level.exit.y },
    player,
    score: 0,
    time: 0,
    message: 'Find the gold stairs',
    messageT: 2.4,
    introT: 1.8,
    mapOpen: false,
    killed: 0,
  }
}

export function nextFloor(prev) {
  const world = createWorld(prev.floor + 1)
  world.score = prev.score + 50
  world.player.health = Math.min(100, prev.player.health + 18)
  world.player.ammo = Math.min(99, prev.player.ammo + 6)
  world.message = 'Stairs hold. Floor ' + world.floor
  world.messageT = 2
  return world
}

export function retryFloor(prev) {
  const world = createWorld(prev.floor)
  world.score = prev.score
  world.message = 'Same floor. Find another line.'
  world.messageT = 2
  return world
}

function solidAt(world, x, y) {
  const map = world.map
  const mx = Math.floor(x)
  const my = Math.floor(y)
  if (my < 0 || mx < 0 || my >= map.length || mx >= map[0].length) return true
  const tile = map[my][mx]
  if (tile === TILE.FLOOR) return false
  if (tile === TILE.DOOR) {
    const door = world.doors.get(mx + ',' + my)
    return !door || door.open < 0.72
  }
  return true
}

function blockedTile(world, x, y) {
  const r = PLAYER_RADIUS
  return (
    solidAt(world, x - r, y - r) ||
    solidAt(world, x + r, y - r) ||
    solidAt(world, x - r, y + r) ||
    solidAt(world, x + r, y + r)
  )
}

function canOccupy(world, x, y, fromX, fromY) {
  if (blockedTile(world, x, y)) return false
  for (const enemy of world.enemies) {
    if (enemy.dead) continue
    const dist = Math.hypot(enemy.x - x, enemy.y - y)
    if (dist < 0.34) {
      const prev = Math.hypot(enemy.x - fromX, enemy.y - fromY)
      if (dist < prev - 1e-4) return false
    }
  }
  return true
}

export function lineOfSight(world, x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const dist = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(dist / 0.12))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (solidAt(world, x0 + dx * t, y0 + dy * t)) return false
  }
  return true
}

function doorInFront(world) {
  const player = world.player
  for (const dist of [0.45, 0.9, 1.3]) {
    const x = Math.floor(player.x + player.dirX * dist)
    const y = Math.floor(player.y + player.dirY * dist)
    const door = world.doors.get(x + ',' + y)
    if (door) return door
  }
  return null
}

function hitscan(world, maxDist, radius) {
  const player = world.player
  let best = null
  let bestT = maxDist
  const radiusSq = radius * radius
  for (const enemy of world.enemies) {
    if (enemy.dead) continue
    const dx = enemy.x - player.x
    const dy = enemy.y - player.y
    const t = dx * player.dirX + dy * player.dirY
    if (t < 0.2 || t > bestT) continue
    const ox = enemy.x - (player.x + player.dirX * t)
    const oy = enemy.y - (player.y + player.dirY * t)
    if (ox * ox + oy * oy > radiusSq) continue
    if (!lineOfSight(world, player.x, player.y, enemy.x, enemy.y)) continue
    best = enemy
    bestT = t
  }
  return best
}

function hurtEnemy(world, enemy, amount, events) {
  enemy.hp -= amount
  enemy.hurt = 0.12
  events.sounds.push('hit')
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true
    enemy.deathT = 0
    world.score += 100
    world.killed += 1
    setMessage(world, 'Sentry down', 0.9)
    events.sounds.push('down')
    events.kill = true
    if (Math.random() < 0.55) {
      world.pickups.push({ kind: 'ammo', x: enemy.x, y: enemy.y })
    }
  }
}

function hurtPlayer(world, enemy, events) {
  const player = world.player
  if (player.hurt > 0 || !player.alive) return
  player.health -= enemy.damage
  player.hurt = 0.5
  events.sounds.push('hurt')
  if (player.health <= 0) {
    player.health = 0
    player.alive = false
    setMessage(world, 'You are down. Click to retry this floor.', 6)
    events.died = true
  }
}

function enemyCan(world, self, x, y) {
  if (blockedTile(world, x, y)) return false
  for (const other of world.enemies) {
    if (other === self || other.dead) continue
    if (Math.hypot(other.x - x, other.y - y) < 0.42) return false
  }
  return true
}

function movePlayer(world, input, dt) {
  const player = world.player
  let turn = input.mouseTurn || 0
  const turnSpeed = 2.15 * dt
  if (input.turnLeft) turn -= turnSpeed
  if (input.turnRight) turn += turnSpeed
  if (turn) {
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    face(player, player.dirX * cos - player.dirY * sin, player.dirX * sin + player.dirY * cos)
  }

  let mx = 0
  let my = 0
  if (input.forward) {
    mx += player.dirX
    my += player.dirY
  }
  if (input.back) {
    mx -= player.dirX
    my -= player.dirY
  }
  if (input.strafe) {
    mx += -player.dirY * input.strafe
    my += player.dirX * input.strafe
  }
  const len = Math.hypot(mx, my)
  player.moving = len > 0.001
  if (!player.moving) return
  const speed = (input.run ? 3.15 : 2.05) * dt
  mx = (mx / len) * speed
  my = (my / len) * speed
  if (canOccupy(world, player.x + mx, player.y, player.x, player.y)) player.x += mx
  if (canOccupy(world, player.x, player.y + my, player.x, player.y)) player.y += my
}

function updateEnemies(world, dt, events) {
  const player = world.player
  for (const enemy of world.enemies) {
    if (enemy.dead) {
      enemy.deathT += dt
      enemy.moving = false
      continue
    }
    enemy.hurt = Math.max(0, enemy.hurt - dt)
    enemy.attackCd = Math.max(0, enemy.attackCd - dt)
    enemy.thinkT -= dt
    if (enemy.thinkT <= 0) {
      enemy.thinkT = 0.18
      const dx = player.x - enemy.x
      const dy = player.y - enemy.y
      enemy.seeDist = Math.hypot(dx, dy)
      enemy.see = enemy.seeDist < 8.5 && lineOfSight(world, enemy.x, enemy.y, player.x, player.y)
    }

    if (enemy.swing > 0) {
      enemy.swing -= dt
      enemy.moving = false
      if (!enemy.didHit && enemy.swing <= 0.12) {
        enemy.didHit = true
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y)
        if (dist < 1.45 && lineOfSight(world, enemy.x, enemy.y, player.x, player.y)) {
          hurtPlayer(world, enemy, events)
        }
      }
      if (enemy.swing < 0) enemy.swing = 0
      continue
    }

    if (enemy.see && enemy.seeDist < 1.28 && enemy.attackCd <= 0) {
      enemy.swing = 0.42
      enemy.attackCd = 1.05
      enemy.didHit = false
      enemy.moving = false
      continue
    }

    let vx = 0
    let vy = 0
    if (enemy.see && enemy.seeDist > 0.82) {
      vx = (player.x - enemy.x) / enemy.seeDist
      vy = (player.y - enemy.y) / enemy.seeDist
    } else if (!enemy.see) {
      enemy.wanderT -= dt
      if (enemy.wanderT <= 0) {
        enemy.wander = Math.random() * Math.PI * 2
        enemy.wanderT = 0.8 + Math.random() * 1.8
      }
      vx = Math.cos(enemy.wander)
      vy = Math.sin(enemy.wander)
    }

    const step = (enemy.see ? enemy.speed : enemy.speed * 0.45) * dt
    enemy.moving = false
    if (!vx && !vy) continue
    const nx = enemy.x + vx * step
    const ny = enemy.y + vy * step
    if (enemyCan(world, enemy, nx, ny)) {
      enemy.x = nx
      enemy.y = ny
      enemy.moving = true
    } else if (enemyCan(world, enemy, nx, enemy.y)) {
      enemy.x = nx
      enemy.moving = true
    } else if (enemyCan(world, enemy, enemy.x, ny)) {
      enemy.y = ny
      enemy.moving = true
    } else {
      enemy.wander = Math.random() * Math.PI * 2
    }
  }
}

/**
 * Advance the maze by `dt` seconds. Returns one-shot events for the shell.
 */
export function step(world, input, dt) {
  const events = { advanced: false, died: false, kill: false, sounds: [] }
  const clamped = Math.max(0, Math.min(0.05, dt || 0))
  world.time += clamped
  world.introT = Math.max(0, world.introT - clamped)
  world.messageT = Math.max(0, world.messageT - clamped)

  const player = world.player
  player.shotCd = Math.max(0, player.shotCd - clamped)
  player.shotFlash = Math.max(0, player.shotFlash - clamped)
  player.markT = Math.max(0, player.markT - clamped)
  player.hurt = Math.max(0, player.hurt - clamped)

  if (!player.alive) return events

  if (input.mapEdge) world.mapOpen = !world.mapOpen

  if (input.useEdge) {
    const door = doorInFront(world)
    if (door) {
      door.target = door.target > 0.5 ? 0 : 1
      events.sounds.push('door')
    }
  }

  for (const door of world.doors.values()) {
    const diff = door.target - door.open
    if (Math.abs(diff) < 0.001) {
      door.open = door.target
      continue
    }
    const amount = Math.min(Math.abs(diff), 1.8 * clamped)
    door.open += Math.sign(diff) * amount
  }

  movePlayer(world, input, clamped)

  if (input.fireEdge && player.shotCd <= 0) {
    if (player.ammo > 0) {
      player.ammo -= 1
      player.shotCd = 0.28
      player.shotFlash = 0.08
      events.sounds.push('shoot')
      const hit = hitscan(world, 16, 0.32)
      if (hit) {
        hurtEnemy(world, hit, 1, events)
        player.markT = 0.12
      }
    } else {
      player.shotCd = 0.38
      player.shotFlash = 0.05
      events.sounds.push('knife')
      const hit = hitscan(world, 1.05, 0.42)
      if (hit) {
        hurtEnemy(world, hit, 1, events)
        player.markT = 0.12
      } else {
        setMessage(world, 'Empty. Get in close.', 0.8)
      }
    }
  }

  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const item = world.pickups[i]
    if (Math.hypot(item.x - player.x, item.y - player.y) >= 0.38) continue
    if (item.kind === 'med') {
      if (player.health >= 100) continue
      player.health = Math.min(100, player.health + 25)
      setMessage(world, '+25 HP', 0.7)
    } else {
      if (player.ammo >= 99) continue
      player.ammo = Math.min(99, player.ammo + 8)
      setMessage(world, '+8 ammo', 0.7)
    }
    world.pickups.splice(i, 1)
    events.sounds.push('pickup')
  }

  updateEnemies(world, clamped, events)

  if (player.alive && Math.hypot(world.exit.x - player.x, world.exit.y - player.y) < 0.42) {
    events.advanced = true
    events.sounds.push('exit')
  }

  if (events.sounds.length > 4) events.sounds.length = 4
  return events
}
