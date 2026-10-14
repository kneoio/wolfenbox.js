const CSS = `
:host {
  display: block;
  color: #e7dcc0;
  font-family: ui-monospace, "Cascadia Code", "Segoe UI Mono", Menlo, Consolas, monospace;
  line-height: 1.35;
}
:host(.wolfenbox-mount) { height: 100%; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.win {
  display: flex;
  flex-direction: column;
  background: #14120e;
  border: 1px solid #3c3426;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.48);
  user-select: none;
}
header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 12px;
  background: #221e17;
  cursor: grab;
  touch-action: none;
}
header:active { cursor: grabbing; }
.title {
  letter-spacing: 0.16em;
  font-size: 12px;
  font-weight: 700;
  color: #f0e2bc;
}
.status {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #b7ab8e;
  font-size: 11px;
}
.tools { display: flex; gap: 2px; }
.tools button {
  width: 26px;
  height: 22px;
  border-radius: 6px;
  color: #cbbd96;
}
.tools button:hover { background: #3a3226; color: #fff8e8; }
.progress {
  height: 3px;
  background: #2a241c;
}
.progress > div {
  height: 100%;
  width: 0;
  background: #d2a24a;
}
.win.is-embed { height: 100%; }
.body {
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.win.is-embed .body { flex: 1; }
.stage-wrap {
  position: relative;
  width: 100%;
  background: #000;
}
.win.is-float .stage-wrap { aspect-ratio: 8 / 5; }
.win.is-embed .stage-wrap { flex: 1; min-height: 160px; }
canvas {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #000;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  cursor: crosshair;
  outline: none;
}
.cross {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.cross::before, .cross::after {
  content: "";
  position: absolute;
  background: rgba(240, 226, 188, 0.9);
}
.cross::before { left: 3px; top: 0; width: 2px; height: 8px; }
.cross::after { left: 0; top: 3px; width: 8px; height: 2px; }
.cross.mark::before, .cross.mark::after { background: #e15a4a; }
.flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle, transparent 35%, rgba(150, 24, 24, 0.9) 100%);
  opacity: 0;
}
.banner {
  position: absolute;
  left: 0;
  right: 0;
  top: 16%;
  text-align: center;
  letter-spacing: 0.28em;
  font-size: 16px;
  color: #f3e6c4;
  text-shadow: 0 2px 0 #000;
  pointer-events: none;
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  text-align: center;
  background: rgba(8, 7, 5, 0.42);
  color: #f3e6c4;
  cursor: pointer;
}
.overlay strong {
  letter-spacing: 0.22em;
  font-size: 15px;
}
.overlay span, .death p {
  max-width: 28em;
  font-size: 12px;
  color: #d9c89a;
}
.death {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(12, 6, 6, 0.55);
  cursor: pointer;
}
.death strong { letter-spacing: 0.2em; color: #f0c2b4; }
.retry {
  border: 1px solid #6a4038;
  border-radius: 999px;
  padding: 6px 12px;
  color: #f0d2c8;
}
.hud {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px 0;
  font-size: 12px;
}
.hud b { color: #f0e2bc; font-weight: 700; margin-right: 4px; }
.hud b.low { color: #e15a4a; }
.hud i { font-style: normal; color: #8d826c; font-size: 10px; letter-spacing: 0.08em; }
.msg {
  min-height: 16px;
  padding: 2px 10px 0;
  color: #e7c56a;
  font-size: 11px;
}
footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 6px 10px 8px;
  color: #8d826c;
  font-size: 10px;
}
.sound {
  border: 1px solid #3c3426;
  border-radius: 999px;
  padding: 3px 8px;
  color: #d9c89a;
  flex: none;
}
.win.is-min .body { display: none; }
`

function el(root, sel) {
  return root.querySelector(sel)
}

function setText(node, value) {
  const next = String(value)
  if (node.textContent !== next) node.textContent = next
}

export function createShell(host, options) {
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `<style>${CSS}</style>
    <div class="win" role="application" aria-label="Wolfenbox">
      <header data-drag>
        <div class="title"></div>
        <div class="status"></div>
        <div class="tools">
          <button type="button" data-act="min" title="Minimize" aria-label="Minimize">–</button>
          <button type="button" data-act="close" title="Close" aria-label="Close">×</button>
        </div>
      </header>
      <div class="progress" hidden><div></div></div>
      <div class="body">
        <div class="stage-wrap">
          <div class="stage"></div>
          <div class="cross"></div>
          <div class="flash"></div>
          <div class="banner" hidden>FLOOR 1</div>
          <div class="overlay">
            <strong>CLICK TO PLAY</strong>
            <span>The job keeps running. Esc returns you to the page.</span>
          </div>
          <div class="death" hidden>
            <strong>YOU ARE DOWN</strong>
            <p>Click to retry this floor. Your score stays.</p>
            <button type="button" class="retry" data-act="retry">Retry floor</button>
          </div>
        </div>
        <div class="hud">
          <span><b data-k="hp">100</b><i>HP</i></span>
          <span><b data-k="ammo">32</b><i>AMMO</i></span>
          <span><b data-k="floor">1</b><i>FLOOR</i></span>
          <span><b data-k="score">0</b><i>SCORE</i></span>
          <span><b data-k="left">0</b><i>LEFT</i></span>
        </div>
        <div class="msg" data-k="message"></div>
        <footer>
          <span>WASD move · mouse aim · click shoot · E door · M map · Esc page</span>
          <button type="button" data-act="sound" class="sound">Unmute</button>
        </footer>
      </div>
    </div>`

  const win = el(shadow, '.win')
  win.classList.add(options.mode === 'embed' ? 'is-embed' : 'is-float')
  const stageWrap = el(shadow, '.stage-wrap')
  const stage = el(shadow, '.stage')
  stage.style.cssText = 'position:absolute;inset:0;'
  const els = {
    title: el(shadow, '.title'),
    status: el(shadow, '.status'),
    bar: el(shadow, '.progress'),
    fill: el(shadow, '.progress > div'),
    hp: el(shadow, '[data-k="hp"]'),
    ammo: el(shadow, '[data-k="ammo"]'),
    floor: el(shadow, '[data-k="floor"]'),
    score: el(shadow, '[data-k="score"]'),
    left: el(shadow, '[data-k="left"]'),
    msg: el(shadow, '[data-k="message"]'),
    banner: el(shadow, '.banner'),
    flash: el(shadow, '.flash'),
    play: el(shadow, '.overlay'),
    death: el(shadow, '.death'),
    cross: el(shadow, '.cross'),
    sound: el(shadow, '[data-act="sound"]'),
    canvas: null,
  }
  setText(els.title, options.title || 'WOLFENBOX')
  setText(els.status, options.status || 'Play while you wait')

  const api = {
    host,
    shadow,
    stage,
    stageWrap,
    els,
    handlers: {
      close() {},
      minimize() {},
      play() {},
      retry() {},
      sound() {},
    },
    setStatus(text) {
      setText(els.status, text ?? '')
    },
    setProgress(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return
      const clamped = Math.max(0, Math.min(1, n))
      els.bar.hidden = false
      els.fill.style.width = (clamped * 100).toFixed(1) + '%'
    },
    setSoundLabel(muted) {
      setText(els.sound, muted ? 'Unmute' : 'Mute')
    },
    sync(world, engaged) {
      const player = world.player
      setText(els.hp, player.health)
      els.hp.classList.toggle('low', player.health <= 30)
      setText(els.ammo, player.ammo)
      setText(els.floor, world.floor)
      setText(els.score, world.score)
      let left = 0
      for (const enemy of world.enemies) if (!enemy.dead) left += 1
      setText(els.left, left)
      if (world.messageT > 0 && world.message) {
        els.msg.hidden = false
        setText(els.msg, world.message)
      } else {
        els.msg.hidden = true
      }
      if (world.introT > 0) {
        els.banner.hidden = false
        setText(els.banner, 'FLOOR ' + world.floor)
        els.banner.style.opacity = String(Math.min(1, world.introT))
      } else {
        els.banner.hidden = true
      }
      els.flash.style.opacity = player.alive ? String(Math.min(0.7, player.hurt * 1.3)) : '0'
      els.cross.classList.toggle('mark', player.markT > 0)
      els.play.hidden = engaged || !player.alive
      els.death.hidden = player.alive
    },
  }

  el(shadow, '[data-act="close"]').addEventListener('click', () => api.handlers.close())
  el(shadow, '[data-act="min"]').addEventListener('click', () => {
    const next = !win.classList.contains('is-min')
    win.classList.toggle('is-min', next)
    if (options.mode === 'float') {
      if (next) {
        host.dataset.prevHeight = host.style.height
        host.style.height = 'auto'
        host.style.resize = 'none'
      } else {
        host.style.height = host.dataset.prevHeight || ''
        host.style.resize = 'both'
      }
    }
    api.handlers.minimize(next)
  })
  el(shadow, '[data-act="sound"]').addEventListener('click', () => api.handlers.sound())
  el(shadow, '[data-act="retry"]').addEventListener('click', (event) => {
    event.stopPropagation()
    api.handlers.retry()
  })
  els.play.addEventListener('click', () => api.handlers.play())
  els.death.addEventListener('click', () => api.handlers.retry())

  if (options.mode === 'float') {
    const header = el(shadow, 'header')
    header.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return
      if (event.target.closest('button')) return
      const rect = host.getBoundingClientRect()
      host.style.transform = 'none'
      host.style.left = rect.left + 'px'
      host.style.top = rect.top + 'px'
      host.style.right = 'auto'
      host.style.bottom = 'auto'
      const dx = event.clientX - rect.left
      const dy = event.clientY - rect.top
      header.setPointerCapture(event.pointerId)
      const move = (ev) => {
        const maxX = Math.max(0, window.innerWidth - 80)
        const maxY = Math.max(0, window.innerHeight - 40)
        host.style.left = Math.min(maxX, Math.max(-rect.width + 80, ev.clientX - dx)) + 'px'
        host.style.top = Math.min(maxY, Math.max(0, ev.clientY - dy)) + 'px'
      }
      const up = () => {
        header.removeEventListener('pointermove', move)
        header.removeEventListener('pointerup', up)
      }
      header.addEventListener('pointermove', move)
      header.addEventListener('pointerup', up)
    })
  }

  return api
}
