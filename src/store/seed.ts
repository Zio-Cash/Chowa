import { computeTargets } from '../lib/calories'
import { DEFAULT_GOALS } from '../lib/goals'
import type {
  AppState,
  CalorieProfile,
  CatalogExercise,
  ExecutionPlan,
  Food,
  Meal,
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
    { id: 'm2', nome: 'Afternoon snack', emoji: '🍎', items: [], spuntato: false },
    { id: 'm3', nome: 'Dinner', emoji: '🌙', items: [], spuntato: false },
    { id: 'm4', nome: 'Evening snack', emoji: '🥪', items: [], spuntato: false },
  ]
}

// ===== Database alimenti (per 100 g) =====
type FoodSeed = Omit<Food, 'id'>
const FOODS: FoodSeed[] = [
  { nome: 'Chicken breast', p100: 31, c100: 0, g100: 3.6, categoria: 'Carne', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Turkey breast', p100: 24, c100: 0.5, g100: 1, categoria: 'Carne', unita: 'g', qualita: 3 },
  { nome: 'Whole egg', p100: 13, c100: 1.1, g100: 11, categoria: 'Uova', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Egg white', p100: 11, c100: 0.7, g100: 0.2, categoria: 'Uova', unita: 'g', qualita: 3 },
  { nome: 'Salmon', p100: 20, c100: 0, g100: 13, categoria: 'Pesce', unita: 'g', qualita: 3 },
  { nome: 'Tuna in water', p100: 26, c100: 0, g100: 1, categoria: 'Pesce', unita: 'g', qualita: 3 },
  { nome: 'White rice (raw)', p100: 7, c100: 80, g100: 0.6, categoria: 'Cereali', unita: 'g', qualita: 2, preferito: true },
  { nome: 'Durum wheat pasta (raw)', p100: 13, c100: 72, g100: 1.5, categoria: 'Cereali', unita: 'g', qualita: 2 },
  { nome: 'Wholemeal bread', p100: 9, c100: 45, g100: 3, categoria: 'Cereali', unita: 'g', qualita: 2 },
  { nome: 'Oats', p100: 13, c100: 67, g100: 7, categoria: 'Cereali', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Potatoes', p100: 2, c100: 17, g100: 0.1, categoria: 'Verdura', unita: 'g', qualita: 2 },
  { nome: 'Broccoli', p100: 3, c100: 7, g100: 0.4, categoria: 'Verdura', unita: 'g', qualita: 3 },
  { nome: 'Banana', p100: 1.1, c100: 23, g100: 0.3, categoria: 'Frutta', unita: 'g', qualita: 2, preferito: true },
  { nome: 'Apple', p100: 0.3, c100: 14, g100: 0.2, categoria: 'Frutta', unita: 'g', qualita: 3 },
  { nome: 'Greek yogurt 0%', p100: 10, c100: 4, g100: 0.4, categoria: 'Latticini', unita: 'g', qualita: 3, preferito: true },
  { nome: 'Semi-skimmed milk', p100: 3.3, c100: 4.8, g100: 1.6, categoria: 'Latticini', unita: 'ml', qualita: 2 },
  { nome: 'Parmesan', p100: 33, c100: 0, g100: 29, categoria: 'Latticini', unita: 'g', qualita: 2 },
  { nome: 'Extra virgin olive oil', p100: 0, c100: 0, g100: 100, categoria: 'Condimenti', unita: 'g', qualita: 3 },
  { nome: 'Almonds', p100: 21, c100: 22, g100: 49, categoria: 'Frutta secca', unita: 'g', qualita: 3 },
  { nome: 'Lentils (cooked)', p100: 9, c100: 17, g100: 0.4, categoria: 'Legumi', unita: 'g', qualita: 3 },
  { nome: 'Cannellini beans (cooked)', p100: 9, c100: 21, g100: 0.5, categoria: 'Legumi', unita: 'g', qualita: 3 },
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
    E("Toe Yoga", "Active", "Legs", "Lift your big toe and the other toes in turn, keeping your foot flat on the floor."),
    E("Short Foot", "Active", "Legs", "Shorten your foot by lifting the arch, without curling your toes."),
    E("Hip CARs", "Active", "Legs", "Slowly draw a large circle with your hip while keeping your pelvis still."),
    E("Knee Over Toe", "Active", "Legs", "Drive your knee forward over your foot while keeping your heel glued to the floor."),
    E("Glute Bridge", "Active", "Legs", "Lift your hips by pushing through your heels until shoulders, hips and knees line up."),
    E("Band External Rotation", "Active", "Upper", "Rotate your forearm outward, keeping your elbow tucked against your side."),
    E("Wall Slides", "Active", "Upper", "Slowly slide your arms up the wall while keeping contact."),
    E("Scapular CARs", "Active", "Upper", "Move your shoulder blades in every direction, tracing a controlled circle."),
    E("Cat-Cow (Thoracic Focus)", "Active", "Back", "Alternate arching and rounding your spine, focusing the movement on your upper back."),
    E("Quadruped Thoracic Rotation", "Active", "Back", "Rotate your chest toward the ceiling while keeping your pelvis stable."),
    E("Dead Bug", "Active", "Core", "Slowly extend the opposite arm and leg while keeping your lower back pressed into the floor."),
    E("Bird Dog", "Active", "Core", "Reach out with the opposite arm and leg at the same time, keeping your body stable."),
    E("Treadmill Walking", "Active", "Cardio", "Walk at a brisk pace with an upright posture and a natural stride."),

    // ===== BUILD =====
    E("Hip Thrust", "Build", "Legs", "With your upper back on the bench, drive your hips up and squeeze your glutes at the top."),
    E("Leg Press", "Build", "Legs", "Push the platform with your whole foot without fully locking your knees."),
    E("Bulgarian Split Squat", "Build", "Legs", "With your back foot on the bench, lower slowly and rise by pushing through your front leg."),
    E("Leg Extension", "Build", "Legs", "Slowly straighten your knees until almost fully extended, then return with control."),
    E("Seated Leg Curl", "Build", "Legs", "Bend your knees to bring your heels under the seat, then return slowly."),
    E("Standing Calf Raise", "Build", "Legs", "Rise onto your toes, then lower slowly into a full stretch."),
    E("Walking Lunges", "Build", "Legs", "Step forward, lower into a lunge and keep going, alternating legs."),
    E("Cable Kickback", "Build", "Legs", "Extend your leg back, driving with your glute, without arching your back."),
    E("Back Extension 45°", "Build", "Legs", "Raise your torso until it’s in line with your legs, without overextending your back."),
    E("Assisted Pull-Up", "Build", "Upper", "Pull your chest toward the bar, using the machine’s assistance."),
    E("Incline Chest Press Machine", "Build", "Upper", "Press the handles forward, keeping your shoulder blades stable and chest open."),
    E("Reverse Fly", "Build", "Upper", "Open your arms out to the sides, squeezing your shoulder blades together."),
    E("Face Pull", "Build", "Upper", "Pull the rope toward your face, flaring your elbows out."),
    E("Seated Cable Row", "Build", "Back", "Pull the handle toward your stomach, squeezing your shoulder blades."),
    E("Lat Machine", "Build", "Back", "Pull the bar toward your upper chest while keeping your torso stable."),
    E("Farmer Carry", "Build", "Back", "Walk holding two weights, standing tall with your core braced."),
    E("Pallof Press", "Build", "Core", "Press the handle out in front of your chest, resisting the pull to rotate."),
    E("Cable Chop", "Build", "Core", "Pull the cable diagonally, rotating your torso with control."),
    E("Hollow Hold", "Build", "Core", "Hold your body off the floor with your lower back pressed down."),
    E("Side Plank", "Build", "Core", "Hold your body in a straight line, resting on one forearm and the side of your foot."),
    E("Zone 2 Cardio", "Build", "Cardio", "Keep a moderate intensity: you can talk, but not sing."),

    // ===== CONTROL =====
    E("Single Leg Balance", "Control", "Legs", "Balance on one leg without losing your alignment."),
    E("Single Leg Reach", "Control", "Legs", "Keep your balance as you reach toward a point in front of you."),
    E("Balance Board", "Control", "Legs", "Keep the board steady by controlling its wobble."),
    E("Scapular Control Drill", "Control", "Upper", "Move only your shoulder blades, without bending your elbows."),
    E("Y-T-W Raises", "Control", "Upper", "Raise your arms to form the letters Y, T and W, staying in control."),
    E("Sternal Lift & Release", "Control", "Back", "Lift and lower your breastbone without compensating with your lower back."),
    E("Figure 8", "Control", "Back", "Trace a continuous figure eight with your pelvis and torso."),
    E("Spinal Waves", "Control", "Back", "Move your spine like a wave, one vertebra at a time."),
    E("Pelvic Tilt", "Control", "Core", "Alternate tilting your pelvis back and forward, staying in control."),

    // ===== RESET =====
    E("90/90 Stretch", "Reset", "Legs", "Keep both hips bent at 90° and lean your torso forward."),
    E("Hip Flexor Stretch", "Reset", "Legs", "Gently push your hips forward while keeping your torso upright."),
    E("Hamstring Stretch", "Reset", "Legs", "Stretch the back of your thigh while keeping your back long."),
    E("Adductor Rock Back", "Reset", "Legs", "Rock your hips back while keeping one leg extended out to the side."),
    E("Deep Squat Hold", "Reset", "Legs", "Hold a deep squat with your heels firmly on the ground."),
    E("Doorway Stretch", "Reset", "Upper", "Rest your forearms on a door frame and slowly lean your body forward."),
    E("Child’s Pose", "Reset", "Back", "Sit your hips back toward your heels, reaching your arms forward."),
    E("Thoracic Mobility Stretch", "Reset", "Back", "Gently extend your upper back while keeping your pelvis stable."),
    E("Diaphragmatic Breathing", "Reset", "Core", "Breathe in, filling your belly, then breathe out slowly and relax your whole body."),
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
      { id: 'm2', nome: 'Afternoon snack' },
      { id: 'm3', nome: 'Dinner' },
      { id: 'm4', nome: 'Evening snack' },
    ],
    cycle: { starts: [], cycleLength: 28, periodLength: 5 },
    account: {},
    gamification: { xp: 0, streak: 0, ultimaData: null, eventi: {} },
    medals: {},
    mlw: {},
    reminders: [
      { id: 'pesata', emoji: '⚖️', label: 'Weigh in', time: '08:00', on: false },
      { id: 'acqua', emoji: '💧', label: 'Drink water', time: '11:00', on: false },
      { id: 'pranzo', emoji: '🍽️', label: 'Log lunch', time: '13:30', on: false },
      { id: 'workout', emoji: '🏋️', label: 'Workout', time: '18:00', on: false },
      { id: 'cena', emoji: '🌙', label: 'Log dinner', time: '21:00', on: false },
    ],
  }
}
