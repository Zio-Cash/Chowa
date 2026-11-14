export const LEVEL_SIZE = 300

export const XP = {
  pesata: 10,
  pasto: 5,
  workout: 20,
  passi: 10,
  acqua: 5,
  giornataPerfetta: 50,
} as const

const LABELS = [
  'Newcomer',
  'Motivated',
  'Determined',
  'Consistent',
  'Unstoppable',
  'Athlete',
  'Veteran',
  'Champion',
  'Legend',
]

export interface LevelInfo {
  livello: number
  inLevel: number // xp nel livello corrente
  soglia: number // LEVEL_SIZE
  label: string
  pct: number // 0..1
}

export function levelInfo(xp: number): LevelInfo {
  const livello = Math.floor(xp / LEVEL_SIZE) + 1
  const inLevel = xp % LEVEL_SIZE
  const label = LABELS[Math.min(livello - 1, LABELS.length - 1)]
  return { livello, inLevel, soglia: LEVEL_SIZE, label, pct: inLevel / LEVEL_SIZE }
}

export interface BadgeDef {
  id: string
  label: string
  emoji: string
  color: string // classe colore acceso
}

export const BADGES: BadgeDef[] = [
  { id: 'pesata', label: 'Weigh-in', emoji: '⚖️', color: 'bg-blunotte' },
  { id: 'calorie', label: 'Calories', emoji: '🔥', color: 'bg-arancio' },
  { id: 'macro', label: 'Macro', emoji: '🥗', color: 'bg-carb' },
  { id: 'workout', label: 'Workout', emoji: '🏋️', color: 'bg-verde' },
  { id: 'acqua', label: 'Water', emoji: '💧', color: 'bg-teal' },
  { id: 'passi', label: 'Steps', emoji: '👟', color: 'bg-magenta' },
  { id: 'perfetta', label: 'Perfect day', emoji: '🏆', color: 'bg-viola' },
]

export type BadgeState = Record<string, boolean>
