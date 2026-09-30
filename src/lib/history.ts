import type { AppState } from '../types'
import { addDays, dateKey, mondayOf, MONITOR_START, weekBelongsToMonth } from './date'
import { bmr } from './calories'
import { dayMacros, macroRatioOk } from './nutrition'

export interface DaySummary {
  date: string
  weight?: number
  steps: number
  water: number
  activeKcal: number
  stepsOk: boolean
  waterOk: boolean
  // allenamento
  workoutDayId?: string
  workoutNome?: string
  workoutEmoji?: string
  workoutSetsDone: number
  workoutSetsTotal: number
  workoutDone: boolean
  // dieta
  dietKcal: number
  dietP: number
  dietC: number
  dietG: number
  mealsChecked: number
  mealsTotal: number
  dietFollowed: boolean
  kcalOk: boolean // kcal nel range [kcalMin, target]
  macroOk: boolean // rapporto % macro vicino all'obiettivo
  /** assunte − attive − metabolismo basale (< 0 = deficit) */
  deficit: number
  // riepilogo
  perfetta: boolean
  /** quante "aree" del programma seguite quel giorno (0..6) */
  score: number
}

/** Riepilogo completo di un singolo giorno a partire dallo stato. */
export function buildDaySummary(s: AppState, date: string): DaySummary {
  const steps = s.stepsLog[date] ?? 0
  const water = s.waterLog[date] ?? 0
  const activeKcal = s.activeKcalLog?.[date] ?? 0
  const weight = s.weightLog[date]

  // allenamento
  const sess = s.workoutProgress[date]
  let workoutSetsDone = 0
  let workoutSetsTotal = 0
  let workoutNome: string | undefined
  let workoutEmoji: string | undefined
  let workoutDayId: string | undefined
  if (sess) {
    workoutDayId = sess.dayId
    const day = s.executionPlan.find((d) => d.id === sess.dayId)
    workoutNome = day?.nome
    workoutEmoji = day?.emoji
    if (day) {
      workoutSetsTotal = day.blocchi
        .flatMap((b) => b.esercizi)
        .filter((e) => e.tipo === 'reps')
        .reduce((a, e) => a + e.serie, 0)
    }
    workoutSetsDone = Object.values(sess.esercizi).reduce(
      (a, e) => a + e.sets.filter(Boolean).length,
      0,
    )
  }
  const eventi = s.gamification.eventi[date] ?? []
  const workoutDone = workoutSetsDone > 0 || eventi.some((e) => e.startsWith('workout:'))

  // dieta
  const meals = s.diario[date]
  const mealsTotal = meals?.length ?? 0
  const mealsChecked = meals?.filter((m) => m.spuntato).length ?? 0
  const dm = meals ? dayMacros(meals, s.foods, true) : { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 }
  const dietKcal = dm.kcal
  const dietFollowed = mealsTotal > 0 && mealsChecked === mealsTotal
  const g = s.settings.goals
  const kcalOk = dietKcal >= g.kcalMin && dietKcal <= s.settings.targets.kcal
  const macroOk = macroRatioOk(dm, s.settings.targets)

  const stepsOk = steps >= g.stepTarget
  const waterOk = water >= g.waterTarget
  const perfetta = eventi.includes('perfetta')

  const score = [weight != null, kcalOk, macroOk, workoutDone, waterOk, stepsOk].filter(Boolean).length

  // deficit del giorno: assunte − attive − metabolismo basale
  const p = s.settings.profilo
  const metabolismo = Math.round(bmr(p.sesso, p.peso, p.altezza, p.eta))
  const deficit = Math.round(dietKcal) - activeKcal - metabolismo

  return {
    date,
    weight,
    deficit,
    steps,
    water,
    activeKcal,
    stepsOk,
    waterOk,
    workoutDayId,
    workoutNome,
    workoutEmoji,
    workoutSetsDone,
    workoutSetsTotal,
    workoutDone,
    dietKcal,
    dietP: dm.proteine,
    dietC: dm.carboidrati,
    dietG: dm.grassi,
    mealsChecked,
    mealsTotal,
    dietFollowed,
    kcalOk,
    macroOk,
    perfetta,
    score,
  }
}

export interface PeriodStats {
  giorni: number // giorni con almeno un'attività
  allenamenti: number
  mediaPassi: number
  mediaAcqua: number
  mediaKcal: number
  /** media del deficit calorico sui giorni con pasti registrati (< 0 = deficit) */
  mediaDeficit: number
  giorniDieta: number
  giorniPerfetti: number
}

export function periodStats(days: DaySummary[]): PeriodStats {
  const attivi = days.filter((d) => d.score > 0)
  const passiVals = days.map((d) => d.steps).filter((n) => n > 0)
  const acquaVals = days.map((d) => d.water).filter((n) => n > 0)
  const kcalVals = days.map((d) => d.dietKcal).filter((n) => n > 0)
  // il deficit ha senso solo nei giorni in cui hai registrato i pasti
  const deficitVals = days.filter((d) => d.dietKcal > 0).map((d) => d.deficit)
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
  return {
    giorni: attivi.length,
    allenamenti: days.filter((d) => d.workoutDone).length,
    mediaPassi: avg(passiVals),
    mediaAcqua: avg(acquaVals),
    mediaKcal: avg(kcalVals),
    mediaDeficit: avg(deficitVals),
    giorniDieta: days.filter((d) => d.kcalOk).length,
    giorniPerfetti: days.filter((d) => d.perfetta).length,
  }
}

export interface DayRating {
  label: string
  /** classe Tailwind per testo/sfondo del badge */
  cls: string
}

/** Valutazione della giornata in base allo "score" (0..6). null se nessuna attività. */
export function dayRating(score: number): DayRating | null {
  if (score <= 0) return null
  if (score >= 5) return { label: 'Eccellente', cls: 'bg-verde/15 text-verde' }
  if (score >= 3) return { label: 'Ok', cls: 'bg-arancio/15 text-arancio' }
  return { label: 'Pessima', cls: 'bg-red-500/15 text-red-400' }
}

/** Tutti i giorni di un mese come DaySummary (1..ultimo giorno). */
export function monthSummaries(s: AppState, year: number, month0: number): DaySummary[] {
  const last = new Date(year, month0 + 1, 0).getDate()
  const out: DaySummary[] = []
  for (let d = 1; d <= last; d++) {
    out.push(buildDaySummary(s, dateKey(new Date(year, month0, d))))
  }
  return out
}

export interface WeekSummary {
  startDate: Date
  endDate: Date
  /** i 7 giorni lun→dom, filtrati su [MONITOR_START, oggi] */
  days: DaySummary[]
}

/**
 * Settimane del mese indicato. Ogni settimana va sempre da lunedì a domenica
 * (7 giorni esatti) e appartiene a UN SOLO mese: quello in cui cade il giovedì.
 * Così le settimane a cavallo non compaiono in due mesi diversi.
 */
export function weeksForMonth(
  s: AppState,
  year: number,
  month0: number,
  today: string,
): WeekSummary[] {
  const firstOfMonth = new Date(year, month0, 1)
  const lastOfMonth = new Date(year, month0 + 1, 0)
  const out: WeekSummary[] = []
  let cursor = mondayOf(firstOfMonth)

  while (cursor <= lastOfMonth) {
    if (weekBelongsToMonth(cursor, year, month0)) {
      const startDate = cursor
      const endDate = addDays(cursor, 6)
      const days: DaySummary[] = []
      for (let i = 0; i < 7; i++) {
        const key = dateKey(addDays(startDate, i))
        if (key < MONITOR_START || key > today) continue
        days.push(buildDaySummary(s, key))
      }
      if (days.length > 0) out.push({ startDate, endDate, days })
    }
    cursor = addDays(cursor, 7)
  }
  return out
}
