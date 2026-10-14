import { SPRITE, TEX, TILE, VIEW_H, VIEW_W } from './constants.js'
import { buildAssets } from './textures.js'

function lerp(a, b, t) {
  return a + (b - a) * t
}

function fillRect(buf, w, h, x, y, rw, rh, r, g, b) {
  const x0 = Math.max(0, x | 0)
  const y0 = Math.max(0, y | 0)
  const x1 = Math.min(w, (x + rw) | 0)
  const y1 = Math.min(h, (y + rh) | 0)
  for (let yy = y0; yy < y1; yy++) {
    let di = (yy * w + x0) * 4
    for (let xx = x0; xx < x1; xx++) {
      buf[di] = r
      buf[di + 1] = g
      buf[di + 2] = b
      buf[di + 3] = 255
      di += 4
    }
  }
}

function tileColor(tile, open) {
  switch (tile) {
    case TILE.FLOOR:
      return [28, 26, 22]
    case TILE.STONE:
      return [110, 106, 98]
    case TILE.BRICK:
      return [140, 78, 62]
    case TILE.MOSS:
      return [70, 110, 74]
    case TILE.METAL:
      return [90, 104, 118]
    case TILE.DOOR:
      return open > 0.7 ? [28, 26, 22] : [196, 154, 64]
    default:
      return [0, 0, 0]
  }
}

function blit(buf, viewW, viewH, tex, dx, dy, scale, texSize) {
  const span = texSize * scale
  const x0 = Math.max(0, dx | 0)
  const y0 = Math.max(0, dy | 0)
  const x1 = Math.min(viewW, (dx + span) | 0)
  const y1 = Math.min(viewH, (dy + span) | 0)
  for (let y = y0; y < y1; y++) {
    const sy = ((y - dy) / scale) | 0
    if (sy < 0 || sy >= texSize) continue
    for (let x = x0; x < x1; x++) {
      const sx = ((x - dx) / scale) | 0
      if (sx < 0 || sx >= texSize) continue
      const ti = (sy * texSize + sx) * 4
      if (tex[ti + 3] < 16) continue
      const di = (y * viewW + x) * 4
      buf[di] = tex[ti]
      buf[di + 1] = tex[ti + 1]
      buf[di + 2] = tex[ti + 2]
      buf[di + 3] = 255
    }
  }
}

export function createRenderer(ctx) {
  const w = VIEW_W
  const h = VIEW_H
  const img = ctx.createImageData(w, h)
  const buf = img.data
  const zbuf = new Float32Array(w * h)
  const assets = buildAssets()
  const row = new Uint8Array(h * 3)
  for (let y = 0; y < h; y++) {
    if (y < h / 2) {
      const u = y / (h / 2)
      row[y * 3] = lerp(8, 28, u)
      row[y * 3 + 1] = lerp(10, 32, u)
      row[y * 3 + 2] = lerp(16, 48, u)
    } else {
      const u = (y - h / 2) / (h / 2)
      row[y * 3] = lerp(58, 16, u)
      row[y * 3 + 1] = lerp(48, 12, u)
      row[y * 3 + 2] = lerp(36, 10, u)
    }
  }

  function shadeFor(perp, side) {
    let shade = 1 - Math.min(0.78, perp * 0.055)
    if (side === 1) shade *= 0.72
    return Math.max(0.18, shade)
  }

  function castColumn(col, player, world) {
    const cameraX = (2 * col) / w - 1
    const rayDirX = player.dirX + player.planeX * cameraX
    const rayDirY = player.dirY + player.planeY * cameraX
    let mapX = Math.floor(player.x)
    let mapY = Math.floor(player.y)
    const deltaDistX = Math.abs(1 / rayDirX)
    const deltaDistY = Math.abs(1 / rayDirY)
    let stepX
    let stepY
    let sideDistX
    let sideDistY
    if (rayDirX < 0) {
      stepX = -1
      sideDistX = (player.x - mapX) * deltaDistX
    } else {
      stepX = 1
      sideDistX = (mapX + 1 - player.x) * deltaDistX
    }
    if (rayDirY < 0) {
      stepY = -1
      sideDistY = (player.y - mapY) * deltaDistY
    } else {
      stepY = 1
      sideDistY = (mapY + 1 - player.y) * deltaDistY
    }

    const hits = []
    const map = world.map
    const mapH = map.length
    const mapW = map[0].length
    for (let guard = 0; guard < 64 && hits.length < 3; guard++) {
      let side
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX
        mapX += stepX
        side = 0
      } else {
        sideDistY += deltaDistY
        mapY += stepY
        side = 1
      }
      if (mapX < 0 || mapY < 0 || mapX >= mapW || mapY >= mapH) break
      const tile = map[mapY][mapX]
      if (!tile) continue

      // Perpendicular distance removes the fisheye stretch.
      let perp = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY
      if (perp < 0.05) perp = 0.05
      let wallX = side === 0 ? player.y + perp * rayDirY : player.x + perp * rayDirX
      wallX -= Math.floor(wallX)
      let texX = (wallX * TEX) | 0
      if (texX < 0) texX = 0
      if (texX > TEX - 1) texX = TEX - 1
      if (side === 0 && rayDirX > 0) texX = TEX - 1 - texX
      if (side === 1 && rayDirY < 0) texX = TEX - 1 - texX

      if (tile === TILE.DOOR) {
        const door = world.doors.get(mapX + ',' + mapY)
        const open = door ? door.open : 0
        if (open < 0.98) hits.push({ tile, side, perp, texX, kind: 'door', open })
        if (open < 0.08) break
        continue
      }
      hits.push({ tile, side, perp, texX, kind: 'wall', open: 0 })
      break
    }

    for (let i = hits.length - 1; i >= 0; i--) drawHit(col, hits[i])
  }

  function drawHit(col, hit) {
    const lineHeight = (h / hit.perp) | 0
    if (lineHeight <= 0) return
    const drawStart = (-lineHeight / 2 + h / 2) | 0
    const drawEnd = (lineHeight / 2 + h / 2) | 0
    const gap = hit.kind === 'door' ? (lineHeight * hit.open) | 0 : 0
    const y0 = Math.max(0, drawStart)
    const y1 = Math.min(h, drawEnd - gap)
    const tex = assets.walls[hit.tile] || assets.walls[TILE.STONE]
    const shade = shadeFor(hit.perp, hit.side)
    const shift = hit.kind === 'door' ? (hit.open * (TEX - 1)) | 0 : 0
    for (let y = y0; y < y1; y++) {
      const d = y * 256 - h * 128 + lineHeight * 128
      let texY = ((d * TEX) / lineHeight / 256) | 0
      if (hit.kind === 'door') {
        texY += shift
        if (texY < 0 || texY > TEX - 1) continue
      } else if (texY < 0) {
        texY = 0
      } else if (texY > TEX - 1) {
        texY = TEX - 1
      }
      const ti = (texY * TEX + hit.texX) * 4
      const di = (y * w + col) * 4
      buf[di] = tex[ti] * shade
      buf[di + 1] = tex[ti + 1] * shade
      buf[di + 2] = tex[ti + 2] * shade
      buf[di + 3] = 255
      zbuf[y * w + col] = hit.perp
    }
  }

  function drawSprite(player, spr) {
    const dx = spr.x - player.x
    const dy = spr.y - player.y
    const invDet = 1 / (player.planeX * player.dirY - player.dirX * player.planeY)
    const transformX = invDet * (player.dirY * dx - player.dirX * dy)
    const transformY = invDet * (-player.planeY * dx + player.planeX * dy)
    if (transformY <= 0.08) return

    const full = h / transformY
    const spriteH = Math.abs(full * spr.scale)
    const spriteW = spriteH
    const screenX = (w / 2) * (1 + transformX / transformY)
    const footY = h / 2 + full / 2
    const drawStartY = footY - spriteH
    const drawEndY = footY
    const drawStartX = screenX - spriteW / 2
    const drawEndX = screenX + spriteW / 2
    const clipY0 = Math.max(0, drawStartY | 0)
    const clipY1 = Math.min(h, drawEndY | 0)
    const clipX0 = Math.max(0, drawStartX | 0)
    const clipX1 = Math.min(w, drawEndX | 0)
    if (clipX0 >= clipX1 || clipY0 >= clipY1 || spriteW < 1 || spriteH < 1) return

    const shade = Math.max(0.22, 1 - Math.min(0.75, transformY * 0.05))
    const tint = spr.tint
    const tex = spr.tex
    const texSize = SPRITE
    for (let stripe = clipX0; stripe < clipX1; stripe++) {
      const texX = (((stripe - drawStartX) * texSize) / spriteW) | 0
      if (texX < 0 || texX >= texSize) continue
      for (let y = clipY0; y < clipY1; y++) {
        const texY = (((y - drawStartY) * texSize) / spriteH) | 0
        if (texY < 0 || texY >= texSize) continue
        const zi = y * w + stripe
        if (zbuf[zi] <= transformY) continue
        const ti = (texY * texSize + texX) * 4
        if (tex[ti + 3] < 16) continue
        const di = zi * 4
        buf[di] = Math.min(255, tex[ti] * shade * tint[0])
        buf[di + 1] = Math.min(255, tex[ti + 1] * shade * tint[1])
        buf[di + 2] = Math.min(255, tex[ti + 2] * shade * tint[2])
        buf[di + 3] = 255
      }
    }
  }

  function enemyTexture(enemy, time) {
    if (enemy.dead) return assets.enemy.dead
    if (enemy.swing > 0) return assets.enemy.attack
    if (!enemy.moving) return assets.enemy.walk[0]
    return assets.enemy.walk[((time * 8) | 0) & 3]
  }

  function drawSprites(world, player, time) {
    const list = []
    for (const enemy of world.enemies) {
      list.push({
        x: enemy.x,
        y: enemy.y,
        tex: enemyTexture(enemy, time),
        scale: enemy.dead ? 0.95 : 0.92,
        tint: enemy.hurt > 0 ? [1.7, 0.45, 0.4] : [1, 1, 1],
      })
    }
    for (const item of world.pickups) {
      list.push({
        x: item.x,
        y: item.y,
        tex: item.kind === 'med' ? assets.pickup.med : assets.pickup.ammo,
        scale: 0.62,
        tint: [1, 1, 1],
      })
    }
    const pulse = 0.85 + Math.sin(time * 4) * 0.15
    list.push({
      x: world.exit.x,
      y: world.exit.y,
      tex: (time * 2) & 1 ? assets.exit[1] : assets.exit[0],
      scale: 0.78,
      tint: [1, pulse, 0.55 + pulse * 0.2],
    })
    const px = player.x
    const py = player.y
    list.sort((a, b) => {
      const da = (a.x - px) * (a.x - px) + (a.y - py) * (a.y - py)
      const db = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py)
      return db - da
    })
    for (const spr of list) drawSprite(player, spr)
  }

  function cellColor(world, mx, my) {
    const map = world.map
    if (my < 0 || mx < 0 || my >= map.length || mx >= map[0].length) return [8, 8, 10]
    if (mx === (world.exit.x | 0) && my === (world.exit.y | 0) && map[my][mx] === TILE.FLOOR) {
      return [64, 160, 96]
    }
    const tile = map[my][mx]
    if (tile === TILE.DOOR) {
      const door = world.doors.get(mx + ',' + my)
      return tileColor(tile, door ? door.open : 0)
    }
    return tileColor(tile, 0)
  }

  function drawRadar(world, player) {
    const cells = 15
    const scale = 4
    const size = cells * scale
    const left = w - size - 6
    const top = 6
    const half = (cells / 2) | 0
    const cx = player.x | 0
    const cy = player.y | 0
    fillRect(buf, w, h, left - 2, top - 2, size + 4, size + 4, 8, 8, 10)
    for (let j = 0; j < cells; j++) {
      for (let i = 0; i < cells; i++) {
        const color = cellColor(world, cx - half + i, cy - half + j)
        fillRect(buf, w, h, left + i * scale, top + j * scale, scale, scale, color[0], color[1], color[2])
      }
    }
    for (const enemy of world.enemies) {
      if (enemy.dead) continue
      const ix = enemy.x - (cx - half)
      const iy = enemy.y - (cy - half)
      if (ix < 0 || iy < 0 || ix >= cells || iy >= cells) continue
      fillRect(buf, w, h, left + ix * scale - 1, top + iy * scale - 1, 3, 3, 196, 64, 58)
    }
    const ox = left + (player.x - (cx - half)) * scale
    const oy = top + (player.y - (cy - half)) * scale
    fillRect(buf, w, h, ox - 1, oy - 1, 3, 3, 240, 224, 180)
    fillRect(
      buf,
      w,
      h,
      ox + player.dirX * 4 - 0.5,
      oy + player.dirY * 4 - 0.5,
      2,
      2,
      240,
      224,
      180,
    )
  }

  function drawFullMap(world, player) {
    const map = world.map
    const mapH = map.length
    const mapW = map[0].length
    fillRect(buf, w, h, 8, 8, w - 16, h - 16, 10, 9, 8)
    const scale = Math.max(2, Math.min(8, ((w - 28) / mapW) | 0, ((h - 28) / mapH) | 0))
    const left = ((w - mapW * scale) / 2) | 0
    const top = ((h - mapH * scale) / 2) | 0
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const color = cellColor(world, x, y)
        fillRect(buf, w, h, left + x * scale, top + y * scale, scale, scale, color[0], color[1], color[2])
      }
    }
    for (const enemy of world.enemies) {
      if (enemy.dead) continue
      fillRect(buf, w, h, left + enemy.x * scale - 1, top + enemy.y * scale - 1, 3, 3, 196, 64, 58)
    }
    fillRect(buf, w, h, left + player.x * scale - 1, top + player.y * scale - 1, 3, 3, 240, 224, 180)
  }

  function drawWeapon(world, time) {
    const firing = world.player.shotFlash > 0
    const tex = firing ? assets.weapon.fire : assets.weapon.idle
    const bob = world.player.moving ? Math.sin(time * 10) * 4 : Math.sin(time * 2)
    const sway = world.player.moving ? Math.cos(time * 10) * 3 : 0
    const shown = 132
    const scale = shown / SPRITE
    const dx = (w - shown) / 2 + sway
    const dy = h - shown + 18 + bob - (firing ? 6 : 0)
    blit(buf, w, h, tex, dx, dy, scale, SPRITE)
  }

  function clear() {
    for (let y = 0; y < h; y++) {
      const r = row[y * 3]
      const g = row[y * 3 + 1]
      const b = row[y * 3 + 2]
      let di = y * w * 4
      for (let x = 0; x < w; x++) {
        buf[di] = r
        buf[di + 1] = g
        buf[di + 2] = b
        buf[di + 3] = 255
        di += 4
      }
    }
    zbuf.fill(1e9)
  }

  function draw(world, time, wobble) {
    const player = world.player
    let saved = null
    if (wobble) {
      const cos = Math.cos(wobble)
      const sin = Math.sin(wobble)
      saved = [player.dirX, player.dirY, player.planeX, player.planeY]
      player.dirX = saved[0] * cos - saved[1] * sin
      player.dirY = saved[0] * sin + saved[1] * cos
      player.planeX = saved[2] * cos - saved[3] * sin
      player.planeY = saved[2] * sin + saved[3] * cos
    }
    try {
      clear()
      for (let col = 0; col < w; col++) castColumn(col, player, world)
      drawSprites(world, player, time)
      if (world.mapOpen) drawFullMap(world, player)
      else {
        drawRadar(world, player)
        drawWeapon(world, time)
      }
      ctx.putImageData(img, 0, 0)
    } finally {
      if (saved) {
        player.dirX = saved[0]
        player.dirY = saved[1]
        player.planeX = saved[2]
        player.planeY = saved[3]
      }
    }
  }

  return { draw, width: w, height: h }
}
