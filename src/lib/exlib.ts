import type { CatalogExercise, ExCategoria, ExSub } from '../types'

// Libreria esercizi: "Free Exercise DB" (yuhonas/free-exercise-db, pubblico dominio).
// Il JSON compatto è in /public e si scarica solo quando apri la libreria; le
// immagini sono link online, quindi valgono su tutti i dispositivi.
export const LIB_IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

export interface LibExercise {
  id: string
  n: string // nome (inglese)
  c: string // categoria
  e: string // attrezzo
  l: string // livello
  m: string[] // muscoli primari
  s: string[] // muscoli secondari
  i: string[] // istruzioni (inglese)
  img: string[] // percorsi immagini
}

let cache: Promise<LibExercise[]> | null = null
export function loadLibrary(): Promise<LibExercise[]> {
  if (!cache) {
    cache = fetch('/exercises-lib.json')
      .then((r) => {
        if (!r.ok) throw new Error('lib')
        return r.json() as Promise<LibExercise[]>
      })
      .catch((e) => {
        cache = null
        throw e
      })
  }
  return cache
}

/** URL delle due foto (partenza/arrivo) di un esercizio della libreria. */
export const libImages = (libId: string) => [`${LIB_IMG_BASE}${libId}/0.jpg`, `${LIB_IMG_BASE}${libId}/1.jpg`]

// ===== Etichette italiane =====
export const MUSCOLI: Record<string, string> = {
  abdominals: 'Addominali',
  abductors: 'Abduttori',
  adductors: 'Adduttori',
  biceps: 'Bicipiti',
  calves: 'Polpacci',
  chest: 'Petto',
  forearms: 'Avambracci',
  glutes: 'Glutei',
  hamstrings: 'Femorali',
  lats: 'Dorsali',
  'lower back': 'Lombari',
  'middle back': 'Schiena media',
  neck: 'Collo',
  quadriceps: 'Quadricipiti',
  shoulders: 'Spalle',
  traps: 'Trapezi',
  triceps: 'Tricipiti',
}
export const ATTREZZI: Record<string, string> = {
  'body only': 'Corpo libero',
  bands: 'Elastici',
  barbell: 'Bilanciere',
  cable: 'Cavi',
  dumbbell: 'Manubri',
  'e-z curl bar': 'Bilanciere EZ',
  'exercise ball': 'Fitball',
  'foam roll': 'Foam roller',
  kettlebells: 'Kettlebell',
  machine: 'Macchina',
  'medicine ball': 'Palla medica',
  other: 'Altro',
}
export const TIPI: Record<string, string> = {
  strength: 'Forza',
  stretching: 'Stretching',
  cardio: 'Cardio',
  plyometrics: 'Pliometria',
  powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Pesistica',
  strongman: 'Strongman',
}
export const LIVELLI: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  expert: 'Esperto',
}
export const it = (map: Record<string, string>, k: string) => map[k] ?? k

/** Categoria/sottocategoria Chōwa suggerite per un esercizio della libreria. */
export function suggestCategory(x: LibExercise): { categoria: ExCategoria; sub: ExSub } {
  const categoria: ExCategoria =
    x.c === 'stretching' ? 'Reset' : x.c === 'cardio' || x.c === 'plyometrics' ? 'Active' : 'Build'
  const m = x.m[0] ?? ''
  let sub: ExSub = 'Core'
  if (x.c === 'cardio') sub = 'Cardio'
  else if (['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'].includes(m)) sub = 'Legs'
  else if (['chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'neck'].includes(m)) sub = 'Upper'
  else if (['lats', 'middle back', 'lower back', 'traps'].includes(m)) sub = 'Back'
  return { categoria, sub }
}

// ===== Abbinamento ai tuoi esercizi già esistenti (per nome) =====
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const NAME_MATCH: Record<string, string> = {
  'assisted pull up': 'Band_Assisted_Pull-Up',
  'back extension 45': 'Hyperextensions_Back_Extensions',
  'balance board': 'Balance_Board',
  'band external rotation': 'External_Rotation_with_Band',
  'bulgarian split squat': 'Split_Squat_with_Dumbbells',
  'cable chop': 'Standing_Cable_Wood_Chop',
  'cable kickback': 'One-Legged_Cable_Kickback',
  'cat cow thoracic focus': 'Cat_Stretch',
  'childs pose': 'Childs_Pose',
  'dead bug': 'Dead_Bug',
  'deep squat hold': 'Bodyweight_Squat',
  'face pull': 'Face_Pull',
  'farmer carry': 'Farmers_Walk',
  'figure 8': 'Kettlebell_Figure_8',
  'glute bridge': 'Butt_Lift_Bridge',
  'hamstring stretch': 'Hamstring_Stretch',
  'hip cars': 'Standing_Hip_Circles',
  'hip flexor stretch': 'Intermediate_Hip_Flexor_and_Quad_Stretch',
  'hip thrust': 'Barbell_Hip_Thrust',
  'incline chest press machine': 'Leverage_Incline_Chest_Press',
  'lat machine': 'Wide-Grip_Lat_Pulldown',
  'leg extension': 'Leg_Extensions',
  'leg press': 'Leg_Press',
  'pallof press': 'Pallof_Press',
  'pelvic tilt': 'Standing_Pelvic_Tilt',
  'plank': 'Plank',
  'reverse fly': 'Reverse_Flyes',
  'scapular cars': 'Shoulder_Circles',
  'seated cable row': 'Seated_Cable_Rows',
  'seated leg curl': 'Seated_Leg_Curl',
  'side plank': 'Side_Bridge',
  'standing calf raise': 'Standing_Calf_Raises',
  'treadmill walking': 'Walking_Treadmill',
  'walking lunges': 'Bodyweight_Walking_Lunge',
  'zone 2 cardio': 'Jogging_Treadmill',
}

/** id libreria dell'esercizio: scelto esplicitamente, oppure abbinato per nome. */
export function libIdOf(e: Pick<CatalogExercise, 'nome' | 'libId'>): string | undefined {
  if (e.libId === '') return undefined // immagine rimossa di proposito
  return e.libId ?? NAME_MATCH[norm(e.nome)]
}
