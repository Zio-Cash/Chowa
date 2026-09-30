import type { DailyGoals } from '../types'

// Obiettivi giornalieri di default (configurabili dall'utente)
export const DEFAULT_GOALS: DailyGoals = {
  stepTarget: 8000,
  waterTarget: 2000,
  kcalMin: 1600,
}

export const WATER_STEP_ML = 250 // un bicchiere

/** Numero con separatore migliaia "." (es. 9.000), robusto a prescindere dal locale. */
export const fmtSteps = (n: number) =>
  n ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—'

/** ml -> stringa breve: 1.5 L oppure 750 ml */
export function fmtWater(ml: number): string {
  if (!ml) return '—'
  return ml >= 1000 ? `${(ml / 1000).toFixed(1).replace(/\.0$/, '')} L` : `${ml} ml`
}
