// Foto progressi salvate SOLO in locale (IndexedDB): le immagini sono pesanti
// e non possono stare nel documento cloud (1 doc JSON). Restano quindi su questo
// dispositivo — comodo per un confronto "prima/dopo" privato.

const DB = 'chowa-photos'
const STORE = 'photos'

export interface ProgressPhoto {
  date: string // YYYY-MM-DD (chiave)
  dataUrl: string // JPEG ridimensionato
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'date' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function savePhoto(p: ProgressPhoto): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(p)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listPhotos(): Promise<ProgressPhoto[]> {
  const db = await open()
  const out = await new Promise<ProgressPhoto[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as ProgressPhoto[]) ?? [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export async function deletePhoto(date: string): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(date)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

/** Ridimensiona un file immagine a max `max` px e restituisce un JPEG dataURL. */
export function resizeImage(file: File, max = 720, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no ctx'))
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('img error'))
    }
    img.src = url
  })
}
