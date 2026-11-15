/**
 * "Digital Dojo" — livello di contenuto (linguaggio, non dati).
 *
 * Tutto ciò che segue è DERIVATO da dati già esistenti (livello, streak,
 * pratiche completate oggi, data). Non introduce né modifica alcun dato.
 * Serve solo a dare all'app il tono calmo e disciplinato del dojo.
 */

/** Fase del percorso — derivata dal livello di maestria già calcolato. */
export interface JourneyPhase {
  nome: string
  descrizione: string
}

const PHASES: JourneyPhase[] = [
  { nome: 'Foundation', descrizione: 'Build the base. Presence before strength.' },
  { nome: 'Rooting', descrizione: 'Consistency becomes structure.' },
  { nome: 'Flow', descrizione: 'Movement starts to flow without effort.' },
  { nome: 'Control', descrizione: 'Body and breath answer to intention.' },
  { nome: 'Balance', descrizione: 'Strength and stillness live side by side.' },
  { nome: 'Mastery', descrizione: 'Discipline has become nature.' },
]

export function journeyPhase(livello: number): JourneyPhase {
  const i = Math.min(Math.floor((livello - 1) / 2), PHASES.length - 1)
  return PHASES[Math.max(0, i)]
}

/** Stato di energia — derivato dalle pratiche completate oggi (0..6). */
export interface EnergyState {
  label: string
  hint: string
  /** 0..1 per la resa visiva */
  level: number
}

export function energyState(done: number, total: number): EnergyState {
  const level = total > 0 ? done / total : 0
  if (level >= 0.99) return { label: 'Full', hint: 'Day complete. Now rest.', level }
  if (level >= 0.66) return { label: 'Alive', hint: 'You’re in flow. Keep going, calmly.', level }
  if (level >= 0.33) return { label: 'In motion', hint: 'The rhythm has begun.', level }
  if (level > 0) return { label: 'Awakening', hint: 'A first gesture is already practice.', level }
  return { label: 'Stillness', hint: 'Begin with a single breath.', level }
}

/**
 * Focus della settimana — rotazione deterministica sulla settimana ISO.
 * Nessun dato nuovo: è una lente su cui posare l’attenzione.
 */
export interface WeeklyFocus {
  titolo: string
  nota: string
}

const FOCI: WeeklyFocus[] = [
  { titolo: 'Breath', nota: 'Let your breath lead every movement.' },
  { titolo: 'Posture', nota: 'Lengthen your spine. Find your vertical.' },
  { titolo: 'Roots', nota: 'Steady weight, mindful footing.' },
  { titolo: 'Flow', nota: 'Slow movements, no jerks.' },
  { titolo: 'Control', nota: 'Less intensity, more precision.' },
  { titolo: 'Listening', nota: 'Follow your body’s signals, not the number.' },
  { titolo: 'Consistency', nota: 'It doesn’t take much. It takes every day.' },
  { titolo: 'Balance', nota: 'Seek calm, even in effort.' },
]

function weekIndex(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return Math.floor((days + start.getDay()) / 7)
}

export function weeklyFocus(d = new Date()): WeeklyFocus {
  return FOCI[weekIndex(d) % FOCI.length]
}

/**
 * Massima del giorno — rotazione deterministica per data (stessa frase per
 * tutto il giorno). Toni orientali contemporanei, senza cliché.
 */
const QUOTES: string[] = [
  'Discipline is remembering what you truly want.',
  'Do a little, but do it every day.',
  'Quiet strength outlasts loud strength.',
  'First calm, then movement.',
  'Every rep is a small promise kept.',
  'The body follows where the mind stays present.',
  'Don’t tame the body. Listen to it.',
  'Mastery is a thousand simple gestures, done well.',
  'Slow down, and you will see further.',
  'Consistency is the highest form of talent.',
  'Breathe. This, too, is training.',
  'Progress favors those who return, not those who rush.',
]

export function quoteOfDay(d = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 1)
  const day = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return QUOTES[day % QUOTES.length]
}

/**
 * Rinomina i gradi di maestria in un lessico calmo (sostituisce le etichette
 * "RPG" solo a livello visivo dove serve).
 */
export const MASTERY_LABELS = [
  'Beginner',
  'Student',
  'Practitioner',
  'Steadfast',
  'Adept',
  'Expert',
  'Veteran',
  'Master',
  'Sensei',
]

export function masteryLabel(livello: number): string {
  return MASTERY_LABELS[Math.min(livello - 1, MASTERY_LABELS.length - 1)]
}
