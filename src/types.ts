// ===== Profilo calorie =====
export type Sex = 'donna' | 'uomo'
export type Activity = 'seden' | 'poco' | 'attivo' | 'molto' | 'pro'
export type Goal = 'cutplus' | 'cut' | 'manten' | 'bulk' | 'bulkplus'

export interface CalorieProfile {
  sesso: Sex
  peso: number
  altezza: number
  eta: number
  attivita: Activity
  obiettivo: Goal
  protGkg: number
  grassiGkg: number
}

export interface Targets {
  kcal: number
  proteine: number
  carboidrati: number
  grassi: number
}

export interface DailyGoals {
  stepTarget: number
  waterTarget: number // ml
  kcalMin: number
}

export interface Settings {
  profilo: CalorieProfile
  targets: Targets
  goals: DailyGoals
}

// ===== Alimenti =====
export type FoodUnit = 'g' | 'ml'

export interface Food {
  id: string
  nome: string
  p100: number
  c100: number
  g100: number
  k100?: number // kcal/100 opzionali (se assenti si calcolano dai macro)
  categoria: string
  unita: FoodUnit
  qualita: number // 1..3
  preferito?: boolean
  usato?: number // timestamp ultimo uso (per "recenti")
  ultimiGrammi?: number // ultima quantità usata (per riproporla in automatico)
}

// ===== Diario alimentare =====
export interface MealItem {
  foodId: string
  grammi: number
}

export interface Meal {
  id: string
  nome: string
  emoji: string
  items: MealItem[]
  spuntato: boolean
}

export type Diario = Record<string, Meal[]> // chiave: YYYY-MM-DD

// Struttura predefinita dei pasti di una giornata (nome + id stabile).
export interface MealSlot {
  id: string
  nome: string
}

// Pasto preimpostato ("mix"): un insieme di alimenti già assemblato.
export interface MealPreset {
  id: string
  nome: string
  items: MealItem[]
}

// ===== Catalogo esercizi =====
export type ExCategoria = 'Active' | 'Build' | 'Control' | 'Reset'
export type ExSub = 'Legs' | 'Upper' | 'Back' | 'Core' | 'Cardio'

export interface CatalogExercise {
  id: string
  nome: string
  categoria: ExCategoria
  sub: ExSub
  descrizione?: string // spiegazione dell'esercizio
}
export type ExerciseCatalog = CatalogExercise[]

// ===== Workout: esecuzione =====
export type ExKind = 'reps' | 'tempo'

export interface ExExercise {
  id: string
  nome: string
  catalogId?: string // collegamento all'esercizio nel catalogo
  tipo: ExKind
  serie: number
  reps?: number
  durataSec?: number
  carico?: number
  note?: string
  riposoSec: number
}

export interface ExBlock {
  id: string
  nome: string
  esercizi: ExExercise[]
}

export interface ExDay {
  id: string
  nome: string
  emoji?: string
  blocchi: ExBlock[]
}

export type ExecutionPlan = ExDay[]

// ===== Progressi sessione (esecuzione) =====
export interface ExerciseProgress {
  sets: boolean[]
  carico?: number
}

export interface SessionProgress {
  date: string
  dayId: string
  esercizi: Record<string, ExerciseProgress>
}

export type WorkoutProgress = Record<string, SessionProgress> // chiave: YYYY-MM-DD

// ===== Peso =====
export type WeightLog = Record<string, number> // chiave: YYYY-MM-DD -> kg

// ===== Passi =====
export type StepsLog = Record<string, number> // chiave: YYYY-MM-DD -> passi

// ===== Acqua =====
export type WaterLog = Record<string, number> // chiave: YYYY-MM-DD -> ml

// ===== Calorie attive bruciate (da smartwatch) =====
export type ActiveKcalLog = Record<string, number> // chiave: YYYY-MM-DD -> kcal

// ===== Ciclo mestruale =====
export interface CycleData {
  starts: string[] // date di inizio mestruazioni (YYYY-MM-DD), crescenti
  cycleLength: number // durata media del ciclo (giorni)
  periodLength: number // durata delle mestruazioni (giorni)
}

// ===== Account (nome e foto personalizzati) =====
export interface Account {
  nome?: string
  avatar?: string // data URL dell'immagine profilo
}

// ===== Gamification =====
export interface Gamification {
  xp: number
  streak: number
  ultimaData: string | null // ultimo giorno con un'azione (YYYY-MM-DD)
  eventi: Record<string, string[]> // data -> id eventi gia premiati (anti doppio XP)
}

// ===== Stato globale =====
export interface AppState {
  settings: Settings
  foods: Food[]
  diario: Diario
  executionPlan: ExecutionPlan
  workoutProgress: WorkoutProgress
  weightLog: WeightLog
  stepsLog: StepsLog
  waterLog: WaterLog
  activeKcalLog: ActiveKcalLog
  exerciseCatalog: ExerciseCatalog
  mealPresets: MealPreset[]
  mealDefault: MealSlot[]
  cycle: CycleData
  account: Account
  gamification: Gamification
}

export type ViewId =
  | 'oggi'
  | 'dieta'
  | 'workout'
  | 'progressi'
  | 'storico'
  | 'obiettivi'
  | 'cycle'
  | 'profilo'
