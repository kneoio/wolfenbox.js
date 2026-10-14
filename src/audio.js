export function createAudio() {
  let ctx = null
  let muted = true

  function ac() {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  function tone(freq, dur, type, gain, at = 0, slideTo = 0) {
    const audio = ac()
    const t0 = audio.currentTime + at
    const osc = audio.createOscillator()
    const amp = audio.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(1, freq), t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
    amp.gain.setValueAtTime(gain, t0)
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(amp)
    amp.connect(audio.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  function noise(dur, gain) {
    const audio = ac()
    const length = Math.max(1, Math.floor(audio.sampleRate * dur))
    const buffer = audio.createBuffer(1, length, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const src = audio.createBufferSource()
    src.buffer = buffer
    const filter = audio.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 900
    const amp = audio.createGain()
    amp.gain.setValueAtTime(gain, audio.currentTime)
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur)
    src.connect(filter)
    filter.connect(amp)
    amp.connect(audio.destination)
    src.start()
  }

  const bank = {
    shoot() {
      noise(0.06, 0.07)
      tone(190, 0.07, 'square', 0.035)
    },
    knife() {
      tone(90, 0.05, 'square', 0.05)
      tone(150, 0.04, 'square', 0.03, 0.03)
    },
    hit() {
      tone(520, 0.05, 'square', 0.04)
    },
    down() {
      tone(220, 0.12, 'sawtooth', 0.04, 0, 70)
    },
    hurt() {
      tone(120, 0.16, 'sawtooth', 0.055, 0, 55)
    },
    pickup() {
      tone(660, 0.06, 'square', 0.04)
      tone(880, 0.08, 'square', 0.04, 0.07)
    },
    door() {
      noise(0.09, 0.03)
    },
    exit() {
      tone(523, 0.08, 'square', 0.04)
      tone(659, 0.1, 'square', 0.04, 0.08)
      tone(784, 0.12, 'square', 0.035, 0.16)
    },
  }

  return {
    get muted() {
      return muted
    },
    setMuted(value) {
      muted = !!value
      if (!muted) ac()
    },
    play(name) {
      if (muted) return
      const fn = bank[name]
      if (fn) fn()
    },
  }
}
