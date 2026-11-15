import type { AppState } from '../types'
import { addDays, dateKey, parseKey } from './date'
import { buildDaySummary } from './history'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'
type Metric =
  | 'maxSteps'
  | 'totalSteps'
  | 'stepDays'
  | 'bestStreak'
  | 'perfectDays'
  | 'workouts'
  | 'diaryDays'
  | 'deficitDays'
  | 'waterDays'
  | 'weighIns'
  | 'kgLost'
  | 'activeKcal'

export interface MedalDef {
  id: string
  cat: string
  nome: string
  desc: string
  icon: string // chiave Icon
  tier: Tier
  metric: Metric
  goal: number
  unit?: string
}

export const CATEGORIES = ['Steps', 'Consistency', 'Workout', 'Nutrition', 'Water', 'Weight', 'Energy']

const M = (
  cat: string,
  icon: string,
  metric: Metric,
  list: [string, Tier, number, string, string][],
  unit?: string,
): MedalDef[] => list.map(([id, tier, goal, nome, desc]) => ({ id, cat, icon, metric, tier, goal, nome, desc, unit }))

export const MEDALS: MedalDef[] = [
  ...M('Steps', 'steps', 'maxSteps', [
    ['passi_10k', 'bronze', 10000, 'Ten thousand', '10,000 steps in a single day'],
    ['passi_15k', 'silver', 15000, 'Fifteen thousand', '15,000 steps in a single day'],
    ['passi_20k', 'gold', 20000, 'Twenty thousand', '20,000 steps in a single day'],
  ], 'steps'),
  ...M('Steps', 'steps', 'totalSteps', [
    ['passi_100k', 'bronze', 100000, 'One hundred thousand', '100,000 steps in total'],
    ['passi_500k', 'silver', 500000, 'Half a million', '500,000 steps in total'],
    ['passi_1m', 'gold', 1000000, 'One million', '1,000,000 steps in total'],
  ], 'steps'),
  ...M('Steps', 'steps', 'stepDays', [
    ['passi_obj_7', 'bronze', 7, 'On the path', 'Step goal reached on 7 days'],
    ['passi_obj_30', 'silver', 30, 'Steady stride', 'Step goal reached on 30 days'],
    ['passi_obj_100', 'gold', 100, 'Tireless', 'Step goal reached on 100 days'],
  ], 'days'),
  ...M('Consistency', 'flame', 'bestStreak', [
    ['streak_3', 'bronze', 3, 'Three in a row', '3 active days in a row'],
    ['streak_7', 'silver', 7, 'One week', '7 active days in a row'],
    ['streak_30', 'gold', 30, 'A month strong', '30 active days in a row'],
    ['streak_100', 'platinum', 100, 'One hundred days', '100 active days in a row'],
  ], 'days'),
  ...M('Consistency', 'star', 'perfectDays', [
    ['perfetta_1', 'bronze', 1, 'Perfect day', 'Every ritual completed in a single day'],
    ['perfetta_10', 'silver', 10, 'Ten perfect days', '10 perfect days'],
    ['perfetta_50', 'gold', 50, 'Mastery', '50 perfect days'],
  ], 'days'),
  ...M('Workout', 'practice', 'workouts', [
    ['workout_1', 'bronze', 1, 'First workout', 'You completed your first workout'],
    ['workout_10', 'silver', 10, 'Ten sessions', '10 workouts completed'],
    ['workout_50', 'gold', 50, 'Fifty sessions', '50 workouts completed'],
    ['workout_100', 'platinum', 100, 'One hundred sessions', '100 workouts completed'],
  ], 'workouts'),
  ...M('Nutrition', 'bowl', 'diaryDays', [
    ['diario_7', 'bronze', 7, 'A week of logging', 'Meals logged on 7 days'],
    ['diario_30', 'silver', 30, 'A month of logging', 'Meals logged on 30 days'],
    ['diario_100', 'gold', 100, 'One hundred days at the table', 'Meals logged on 100 days'],
  ], 'days'),
  ...M('Nutrition', 'bowl', 'deficitDays', [
    ['deficit_7', 'bronze', 7, 'In balance', '7 days closed in a deficit'],
    ['deficit_30', 'silver', 30, 'Discipline', '30 days closed in a deficit'],
    ['deficit_90', 'gold', 90, 'Transformation', '90 days closed in a deficit'],
  ], 'days'),
  ...M('Water', 'drop', 'waterDays', [
    ['acqua_7', 'bronze', 7, 'Hydrated', 'Water goal reached on 7 days'],
    ['acqua_30', 'silver', 30, 'Fountain', 'Water goal reached on 30 days'],
    ['acqua_100', 'gold', 100, 'Wellspring', 'Water goal reached on 100 days'],
  ], 'days'),
  ...M('Weight', 'weight', 'weighIns', [
    ['pesate_10', 'bronze', 10, 'On the scale', '10 weigh-ins logged'],
    ['pesate_50', 'silver', 50, 'Keeping track', '50 weigh-ins logged'],
    ['pesate_150', 'gold', 150, 'Precision', '150 weigh-ins logged'],
  ], 'weigh-ins'),
  ...M('Weight', 'weight', 'kgLost', [
    ['kg_1', 'bronze', 1, 'First kilo', '1 kg down since you started'],
    ['kg_3', 'silver', 3, 'Three kilos', '3 kg down since you started'],
    ['kg_5', 'gold', 5, 'Five kilos', '5 kg down since you started'],
    ['kg_10', 'platinum', 10, 'Ten kilos', '10 kg down since you started'],
  ], 'kg'),
  ...M('Energy', 'flame', 'activeKcal', [
    ['kcal_10k', 'bronze', 10000, 'Spark', '10,000 active kcal burned in total'],
    ['kcal_50k', 'silver', 50000, 'Furnace', '50,000 active kcal burned in total'],
    ['kcal_100k', 'gold', 100000, 'Volcano', '100,000 active kcal burned in total'],
  ], 'kcal'),
]

const countEvent = (eventi: Record<string, string[]>, id: string) =>
  Object.values(eventi).filter((ids) => ids.includes(id)).length

// Allenamenti: l'evento è "workout:<idGiorno>", quindi conto per prefisso.
const countPrefix = (eventi: Record<string, string[]>, prefix: string) =>
  Object.values(eventi).reduce((n, ids) => n + ids.filter((x) => x.startsWith(prefix)).length, 0)

/** Giorni consecutivi più lunghi con almeno un'attività registrata. */
function bestStreak(s: AppState): number {
  const days = new Set<string>()
  for (const [d, ids] of Object.entries(s.gamification.eventi)) if (ids.length) days.add(d)
  for (const [d, meals] of Object.entries(s.diario)) if (meals.some((m) => m.items.length)) days.add(d)
  for (const d of Object.keys(s.weightLog)) days.add(d)
  for (const [d, n] of Object.entries(s.stepsLog)) if (n > 0) days.add(d)
  for (const d of Object.keys(s.workoutProgress)) days.add(d)
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of sorted) {
    run = prev && dateKey(addDays(parseKey(prev), 1)) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return Math.max(best, s.gamification.streak)
}

export function computeMetrics(s: AppState): Record<Metric, number> {
  const steps = Object.values(s.stepsLog).filter((n) => n > 0)
  const diaryDates = Object.entries(s.diario)
    .filter(([, meals]) => meals.some((m) => m.items.length))
    .map(([d]) => d)
  const deficitDays = diaryDates.filter((d) => {
    const x = buildDaySummary(s, d)
    return x.dietKcal > 0 && x.deficit < 0
  }).length
  const pesi = Object.entries(s.weightLog)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
  return {
    maxSteps: steps.length ? Math.max(...steps) : 0,
    totalSteps: steps.reduce((a, b) => a + b, 0),
    stepDays: countEvent(s.gamification.eventi, 'passi'),
    bestStreak: bestStreak(s),
    perfectDays: countEvent(s.gamification.eventi, 'perfetta'),
    workouts: countPrefix(s.gamification.eventi, 'workout'),
    diaryDays: diaryDates.length,
    deficitDays,
    waterDays: countEvent(s.gamification.eventi, 'acqua'),
    weighIns: pesi.length,
    kgLost: pesi.length >= 2 ? Math.max(0, Math.round((pesi[0] - pesi[pesi.length - 1]) * 10) / 10) : 0,
    activeKcal: Object.values(s.activeKcalLog ?? {}).reduce((a, b) => a + (b > 0 ? b : 0), 0),
  }
}

export interface MedalStatus {
  def: MedalDef
  value: number
  earned: boolean
  date?: string // '' = conquistata prima dell'arrivo delle medaglie
  pct: number
}

export const INIT_KEY = '__init'

export function medalStatus(s: AppState): MedalStatus[] {
  const met = computeMetrics(s)
  const got = s.medals ?? {}
  return MEDALS.map((def) => {
    const value = met[def.metric]
    const earned = def.id in got || value >= def.goal
    return { def, value, earned, date: got[def.id], pct: Math.min(1, value / def.goal) }
  })
}

/** Medaglie raggiunte dai dati ma non ancora registrate. */
export function newlyEarned(s: AppState): string[] {
  const met = computeMetrics(s)
  const got = s.medals ?? {}
  return MEDALS.filter((d) => !(d.id in got) && met[d.metric] >= d.goal).map((d) => d.id)
}

export const medalById = (id: string) => MEDALS.find((m) => m.id === id)

/** Etichetta corta da incidere sulla medaglia: 10K, 1M, 30, −5. */
export function medalLabel(d: MedalDef): string {
  if (d.unit === 'kg') return `−${d.goal}`
  if (d.goal >= 1_000_000) return `${d.goal / 1_000_000}M`
  if (d.goal >= 1000) return `${d.goal / 1000}K`
  return String(d.goal)
}
