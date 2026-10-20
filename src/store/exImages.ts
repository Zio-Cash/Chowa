// Immagini degli esercizi salvate in locale (IndexedDB), una per id esercizio.
// Non vanno nel documento cloud (limite 1MB), quindi restano su questo dispositivo.

const DB = 'chowa-ex-images'
const STORE = 'images'

interface ExImage {
  id: string
  dataUrl: string
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => void): Promise<void> {
  return open().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        fn(t.objectStore(STORE))
        t.oncomplete = () => {
          db.close()
          resolve()
        }
        t.onerror = () => {
          db.close()
          reject(t.error)
        }
      }),
  )
}

export function saveExImage(id: string, dataUrl: string): Promise<void> {
  return tx('readwrite', (s) => s.put({ id, dataUrl } satisfies ExImage))
}

export function deleteExImage(id: string): Promise<void> {
  return tx('readwrite', (s) => s.delete(id))
}

/** Tutte le immagini come mappa id → dataURL. */
export async function listExImages(): Promise<Record<string, string>> {
  const db = await open()
  const all = await new Promise<ExImage[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as ExImage[]) ?? [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return Object.fromEntries(all.map((x) => [x.id, x.dataUrl]))
}
