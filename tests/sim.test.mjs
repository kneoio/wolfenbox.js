import assert from 'node:assert/strict'
import test from 'node:test'
import { TILE, VIEW_H, VIEW_W } from '../src/constants.js'
import { generateLevel } from '../src/level.js'
import { createRenderer } from '../src/render.js'
import {
  createWorld,
  emptyInput,
  face,
  makeEnemy,
  nextFloor,
  retryFloor,
  step,
} from '../src/sim.js'
import { buildAssets } from '../src/textures.js'

function reachable(level) {
  const map = level.map
  const height = map.length
  const width = map[0].length
  const sx = Math.floor(level.spawn.x)
  const sy = Math.floor(level.spawn.y)
  const seen = new Set([sx + ',' + sy])
  const queue = [[sx, sy]]
  while (queue.length) {
    const [x, y] = queue.shift()
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const tile = map[ny][nx]
      if (tile !== TILE.FLOOR && tile !== TILE.DOOR) continue
      const key = nx + ',' + ny
      if (seen.has(key)) continue
      seen.add(key)
      queue.push([nx, ny])
    }
  }
  return seen
}

function arena(world) {
  const height = world.map.length
  const width = world.map[0].length
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      world.map[y][x] = edge ? TILE.STONE : TILE.FLOOR
    }
  }
  world.doors.clear()
  world.enemies.length = 0
  world.pickups.length = 0
  world.player.x = 3.5
  world.player.y = 3.5
  world.player.health = 100
  world.player.ammo = 32
  world.player.alive = true
  face(world.player, 1, 0)
}

test('floors are bordered, connected, and deterministic', () => {
  for (let floor = 1; floor <= 5; floor++) {
    const level = generateLevel(floor)
    const map = level.map
    const height = map.length
    const width = map[0].length
    assert.ok(width >= 15 && height >= 15)
    assert.equal(width % 2, 1)
    for (let x = 0; x < width; x++) {
      assert.notEqual(map[0][x], TILE.FLOOR)
      assert.notEqual(map[height - 1][x], TILE.FLOOR)
    }
    for (let y = 0; y < height; y++) {
      assert.notEqual(map[y][0], TILE.FLOOR)
      assert.notEqual(map[y][width - 1], TILE.FLOOR)
    }
    assert.equal(map[1][1], TILE.FLOOR)
    const seen = reachable(level)
    const ex = Math.floor(level.exit.x)
    const ey = Math.floor(level.exit.y)
    assert.equal(map[ey][ex], TILE.FLOOR)
    assert.ok(seen.has(ex + ',' + ey), 'exit is reachable on floor ' + floor)
    assert.ok(level.enemies.length >= 1, 'floor ' + floor + ' has sentries')
  }
  const a = generateLevel(3, 99)
  const b = generateLevel(3, 99)
  assert.deepEqual(a.map, b.map)
  assert.equal(a.exit.x, b.exit.x)
  assert.equal(a.exit.y, b.exit.y)
})

test('walls stop the player and an open door does not', () => {
  const world = createWorld(1)
  arena(world)
  world.map[3][4] = TILE.DOOR
  world.doors.set('4,3', { x: 4, y: 3, open: 0, target: 0 })
  const input = emptyInput()
  input.forward = 1
  for (let i = 0; i < 80; i++) step(world, input, 0.05)
  assert.ok(world.player.x > 3.5)
  assert.ok(world.player.x < 4, 'closed door blocks, x=' + world.player.x)

  const opened = step(world, { ...emptyInput(), useEdge: true }, 0.05)
  assert.ok(opened.sounds.includes('door'))
  assert.equal(world.doors.get('4,3').target, 1)

  const door = world.doors.get('4,3')
  door.open = 1
  door.target = 1
  for (let i = 0; i < 40; i++) step(world, input, 0.05)
  assert.ok(world.player.x > 4.4, 'open door can be crossed, x=' + world.player.x)
  assert.ok(world.player.x < world.map[0].length - 1)
  assert.ok(world.player.y > 1 && world.player.y < world.map.length - 1)
})

test('a shot spends ammo and drops a sentry in front of the player', () => {
  const world = createWorld(1)
  arena(world)
  world.enemies.push(makeEnemy(6.5, 3.5, { hp: 1 }))
  const before = world.player.ammo
  const events = step(world, { ...emptyInput(), fireEdge: true }, 0.016)
  assert.equal(world.player.ammo, before - 1)
  assert.equal(world.enemies[0].dead, true)
  assert.equal(world.score, 100)
  assert.ok(events.sounds.includes('shoot'))
  assert.equal(events.kill, true)
})

test('medkits heal and do not raise health past 100', () => {
  const world = createWorld(1)
  arena(world)
  world.player.health = 40
  world.pickups.push({ kind: 'med', x: world.player.x, y: world.player.y })
  step(world, emptyInput(), 0.016)
  assert.equal(world.player.health, 65)
  assert.equal(world.pickups.length, 0)

  world.player.health = 90
  world.pickups.push({ kind: 'med', x: world.player.x, y: world.player.y })
  step(world, emptyInput(), 0.016)
  assert.equal(world.player.health, 100)
})

test('the next floor keeps the score and a retry keeps the maze seed', () => {
  const world = createWorld(2)
  world.score = 200
  const layout = world.map.map((row) => row.slice())
  const again = retryFloor(world)
  assert.equal(again.floor, 2)
  assert.equal(again.score, 200)
  assert.deepEqual(again.map, layout)

  const next = nextFloor(world)
  assert.equal(next.floor, 3)
  assert.equal(next.score, 250)
  assert.ok(next.player.health <= 100)
})

test('textures and one rendered frame are not blank', () => {
  const assets = buildAssets()
  assert.equal(assets.walls[TILE.STONE].length, 64 * 64 * 4)
  assert.equal(assets.enemy.walk.length, 4)
  let opaque = 0
  const sentry = assets.enemy.walk[0]
  for (let i = 3; i < sentry.length; i += 4) if (sentry[i] > 0) opaque += 1
  assert.ok(opaque > 80)

  const data = new Uint8ClampedArray(VIEW_W * VIEW_H * 4)
  let presented = 0
  const renderer = createRenderer({
    createImageData() {
      return { data, width: VIEW_W, height: VIEW_H }
    },
    putImageData() {
      presented += 1
    },
  })
  const world = createWorld(1)
  renderer.draw(world, 0.4, 0)
  assert.equal(presented, 1)

  const horizon = new Set()
  const y = (VIEW_H / 2) | 0
  for (let x = 0; x < VIEW_W; x += 4) horizon.add(data[(y * VIEW_W + x) * 4])
  assert.ok(horizon.size > 3, 'horizon should show wall texture, got ' + horizon.size)

  let min = 255
  let max = 0
  for (let i = 0; i < data.length; i += 16) {
    if (data[i] < min) min = data[i]
    if (data[i] > max) max = data[i]
  }
  assert.ok(max - min > 20)
})
