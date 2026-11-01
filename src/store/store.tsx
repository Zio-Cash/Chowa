import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  Account,
  CalorieProfile,
  CatalogExercise,
  CycleData,
  DailyGoals,
  ExecutionPlan,
  Food,
  Meal,
  MealItem,
  ReminderItem,
  SessionProgress,
  Targets,
} from '../types'
import { dateKey, isYesterday } from '../lib/date'
import { XP } from '../lib/gamification'
import { loadJSON, saveJSON, storageIsPersistent } from './storage'
import { saveDailySnapshot } from './backup'
import { cleanMlw } from '../lib/mlw'
import { mealTemplate, seedState, uid } from './seed'
import { useAuth } from '../auth/AuthProvider'
import { db } from '../lib/firebase'
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

const KEY = 'fitvita:v1'

const CATS_VALIDE = new Set(['Active', 'Build', 'Control', 'Reset'])

/**
 * Il catalogo esercizi ha cambiato tassonomia (Active/Build/Control/Reset).
 * Se lo stato salvato contiene ancora le vecchie categorie, lo si rimpiazza
 * con il catalogo aggiornato.
 */
function migraCatalogo(loaded: Partial<AppState>, base: AppState): AppState['exerciseCatalog'] {
  const cat = loaded.exerciseCatalog
  if (!Array.isArray(cat) || cat.length === 0) return base.exerciseCatalog
  const vecchio = cat.some((e) => !CATS_VALIDE.has(e?.categoria as string))
  return vecchio ? base.exerciseCatalog : cat
}

// Guardie di tipo: un file di import o un doc cloud/legacy malformato non deve
// sovrascrivere i default validi né far crashare le schermate.
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const asArr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback)
const asMap = <T,>(v: unknown, fallback: T): T => (isObj(v) ? (v as T) : fallback)

/** Tiene solo i giorni con un valore del tipo giusto (un import rovinato non deve far crashare). */
function cleanDays<T>(m: Record<string, T>, ok: (v: unknown) => boolean): Record<string, T> {
  const bad = Object.keys(m).filter((k) => !ok(m[k]))
  if (!bad.length) return m
  const out = { ...m }
  for (const k of bad) delete out[k]
  return out
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

/**
 * Fusione a tre vie: base = ultimo stato condiviso col cloud, local = le mie
 * modifiche non ancora inviate, remote = quello che è arrivato da un altro
 * dispositivo. Per ogni campo (e per ogni giorno dentro le mappe) vince chi
 * l'ha cambiato; se l'hanno cambiato entrambi, vince questo dispositivo.
 */
function merge3(base: unknown, local: unknown, remote: unknown, depth = 0): unknown {
  if (same(local, base)) return remote
  if (same(remote, base) || same(local, remote)) return local
  if (depth < 3 && isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {}
    const out: Record<string, unknown> = {}
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(b)])) {
      const v = merge3(b[k], local[k], remote[k], depth + 1)
      if (v !== undefined) out[k] = v
    }
    return out
  }
  return local
}

/** Fonde uno stato parziale (da cache locale o cloud) sui valori di default. */
function mergeState(loaded: Partial<AppState> | null): AppState {
  const base = seedState()
  if (!isObj(loaded)) return base
  const l = loaded as Partial<AppState>
  return {
    ...base,
    // mappe per-giorno (oggetti { 'YYYY-MM-DD': ... })
    diario: cleanDays(asMap(l.diario, base.diario), Array.isArray),
    workoutProgress: asMap(l.workoutProgress, base.workoutProgress),
    weightLog: asMap(l.weightLog, base.weightLog),
    stepsLog: asMap(l.stepsLog, base.stepsLog),
    waterLog: asMap(l.waterLog, base.waterLog),
    activeKcalLog: asMap(l.activeKcalLog, base.activeKcalLog),
    // liste
    foods: asArr(l.foods, base.foods),
    mealPresets: asArr(l.mealPresets, base.mealPresets),
    mealDefault: asArr(l.mealDefault, base.mealDefault),
    reminders: asArr(l.reminders, base.reminders),
    medals: asMap(l.medals, base.medals),
    mlw: cleanMlw(l.mlw),
    // oggetti strutturati
    executionPlan: asArr(l.executionPlan, base.executionPlan),
    settings: {
      ...base.settings,
      ...(isObj(l.settings) ? l.settings : {}),
      profilo: { ...base.settings.profilo, ...asMap(l.settings?.profilo, {}) },
      targets: { ...base.settings.targets, ...asMap(l.settings?.targets, {}) },
      goals: { ...base.settings.goals, ...asMap(l.settings?.goals, {}) },
    },
    cycle: {
      ...base.cycle,
      ...(isObj(l.cycle) ? l.cycle : {}),
      starts: asArr(l.cycle?.starts, base.cycle.starts),
    },
    account: asMap(l.account, base.account),
    exerciseCatalog: migraCatalogo(l, base),
    gamification: {
      ...base.gamification,
      ...(isObj(l.gamification) ? l.gamification : {}),
      eventi: cleanDays(asMap(l.gamification?.eventi, base.gamification.eventi), Array.isArray),
    },
  }
}

// Di chi è la copia locale: se sul telefono entra un altro account non deve
// ritrovarsi (né caricare nel suo cloud) i dati della persona precedente.
const OWNER_KEY = 'fitvita:owner'

function hydrate(uid: string | undefined): AppState {
  const owner = loadJSON<string | null>(OWNER_KEY, null)
  if (uid && owner && owner !== uid) return seedState()
  return mergeState(loadJSON<Partial<AppState> | null>(KEY, null))
}

// ===== Award puro (anti doppio XP + streak) =====
function applyAward(s: AppState, date: string, eventId: string, amount: number): AppState {
  const done = s.gamification.eventi[date] ?? []
  if (done.includes(eventId)) return s
  const g = s.gamification
  // La streak e "ultimaData" si aggiornano SOLO per il giorno più recente
  // registrato. Compilare un giorno passato (date < ultimaData) o ri-registrare
  // lo stesso giorno dà XP ma non tocca la streak → niente reset sui backfill.
  let streak = g.streak
  let ultimaData = g.ultimaData
  if (!g.ultimaData || date > g.ultimaData) {
    streak = g.ultimaData && isYesterday(g.ultimaData, date) ? g.streak + 1 : 1
    ultimaData = date
  }
  return {
    ...s,
    gamification: {
      ...g,
      xp: g.xp + amount,
      streak,
      ultimaData,
      eventi: { ...g.eventi, [date]: [...done, eventId] },
    },
  }
}

function emptySession(date: string, dayId: string): SessionProgress {
  return { date, dayId, esercizi: {} }
}

/** Costruisce i pasti vuoti di una giornata dalla struttura predefinita. */
function mealsFromDefault(md: AppState['mealDefault']): Meal[] {
  const base = md && md.length ? md : mealTemplate().map((m) => ({ id: m.id, nome: m.nome }))
  return base.map((s) => ({ id: s.id, nome: s.nome, emoji: '', items: [], spuntato: false }))
}

interface StoreCtx {
  state: AppState
  persistent: boolean
  /** L'ultimo salvataggio sul cloud non è riuscito (i dati restano sul telefono). */
  syncError: boolean
  // cloud / condivisione
  readOnly: boolean
  cloudViewers: string[]
  addViewer: (uid: string) => Promise<void>
  removeViewer: (uid: string) => Promise<void>
  // settings
  setProfile: (p: CalorieProfile) => void
  setTargets: (t: Targets, adattivo?: boolean) => void
  setGoals: (g: DailyGoals) => void
  setAccount: (patch: Partial<Account>) => void
  setReminders: (items: ReminderItem[]) => void
  awardMedals: (ids: string[], date: string, initKey?: string) => void
  toggleMlw: (date: string, i: number) => void
  // foods
  addFood: (f: Omit<Food, 'id'>) => string
  updateFood: (id: string, patch: Partial<Food>) => void
  deleteFood: (id: string) => void
  toggleFav: (id: string) => void
  swapFoods: (idA: string, idB: string) => void
  markUsed: (id: string) => void
  // catalogo esercizi
  addCatalogExercise: (e: Omit<CatalogExercise, 'id'>) => string
  updateCatalogExercise: (id: string, patch: Partial<CatalogExercise>) => void
  deleteCatalogExercise: (id: string) => void
  // diario
  getMeals: (date: string) => Meal[]
  toggleMeal: (date: string, mealId: string) => void
  addItem: (date: string, mealId: string, foodId: string, grammi: number) => void
  setItemGrams: (date: string, mealId: string, index: number, grammi: number) => void
  removeItem: (date: string, mealId: string, index: number) => void
  addMeal: (date: string, nome: string, emoji: string) => void
  updateMeal: (date: string, mealId: string, patch: Partial<Meal>) => void
  deleteMeal: (date: string, mealId: string) => void
  // mix preimpostati
  addMealPreset: (nome: string, items: MealItem[]) => string
  renameMealPreset: (id: string, nome: string) => void
  deleteMealPreset: (id: string) => void
  applyPreset: (date: string, mealId: string, presetId: string) => void
  updateMealDefault: (fn: (list: AppState['mealDefault']) => AppState['mealDefault']) => void
  copyDay: (fromDate: string, toDate: string) => void
  // peso
  setWeight: (date: string, kg: number) => void
  // passi
  setSteps: (date: string, passi: number) => void
  // acqua
  setWater: (date: string, ml: number) => void
  addWater: (date: string, deltaMl: number) => void
  // calorie attive bruciate
  setActiveKcal: (date: string, kcal: number) => void
  // ciclo
  logCycleStart: (date: string) => void
  removeCycleStart: (date: string) => void
  setCycleSettings: (patch: Partial<Pick<CycleData, 'cycleLength' | 'periodLength'>>) => void
  // workout
  updateExecutionPlan: (fn: (p: ExecutionPlan) => ExecutionPlan) => void
  getSession: (date: string) => SessionProgress | undefined
  toggleSet: (date: string, dayId: string, exId: string, index: number, serie: number) => void
  setSessionLoad: (date: string, dayId: string, exId: string, carico: number) => void
  completeWorkout: (date: string, dayId: string) => void
  resetSession: (date: string) => void
  // gamification
  maybeAwardPerfect: (date: string) => void
  // backup
  exportData: () => string
  importData: (json: string) => boolean
  resetAll: () => void
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, viewingUid } = useAuth()
  const readOnly = viewingUid != null
  const targetUid = viewingUid ?? user?.uid ?? null

  const [state, setStateRaw] = useState<AppState>(() => hydrate(user?.uid))
  const [syncError, setSyncError] = useState(false)
  const persistent = storageIsPersistent()
  const [cloudViewers, setCloudViewers] = useState<string[]>([])

  // In sola lettura (sto guardando i dati di un altro) le modifiche sono ignorate.
  const roRef = useRef(readOnly)
  roRef.current = readOnly
  const setState = useCallback((u: AppState | ((s: AppState) => AppState)) => {
    if (roRef.current) return
    localRev.current += 1
    setStateRaw(u as Parameters<typeof setStateRaw>[0])
  }, [])

  const stateRef = useRef(state)
  stateRef.current = state
  const skipWrite = useRef(false)
  // Identità di questa sessione + contatore di revisione: servono a ignorare
  // l'eco di una mia scrittura più vecchia (che altrimenti sovrascriverebbe
  // una modifica locale più recente → "sfarfallio / devi rifarlo").
  const clientId = useRef(uid())
  const localRev = useRef(0)
  // Diventa true solo dopo aver ricevuto il PRIMO snapshot dal cloud.
  // Finché è false NON scriviamo sul cloud: evita che una copia locale vecchia,
  // caricata prima di leggere il cloud, sovrascriva dati più recenti (perdita dati).
  const cloudReady = useRef(false)

  // Cache locale (solo dei miei dati, mai di quelli che sto guardando)
  const first = useRef(true)
  const prevReadOnly = useRef(readOnly)
  useEffect(() => {
    const justExitedReadOnly = prevReadOnly.current && !readOnly
    prevReadOnly.current = readOnly
    if (first.current) {
      first.current = false
      return
    }
    // Appena esco dalla sola-lettura, "state" contiene ancora i dati dell'altra
    // persona (il mio snapshot non è ancora arrivato): NON salvarli nella mia
    // cache. Il salvataggio riparte quando arriva il mio stato reale.
    if (justExitedReadOnly) return
    if (!readOnly) {
      saveJSON(KEY, state)
      if (user) saveJSON(OWNER_KEY, user.uid)
    }
  }, [state, readOnly, user])

  // Backup automatico locale (rete di sicurezza): uno snapshot al giorno, solo
  // dei miei dati e solo dopo aver letto il cloud (mai stati vecchi/vuoti).
  useEffect(() => {
    if (readOnly || !cloudReady.current) return
    const t = setTimeout(() => saveDailySnapshot(stateRef.current), 4000)
    return () => clearTimeout(t)
  }, [state, readOnly])

  // Ultimo stato condiviso col cloud (base per fondere modifiche concorrenti)
  // e scrittura in attesa del debounce (da inviare subito se l'app si chiude).
  const synced = useRef<AppState | null>(null)
  const lastWritten = useRef<{ rev: number; state: AppState } | null>(null)
  const pending = useRef<(() => void) | null>(null)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (pendingTimer.current) clearTimeout(pendingTimer.current)
    pendingTimer.current = null
    const w = pending.current
    pending.current = null
    w?.()
  }, [])

  // Ascolto in tempo reale del documento cloud (mio o di chi sto guardando)
  useEffect(() => {
    if (!targetUid) return
    cloudReady.current = false // nuovo target: aspetta il suo primo snapshot
    synced.current = null
    const ref = doc(db, 'states', targetUid)
    return onSnapshot(
      ref,
      (snap) => {
        // Offline e senza copia in cache: "non esiste" non è affidabile.
        // Non creare nulla (sovrascriverebbe il documento vero al rientro online).
        if (!snap.exists() && snap.metadata.fromCache) return
        cloudReady.current = true // abbiamo letto lo stato del cloud: da ora si può scrivere
        if (snap.exists()) {
          const d = snap.data()
          if (typeof d.data === 'string') {
            const mine = d.writer === clientId.current && typeof d.rev === 'number'
            if (mine && d.rev <= localRev.current) {
              // Eco di una mia scrittura: non porta nulla di nuovo (e se è più
              // vecchia sovrascriverebbe una modifica più recente). Conferma
              // però che il cloud ora ha quella versione.
              const w = lastWritten.current
              if (w && w.rev === d.rev) synced.current = w.state
            } else {
              let remote: AppState | null = null
              try {
                remote = mergeState(JSON.parse(d.data))
              } catch {
                // documento illeggibile: ignora
              }
              if (remote) {
                // Fusione con le mie modifiche non ancora confermate dal cloud
                // (base = ultima versione condivisa). Se non ne ho, è il remoto.
                const merged =
                  synced.current && !readOnly
                    ? (merge3(synced.current, stateRef.current, remote) as AppState)
                    : remote
                synced.current = remote
                if (merged === remote) {
                  skipWrite.current = true
                  setStateRaw(remote)
                } else {
                  // c'erano modifiche mie: le tengo e invio il risultato
                  localRev.current += 1
                  setStateRaw(mergeState(merged))
                }
              }
            }
          }
          setCloudViewers(Array.isArray(d.viewers) ? d.viewers : [])
        } else if (!readOnly && user) {
          // Primo accesso: crea il documento col mio stato locale attuale
          synced.current = stateRef.current
          setDoc(ref, {
            data: JSON.stringify(stateRef.current),
            viewers: [],
            writer: clientId.current,
            rev: localRev.current,
            updatedAt: serverTimestamp(),
          }).catch((e) => console.warn('[cloud] creazione documento fallita', e))
        } else {
          setCloudViewers([])
        }
      },
      (err) => {
        // permesso negato (es. spettatore non autorizzato) o rete: nessun update
        console.warn('[cloud] snapshot non disponibile', err)
      },
    )
  }, [targetUid, readOnly, user])

  // Salvataggio cloud dei miei dati (debounce), mai in sola lettura
  useEffect(() => {
    if (readOnly || !user) return
    // Guardia anti-perdita: non scrivere finché non abbiamo letto il cloud.
    if (!cloudReady.current) return
    if (skipWrite.current) {
      skipWrite.current = false
      return
    }
    const uid = user.uid
    const snapshot = state
    const rev = localRev.current
    pending.current = () => {
      const data = JSON.stringify(snapshot)
      lastWritten.current = { rev, state: snapshot }
      setDoc(
        doc(db, 'states', uid),
        { data, writer: clientId.current, rev, updatedAt: serverTimestamp() },
        { merge: true },
      )
        .then(() => setSyncError(false))
        .catch((e) => {
          console.warn('[cloud] salvataggio fallito', e)
          setSyncError(true)
        })
    }
    pendingTimer.current = setTimeout(flush, 800)
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
  }, [state, readOnly, user, flush])

  // App chiusa o messa in background: invia subito, senza aspettare il debounce.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush() // es. uscita dall'account
    }
  }, [flush])

  // Entrando in sola lettura, la mia modifica in attesa parte prima del cambio.
  useEffect(() => {
    if (readOnly) flush()
  }, [readOnly, flush])

  const addViewer = useCallback(
    async (viewer: string) => {
      const v = viewer.trim()
      if (!user || !v) return
      await setDoc(doc(db, 'states', user.uid), { viewers: arrayUnion(v) }, { merge: true })
    },
    [user],
  )

  const removeViewer = useCallback(
    async (viewer: string) => {
      const v = viewer.trim()
      if (!user || !v) return
      await setDoc(doc(db, 'states', user.uid), { viewers: arrayRemove(v) }, { merge: true })
    },
    [user],
  )

  const setProfile = useCallback((p: CalorieProfile) => {
    setState((s) => ({ ...s, settings: { ...s.settings, profilo: p } }))
  }, [])

  const setTargets = useCallback((t: Targets, adattivo = false) => {
    setState((s) => ({
      ...s,
      settings: { ...s.settings, targets: t, ...(adattivo ? { adattivoIl: dateKey() } : {}) },
    }))
  }, [])

  const setGoals = useCallback((g: DailyGoals) => {
    setState((s) => ({ ...s, settings: { ...s.settings, goals: g } }))
  }, [])

  const setAccount = useCallback((patch: Partial<Account>) => {
    setState((s) => ({ ...s, account: { ...s.account, ...patch } }))
  }, [])

  const setReminders = useCallback((items: ReminderItem[]) => {
    setState((s) => ({ ...s, reminders: items }))
  }, [])

  // Move · Learn · Work: segna/toglie l'obiettivo i (0 move, 1 learn, 2 work) in quel giorno.
  const toggleMlw = useCallback((date: string, i: number) => {
    setState((s) => {
      const bits = (s.mlw?.[date] ?? '000').split('')
      bits[i] = bits[i] === '1' ? '0' : '1'
      const v = bits.join('')
      const mlw = { ...(s.mlw ?? {}) }
      if (v === '000') delete mlw[date]
      else mlw[date] = v
      return { ...s, mlw }
    })
  }, [])

  // Registra medaglie conquistate. `date` vuota = conquistate prima che esistessero
  // le medaglie (primo avvio: le assegna in silenzio, senza festeggiamenti).
  const awardMedals = useCallback((ids: string[], date: string, initKey?: string) => {
    setState((s) => {
      const medals = { ...(s.medals ?? {}) }
      for (const id of ids) if (!(id in medals)) medals[id] = date
      if (initKey) medals[initKey] = dateKey()
      return { ...s, medals }
    })
  }, [])

  const addFood = useCallback((f: Omit<Food, 'id'>) => {
    const id = uid()
    setState((s) => ({ ...s, foods: [...s.foods, { ...f, id }] }))
    return id
  }, [])

  const updateFood = useCallback((id: string, patch: Partial<Food>) => {
    setState((s) => ({ ...s, foods: s.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)) }))
  }, [])

  const deleteFood = useCallback((id: string) => {
    setState((s) => ({ ...s, foods: s.foods.filter((f) => f.id !== id) }))
  }, [])

  const toggleFav = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      foods: s.foods.map((f) => (f.id === id ? { ...f, preferito: !f.preferito } : f)),
    }))
  }, [])

  // Scambia due alimenti nell'ordine della lista (riordino manuale, anche
  // dentro una categoria: i due elementi visibili adiacenti si scambiano).
  const swapFoods = useCallback((idA: string, idB: string) => {
    setState((s) => {
      const i = s.foods.findIndex((f) => f.id === idA)
      const j = s.foods.findIndex((f) => f.id === idB)
      if (i < 0 || j < 0 || i === j) return s
      const foods = s.foods.slice()
      ;[foods[i], foods[j]] = [foods[j], foods[i]]
      return { ...s, foods }
    })
  }, [])

  const markUsed = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      foods: s.foods.map((f) => (f.id === id ? { ...f, usato: Date.now() } : f)),
    }))
  }, [])

  // ===== Catalogo esercizi =====
  const addCatalogExercise = useCallback((e: Omit<CatalogExercise, 'id'>) => {
    const id = uid()
    setState((s) => ({ ...s, exerciseCatalog: [...s.exerciseCatalog, { ...e, id }] }))
    return id
  }, [])

  const updateCatalogExercise = useCallback((id: string, patch: Partial<CatalogExercise>) => {
    setState((s) => ({
      ...s,
      exerciseCatalog: s.exerciseCatalog.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  }, [])

  const deleteCatalogExercise = useCallback((id: string) => {
    setState((s) => ({ ...s, exerciseCatalog: s.exerciseCatalog.filter((e) => e.id !== id) }))
  }, [])

  const getMeals = useCallback(
    (date: string) => state.diario[date] ?? mealsFromDefault(state.mealDefault),
    [state.diario, state.mealDefault],
  )

  const mutateDay = (s: AppState, date: string, fn: (m: Meal[]) => Meal[]): Meal[] =>
    fn(s.diario[date] ? s.diario[date] : mealsFromDefault(s.mealDefault))

  const updateMealDefault = useCallback((fn: (list: AppState['mealDefault']) => AppState['mealDefault']) => {
    setState((s) => ({ ...s, mealDefault: fn(s.mealDefault) }))
  }, [])

  // Copia i pasti (struttura + alimenti) da un giorno all'altro, azzerando le spunte.
  const copyDay = useCallback((fromDate: string, toDate: string) => {
    setState((s) => {
      const src = s.diario[fromDate] ?? mealsFromDefault(s.mealDefault)
      const copia = src.map((m) => ({
        ...m,
        spuntato: false,
        items: m.items.map((it) => ({ ...it })),
      }))
      return { ...s, diario: { ...s.diario, [toDate]: copia } }
    })
  }, [])

  const toggleMeal = useCallback((date: string, mealId: string) => {
    setState((s) => {
      let became = false
      const meals = mutateDay(s, date, (ms) =>
        ms.map((m) => {
          if (m.id !== mealId) return m
          const sp = !m.spuntato
          if (sp) became = true
          return { ...m, spuntato: sp }
        }),
      )
      let ns: AppState = { ...s, diario: { ...s.diario, [date]: meals } }
      if (became) ns = applyAward(ns, date, `pasto:${mealId}`, XP.pasto)
      return ns
    })
  }, [])

  const addItem = useCallback(
    (date: string, mealId: string, foodId: string, grammi: number) => {
      setState((s) => {
        const meals = mutateDay(s, date, (ms) =>
          ms.map((m) =>
            m.id === mealId ? { ...m, items: [...m.items, { foodId, grammi }] } : m,
          ),
        )
        // Memorizza l'ultima quantità usata per riproporla la volta dopo.
        const foods = s.foods.map((f) =>
          f.id === foodId ? { ...f, usato: Date.now(), ultimiGrammi: grammi } : f,
        )
        return { ...s, foods, diario: { ...s.diario, [date]: meals } }
      })
    },
    [],
  )

  const setItemGrams = useCallback(
    (date: string, mealId: string, index: number, grammi: number) => {
      setState((s) => {
        let foodId: string | undefined
        const meals = mutateDay(s, date, (ms) =>
          ms.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((it, i) => {
                    if (i !== index) return it
                    foodId = it.foodId
                    return { ...it, grammi }
                  }),
                }
              : m,
          ),
        )
        // Aggiorna anche la quantità memorizzata per quell'alimento.
        const foods = foodId
          ? s.foods.map((f) => (f.id === foodId ? { ...f, ultimiGrammi: grammi } : f))
          : s.foods
        return { ...s, foods, diario: { ...s.diario, [date]: meals } }
      })
    },
    [],
  )

  const removeItem = useCallback((date: string, mealId: string, index: number) => {
    setState((s) => {
      const meals = mutateDay(s, date, (ms) =>
        ms.map((m) =>
          m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== index) } : m,
        ),
      )
      return { ...s, diario: { ...s.diario, [date]: meals } }
    })
  }, [])

  const addMeal = useCallback((date: string, nome: string, emoji: string) => {
    setState((s) => {
      const meals = mutateDay(s, date, (ms) => [
        ...ms,
        { id: uid(), nome, emoji, items: [], spuntato: false },
      ])
      return { ...s, diario: { ...s.diario, [date]: meals } }
    })
  }, [])

  const updateMeal = useCallback((date: string, mealId: string, patch: Partial<Meal>) => {
    setState((s) => {
      const meals = mutateDay(s, date, (ms) =>
        ms.map((m) => (m.id === mealId ? { ...m, ...patch } : m)),
      )
      return { ...s, diario: { ...s.diario, [date]: meals } }
    })
  }, [])

  const deleteMeal = useCallback((date: string, mealId: string) => {
    setState((s) => {
      const meals = mutateDay(s, date, (ms) => ms.filter((m) => m.id !== mealId))
      return { ...s, diario: { ...s.diario, [date]: meals } }
    })
  }, [])

  // ===== Mix preimpostati =====
  const addMealPreset = useCallback((nome: string, items: MealItem[]) => {
    const id = uid()
    setState((s) => ({
      ...s,
      mealPresets: [...s.mealPresets, { id, nome, items: items.map((it) => ({ ...it })) }],
    }))
    return id
  }, [])

  const renameMealPreset = useCallback((id: string, nome: string) => {
    setState((s) => ({
      ...s,
      mealPresets: s.mealPresets.map((p) => (p.id === id ? { ...p, nome } : p)),
    }))
  }, [])

  const deleteMealPreset = useCallback((id: string) => {
    setState((s) => ({ ...s, mealPresets: s.mealPresets.filter((p) => p.id !== id) }))
  }, [])

  const applyPreset = useCallback((date: string, mealId: string, presetId: string) => {
    setState((s) => {
      const preset = s.mealPresets.find((p) => p.id === presetId)
      if (!preset) return s
      const meals = mutateDay(s, date, (ms) =>
        ms.map((m) =>
          m.id === mealId ? { ...m, items: [...m.items, ...preset.items.map((it) => ({ ...it }))] } : m,
        ),
      )
      return { ...s, diario: { ...s.diario, [date]: meals } }
    })
  }, [])

  const setWeight = useCallback((date: string, kg: number) => {
    setState((s) => {
      const weightLog = { ...s.weightLog }
      if (kg > 0) weightLog[date] = kg
      else delete weightLog[date]
      let ns: AppState = { ...s, weightLog }
      if (kg > 0) ns = applyAward(ns, date, 'pesata', XP.pesata)
      return ns
    })
  }, [])

  const setSteps = useCallback((date: string, passi: number) => {
    setState((s) => {
      const stepsLog = { ...s.stepsLog }
      if (passi > 0) stepsLog[date] = passi
      else delete stepsLog[date]
      let ns: AppState = { ...s, stepsLog }
      if (passi >= s.settings.goals.stepTarget) ns = applyAward(ns, date, 'passi', XP.passi)
      return ns
    })
  }, [])

  const setWater = useCallback((date: string, ml: number) => {
    setState((s) => {
      const v = Math.max(0, ml)
      const waterLog = { ...s.waterLog }
      if (v > 0) waterLog[date] = v
      else delete waterLog[date]
      let ns: AppState = { ...s, waterLog }
      if (v >= s.settings.goals.waterTarget) ns = applyAward(ns, date, 'acqua', XP.acqua)
      return ns
    })
  }, [])

  const addWater = useCallback((date: string, deltaMl: number) => {
    setState((s) => {
      const v = Math.max(0, (s.waterLog[date] ?? 0) + deltaMl)
      const waterLog = { ...s.waterLog }
      if (v > 0) waterLog[date] = v
      else delete waterLog[date]
      let ns: AppState = { ...s, waterLog }
      if (v >= s.settings.goals.waterTarget) ns = applyAward(ns, date, 'acqua', XP.acqua)
      return ns
    })
  }, [])

  const setActiveKcal = useCallback((date: string, kcal: number) => {
    setState((s) => {
      const v = Math.max(0, Math.round(kcal))
      const activeKcalLog = { ...s.activeKcalLog }
      if (v > 0) activeKcalLog[date] = v
      else delete activeKcalLog[date]
      return { ...s, activeKcalLog }
    })
  }, [])

  const logCycleStart = useCallback((date: string) => {
    setState((s) => {
      if (s.cycle.starts.includes(date)) return s
      const starts = [...s.cycle.starts, date].sort()
      return { ...s, cycle: { ...s.cycle, starts } }
    })
  }, [])

  const removeCycleStart = useCallback((date: string) => {
    setState((s) => ({
      ...s,
      cycle: { ...s.cycle, starts: s.cycle.starts.filter((d) => d !== date) },
    }))
  }, [])

  const setCycleSettings = useCallback(
    (patch: Partial<Pick<CycleData, 'cycleLength' | 'periodLength'>>) => {
      setState((s) => ({ ...s, cycle: { ...s.cycle, ...patch } }))
    },
    [],
  )

  const updateExecutionPlan = useCallback((fn: (p: ExecutionPlan) => ExecutionPlan) => {
    setState((s) => ({ ...s, executionPlan: fn(s.executionPlan) }))
  }, [])

  const getSession = useCallback(
    (date: string) => state.workoutProgress[date],
    [state.workoutProgress],
  )

  const toggleSet = useCallback(
    (date: string, dayId: string, exId: string, index: number, serie: number) => {
      setState((s) => {
        const prev = s.workoutProgress[date]
        const sess = prev && prev.dayId === dayId ? prev : emptySession(date, dayId)
        const exr = sess.esercizi[exId] ?? { sets: Array(serie).fill(false) }
        const sets = exr.sets.slice()
        while (sets.length < serie) sets.push(false)
        sets[index] = !sets[index]
        const next: SessionProgress = {
          ...sess,
          esercizi: { ...sess.esercizi, [exId]: { ...exr, sets } },
        }
        return { ...s, workoutProgress: { ...s.workoutProgress, [date]: next } }
      })
    },
    [],
  )

  const setSessionLoad = useCallback(
    (date: string, dayId: string, exId: string, carico: number) => {
      setState((s) => {
        const prev = s.workoutProgress[date]
        const sess = prev && prev.dayId === dayId ? prev : emptySession(date, dayId)
        const exr = sess.esercizi[exId] ?? { sets: [] }
        const next: SessionProgress = {
          ...sess,
          esercizi: { ...sess.esercizi, [exId]: { ...exr, carico } },
        }
        return { ...s, workoutProgress: { ...s.workoutProgress, [date]: next } }
      })
    },
    [],
  )

  const completeWorkout = useCallback((date: string, dayId: string) => {
    setState((s) => applyAward(s, date, `workout:${dayId}`, XP.workout))
  }, [])

  const resetSession = useCallback((date: string) => {
    setState((s) => {
      const wp = { ...s.workoutProgress }
      delete wp[date]
      return { ...s, workoutProgress: wp }
    })
  }, [])

  const maybeAwardPerfect = useCallback((date: string) => {
    setState((s) => applyAward(s, date, 'perfetta', XP.giornataPerfetta))
  }, [])

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state])

  const importData = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json)
      if (!isObj(parsed)) return false
      // stessa validazione tipi di cache/cloud: campi malformati → default
      setState(mergeState(parsed as Partial<AppState>))
      return true
    } catch {
      return false
    }
  }, [])

  const resetAll = useCallback(() => setState(seedState()), [])

  const value = useMemo<StoreCtx>(
    () => ({
      state,
      persistent,
      syncError,
      readOnly,
      cloudViewers,
      addViewer,
      removeViewer,
      setProfile,
      setTargets,
      setGoals,
      setAccount,
      setReminders,
      awardMedals,
      toggleMlw,
      setSteps,
      setWater,
      addWater,
      setActiveKcal,
      logCycleStart,
      removeCycleStart,
      setCycleSettings,
      addFood,
      updateFood,
      deleteFood,
      toggleFav,
      swapFoods,
      markUsed,
      addCatalogExercise,
      updateCatalogExercise,
      deleteCatalogExercise,
      getMeals,
      toggleMeal,
      addItem,
      setItemGrams,
      removeItem,
      addMeal,
      updateMeal,
      deleteMeal,
      addMealPreset,
      renameMealPreset,
      deleteMealPreset,
      applyPreset,
      updateMealDefault,
      copyDay,
      setWeight,
      updateExecutionPlan,
      getSession,
      toggleSet,
      setSessionLoad,
      completeWorkout,
      resetSession,
      maybeAwardPerfect,
      exportData,
      importData,
      resetAll,
    }),
    [
      state,
      persistent,
      syncError,
      readOnly,
      cloudViewers,
      addViewer,
      removeViewer,
      setProfile,
      setTargets,
      setGoals,
      setAccount,
      setReminders,
      awardMedals,
      toggleMlw,
      setSteps,
      setWater,
      addWater,
      setActiveKcal,
      logCycleStart,
      removeCycleStart,
      setCycleSettings,
      addFood,
      updateFood,
      deleteFood,
      toggleFav,
      swapFoods,
      markUsed,
      addCatalogExercise,
      updateCatalogExercise,
      deleteCatalogExercise,
      getMeals,
      toggleMeal,
      addItem,
      setItemGrams,
      removeItem,
      addMeal,
      updateMeal,
      deleteMeal,
      addMealPreset,
      renameMealPreset,
      deleteMealPreset,
      applyPreset,
      updateMealDefault,
      copyDay,
      setWeight,
      updateExecutionPlan,
      getSession,
      toggleSet,
      setSessionLoad,
      completeWorkout,
      resetSession,
      maybeAwardPerfect,
      exportData,
      importData,
      resetAll,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore deve essere usato dentro StoreProvider')
  return v
}
