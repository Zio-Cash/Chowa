import type { Activity, CalorieProfile, Goal, Sex, Targets } from '../types'

export const LAF: Record<Activity, number> = {
  seden: 1.2,
  poco: 1.375,
  attivo: 1.55,
  molto: 1.725,
  pro: 1.9,
}

export const GOAL_MULT: Record<Goal, number> = {
  cutplus: 0.75,
  cut: 0.85,
  manten: 1.0,
  bulk: 1.1,
  bulkplus: 1.2,
}

export const SEX_LABEL: Record<Sex, string> = { donna: 'Donna', uomo: 'Uomo' }
export const ACTIVITY_LABEL: Record<Activity, string> = {
  seden: 'Seden.',
  poco: 'Poco',
  attivo: 'Attivo',
  molto: 'Molto',
  pro: 'Pro',
}
export const GOAL_LABEL: Record<Goal, string> = {
  cutplus: 'Cut+',
  cut: 'Cut',
  manten: 'Manten.',
  bulk: 'Bulk',
  bulkplus: 'Bulk+',
}

/** Harris-Benedict riveduta (Roza–Shizgal 1984). */
export function bmr(sesso: Sex, peso: number, altezza: number, eta: number): number {
  if (sesso === 'donna') {
    return 447.593 + 9.247 * peso + 3.098 * altezza - 4.33 * eta
  }
  return 88.362 + 13.397 * peso + 4.799 * altezza - 5.677 * eta
}

export interface CalcResult {
  bmr: number
  tdee: number
  kcal: number
  proteine: number
  carboidrati: number
  grassi: number
}

export function computeTargets(p: CalorieProfile): CalcResult {
  const bmrRaw = bmr(p.sesso, p.peso, p.altezza, p.eta)
  const tdeeRaw = bmrRaw * LAF[p.attivita]
  const kcal = Math.round(tdeeRaw * GOAL_MULT[p.obiettivo])

  const proteine = Math.round(p.protGkg * p.peso)
  const grassi = Math.round(p.grassiGkg * p.peso)
  const carbKcal = kcal - proteine * 4 - grassi * 9
  const carboidrati = Math.round(Math.max(0, carbKcal) / 4)

  return {
    bmr: Math.round(bmrRaw),
    tdee: Math.round(tdeeRaw),
    kcal,
    proteine,
    carboidrati,
    grassi,
  }
}

export function kcalFromMacros(t: Pick<Targets, 'proteine' | 'carboidrati' | 'grassi'>): number {
  return t.proteine * 4 + t.carboidrati * 4 + t.grassi * 9
}
