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
    msgs.push({ tone: 'good', text: `${stats.allenamenti} allenamenti questa settimana — ottimo ritmo.` })
  else
    msgs.push({
      tone: stats.allenamenti === 0 ? 'warn' : 'info',
      text: `${stats.allenamenti} allenament${stats.allenamenti === 1 ? 'o' : 'i'}: prova a puntare ad almeno 3.`,
    })

  // Deficit / energia
  if (stats.mediaDeficit !== 0 || stats.mediaKcal > 0) {
    const d = stats.mediaDeficit
    if (d < -850)
      msgs.push({ tone: 'warn', text: `Deficit medio molto alto (${Math.round(d)} kcal/g): valuta +100–150 kcal per non rallentare il metabolismo.` })
    else if (d < -150)
      msgs.push({ tone: 'good', text: `Deficit medio ${Math.round(d)} kcal/g: in linea col dimagrimento.` })
    else if (d > 150)
      msgs.push({ tone: 'warn', text: `Surplus medio +${Math.round(d)} kcal/g: occhio alle porzioni se vuoi dimagrire.` })
    else msgs.push({ tone: 'info', text: `Sei intorno al mantenimento (${Math.round(d)} kcal/g di media).` })
  }

  // Trend peso + obiettivo
  const trend = weightTrend(state.weightLog, oggi, 28)
  const target = state.settings.goals.pesoTarget ?? 0
  if (trend) {
    const s = trend.slopePerWeek
    const verso =
      Math.abs(s) < 0.1 ? 'stabile' : s < 0 ? `in calo di ${Math.abs(s).toFixed(2)} kg/sett` : `in aumento di ${s.toFixed(2)} kg/sett`
    if (target > 0) {
      const proj = projectToTarget(trend.current, target, s, oggi)
      if (proj && proj.weeksToGo > 0)
        msgs.push({ tone: 'good', text: `Peso ${verso}: all'obiettivo di ${target} kg in circa ${Math.max(1, Math.round(proj.weeksToGo))} settimane.` })
      else if (proj && proj.weeksToGo <= 0) msgs.push({ tone: 'good', text: `Hai raggiunto l'obiettivo di ${target} kg!` })
      else msgs.push({ tone: 'warn', text: `Peso ${verso}: così non ti avvicini ai ${target} kg. Rivedi dieta o movimento.` })
    } else {
      msgs.push({ tone: 'info', text: `Peso ${verso} nelle ultime settimane.` })
    }
  }

  // Aderenza diario
  if (stats.giorniDieta < Math.min(5, n))
    msgs.push({ tone: 'info', text: `Pasti registrati ${stats.giorniDieta}/${n} giorni: più registri, più i numeri sono veri.` })

  return { giorni: n, messages: msgs.slice(0, 5) }
}
