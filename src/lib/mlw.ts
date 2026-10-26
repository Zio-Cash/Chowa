// Move · Learn · Work: tre abitudini giornaliere.
// Ogni giorno è salvato come stringa di 3 cifre ("101" = Move e Work fatti).
import { addDays, dateKey, mondayOf, parseKey } from './date'

export const GOALS = [
  { k: 'move', n: 'Move', color: '#211d19' }, // inchiostro
  { k: 'learn', n: 'Learn', color: '#8a847a' }, // grigio caldo
  { k: 'work', n: 'Work', color: '#c3bcae' }, // grigio chiaro
] as const

export type MlwLog = Record<string, string>

/** Tiene solo voci valide (data + 3 cifre, non tutte zero). */
export function cleanMlw(o: unknown): MlwLog {
  const r: MlwLog = {}
  if (!o || typeof o !== 'object') return r
  for (const [k, v] of Object.entries(o as Record<string, unknown>))
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'string' && /^[01]{3}$/.test(v) && v !== '000') r[k] = v
  return r
}

export const has = (log: MlwLog, k: string, i: number) => (log[k] ?? '000').charAt(i) === '1'

/** Giorni di fila fino a oggi (se oggi non è ancora segnato, conta da ieri). */
export function streak(log: MlwLog, i: number, today: Date): number {
  let d = today
  if (!has(log, dateKey(d), i)) d = addDays(d, -1)
  let n = 0
  while (has(log, dateKey(d), i) && n < 4000) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function firstDay(log: MlwLog): Date | null {
  const ks = Object.keys(log).sort()
  return ks.length ? parseKey(ks[0]) : null
}

export interface WeekStat {
  start: Date
  key: string
  den: number // giorni contati (dal primo giorno segnato, fino a oggi)
  done: [number, number, number]
}

export function weekStat(log: MlwLog, start: Date, first: Date, today: Date): WeekStat {
  const st: WeekStat = { start, key: dateKey(start), den: 0, done: [0, 0, 0] }
  for (let j = 0; j < 7; j++) {
    const d = addDays(start, j)
    if (d > today || d < first) continue
    st.den++
    const k = dateKey(d)
    for (let i = 0; i < 3; i++) if (has(log, k, i)) st.done[i]++
  }
  return st
}

/** Ultime 8 settimane (dalla più vecchia alla corrente). */
export function lastWeeks(log: MlwLog, today: Date, n = 8): WeekStat[] {
  const first = firstDay(log)
  const cw = mondayOf(today)
  const out: WeekStat[] = []
  for (let w = n - 1; w >= 0; w--) {
    const ws = addDays(cw, -7 * w)
    out.push(first ? weekStat(log, ws, first, today) : { start: ws, key: dateKey(ws), den: 0, done: [0, 0, 0] })
  }
  return out
}

/** Mese in corso: giorni contati e fatti per obiettivo. */
export function monthStat(log: MlwLog, today: Date): { den: number; done: [number, number, number] } {
  const first = firstDay(log)
  const res = { den: 0, done: [0, 0, 0] as [number, number, number] }
  if (!first) return res
  const ms = new Date(today.getFullYear(), today.getMonth(), 1)
  for (let d = first > ms ? first : ms; d <= today; d = addDays(d, 1)) {
    res.den++
    const k = dateKey(d)
    for (let i = 0; i < 3; i++) if (has(log, k, i)) res.done[i]++
  }
  return res
}
