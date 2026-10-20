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

export const CATEGORIES = ['Passi', 'Costanza', 'Allenamento', 'Nutrizione', 'Acqua', 'Peso', 'Energia']

const M = (
  cat: string,
  icon: string,
  metric: Metric,
  list: [string, Tier, number, string, string][],
  unit?: string,
): MedalDef[] => list.map(([id, tier, goal, nome, desc]) => ({ id, cat, icon, metric, tier, goal, nome, desc, unit }))

export const MEDALS: MedalDef[] = [
  ...M('Passi', 'steps', 'maxSteps', [
    ['passi_10k', 'bronze', 10000, 'Diecimila', '10.000 passi in un solo giorno'],
    ['passi_15k', 'silver', 15000, 'Quindicimila', '15.000 passi in un solo giorno'],
    ['passi_20k', 'gold', 20000, 'Ventimila', '20.000 passi in un solo giorno'],
  ], 'passi'),
  ...M('Passi', 'steps', 'totalSteps', [
    ['passi_100k', 'bronze', 100000, 'Centomila', '100.000 passi in totale'],
    ['passi_500k', 'silver', 500000, 'Mezzo milione', '500.000 passi in totale'],
    ['passi_1m', 'gold', 1000000, 'Un milione', '1.000.000 di passi in totale'],
  ], 'passi'),
  ...M('Passi', 'steps', 'stepDays', [
    ['passi_obj_7', 'bronze', 7, 'In cammino', 'Obiettivo passi raggiunto 7 giorni'],
    ['passi_obj_30', 'silver', 30, 'Passo costante', 'Obiettivo passi raggiunto 30 giorni'],
    ['passi_obj_100', 'gold', 100, 'Instancabile', 'Obiettivo passi raggiunto 100 giorni'],
  ], 'giorni'),
  ...M('Costanza', 'flame', 'bestStreak', [
    ['streak_3', 'bronze', 3, 'Tre di fila', '3 giorni attivi consecutivi'],
    ['streak_7', 'silver', 7, 'Una settimana', '7 giorni attivi consecutivi'],
    ['streak_30', 'gold', 30, 'Un mese di fila', '30 giorni attivi consecutivi'],
    ['streak_100', 'platinum', 100, 'Cento giorni', '100 giorni attivi consecutivi'],
  ], 'giorni'),
  ...M('Costanza', 'star', 'perfectDays', [
    ['perfetta_1', 'bronze', 1, 'Giornata perfetta', 'Tutti i rituali completati in un giorno'],
    ['perfetta_10', 'silver', 10, 'Dieci perfette', '10 giornate perfette'],
    ['perfetta_50', 'gold', 50, 'Maestria', '50 giornate perfette'],
  ], 'giornate'),
  ...M('Allenamento', 'practice', 'workouts', [
    ['workout_1', 'bronze', 1, 'Primo allenamento', 'Hai completato il tuo primo allenamento'],
    ['workout_10', 'silver', 10, 'Dieci sessioni', '10 allenamenti completati'],
    ['workout_50', 'gold', 50, 'Cinquanta sessioni', '50 allenamenti completati'],
    ['workout_100', 'platinum', 100, 'Cento sessioni', '100 allenamenti completati'],
  ], 'allenamenti'),
  ...M('Nutrizione', 'bowl', 'diaryDays', [
    ['diario_7', 'bronze', 7, 'Diario di una settimana', 'Pasti registrati per 7 giorni'],
    ['diario_30', 'silver', 30, 'Un mese di diario', 'Pasti registrati per 30 giorni'],
    ['diario_100', 'gold', 100, 'Cento giorni a tavola', 'Pasti registrati per 100 giorni'],
  ], 'giorni'),
  ...M('Nutrizione', 'bowl', 'deficitDays', [
    ['deficit_7', 'bronze', 7, 'In equilibrio', '7 giorni chiusi in deficit'],
    ['deficit_30', 'silver', 30, 'Disciplina', '30 giorni chiusi in deficit'],
    ['deficit_90', 'gold', 90, 'Trasformazione', '90 giorni chiusi in deficit'],
  ], 'giorni'),
  ...M('Acqua', 'drop', 'waterDays', [
    ['acqua_7', 'bronze', 7, 'Idratata', 'Obiettivo acqua raggiunto 7 giorni'],
    ['acqua_30', 'silver', 30, 'Fonte', 'Obiettivo acqua raggiunto 30 giorni'],
    ['acqua_100', 'gold', 100, 'Sorgente', 'Obiettivo acqua raggiunto 100 giorni'],
  ], 'giorni'),
  ...M('Peso', 'weight', 'weighIns', [
    ['pesate_10', 'bronze', 10, 'Sulla bilancia', '10 pesate registrate'],
    ['pesate_50', 'silver', 50, 'Monitoraggio', '50 pesate registrate'],
    ['pesate_150', 'gold', 150, 'Precisione', '150 pesate registrate'],
  ], 'pesate'),
  ...M('Peso', 'weight', 'kgLost', [
    ['kg_1', 'bronze', 1, 'Primo chilo', '1 kg in meno dall’inizio'],
    ['kg_3', 'silver', 3, 'Tre chili', '3 kg in meno dall’inizio'],
    ['kg_5', 'gold', 5, 'Cinque chili', '5 kg in meno dall’inizio'],
    ['kg_10', 'platinum', 10, 'Dieci chili', '10 kg in meno dall’inizio'],
  ], 'kg'),
  ...M('Energia', 'flame', 'activeKcal', [
    ['kcal_10k', 'bronze', 10000, 'Accesa', '10.000 kcal attive bruciate in totale'],
    ['kcal_50k', 'silver', 50000, 'Fornace', '50.000 kcal attive bruciate in totale'],
    ['kcal_100k', 'gold', 100000, 'Vulcano', '100.000 kcal attive bruciate in totale'],
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
