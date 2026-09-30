const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
export const MESI_BREVI = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
]

/** Chiave locale YYYY-MM-DD (niente UTC shift). */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** es. "Lun 8 Giugno" */
export function formatLong(d: Date = new Date()): string {
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`
}

export function isYesterday(key: string, ref: string): boolean {
  const r = parseKey(ref)
  r.setDate(r.getDate() - 1)
  return dateKey(r) === key
}

/** Inizio del monitoraggio: i dati precedenti non vengono mostrati. */
export const MONITOR_START = '2026-06-01'

/** Lunedì della settimana che contiene la data. */
export function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const off = (r.getDay() + 6) % 7 // lunedì = 0
  r.setDate(r.getDate() - off)
  return r
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** es. "29 giu – 5 lug" */
export function rangeLabel(a: Date, b: Date): string {
  return `${a.getDate()} ${MESI_BREVI[a.getMonth()].toLowerCase()} – ${b.getDate()} ${MESI_BREVI[b.getMonth()].toLowerCase()}`
}

export interface WeekRange {
  start: Date
  end: Date
  /** i 7 giorni della settimana, lunedì → domenica */
  days: Date[]
}

/** Vero se la settimana (lun) appartiene a quel mese: regola del giovedì
 * (la settimana sta nel mese dove cade la maggioranza dei suoi 7 giorni). */
export function weekBelongsToMonth(weekMon: Date, year: number, month0: number): boolean {
  const thu = addDays(weekMon, 3)
  return thu.getFullYear() === year && thu.getMonth() === month0
}

/**
 * Mese { year, month0 } a cui appartiene la settimana che contiene `d`
 * (regola del giovedì). È il mese "corrente" ai fini del monitoraggio: p.es.
 * il 30 settembre la settimana 28 set–4 ott appartiene già a ottobre, quindi
 * ottobre e la settimana in corso devono comparire subito.
 */
export function weekMonthOf(d: Date = new Date()): { year: number; month0: number } {
  const thu = addDays(mondayOf(d), 3)
  return { year: thu.getFullYear(), month0: thu.getMonth() }
}

/**
 * Settimane del mese indicato. Ogni settimana va sempre da lunedì a domenica
 * (7 giorni esatti) e appartiene a UN SOLO mese: quello in cui cade il giovedì.
 * Così le settimane a cavallo non vengono contate due volte.
 */
export function weeksOfMonth(year: number, month0: number): WeekRange[] {
  const first = new Date(year, month0, 1)
  const last = new Date(year, month0 + 1, 0)
  const out: WeekRange[] = []
  let cursor = mondayOf(first)
  while (cursor <= last) {
    if (weekBelongsToMonth(cursor, year, month0)) {
      const days = Array.from({ length: 7 }, (_, i) => addDays(cursor, i))
      out.push({ start: cursor, end: addDays(cursor, 6), days })
    }
    cursor = addDays(cursor, 7)
  }
  return out
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}
