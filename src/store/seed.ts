import { computeTargets } from '../lib/calories'
import { DEFAULT_GOALS } from '../lib/goals'
import type {
  AppState,
  CalorieProfile,
  CatalogExercise,
  ExecutionPlan,
  Food,
  Meal,
  PlanCard,
} from '../types'

export const uid = () => Math.random().toString(36).slice(2, 10)

// ===== Profilo di default =====
export const defaultProfile: CalorieProfile = {
  sesso: 'donna',
  peso: 76,
  altezza: 178,
  eta: 29,
  attivita: 'attivo',
  obiettivo: 'cutplus',
  protGkg: 1.5,
  grassiGkg: 1,
}

// ===== Template pasti (giornata vuota) =====
export function mealTemplate(): Meal[] {
  return [
    { id: 'm0', nome: 'Breakfast', emoji: '🌅', items: [], spuntato: false },
    { id: 'm1', nome: 'Lunch', emoji: '🍽', items: [], spuntato: false },
    { id: 'm2', nome: 'Snack', emoji: '🍎', items: [], spuntato: false },
    { id: 'm3', nome: 'Dinner', emoji: '🌙', items: [], spuntato: false },
    { id: 'm4', nome: 'Snack', emoji: '🥪', items: [], spuntato: false },
  ]
}

// ===== Database alimenti (per 100 g) =====
type FoodSeed = Omit<Food, 'id'>
const FOODS: FoodSeed[] = [
  { nome: 'Petto di pollo', p100: 31, c100: 0, g100: 3.6, categoria: 'Carne', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Fesa di tacchino', p100: 24, c100: 0.5, g100: 1, categoria: 'Carne', unita: 'g', qualita: 3 },
  { nome: 'Uovo intero', p100: 13, c100: 1.1, g100: 11, categoria: 'Uova', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Albume', p100: 11, c100: 0.7, g100: 0.2, categoria: 'Uova', unita: 'g', qualita: 3 },
  { nome: 'Salmone', p100: 20, c100: 0, g100: 13, categoria: 'Pesce', unita: 'g', qualita: 3 },
  { nome: 'Tonno al naturale', p100: 26, c100: 0, g100: 1, categoria: 'Pesce', unita: 'g', qualita: 3 },
  { nome: 'Riso bianco (crudo)', p100: 7, c100: 80, g100: 0.6, categoria: 'Cereali', unita: 'g', qualita: 2, preferito: true },
  { nome: 'Pasta di semola (cruda)', p100: 13, c100: 72, g100: 1.5, categoria: 'Cereali', unita: 'g', qualita: 2 },
  { nome: 'Pane integrale', p100: 9, c100: 45, g100: 3, categoria: 'Cereali', unita: 'g', qualita: 2 },
  { nome: 'Avena', p100: 13, c100: 67, g100: 7, categoria: 'Cereali', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Patate', p100: 2, c100: 17, g100: 0.1, categoria: 'Verdura', unita: 'g', qualita: 2 },
  { nome: 'Broccoli', p100: 3, c100: 7, g100: 0.4, categoria: 'Verdura', unita: 'g', qualita: 3 },
  { nome: 'Banana', p100: 1.1, c100: 23, g100: 0.3, categoria: 'Frutta', unita: 'g', qualita: 2, preferito: true },
  { nome: 'Mela', p100: 0.3, c100: 14, g100: 0.2, categoria: 'Frutta', unita: 'g', qualita: 3 },
  { nome: 'Yogurt greco 0%', p100: 10, c100: 4, g100: 0.4, categoria: 'Latticini', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Latte parz. scremato', p100: 3.3, c100: 4.8, g100: 1.6, categoria: 'Latticini', unita: 'ml', qualita: 2 },
  { nome: 'Parmigiano', p100: 33, c100: 0, g100: 29, categoria: 'Latticini', unita: 'g', qualita: 2 },
  { nome: 'Olio EVO', p100: 0, c100: 0, g100: 100, categoria: 'Condimenti', unita: 'g', qualita: 3 },
  { nome: 'Mandorle', p100: 21, c100: 22, g100: 49, categoria: 'Frutta secca', unita: 'g', qualita: 3 },
  { nome: 'Lenticchie (cotte)', p100: 9, c100: 17, g100: 0.4, categoria: 'Legumi', unita: 'g', qualita: 3 },
  { nome: 'Fagioli cannellini (cotti)', p100: 9, c100: 21, g100: 0.5, categoria: 'Legumi', unita: 'g', qualita: 3 },
  { nome: 'Whey protein', p100: 80, c100: 8, g100: 6, categoria: 'Integratori', unita: 'g', qualita: 2 },
]
export function seedFoods(): Food[] {
  return FOODS.map((f) => ({ ...f, id: uid() }))
}

// ===== Piano di esecuzione =====
// Vuoto: la scheda si costruisce nella sezione Routine.
export function seedExecutionPlan(): ExecutionPlan {
  return []
}

// ===== Catalogo esercizi (di partenza) =====
const E = (
  nome: string,
  categoria: CatalogExercise["categoria"],
  sub: CatalogExercise["sub"],
  descrizione?: string,
): CatalogExercise => ({ id: uid(), nome, categoria, sub, descrizione })

export function seedExerciseCatalog(): CatalogExercise[] {
  return [
    // ===== ACTIVE =====
    E("Toe Yoga", "Active", "Legs", "Solleva alternativamente alluce e altre dita mantenendo il piede completamente appoggiato."),
    E("Short Foot", "Active", "Legs", "Accorcia il piede sollevando l’arco plantare senza arricciare le dita."),
    E("Hip CARs", "Active", "Legs", "Disegna lentamente un grande cerchio con l’anca mantenendo fermo il bacino."),
    E("Knee Over Toe", "Active", "Legs", "Porta il ginocchio in avanti sopra il piede mantenendo il tallone incollato al pavimento."),
    E("Glute Bridge", "Active", "Legs", "Solleva il bacino spingendo sui talloni fino ad allineare spalle, anche e ginocchia."),
    E("Band External Rotation", "Active", "Upper", "Ruota l’avambraccio verso l’esterno mantenendo il gomito aderente al fianco."),
    E("Wall Slides", "Active", "Upper", "Fai scorrere lentamente le braccia lungo il muro mantenendo il contatto."),
    E("Scapular CARs", "Active", "Upper", "Muovi le scapole in tutte le direzioni disegnando un cerchio controllato."),
    E("Cat-Cow (Thoracic Focus)", "Active", "Back", "Alterna estensione e flessione della colonna concentrando il movimento sul tratto toracico."),
    E("Quadruped Thoracic Rotation", "Active", "Back", "Ruota il torace verso il soffitto mantenendo stabile il bacino."),
    E("Dead Bug", "Active", "Core", "Estendi lentamente braccio e gamba opposti mantenendo la zona lombare aderente al pavimento."),
    E("Bird Dog", "Active", "Core", "Allunga contemporaneamente braccio e gamba opposti mantenendo il corpo stabile."),
    E("Treadmill Walking", "Active", "Cardio", "Cammina a ritmo sostenuto mantenendo una postura eretta e un passo naturale."),

    // ===== BUILD =====
    E("Hip Thrust", "Build", "Legs", "Spingi il bacino verso l’alto con la schiena appoggiata alla panca e stringi i glutei in cima."),
    E("Leg Press", "Build", "Legs", "Spingi la pedana con tutto il piede senza bloccare completamente le ginocchia."),
    E("Bulgarian Split Squat", "Build", "Legs", "Scendi lentamente con la gamba posteriore appoggiata alla panca e risali spingendo con la gamba davanti."),
    E("Leg Extension", "Build", "Legs", "Estendi lentamente le ginocchia fino quasi alla completa distensione e torna in controllo."),
    E("Seated Leg Curl", "Build", "Legs", "Fletti le ginocchia portando i talloni sotto il sedile e ritorna lentamente."),
    E("Standing Calf Raise", "Build", "Legs", "Sollevati sulle punte e scendi lentamente fino al massimo allungamento."),
    E("Walking Lunges", "Build", "Legs", "Fai un passo avanti, scendi in affondo e continua alternando le gambe."),
    E("Cable Kickback", "Build", "Legs", "Estendi la gamba all’indietro spingendo con il gluteo senza inarcare la schiena."),
    E("Back Extension 45°", "Build", "Legs", "Estendi il busto fino a tornare in linea con le gambe senza iperestendere la schiena."),
    E("Assisted Pull-Up", "Build", "Upper", "Tira il petto verso la sbarra sfruttando l’assistenza della macchina."),
    E("Incline Chest Press Machine", "Build", "Upper", "Spingi le maniglie in avanti mantenendo scapole stabili e petto aperto."),
    E("Reverse Fly", "Build", "Upper", "Apri le braccia lateralmente stringendo le scapole tra loro."),
    E("Face Pull", "Build", "Upper", "Tira la corda verso il viso aprendo i gomiti verso l’esterno."),
    E("Seated Cable Row", "Build", "Back", "Porta l’impugnatura verso l’addome stringendo le scapole."),
    E("Lat Machine", "Build", "Back", "Tira la barra verso la parte alta del petto mantenendo il busto stabile."),
    E("Farmer Carry", "Build", "Back", "Cammina con due pesi mantenendo postura alta e addome contratto."),
    E("Pallof Press", "Build", "Core", "Spingi la maniglia davanti al petto opponendoti alla rotazione del busto."),
    E("Cable Chop", "Build", "Core", "Porta il cavo in diagonale ruotando il torace in modo controllato."),
    E("Hollow Hold", "Build", "Core", "Mantieni il corpo sospeso con zona lombare aderente al pavimento."),
    E("Side Plank", "Build", "Core", "Mantieni il corpo in linea appoggiandoti su un avambraccio e sul lato del piede."),
    E("Zone 2 Cardio", "Build", "Cardio", "Mantieni un’intensità moderata che ti permetta di parlare ma non cantare."),

    // ===== CONTROL =====
    E("Single Leg Balance", "Control", "Legs", "Rimani in equilibrio su una gamba senza perdere l’allineamento."),
    E("Single Leg Reach", "Control", "Legs", "Mantieni l’equilibrio mentre raggiungi un punto davanti a te."),
    E("Balance Board", "Control", "Legs", "Mantieni stabile la tavola controllandone le oscillazioni."),
    E("Scapular Control Drill", "Control", "Upper", "Muovi solo le scapole senza piegare i gomiti."),
    E("Y-T-W Raises", "Control", "Upper", "Solleva le braccia formando le lettere Y, T e W mantenendo il controllo."),
    E("Sternal Lift & Release", "Control", "Back", "Solleva e abbassa lo sterno senza compensare con la zona lombare."),
    E("Figure 8", "Control", "Back", "Disegna un movimento continuo a forma di otto con il bacino e il tronco."),
    E("Spinal Waves", "Control", "Back", "Muovi la colonna come un’onda, una vertebra alla volta."),
    E("Pelvic Tilt", "Control", "Core", "Alterna retroversione e antiversione del bacino mantenendo il controllo."),

    // ===== RESET =====
    E("90/90 Stretch", "Reset", "Legs", "Mantieni entrambe le anche piegate a 90° e inclina il busto in avanti."),
    E("Hip Flexor Stretch", "Reset", "Legs", "Spingi delicatamente il bacino in avanti mantenendo il busto eretto."),
    E("Hamstring Stretch", "Reset", "Legs", "Allunga la parte posteriore della coscia mantenendo la schiena lunga."),
    E("Adductor Rock Back", "Reset", "Legs", "Scivola indietro con il bacino mantenendo una gamba aperta lateralmente."),
    E("Deep Squat Hold", "Reset", "Legs", "Mantieni un’accosciata profonda con i talloni ben appoggiati a terra."),
    E("Doorway Stretch", "Reset", "Upper", "Appoggia gli avambracci a una porta e porta lentamente il corpo in avanti."),
    E("Child’s Pose", "Reset", "Back", "Porta i glutei verso i talloni allungando le braccia in avanti."),
    E("Thoracic Mobility Stretch", "Reset", "Back", "Estendi delicatamente il tratto toracico mantenendo il bacino stabile."),
    E("Diaphragmatic Breathing", "Reset", "Core", "Inspira gonfiando l’addome ed espira lentamente rilassando tutto il corpo."),
  ]
}

// ===== Periodizzazione (scheda d'esempio) =====
export function seedWorkoutPlan(): PlanCard[] {
  return [
    {
      id: uid(),
      nome: 'Workout 1',
      etichetta: 'Preparazione',
      giornate: [
        {
          id: uid(),
          nome: 'Day 1 · Legs',
          emoji: '🦵',
          esercizi: [
            {
              id: uid(),
              nome: 'Squat',
              mesocicli: [
                { id: uid(), nome: 'A', schema: '5/5/5/5', settimane: [1, 4, 7], carichi: { 1: 40, 4: 45, 7: 50 } },
                { id: uid(), nome: 'B', schema: '4/4/4/4', settimane: [2, 5, 8], carichi: { 2: 50, 5: 55, 8: 60 } },
              ],
            },
            {
              id: uid(),
              nome: 'Hip Thrust',
              mesocicli: [
                { id: uid(), nome: 'A', schema: '5/5/5/5', settimane: [1, 4, 7], carichi: { 1: 50, 4: 55, 7: 60 } },
                { id: uid(), nome: 'B', schema: '4/4/4/4', settimane: [2, 5, 8], carichi: { 2: 60, 5: 65, 8: 70 } },
              ],
            },
          ],
        },
      ],
    },
  ]
}

// ===== Stato iniziale completo =====
export function seedState(): AppState {
  const targets = computeTargets(defaultProfile)
  return {
    settings: {
      profilo: defaultProfile,
      targets: {
        kcal: targets.kcal,
        proteine: targets.proteine,
        carboidrati: targets.carboidrati,
        grassi: targets.grassi,
      },
      goals: { ...DEFAULT_GOALS },
    },
    foods: seedFoods(),
    diario: {},
    executionPlan: seedExecutionPlan(),
    workoutPlan: seedWorkoutPlan(),
    workoutProgress: {},
    weightLog: {},
    stepsLog: {},
    waterLog: {},
    activeKcalLog: {},
    exerciseCatalog: seedExerciseCatalog(),
    mealPresets: [],
    mealDefault: [
      { id: 'm0', nome: 'Breakfast' },
      { id: 'm1', nome: 'Lunch' },
      { id: 'm2', nome: 'Snack' },
      { id: 'm3', nome: 'Dinner' },
      { id: 'm4', nome: 'Snack' },
    ],
    cycle: { starts: [], cycleLength: 28, periodLength: 5 },
    account: {},
    gamification: { xp: 0, streak: 0, ultimaData: null, eventi: {} },
  }
}
