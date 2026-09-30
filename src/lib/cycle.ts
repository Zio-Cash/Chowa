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
    nome: 'Mestruale',
    durata: '3-7 giorni',
    descrizione: 'Con il calo ormonale l’endometrio si sfalda: il corpo si rinnova.',
    cosaSucede:
      'Il rivestimento interno dell’utero (endometrio) si sfalda e viene espulso attraverso la vagina sotto forma di sanguinamento.',
    note: 'Crampi addominali, mal di schiena, stanchezza e cambiamenti dell’umore.',
    scopo: 'Eliminare il tessuto uterino non più necessario e preparare il ciclo successivo.',
    energia: 'Bassa',
    forza: 'Bassa',
    recupero: 'Alto',
    focus: 'Mobilità e respiro',
    consiglio: 'Allenamenti leggeri, mobilità e camminate. Rispetta il riposo: niente record oggi.',
  },
  follicolare: {
    id: 'follicolare',
    nome: 'Follicolare',
    durata: 'Circa 10-14 giorni',
    descrizione: 'Gli estrogeni salgono: energia, umore e voglia di fare aumentano.',
    cosaSucede:
      'L’FSH stimola la crescita di alcuni follicoli finché uno diventa dominante. L’endometrio ricomincia a ispessirsi.',
    note: 'Estrogeni in crescita, più energia e umore; muco cervicale chiaro e filante.',
    scopo: 'Preparare un ovulo maturo per l’eventuale fecondazione.',
    energia: 'Alta',
    forza: 'Alta',
    recupero: 'Buono',
    focus: 'Forza e progressione',
    consiglio: 'La finestra migliore per spingere sui carichi e cercare progressi.',
  },
  ovulatoria: {
    id: 'ovulatoria',
    nome: 'Ovulatoria',
    durata: '12-24 ore (picco)',
    descrizione: 'Un picco di LH rilascia l’ovulo: massima energia e forza.',
    cosaSucede:
      'Il picco di LH provoca la rottura del follicolo e il rilascio dell’ovulo verso la tuba di Falloppio.',
    note: 'Possibile lieve dolore o crampo su un lato del basso ventre.',
    scopo: 'L’ovulo è disponibile per essere fecondato.',
    energia: 'Massima',
    forza: 'Alta',
    recupero: 'Medio',
    focus: 'Potenza',
    consiglio: 'Massima intensità possibile. Cura il riscaldamento: le articolazioni sono più lasse.',
  },
  luteale: {
    id: 'luteale',
    nome: 'Luteale',
    durata: 'Circa 14 giorni',
    descrizione: 'Il progesterone domina: temperatura più alta ed energia in calo.',
    cosaSucede:
      'Il follicolo vuoto diventa corpo luteo e produce progesterone, mantenendo l’endometrio pronto all’impianto.',
    note: 'Se non c’è fecondazione il progesterone cala: possibile sindrome premestruale (gonfiore, mal di testa, stanchezza, umore).',
    scopo: 'Preparare l’utero a una possibile gravidanza; altrimenti, al nuovo ciclo.',
    energia: 'Media',
    forza: 'Media',
    recupero: 'Medio',
    focus: 'Costanza e tecnica',
    consiglio: 'Volume moderato e tecnica pulita. Priorità a sonno e recupero.',
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
  for (let i = 1; i < s.length; i++) diffs.push(daysBetween(s[i - 1], s[i]))
  const recent = diffs.slice(-6)
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
}

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
  const len = averageCycleLength(cycle) ?? cycle.cycleLength
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
    const len = averageCycleLength(cycle) ?? cycle.cycleLength
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
  const len = averageCycleLength(cycle) ?? cycle.cycleLength
  const starts = startsUntil(cycle, addDays(dateStr, len))
  for (const { date } of starts) {
    if (addDays(date, len - 14) === dateStr) return 'ovulation'
  }
  for (const { date, predicted } of starts) {
    const end = addDays(date, cycle.periodLength - 1)
    if (dateStr >= date && dateStr <= end) return predicted ? 'predicted' : 'period'
  }
  return null
}
