import type { AppState } from '../types'
import { dateKey } from '../lib/date'

// Copie di sicurezza locali, indipendenti dalla sincronizzazione cloud.
// Servono da rete di sicurezza: se il cloud si "svuota", qui restano gli
// ultimi giorni per ripristinare in un tap.
const KEY = 'chowa:snapshots'
const MAX = 14

interface Snapshot {
  date: string // YYYY-MM-DD del giorno in cui è stato salvato
  savedAt: number
  data: AppState
}

export interface SnapshotMeta {
  date: string
  savedAt: number
  giorniDiario: number
  giorniPeso: number
}

function load(): Snapshot[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Snapshot[]) : []
  } catch {
    return []
  }
}

function persist(list: Snapshot[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // quota superata: riprova tenendo solo gli ultimi 5 giorni
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-5)))
    } catch {
      /* niente da fare */
    }
  }
}

/** Non salviamo stati vuoti (seed) sopra a copie buone. */
function haData(s: AppState): boolean {
  return (
    Object.keys(s.diario ?? {}).length > 0 ||
    Object.keys(s.weightLog ?? {}).length > 0 ||
    Object.keys(s.stepsLog ?? {}).length > 0
  )
}

/** Salva/aggiorna lo snapshot del giorno corrente (uno per data). */
export function saveDailySnapshot(state: AppState) {
  if (!haData(state)) return
  const today = dateKey()
  const list = load().filter((s) => s.date !== today)
  list.push({ date: today, savedAt: Date.now(), data: state })
  list.sort((a, b) => a.date.localeCompare(b.date))
  persist(list.slice(-MAX))
}

export function listSnapshots(): SnapshotMeta[] {
  return load()
    .map((s) => ({
      date: s.date,
      savedAt: s.savedAt,
      giorniDiario: Object.keys(s.data.diario ?? {}).length,
      giorniPeso: Object.keys(s.data.weightLog ?? {}).length,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getSnapshot(date: string): AppState | null {
  return load().find((s) => s.date === date)?.data ?? null
}
