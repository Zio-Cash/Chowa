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
  { nome: 'Fondamenta', descrizione: 'Costruisci la base. Presenza prima della forza.' },
  { nome: 'Radicamento', descrizione: 'La costanza diventa struttura.' },
  { nome: 'Fluidità', descrizione: 'Il movimento inizia a scorrere senza sforzo.' },
  { nome: 'Controllo', descrizione: 'Corpo e respiro rispondono all’intenzione.' },
  { nome: 'Equilibrio', descrizione: 'Forza e quiete convivono.' },
  { nome: 'Padronanza', descrizione: 'La disciplina è diventata natura.' },
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
  if (level >= 0.99) return { label: 'Pieno', hint: 'Giornata completa. Ora riposa.', level }
  if (level >= 0.66) return { label: 'Vivo', hint: 'Sei in flusso. Continua con calma.', level }
  if (level >= 0.33) return { label: 'In moto', hint: 'Il ritmo è avviato.', level }
  if (level > 0) return { label: 'Risveglio', hint: 'Un primo gesto è già pratica.', level }
  return { label: 'Quiete', hint: 'Comincia da un solo respiro.', level }
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
  { titolo: 'Respiro', nota: 'Lascia che il respiro guidi ogni movimento.' },
  { titolo: 'Postura', nota: 'Allunga la colonna. Trova la tua verticale.' },
  { titolo: 'Radici', nota: 'Peso stabile, appoggio consapevole.' },
  { titolo: 'Fluidità', nota: 'Movimenti lenti, senza strappi.' },
  { titolo: 'Controllo', nota: 'Meno intensità, più precisione.' },
  { titolo: 'Ascolto', nota: 'Segui i segnali del corpo, non il numero.' },
  { titolo: 'Costanza', nota: 'Non serve molto. Serve ogni giorno.' },
  { titolo: 'Equilibrio', nota: 'Cerca la calma anche nello sforzo.' },
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
  'La disciplina è ricordarsi ciò che desideri davvero.',
  'Fai poco, ma falla ogni giorno.',
  'La forza silenziosa dura più della forza rumorosa.',
  'Prima la calma, poi il movimento.',
  'Ogni ripetizione è una piccola promessa mantenuta.',
  'Il corpo segue dove la mente resta presente.',
  'Non domare il corpo: ascoltalo.',
  'La padronanza è mille gesti semplici, fatti bene.',
  'Rallenta e vedrai più lontano.',
  'La costanza è la forma più alta di talento.',
  'Respira. Anche questo è allenamento.',
  'Il progresso ama chi torna, non chi corre.',
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
  'Principiante',
  'Allievo',
  'Praticante',
  'Costante',
  'Adepto',
  'Esperto',
  'Veterano',
  'Maestro',
  'Sensei',
]

export function masteryLabel(livello: number): string {
  return MASTERY_LABELS[Math.min(livello - 1, MASTERY_LABELS.length - 1)]
}
