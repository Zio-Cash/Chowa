import { useEffect, useReducer, useSyncExternalStore } from 'react'
import { beep, vibrate } from './sound'

// Timer di recupero condiviso. Si basa sull'orario di fine (non sul conteggio
// dei tick): resta preciso anche a schermo bloccato, e sopravvive al cambio di
// scheda perché vive fuori dai componenti.
export interface RestTimer {
  label: string
  total: number
  /** ms di fine se in corso, altrimenti null (in pausa) */
  endsAt: number | null
  /** secondi rimasti quando è in pausa */
  pausedSec: number
}

let timer: RestTimer | null = null
let lastBeep = -1
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
let ticker: ReturnType<typeof setInterval> | null = null

export const secLeft = (t: RestTimer, now = Date.now()) =>
  t.endsAt == null ? t.pausedSec : Math.max(0, Math.ceil((t.endsAt - now) / 1000))

function tick() {
  if (!timer || timer.endsAt == null) return stopTicker()
  const s = secLeft(timer)
  if (s !== lastBeep) {
    lastBeep = s
    if (s === 0) {
      beep(880, 250)
      vibrate([200, 100, 200])
      timer = { ...timer, endsAt: null, pausedSec: 0 }
      emit()
      return stopTicker()
    }
    if (s <= 3) beep(660, 90)
  }
}
function startTicker() {
  if (!ticker) ticker = setInterval(tick, 250)
}
function stopTicker() {
  if (ticker) clearInterval(ticker)
  ticker = null
}

function set(next: RestTimer | null) {
  timer = next
  lastBeep = -1
  if (timer?.endsAt != null) startTicker()
  else stopTicker()
  emit()
}

export const restTimer = {
  start(sec: number, label: string) {
    set({ label, total: sec, endsAt: Date.now() + sec * 1000, pausedSec: sec })
  },
  add(delta: number) {
    if (!timer) return
    const s = Math.max(0, secLeft(timer) + delta)
    set(timer.endsAt == null ? { ...timer, pausedSec: s } : { ...timer, endsAt: Date.now() + s * 1000 })
  },
  toggle() {
    if (!timer) return
    const s = secLeft(timer)
    if (timer.endsAt == null) {
      if (s > 0) set({ ...timer, endsAt: Date.now() + s * 1000 })
    } else set({ ...timer, endsAt: null, pausedSec: s })
  },
  stop() {
    set(null)
  },
}

const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}

/** Stato del timer + secondi rimasti, aggiornati 4 volte al secondo mentre corre. */
export function useRestTimer() {
  const t = useSyncExternalStore(subscribe, () => timer)
  const [, redraw] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    if (t?.endsAt == null) return
    const id = setInterval(redraw, 250)
    return () => clearInterval(id)
  }, [t?.endsAt])
  return t ? { ...t, sec: secLeft(t), running: t.endsAt != null } : null
}
