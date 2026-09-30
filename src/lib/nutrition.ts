import type { Food, Meal, MealItem } from '../types'

export interface Macros {
  kcal: number
  proteine: number
  carboidrati: number
  grassi: number
}

export const EMPTY: Macros = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 }

export function foodKcal100(f: Food): number {
  if (f.k100 && f.k100 > 0) return f.k100
  return f.p100 * 4 + f.c100 * 4 + f.g100 * 9
}

export function itemMacros(item: MealItem, foods: Food[]): Macros {
  const f = foods.find((x) => x.id === item.foodId)
  if (!f) return { ...EMPTY }
  const k = item.grammi / 100
  return {
    proteine: f.p100 * k,
    carboidrati: f.c100 * k,
    grassi: f.g100 * k,
    kcal: foodKcal100(f) * k,
  }
}

export function add(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    proteine: a.proteine + b.proteine,
    carboidrati: a.carboidrati + b.carboidrati,
    grassi: a.grassi + b.grassi,
  }
}

export function mealMacros(meal: Meal, foods: Food[]): Macros {
  return meal.items.reduce((acc, it) => add(acc, itemMacros(it, foods)), { ...EMPTY })
}

/** Totali del giorno. Se onlyChecked, conta solo i pasti spuntati. */
export function dayMacros(meals: Meal[], foods: Food[], onlyChecked = false): Macros {
  return meals
    .filter((m) => (onlyChecked ? m.spuntato : true))
    .reduce((acc, m) => add(acc, mealMacros(m, foods)), { ...EMPTY })
}

export const round = (n: number) => Math.round(n)

/** Ripartizione percentuale dei macro sulle kcal totali (P/C 4 kcal·g, G 9). */
export function macroPct(
  proteine: number,
  carboidrati: number,
  grassi: number,
): { p: number; c: number; g: number } {
  const tot = proteine * 4 + carboidrati * 4 + grassi * 9
  if (tot <= 0) return { p: 0, c: 0, g: 0 }
  return {
    p: Math.round(((proteine * 4) / tot) * 100),
    c: Math.round(((carboidrati * 4) / tot) * 100),
    g: Math.round(((grassi * 9) / tot) * 100),
  }
}

/** true se il rapporto % dei macro consumati rispetta quello obiettivo (entro tol punti %). */
export function macroRatioOk(
  consumed: Pick<Macros, 'kcal' | 'proteine' | 'carboidrati' | 'grassi'>,
  target: { proteine: number; carboidrati: number; grassi: number },
  tol = 6,
): boolean {
  if (consumed.kcal <= 0) return false
  const c = macroPct(consumed.proteine, consumed.carboidrati, consumed.grassi)
  const t = macroPct(target.proteine, target.carboidrati, target.grassi)
  return Math.abs(c.p - t.p) <= tol && Math.abs(c.c - t.c) <= tol && Math.abs(c.g - t.g) <= tol
}
