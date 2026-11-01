const memoryFallback = new Map<string, string>()
let useMemory = false

// Verifica disponibilità localStorage (es. Safari private mode).
try {
  const k = '__fitvita_test__'
  localStorage.setItem(k, '1')
  localStorage.removeItem(k)
} catch {
  useMemory = true
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = useMemory ? memoryFallback.get(key) : localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Le copie di sicurezza giornaliere (backup.ts) stanno nello stesso spazio:
// se manca posto si sacrificano quelle più vecchie, mai i dati principali.
const SNAPSHOTS_KEY = 'chowa:snapshots'

function trimSnapshots(keep: number): boolean {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY)
    if (!raw) return false
    const list = JSON.parse(raw) as unknown[]
    if (!Array.isArray(list) || list.length === 0) return false
    if (keep === 0) localStorage.removeItem(SNAPSHOTS_KEY)
    else localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list.slice(-keep)))
    return true
  } catch {
    return false
  }
}

export function saveJSON<T>(key: string, value: T): void {
  let raw: string
  try {
    raw = JSON.stringify(value)
  } catch {
    return
  }
  if (useMemory) {
    memoryFallback.set(key, raw)
    return
  }
  try {
    localStorage.setItem(key, raw)
    return
  } catch {
    // quota: libera spazio dalle copie vecchie e riprova
  }
  if (key !== SNAPSHOTS_KEY) {
    for (const keep of [3, 0]) {
      if (!trimSnapshots(keep)) continue
      try {
        localStorage.setItem(key, raw)
        return
      } catch {
        /* ancora pieno */
      }
    }
  }
  // Ultima spiaggia: in memoria (i dati restano comunque sul cloud).
  memoryFallback.set(key, raw)
  useMemory = true
}

export function removeKey(key: string): void {
  try {
    if (useMemory) memoryFallback.delete(key)
    else localStorage.removeItem(key)
  } catch {
    /* ignora */
  }
}

export function storageIsPersistent(): boolean {
  return !useMemory
}
