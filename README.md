# Wolfenbox.js

A Wolfenstein-style raycasting maze you can drop into a JavaScript app. It opens in its own window so someone can play while a long operation runs. The page underneath keeps working.

This is an original game: procedural mazes, textures, and sprites. It does not use Wolfenstein 3D art, levels, or trademarks.

No dependencies. Sound is off until the player turns it on.

## Play the demo

```bash
npm run demo
```

Open `http://localhost:5179`. **Run a long job** opens the maze and pushes progress into the window. The notes field stays editable the whole time.

## Use it while a job runs

```js
import { Wolfenbox } from 'wolfenbox.js'

await Wolfenbox.during(async (box) => {
  for (let step = 1; step <= 5; step++) {
    box.setStatus('Step ' + step + ' of 5')
    box.setProgress(step / 5)
    await doStep(step)
  }
}, { title: 'Packaging build' })
```

`during` closes the window when the task settles, including when the task throws. The promise result is unchanged. Closing the window does not cancel your task.

Pass `keepOpen: true` to leave the maze up.

A promise works too, if you do not need to update the status:

```js
await Wolfenbox.during(fetch('/api/export'), { title: 'Exporting' })
```

## Open it yourself

```js
const box = Wolfenbox.open({
  title: 'Exporting report',
  status: 'Starting…',
  position: 'bottom-right', // or 'bottom-left' or 'center'
})

box.setStatus('Uploading part 2')
box.setProgress(0.4)

box.close()
```

## Mount it in your own panel

```js
const box = Wolfenbox.mount(document.querySelector('#side'), {
  title: 'While you wait',
})
```

Or drop in the custom element. The module registers it on import.

```html
<script type="module" src="./src/index.js"></script>
<wolfen-box title="Uploading" style="height: 480px"></wolfen-box>
```

```js
const el = document.querySelector('wolfen-box')
el.setStatus('Verifying')
el.setProgress(0.8)
```

## Controls

| Input | Action |
| --- | --- |
| Click the view | Play. Later clicks shoot |
| WASD | Move and strafe |
| Mouse | Turn while the view is focused |
| Arrow keys | Move and turn |
| Shift | Run |
| E | Open or close a door |
| M | Map |
| Space | Shoot. With no ammo, a close swing |
| Esc | Hand focus back to the page |

Find the gold stairs to climb a floor. Score carries over. Closing the window, or finishing the job, ends the session.

## Options

| Option | Meaning |
| --- | --- |
| `title` | Window title |
| `status` | Line next to the title. `setStatus` updates it |
| `position` | `bottom-right` (default), `bottom-left`, or `center` |
| `width`, `height` | Floating window size in pixels |
| `keepOpen` | `during` leaves the window open |
| `sound` | Start unmuted |
| `onClose`, `onFloor`, `onScore` | Hooks |

`getStats()` returns floor, score, health, ammo, and whether the player has clicked into the game.

Drag the title bar to move the floating window. Drag the corner to resize it.

## Tests

```bash
npm test
```

## License

MIT
