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

export function saveJSON<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value)
    if (useMemory) memoryFallback.set(key, raw)
    else localStorage.setItem(key, raw)
  } catch {
    // Quota o serializzazione fallita: ripiega in memoria.
    try {
      memoryFallback.set(key, JSON.stringify(value))
      useMemory = true
    } catch {
      /* niente da fare */
    }
  }
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
