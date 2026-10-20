import { addDays, dateKey, parseKey } from './date'

export interface WeightTrend {
  current: number // ultimo peso registrato
  start: number // primo peso nella finestra
  slopePerWeek: number // kg/settimana (negativo = cala)
  points: number // n. pesate usate
  days: number // ampiezza finestra effettiva
}

/**
 * Tendenza del peso via regressione lineare sulle pesate degli ultimi `days`.
 * Restituisce la pendenza in kg/settimana. null se ci sono meno di 2 pesate.
 */
export function weightTrend(
  weightLog: Record<string, number>,
  oggi: string = dateKey(),
  days = 28,
): WeightTrend | null {
  const from = dateKey(addDays(parseKey(oggi), -days))
  const entries = Object.entries(weightLog)
    .filter(([k, v]) => k >= from && k <= oggi && Number.isFinite(v) && v > 0)
    .sort(([a], [b]) => a.localeCompare(b))
  if (entries.length < 2) return null

  const t0 = parseKey(entries[0][0]).getTime()
  const xs = entries.map(([k]) => (parseKey(k).getTime() - t0) / 86400000) // giorni
  const ys = entries.map(([, v]) => v)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const slopePerDay = den === 0 ? 0 : num / den
  return {
    current: ys[n - 1],
    start: ys[0],
    slopePerWeek: slopePerDay * 7,
    points: n,
    days: xs[n - 1],
  }
}

export interface WeightProjection {
  weeksToGo: number
  etaDate: string // YYYY-MM-DD
  perWeek: number // variazione attesa a settimana (kg, segno)
}

/**
 * Proiezione: quando raggiungerò `target` al ritmo attuale.
 * null se il ritmo è nullo o va nella direzione sbagliata (non ci si avvicina).
 */
export function projectToTarget(
  current: number,
  target: number,
  slopePerWeek: number,
  oggi: string = dateKey(),
): WeightProjection | null {
  const remaining = target - current
  if (Math.abs(remaining) < 0.1) return { weeksToGo: 0, etaDate: oggi, perWeek: slopePerWeek }
  if (Math.abs(slopePerWeek) < 0.02) return null // sostanzialmente fermo
  if (Math.sign(remaining) !== Math.sign(slopePerWeek)) return null // ci si allontana
  const weeksToGo = remaining / slopePerWeek
  const etaDate = dateKey(addDays(parseKey(oggi), Math.round(weeksToGo * 7)))
  return { weeksToGo, etaDate, perWeek: slopePerWeek }
}
