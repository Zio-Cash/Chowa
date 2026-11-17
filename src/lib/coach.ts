import type { AppState } from '../types'
import { addDays, dateKey, parseKey, MONITOR_START } from './date'
import { buildDaySummary, periodStats } from './history'
import { projectToTarget, weightTrend } from './weight'

export type CoachTone = 'good' | 'warn' | 'info'
export interface CoachMsg {
  tone: CoachTone
  text: string
}
export interface CoachReport {
  giorni: number // giorni della finestra effettivamente monitorati
  messages: CoachMsg[]
}

/**
 * "Coach settimanale": legge gli ultimi 7 giorni e il trend peso e produce
 * 3-5 messaggi chiari e azionabili. Puramente derivato dai dati esistenti.
 */
export function weeklyCoach(state: AppState, oggi: string = dateKey()): CoachReport {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = dateKey(addDays(parseKey(oggi), -i))
    if (d >= MONITOR_START && d <= oggi) days.push(buildDaySummary(state, d))
  }
  const stats = periodStats(days)
  const n = days.length
  const msgs: CoachMsg[] = []

  // Allenamenti
  if (stats.allenamenti >= 3)
    msgs.push({ tone: 'good', text: `${stats.allenamenti} workouts this week — great rhythm.` })
  else
    msgs.push({
      tone: stats.allenamenti === 0 ? 'warn' : 'info',
      text: `${stats.allenamenti} workout${stats.allenamenti === 1 ? '' : 's'} this week: try to aim for at least 3.`,
    })

  // Deficit / energia
  if (stats.mediaDeficit !== 0 || stats.mediaKcal > 0) {
    const d = stats.mediaDeficit
    if (d < -850)
      msgs.push({ tone: 'warn', text: `Average deficit is very high (${Math.round(d)} kcal/day): consider +100–150 kcal so your metabolism doesn't slow down.` })
    else if (d < -150)
      msgs.push({ tone: 'good', text: `Average deficit ${Math.round(d)} kcal/day: right on track for fat loss.` })
    else if (d > 150)
      msgs.push({ tone: 'warn', text: `Average surplus +${Math.round(d)} kcal/day: watch your portions if you want to lose weight.` })
    else msgs.push({ tone: 'info', text: `You're around maintenance (${Math.round(d)} kcal/day on average).` })
  }

  // Trend peso + obiettivo
  const trend = weightTrend(state.weightLog, oggi, 28)
  const target = state.settings.goals.pesoTarget ?? 0
  if (trend) {
    const s = trend.slopePerWeek
    const verso =
      Math.abs(s) < 0.1 ? 'stable' : s < 0 ? `down ${Math.abs(s).toFixed(2)} kg/wk` : `up ${s.toFixed(2)} kg/wk`
    if (target > 0) {
      const proj = projectToTarget(trend.current, target, s, oggi)
      if (proj && proj.weeksToGo > 0)
        msgs.push({ tone: 'good', text: `Weight ${verso}: ${target} kg goal in about ${Math.max(1, Math.round(proj.weeksToGo))} week${Math.max(1, Math.round(proj.weeksToGo)) === 1 ? '' : 's'}.` })
      else if (proj && proj.weeksToGo <= 0) msgs.push({ tone: 'good', text: `You've reached your ${target} kg goal!` })
      else msgs.push({ tone: 'warn', text: `Weight ${verso}: at this pace you won't get closer to ${target} kg. Revisit your diet or activity.` })
    } else {
      msgs.push({ tone: 'info', text: `Weight ${verso} over the last few weeks.` })
    }
  }

  // Aderenza diario
  if (stats.giorniDieta < Math.min(5, n))
    msgs.push({ tone: 'info', text: `Meals logged on ${stats.giorniDieta}/${n} days: the more you log, the more accurate your numbers.` })

  return { giorni: n, messages: msgs.slice(0, 5) }
}
