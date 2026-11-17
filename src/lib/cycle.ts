import type { CycleData } from '../types'
import { dateKey, parseKey } from './date'

export type CyclePhase = 'mestruale' | 'follicolare' | 'ovulatoria' | 'luteale'

export interface PhaseInfo {
  id: CyclePhase
  nome: string
  durata: string
  descrizione: string
  cosaSucede: string
  note: string // sintomi / cambiamenti
  scopo: string
  // impatto sull'allenamento
  energia: string
  forza: string
  recupero: string
  focus: string
  consiglio: string
}

export const daysBetween = (a: string, b: string) =>
  Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000)

export const addDays = (key: string, n: number) => {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export const PHASES: Record<CyclePhase, PhaseInfo> = {
  mestruale: {
    id: 'mestruale',
    nome: 'Menstrual',
    durata: '3-7 days',
    descrizione: 'Hormones drop and the uterine lining sheds: your body resets.',
    cosaSucede:
      'The inner lining of the uterus (endometrium) breaks down and leaves the body through the vagina as bleeding.',
    note: 'Cramps, lower back pain, fatigue and mood changes.',
    scopo: 'Clear out uterine tissue that is no longer needed and prepare for the next cycle.',
    energia: 'Low',
    forza: 'Low',
    recupero: 'High',
    focus: 'Mobility and breathing',
    consiglio: 'Light workouts, mobility and walks. Honor your rest: no personal records today.',
  },
  follicolare: {
    id: 'follicolare',
    nome: 'Follicular',
    durata: 'About 10-14 days',
    descrizione: 'Estrogen rises: energy, mood and motivation go up.',
    cosaSucede:
      'FSH stimulates a few follicles to grow until one becomes dominant. The uterine lining starts to thicken again.',
    note: 'Rising estrogen, more energy and better mood; clear, stretchy cervical mucus.',
    scopo: 'Prepare a mature egg for possible fertilization.',
    energia: 'High',
    forza: 'High',
    recupero: 'Good',
    focus: 'Strength and progression',
    consiglio: 'Your best window to push the load and chase progress.',
  },
  ovulatoria: {
    id: 'ovulatoria',
    nome: 'Ovulation',
    durata: '12-24 hours (peak)',
    descrizione: 'An LH surge releases the egg: peak energy and strength.',
    cosaSucede:
      'The LH surge makes the follicle rupture and release the egg toward the fallopian tube.',
    note: 'Possible mild pain or cramping on one side of the lower abdomen.',
    scopo: 'The egg is available to be fertilized.',
    energia: 'Peak',
    forza: 'High',
    recupero: 'Moderate',
    focus: 'Power',
    consiglio: 'Go as hard as you like. Warm up well: joints are more lax.',
  },
  luteale: {
    id: 'luteale',
    nome: 'Luteal',
    durata: 'About 14 days',
    descrizione: 'Progesterone takes over: body temperature rises and energy dips.',
    cosaSucede:
      'The empty follicle becomes the corpus luteum and produces progesterone, keeping the uterine lining ready for implantation.',
    note: 'Without fertilization progesterone falls: PMS is possible (bloating, headaches, fatigue, mood).',
    scopo: 'Prepare the uterus for a possible pregnancy; otherwise, for the next cycle.',
    energia: 'Moderate',
    forza: 'Moderate',
    recupero: 'Moderate',
    focus: 'Consistency and technique',
    consiglio: 'Moderate volume and clean technique. Prioritize sleep and recovery.',
  },
}

export function phaseOf(day: number, cycleLength: number, periodLength: number): CyclePhase {
  const ovulation = Math.max(periodLength + 2, cycleLength - 14)
  if (day <= periodLength) return 'mestruale'
  if (day < ovulation - 1) return 'follicolare'
  if (day <= ovulation + 1) return 'ovulatoria'
  return 'luteale'
}

export interface CurrentCycle {
  day: number
  length: number
  phase: PhaseInfo
  start: string
  /** true se il giorno corrente supera la durata prevista (ciclo in ritardo). */
  late: boolean
}

export function currentCycle(cycle: CycleData, today: string): CurrentCycle | null {
  const past = cycle.starts.filter((d) => d <= today).sort()
  if (past.length === 0) return null
  const start = past[past.length - 1]
  const length = cycle.cycleLength > 0 ? cycle.cycleLength : 28
  const day = daysBetween(start, today) + 1
  const late = day > length
  const phase = PHASES[phaseOf(day, length, cycle.periodLength)]
  return { day, length, phase, start, late }
}

export function averageCycleLength(cycle: CycleData): number | null {
  const s = [...cycle.starts].sort()
  if (s.length < 2) return null
  const diffs: number[] = []
  // Solo intervalli plausibili: un giorno segnato per sbaglio (1 giorno) o un
  // mese saltato (~56) non devono stravolgere le previsioni.
  for (let i = 1; i < s.length; i++) {
    const d = daysBetween(s[i - 1], s[i])
    if (d >= 18 && d <= 50) diffs.push(d)
  }
  const recent = diffs.slice(-6)
  if (!recent.length) return null
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
}

/** Durata da usare per le previsioni: media reale, altrimenti quella impostata. */
const lengthFor = (cycle: CycleData) =>
  averageCycleLength(cycle) ?? (cycle.cycleLength > 0 ? cycle.cycleLength : 28)

export interface CyclePrediction {
  lastStart: string
  nextStart: string
  daysToNext: number
  ovulation: string
}

export function prediction(cycle: CycleData, today: string): CyclePrediction | null {
  const past = cycle.starts.filter((d) => d <= today).sort()
  if (past.length === 0) return null
  const lastStart = past[past.length - 1]
  const len = lengthFor(cycle)
  const nextStart = addDays(lastStart, len)
  return {
    lastStart,
    nextStart,
    daysToNext: daysBetween(today, nextStart),
    ovulation: addDays(lastStart, len - 14),
  }
}

export type DayKind = 'period' | 'predicted' | 'ovulation' | null

/** Genera gli inizi ciclo (reali + previsti) fino a una data limite. */
function startsUntil(cycle: CycleData, until: string): { date: string; predicted: boolean }[] {
  const actual = [...cycle.starts].sort()
  const res = actual.map((d) => ({ date: d, predicted: false }))
  if (actual.length) {
    const len = lengthFor(cycle)
    let s = actual[actual.length - 1]
    for (let i = 0; i < 24; i++) {
      s = addDays(s, len)
      if (s > until) break
      res.push({ date: s, predicted: true })
    }
  }
  return res
}

/** Classifica una data per la resa nel calendario. */
export function dayKind(cycle: CycleData, dateStr: string): DayKind {
  const len = lengthFor(cycle)
  const starts = startsUntil(cycle, addDays(dateStr, len))
  for (const { date } of starts) {
    if (addDays(date, len - 14) === dateStr) return 'ovulation'
  }
  for (const { date, predicted } of starts) {
    const end = addDays(date, Math.max(1, cycle.periodLength || 5) - 1)
    if (dateStr >= date && dateStr <= end) return predicted ? 'predicted' : 'period'
  }
  return null
}
