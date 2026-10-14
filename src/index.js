import { createGame } from './game.js'
import { createShell } from './view.js'

export const version = '0.1.0'

let stack = 0

function place(host, position) {
  const pad = 20 + (stack % 5) * 26
  stack += 1
  if (position === 'center') {
    host.style.left = '50%'
    host.style.top = '50%'
    host.style.transform = 'translate(-50%, -50%)'
    return
  }
  if (position === 'bottom-left') {
    host.style.left = pad + 'px'
    host.style.bottom = pad + 'px'
    return
  }
  host.style.right = pad + 'px'
  host.style.bottom = pad + 'px'
}

function start(host, options) {
  const shell = createShell(host, options)
  const game = createGame(shell, options)
  const session = {
    closed: false,
    setStatus(text) {
      shell.setStatus(text)
    },
    setProgress(value) {
      shell.setProgress(value)
    },
    focus() {
      game.focus()
    },
    getStats() {
      return game.getStats()
    },
    close() {
      if (session.closed) return
      session.closed = true
      game.destroy()
      host.remove()
      options.onClose?.()
    },
    destroy() {
      this.close()
    },
  }
  shell.handlers.close = () => session.close()
  return session
}

/**
 * Open a floating window and start the maze. The page underneath stays usable.
 */
export function open(options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('Wolfenbox.open needs a browser document')
  }
  const host = document.createElement('div')
  host.className = 'wolfenbox-host'
  host.dataset.wolfenbox = 'float'
  const width = options.width ?? 460
  const style = [
    'position:fixed',
    `z-index:${options.zIndex ?? 2147483000}`,
    `width:${width}px`,
    'min-width:280px',
    'max-width:calc(100vw - 16px)',
    'max-height:calc(100vh - 16px)',
    'resize:both',
    'overflow:auto',
    'display:block',
    'background:#14120e',
    'border-radius:12px',
  ]
  if (options.height) style.push(`height:${options.height}px`)
  host.style.cssText = style.join(';')
  place(host, options.position || 'bottom-right')
  document.body.appendChild(host)
  return start(host, { ...options, mode: 'float', width, height: options.height })
}

/**
 * Fill an element you already have. Useful when the game lives in your own panel.
 */
export function mount(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') {
    throw new Error('Wolfenbox.mount needs a container element')
  }
  const host = document.createElement('div')
  host.className = 'wolfenbox-mount'
  host.dataset.wolfenbox = 'embed'
  host.style.height = '100%'
  host.style.minHeight = '360px'
  container.appendChild(host)
  return start(host, { ...options, mode: 'embed' })
}

/**
 * Keep the window up until `task` finishes.
 * Pass a function to receive the session and push status into the title bar.
 * Closing the window does not cancel the task.
 */
export function during(task, options = {}) {
  const session = open({
    ...options,
    onClose() {
      options.onClose?.()
    },
  })
  const run =
    typeof task === 'function' ? Promise.resolve().then(() => task(session)) : Promise.resolve(task)
  return run.finally(() => {
    if (!options.keepOpen && !session.closed) session.close()
  })
}

export const Wolfenbox = { open, mount, during, version }

if (typeof customElements !== 'undefined' && !customElements.get('wolfen-box')) {
  class WolfenBoxElement extends HTMLElement {
    connectedCallback() {
      if (this._session) return
      this.style.display = 'block'
      if (!this.style.minHeight) this.style.minHeight = '360px'
      if (!this.style.height) this.style.height = '100%'
      this._session = mount(this, {
        title: this.getAttribute('title') || 'WOLFENBOX',
        status: this.getAttribute('status') || 'Play while you wait',
      })
    }

    disconnectedCallback() {
      this._session?.destroy()
      this._session = null
    }

    setStatus(text) {
      this._session?.setStatus(text)
    }

    setProgress(value) {
      this._session?.setProgress(value)
    }

    getStats() {
      return this._session?.getStats() ?? null
    }
  }
  customElements.define('wolfen-box', WolfenBoxElement)
}
