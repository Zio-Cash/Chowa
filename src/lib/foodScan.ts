import { auth } from './firebase'
import { resizeImage } from '../store/photos'

/** Bozza di alimento pronta da rivedere nel form del Database alimenti. */
export interface FoodDraftScan {
  nome: string
  p100: number
  c100: number
  g100: number
  k100: number
  categoria: string
  fonte: 'ia' | 'barcode'
  porzione_g?: number
  confidenza?: 'alta' | 'media' | 'bassa'
  note?: string
}

const r1 = (n: unknown) => Math.round((Number(n) || 0) * 10) / 10

// ===================== FOTO CON IA =====================
interface AiResult {
  error?: string
  riconosciuto?: boolean
  nome?: string
  categoria?: string
  porzione_g?: number
  kcal_100g?: number
  proteine_100g?: number
  carboidrati_100g?: number
  grassi_100g?: number
  confidenza?: 'alta' | 'media' | 'bassa'
  note?: string
}

export async function analyzeFoodPhoto(file: File): Promise<FoodDraftScan> {
  const user = auth.currentUser
  if (!user) throw new Error('Accedi per usare l’analisi delle foto.')
  const dataUrl = await resizeImage(file, 1024, 0.85)
  const image = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const res = await fetch('/api/food-photo', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ image, mediaType: 'image/jpeg' }),
  })
  const text = await res.text()
  let data: AiResult
  try {
    data = JSON.parse(text.trim())
  } catch {
    throw new Error(
      res.status === 404
        ? 'Analisi foto non disponibile: la funzione non è ancora pubblicata.'
        : 'Risposta non valida dal servizio.',
    )
  }
  if (data.error) throw new Error(data.error)
  if (!data.riconosciuto) throw new Error('Non vedo cibo in questa foto. Riprova inquadrando meglio.')
  return {
    nome: data.nome || 'Alimento',
    p100: r1(data.proteine_100g),
    c100: r1(data.carboidrati_100g),
    g100: r1(data.grassi_100g),
    k100: Math.round(Number(data.kcal_100g) || 0),
    categoria: data.categoria || 'Other',
    fonte: 'ia',
    porzione_g: data.porzione_g ? Math.round(data.porzione_g) : undefined,
    confidenza: data.confidenza,
    note: data.note,
  }
}

// ===================== CODICE A BARRE =====================
/** Legge il codice a barre da una foto (EAN/UPC). */
export async function decodeBarcode(file: File): Promise<string> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const reader = new BrowserMultiFormatReader()
  const url = URL.createObjectURL(file)
  try {
    const result = await reader.decodeFromImageUrl(url)
    return result.getText()
  } catch {
    throw new Error('Non riesco a leggere il codice a barre. Avvicinati e inquadralo dritto, ben illuminato.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Categoria dell'app stimata dai macro (Open Food Facts non usa le nostre). */
function guessCategory(p: number, c: number, g: number, sugars: number): string {
  const kcal = p * 4 + c * 4 + g * 9 || 1
  if ((p * 4) / kcal > 0.4) return 'Protein'
  if (sugars > 20) return 'Sweet'
  if (c > 40) return 'Carbo'
  return 'Other'
}

/** Valori per 100 g da Open Food Facts (gratuito, senza chiave). */
export async function lookupBarcode(code: string): Promise<FoodDraftScan> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_it,brands,nutriments`,
  )
  if (!res.ok && res.status !== 404) throw new Error('Open Food Facts non risponde: riprova.')
  const data = (await res.json()) as {
    status?: number
    product?: {
      product_name?: string
      product_name_it?: string
      brands?: string
      nutriments?: Record<string, number>
    }
  }
  if (data.status !== 1 || !data.product) throw new Error(`Prodotto ${code} non trovato in Open Food Facts.`)
  const pr = data.product
  const n = pr.nutriments ?? {}
  const p = r1(n.proteins_100g)
  const c = r1(n.carbohydrates_100g)
  const g = r1(n.fat_100g)
  const kcal = Math.round(n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : 0))
  if (!p && !c && !g && !kcal) throw new Error('Il prodotto è stato trovato ma senza valori nutrizionali.')
  const base = (pr.product_name_it || pr.product_name || '').trim()
  const marca = pr.brands?.split(',')[0]?.trim() ?? ''
  // aggiungo la marca solo se non è già nel nome (evita "Nutella · Nutella")
  const nome = marca && !base.toLowerCase().includes(marca.toLowerCase()) ? `${base} · ${marca}` : base
  return {
    nome: nome || `Prodotto ${code}`,
    p100: p,
    c100: c,
    g100: g,
    k100: kcal,
    categoria: guessCategory(p, c, g, Number(n.sugars_100g) || 0),
    fonte: 'barcode',
    confidenza: 'alta',
    note: `Codice ${code} · dati Open Food Facts`,
  }
}
