let ctx: AudioContext | null = null

export function beep(freq = 880, ms = 180) {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = freq
    o.type = 'sine'
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000)
    o.start()
    o.stop(ctx.currentTime + ms / 1000)
  } catch {
    /* audio non disponibile */
  }
}

export function vibrate(pattern: number | number[] = 200) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* niente */
  }
}

export function mmss(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
