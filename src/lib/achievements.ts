import type { AppState } from '../types'
import { levelInfo } from './gamification'

export interface Achievement {
  emoji: string
  label: string
  done: boolean
  progress: string // es. "7/30"
}

const countEvent = (eventi: Record<string, string[]>, id: string) =>
  Object.values(eventi).filter((ids) => ids.includes(id)).length

/** Traguardi derivati dallo stato: fatti / da fare, con progresso. */
export function achievements(state: AppState): Achievement[] {
  const g = state.gamification
  const pesate = Object.keys(state.weightLog).length
  const allenamenti = countEvent(g.eventi, 'workout')
  const perfette = countEvent(g.eventi, 'perfetta')
  const streak = g.streak
  const lvl = levelInfo(g.xp).livello

  const pesi = Object.entries(state.weightLog)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
  const persi = pesi.length >= 2 ? Math.max(0, pesi[0] - pesi[pesi.length - 1]) : 0

  const milestone = (emoji: string, label: string, val: number, goal: number): Achievement => ({
    emoji,
    label,
    done: val >= goal,
    progress: `${Math.min(val, goal)}/${goal}`,
  })

  return [
    milestone('🔥', 'Costanza', streak, 7),
    milestone('⚡', 'Inarrestabile', streak, 30),
    milestone('🏋️', 'Guerriera', allenamenti, 10),
    milestone('💪', 'Veterana', allenamenti, 50),
    milestone('🏆', 'Giornata perfetta', perfette, 1),
    milestone('👑', 'Dieci volte perfetta', perfette, 10),
    milestone('⚖️', 'Monitoraggio', pesate, 10),
    { emoji: '📉', label: '−2 kg', done: persi >= 2, progress: `${persi.toFixed(1)}/2` },
    { emoji: '🎯', label: '−5 kg', done: persi >= 5, progress: `${persi.toFixed(1)}/5` },
    milestone('🌟', 'Livello 5', lvl, 5),
  ]
}
