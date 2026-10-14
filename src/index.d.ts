export interface WolfenboxStats {
  floor: number
  score: number
  health: number
  ammo: number
  alive: boolean
  x: number
  y: number
  enemies: number
  engaged: boolean
}

export interface WolfenboxSession {
  closed: boolean
  setStatus(text: string): void
  setProgress(value: number): void
  focus(): void
  getStats(): WolfenboxStats
  close(): void
  destroy(): void
}

export interface WolfenboxOptions {
  title?: string
  status?: string
  width?: number
  height?: number
  zIndex?: number
  position?: 'bottom-right' | 'bottom-left' | 'center'
  /** Leave the window open when `during` finishes. */
  keepOpen?: boolean
  /** Start with sound on. Sound is off until the player opts in. */
  sound?: boolean
  onClose?: () => void
  onFloor?: (floor: number) => void
  onScore?: (score: number) => void
}

export function open(options?: WolfenboxOptions): WolfenboxSession
export function mount(container: HTMLElement, options?: WolfenboxOptions): WolfenboxSession
export function during<T>(
  task: Promise<T> | ((box: WolfenboxSession) => T | Promise<T>),
  options?: WolfenboxOptions,
): Promise<T>

export const version: string

export const Wolfenbox: {
  open: typeof open
  mount: typeof mount
  during: typeof during
  version: string
}
