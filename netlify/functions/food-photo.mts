// Netlify Function: valori nutrizionali da una foto (piatto, prodotto o etichetta).
// La chiave Anthropic resta qui sul server (variabile d'ambiente ANTHROPIC_API_KEY),
// mai nell'app. Accetta solo utenti autenticati con Firebase; con ALLOWED_EMAILS
// impostata, solo quegli indirizzi.
import Anthropic from '@anthropic-ai/sdk'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const PROJECT_ID = 'health-progress-400cc'
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)
const CATEGORIE = ['Carbo', 'Protein', 'Vegetables', 'Fruit', 'Sweet', 'Other']
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const
type Media = (typeof MEDIA)[number]

const SCHEMA = {
  type: 'object',
  properties: {
    riconosciuto: { type: 'boolean' },
    tipo_foto: { type: 'string', enum: ['piatto', 'prodotto', 'etichetta', 'altro'] },
    nome: { type: 'string' },
    categoria: { type: 'string', enum: CATEGORIE },
    porzione_g: { type: 'number' },
    kcal_100g: { type: 'number' },
    proteine_100g: { type: 'number' },
    carboidrati_100g: { type: 'number' },
    grassi_100g: { type: 'number' },
    confidenza: { type: 'string', enum: ['alta', 'media', 'bassa'] },
    note: { type: 'string' },
  },
  required: [
    'riconosciuto',
    'tipo_foto',
    'nome',
    'categoria',
    'porzione_g',
    'kcal_100g',
    'proteine_100g',
    'carboidrati_100g',
    'grassi_100g',
    'confidenza',
    'note',
  ],
  additionalProperties: false,
}

const SYSTEM = `Sei il nutrizionista di un'app italiana di fitness. Ricevi una foto e restituisci i valori nutrizionali di quello che vedi, sempre riferiti a 100 g.

- Etichetta nutrizionale leggibile: riporta i valori per 100 g esattamente come scritti. Se l'etichetta indica solo i valori per porzione, convertili a 100 g usando il peso della porzione. porzione_g = la porzione indicata in etichetta (100 se non c'è). confidenza "alta" se i numeri si leggono bene.
- Prodotto confezionato senza etichetta visibile: riconosci il prodotto e usa valori tipici per quella categoria. confidenza "media".
- Piatto o alimento: riconosci cosa contiene, stima il peso totale della porzione visibile in grammi e i valori per 100 g del piatto così come servito (cotto e condito). Usa valori di riferimento standard (es. tabelle CREA). confidenza "media" o "bassa" in base a quanto è chiara la foto.
- nome: breve, in italiano (es. "Pasta al pomodoro", "Yogurt greco 0%").
- categoria: Carbo (cereali, pane, pasta, patate), Protein (carne, pesce, uova, latticini proteici, legumi), Vegetables, Fruit, Sweet (dolci, snack zuccherati), Other (condimenti, piatti misti, bevande).
- note: una frase breve in italiano che dice cosa hai assunto (es. "Stimati ~80 g di pasta cruda e un cucchiaio d'olio").
- Se nella foto non c'è cibo: riconosciuto false, valori a 0, nome e note vuoti.`

const client = new Anthropic({ timeout: 55_000, maxRetries: 0 })

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

async function analyze(image: string, mediaType: Media): Promise<unknown> {
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 8000,
    // se la richiesta venisse rifiutata, il server la ripete sul modello di riserva consigliato
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: 'Analizza questa foto e restituisci i valori nutrizionali.' },
        ],
      },
    ],
  })
  if (response.stop_reason === 'refusal') return { error: 'Questa foto non può essere analizzata.' }
  if (response.stop_reason === 'max_tokens') return { error: 'Risposta incompleta: riprova.' }
  const text = response.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') return { error: 'Nessuna risposta dal servizio.' }
  return JSON.parse(text.text)
}

function errorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Chiave API non valida: controllala su Netlify.'
  if (e instanceof Anthropic.PermissionDeniedError) return 'La chiave API non ha i permessi necessari.'
  if (e instanceof Anthropic.RateLimitError) return 'Troppe richieste: riprova tra poco.'
  if (e instanceof Anthropic.APIConnectionTimeoutError) return 'Il servizio ci ha messo troppo: riprova.'
  if (e instanceof Anthropic.APIConnectionError) return 'Servizio non raggiungibile: riprova.'
  if (e instanceof Anthropic.APIError) return `Errore del servizio (${e.status ?? '?'}): riprova.`
  return 'Errore imprevisto durante l’analisi.'
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405)
  if (!process.env.ANTHROPIC_API_KEY)
    return json({ error: 'Funzione non ancora configurata: manca ANTHROPIC_API_KEY su Netlify.' }, 503)

  // ---- autenticazione Firebase ----
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Accesso richiesto' }, 401)
  let email = ''
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    })
    email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
  } catch {
    return json({ error: 'Sessione non valida: esci e rientra.' }, 401)
  }
  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (allowed.length && !allowed.includes(email)) return json({ error: 'Utente non autorizzato' }, 403)

  // ---- immagine ----
  let body: { image?: unknown; mediaType?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Richiesta non valida' }, 400)
  }
  const image = typeof body.image === 'string' ? body.image : ''
  const mediaType = (MEDIA as readonly string[]).includes(String(body.mediaType))
    ? (body.mediaType as Media)
    : 'image/jpeg'
  if (!image || image.length > 4_500_000) return json({ error: 'Immagine mancante o troppo grande' }, 400)

  // Risposta in streaming: su Netlify regge fino a 60 s (una risposta normale molto meno).
  // Mando uno spazio ogni pochi secondi per tenere viva la connessione, poi il JSON.
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const keepAlive = setInterval(() => controller.enqueue(enc.encode(' ')), 4000)
      let result: unknown
      try {
        result = await analyze(image, mediaType)
      } catch (e) {
        result = { error: errorMessage(e) }
      }
      clearInterval(keepAlive)
      controller.enqueue(enc.encode(JSON.stringify(result)))
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'application/json' } })
}

export const config = { path: '/api/food-photo' }
