import { createAudio } from './audio.js'
import { createRenderer } from './render.js'
import { createWorld, emptyInput, nextFloor, retryFloor, step } from './sim.js'
import { VIEW_H, VIEW_W } from './constants.js'

const HANDLED = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'KeyM',
  'KeyF',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'Escape',
])

export function createGame(shell, options = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = VIEW_W
  canvas.height = VIEW_H
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', 'Wolfenbox view')
  shell.stage.appendChild(canvas)
  shell.els.canvas = canvas

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Wolfenbox could not get a canvas context')
  const renderer = createRenderer(ctx)
  const audio = createAudio()
  if (options.sound) audio.setMuted(false)
  shell.setSoundLabel(audio.muted)

  let world = createWorld(1)
  let engaged = false
  let paused = false
  let loopOn = false
  let raf = 0
  let last = 0
  let previewT = 0
  let lastScore = 0
  let focused = false
  const keys = new Set()
  let mouseDx = 0
  let useEdge = false
  let fireEdge = false
  let mapEdge = false
  let touchForward = 0
  let touch = null

  function retry() {
    world = retryFloor(world)
    lastScore = world.score
  }

  function engage() {
    if (engaged) return
    engaged = true
    shell.els.play.hidden = true
  }

  function readInput() {
    const input = emptyInput()
    input.forward = keys.has('KeyW') || keys.has('ArrowUp') || touchForward > 0 ? 1 : 0
    input.back = keys.has('KeyS') || keys.has('ArrowDown') || touchForward < 0 ? 1 : 0
    let strafe = 0
    if (keys.has('KeyA') || keys.has('KeyQ')) strafe -= 1
    if (keys.has('KeyD')) strafe += 1
    input.strafe = strafe
    input.turnLeft = keys.has('ArrowLeft') ? 1 : 0
    input.turnRight = keys.has('ArrowRight') ? 1 : 0
    input.mouseTurn = mouseDx * 0.004
    input.run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0
    input.useEdge = useEdge
    input.fireEdge = fireEdge
    input.mapEdge = mapEdge
    mouseDx = 0
    useEdge = false
    fireEdge = false
    mapEdge = false
    return input
  }

  function onKeyDown(event) {
    if (!engaged) return
    if (event.code === 'Escape') {
      canvas.blur()
      event.preventDefault()
      return
    }
    if (!HANDLED.has(event.code)) return
    event.preventDefault()
    keys.add(event.code)
    if (event.repeat) return
    if (event.code === 'KeyE') useEdge = true
    if (event.code === 'Space' || event.code === 'KeyF') fireEdge = true
    if (event.code === 'KeyM') mapEdge = true
  }

  function onKeyUp(event) {
    keys.delete(event.code)
  }

  function onFocus() {
    focused = true
  }

  function onBlur() {
    focused = false
    keys.clear()
  }

  function onPointerDown(event) {
    if (event.pointerType === 'touch') return
    engage()
    canvas.focus()
    if (world.player.alive) fireEdge = true
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      /* pointer capture is optional */
    }
  }

  function onPointerMove(event) {
    if (!focused) return
    mouseDx += event.movementX || 0
  }

  function onTouchStart(event) {
    event.preventDefault()
    engage()
    canvas.focus()
    const point = event.changedTouches[0]
    touch = { x: point.clientX, y: point.clientY, moved: false }
  }

  function onTouchMove(event) {
    event.preventDefault()
    if (!touch) return
    const point = event.changedTouches[0]
    const dx = point.clientX - touch.x
    const dy = point.clientY - touch.y
    touch.x = point.clientX
    touch.y = point.clientY
    if (Math.abs(dx) + Math.abs(dy) > 3) touch.moved = true
    mouseDx += dx
    if (dy < -3) touchForward = 1
    else if (dy > 3) touchForward = -1
  }

  function onTouchEnd(event) {
    event.preventDefault()
    if (touch && !touch.moved && world.player.alive) fireEdge = true
    touch = null
    touchForward = 0
  }

  function onVisibility() {
    if (document.hidden) stopLoop()
    else if (!paused) startLoop()
  }

  canvas.addEventListener('keydown', onKeyDown)
  canvas.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('focus', onFocus)
  canvas.addEventListener('blur', onBlur)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  canvas.addEventListener('contextmenu', (event) => event.preventDefault())
  document.addEventListener('visibilitychange', onVisibility)

  let frameErrorLogged = false
  function frame(now) {
    if (!loopOn) return
    raf = requestAnimationFrame(frame)
    try {
      drawFrame(now)
    } catch (error) {
      if (!frameErrorLogged) {
        frameErrorLogged = true
        console.error('Wolfenbox frame failed', error)
      }
    }
  }

  function drawFrame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
    last = now
    if (engaged && !paused) {
      const input = readInput()
      if (!world.player.alive) {
        if (input.fireEdge || input.useEdge) retry()
      } else {
        const events = step(world, input, dt)
        for (const name of events.sounds) audio.play(name)
        if (events.advanced) {
          world = nextFloor(world)
          options.onFloor?.(world.floor)
        }
        if (world.score !== lastScore) {
          lastScore = world.score
          options.onScore?.(world.score)
        }
      }
    } else if (!engaged) {
      previewT += dt || 0.016
    }
    shell.sync(world, engaged)
    renderer.draw(world, engaged ? world.time : previewT, engaged ? 0 : Math.sin(previewT * 0.7) * 0.05)
  }

  function startLoop() {
    if (loopOn) return
    loopOn = true
    last = 0
    raf = requestAnimationFrame(frame)
  }

  function stopLoop() {
    loopOn = false
    cancelAnimationFrame(raf)
  }

  shell.handlers.play = () => {
    engage()
    canvas.focus()
  }
  shell.handlers.retry = () => {
    if (!world.player.alive) retry()
    engage()
    canvas.focus()
  }
  shell.handlers.sound = () => {
    audio.setMuted(!audio.muted)
    shell.setSoundLabel(audio.muted)
  }
  shell.handlers.minimize = (minimized) => {
    paused = minimized
    keys.clear()
    if (minimized) stopLoop()
    else startLoop()
  }

  startLoop()

  return {
    focus() {
      canvas.focus({ preventScroll: true })
    },
    getStats() {
      let enemies = 0
      for (const enemy of world.enemies) if (!enemy.dead) enemies += 1
      return {
        floor: world.floor,
        score: world.score,
        health: world.player.health,
        ammo: world.player.ammo,
        alive: world.player.alive,
        x: world.player.x,
        y: world.player.y,
        enemies,
        engaged,
      }
    },
    destroy() {
      stopLoop()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.remove()
    },
  }
}
