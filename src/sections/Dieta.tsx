import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { addDays, dateKey, formatLong, mondayOf, parseKey } from '../lib/date'
import { dayMacros, foodKcal100, itemMacros, macroPct, mealMacros } from '../lib/nutrition'
import type { Food, FoodUnit, MealItem } from '../types'

const WD = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
import { Button, Card, CardTitle, Field, NumberInput, Segmented, Sheet, Stepper } from '../components/ui'
import { MacroDonut } from '../components/charts'
import { Icon } from '../components/brand'
import { uid } from '../store/seed'

// Categorie alimenti (le 6 assegnabili + "Favorites" come filtro speciale).
const FOOD_CATS = ['Carbo', 'Protein', 'Vegetables', 'Fruit', 'Sweet', 'Other'] as const
const CHIP_CATS = ['Favorites', ...FOOD_CATS]

// Mappa categorie (nuove + vecchie italiane) → bucket, così i cibi già
// esistenti compaiono nel filtro giusto senza migrazione dei dati.
const CAT_MAP: Record<string, string> = {
  Carbo: 'Carbo',
  Protein: 'Protein',
  Vegetables: 'Vegetables',
  Fruit: 'Fruit',
  Sweet: 'Sweet',
  Other: 'Other',
  // legacy IT
  Cereali: 'Carbo',
  Carne: 'Protein',
  Uova: 'Protein',
  Pesce: 'Protein',
  Latticini: 'Protein',
  Legumi: 'Protein',
  Integratori: 'Protein',
  Verdura: 'Vegetables',
  Frutta: 'Fruit',
  'Frutta secca': 'Other',
  Condimenti: 'Other',
  Altro: 'Other',
}
const bucketOf = (c: string) => CAT_MAP[c] ?? 'Other'

export default function Dieta() {
  const { state, getMeals, toggleMeal, addMeal } = useStore()
  const oggi = dateKey()
  const [today, setToday] = useState(oggi)
  const isToday = today === oggi
  const isFuture = today > oggi
  const weekMon = mondayOf(parseKey(today))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekMon, i))
  const shiftWeek = (n: number) => setToday(dateKey(addDays(weekMon, n * 7)))
  const meals = getMeals(today)
  const totals = useMemo(() => dayMacros(meals, state.foods, false), [meals, state.foods])
  const targets = state.settings.targets
  const consumedPct = macroPct(totals.proteine, totals.carboidrati, totals.grassi)
  const targetPct = macroPct(targets.proteine, targets.carboidrati, targets.grassi)
  const [editMeal, setEditMeal] = useState<string | null>(null)
  const [showDB, setShowDB] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showStruct, setShowStruct] = useState(false)
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="space-y-4 pb-4">
      {/* Intestazione giorno */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-medium tracking-wide">
            {isToday ? 'Oggi' : formatLong(parseKey(today))}
          </span>
          {isFuture && (
            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium text-teal">
              in programma
            </span>
          )}
        </div>
        {!isToday && (
          <button onClick={() => setToday(oggi)} className="text-xs text-teal">
            Oggi →
          </button>
        )}
      </div>

      {/* Striscia settimana (pianifica anche nel futuro) */}
      <div className="flex items-center gap-1 rounded-2xl bg-surface px-1.5 py-1.5 ring-1 ring-white/[0.05]">
        <button
          onClick={() => shiftWeek(-1)}
          className="h-9 w-7 shrink-0 rounded-full text-muted active:scale-90"
          aria-label="Settimana precedente"
        >
          ‹
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {weekDays.map((d, i) => {
            const k = dateKey(d)
            const sel = k === today
            const isOggi = k === oggi
            return (
              <button
                key={k}
                onClick={() => setToday(k)}
                className={`flex flex-col items-center rounded-xl py-1.5 transition ${
                  sel ? 'bg-teal text-[#1a1012]' : k > oggi ? 'text-muted/60' : 'text-ink'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wide opacity-70">{WD[i]}</span>
                <span className="font-mono text-sm tabular">{d.getDate()}</span>
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    isOggi ? (sel ? 'bg-[#1a1012]' : 'bg-teal') : 'bg-transparent'
                  }`}
                />
              </button>
            )
          })}
        </div>
        <button
          onClick={() => shiftWeek(1)}
          className="h-9 w-7 shrink-0 rounded-full text-muted active:scale-90"
          aria-label="Settimana successiva"
        >
          ›
        </button>
      </div>

      <Card>
        <CardTitle>{isToday ? 'Diario di oggi' : isFuture ? 'In programma' : 'Diario'}</CardTitle>
        <div className="flex justify-center">
          <MacroDonut proteine={totals.proteine} carboidrati={totals.carboidrati} grassi={totals.grassi} size={170}>
            <span className="font-mono text-2xl font-bold tabular">{Math.round(totals.kcal)}</span>
            <span className="text-xs text-muted">kcal</span>
          </MacroDonut>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <MacroTile color="bg-prot" label="Proteine" c={totals.proteine} t={targets.proteine} cp={consumedPct.p} tp={targetPct.p} />
          <MacroTile color="bg-carb" label="Carbo" c={totals.carboidrati} t={targets.carboidrati} cp={consumedPct.c} tp={targetPct.c} />
          <MacroTile color="bg-fat" label="Grassi" c={totals.grassi} t={targets.grassi} cp={consumedPct.g} tp={targetPct.g} />
        </div>
        <div className="mt-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-center font-mono text-xs text-muted tabular">
          rapporto {consumedPct.p}/{consumedPct.c}/{consumedPct.g}% · obiettivo {targetPct.p}/{targetPct.c}/{targetPct.g}%
        </div>
      </Card>

      <div className="space-y-2">
        {meals.map((m) => {
          const mm = mealMacros(m, state.foods)
          return (
            <Card key={m.id} className="!p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => !isFuture && toggleMeal(today, m.id)}
                  disabled={isFuture}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition disabled:opacity-30 ${
                    m.spuntato ? 'border-verde bg-verde text-[#06231d]' : 'border-white/20 text-transparent'
                  }`}
                >
                  ✓
                </button>
                <button onClick={() => setEditMeal(m.id)} className="flex flex-1 items-center gap-2 text-left">
                  <div className="flex-1">
                    <div className="font-semibold">{m.nome}</div>
                    <div className="font-mono text-xs text-muted tabular">
                      {m.items.length} alimenti · P{Math.round(mm.proteine)} C{Math.round(mm.carboidrati)} G
                      {Math.round(mm.grassi)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold tabular">{Math.round(mm.kcal)}</div>
                    <div className="text-[10px] text-muted">kcal</div>
                  </div>
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Azioni — unico controllo discreto */}
      <div className="flex justify-center pt-1">
        <button
          onClick={() => setShowActions(true)}
          className="flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 text-sm text-muted transition active:scale-[0.98]"
        >
          <Icon.dots size={16} /> Azioni
        </button>
      </div>

      <MealActionsSheet
        open={showActions}
        onClose={() => setShowActions(false)}
        onAddMeal={() => addMeal(today, 'Pasto', '')}
        onStruct={() => setShowStruct(true)}
        onDB={() => setShowDB(true)}
        onShop={() => setShowShop(true)}
      />
      {editMeal && <MealEditor date={today} mealId={editMeal} onClose={() => setEditMeal(null)} />}
      <FoodDB open={showDB} onClose={() => setShowDB(false)} />
      <ShoppingListSheet open={showShop} onClose={() => setShowShop(false)} />
      <MealStructureSheet open={showStruct} onClose={() => setShowStruct(false)} />
    </div>
  )
}

// ===== Editor pasto =====
function MealEditor({ date, mealId, onClose }: { date: string; mealId: string; onClose: () => void }) {
  const {
    state, getMeals, addItem, setItemGrams, removeItem, updateMeal, deleteMeal, toggleFav, swapFoods,
    applyPreset, addMealPreset, deleteMealPreset,
  } = useStore()
  const meal = getMeals(date).find((m) => m.id === mealId)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Favorites')
  if (!meal) return null

  const presetKcal = (items: MealItem[]) =>
    items.reduce((a, it) => a + itemMacros(it, state.foods).kcal, 0)
  const saveAsMix = () => {
    if (meal.items.length === 0) return
    const nome = prompt('Nome del mix:', meal.nome)?.trim()
    if (nome) addMealPreset(nome, meal.items)
  }

  const quick = q.trim()
    ? state.foods
        .filter((f) => f.nome.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (b.usato ?? 0) - (a.usato ?? 0))
    : cat === 'Favorites'
      ? state.foods.filter((f) => f.preferito)
      : state.foods.filter((f) => bucketOf(f.categoria) === cat)

  const mm = mealMacros(meal, state.foods)
  const addQuick = (f: Food) => addItem(date, mealId, f.id, f.ultimiGrammi ?? 100)

  return (
    <Sheet open onClose={onClose} title={meal.nome}>
      {/* Nome pasto + elimina */}
      <div className="mb-3 flex items-center gap-2">
        <input
          value={meal.nome}
          onChange={(e) => updateMeal(date, mealId, { nome: e.target.value })}
          className="min-h-[44px] flex-1 rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-white/[0.05]"
        />
        <button
          onClick={() => {
            if (confirm('Eliminare questo pasto?')) {
              deleteMeal(date, mealId)
              onClose()
            }
          }}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-300"
          aria-label="Elimina pasto"
        >
          <Icon.trash size={18} />
        </button>
      </div>

      {/* Alimenti nel pasto — SOPRA, così vedi subito cosa aggiungi */}
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Nel pasto</span>
        <span className="font-mono text-xs text-muted tabular">
          {meal.items.length} · {Math.round(mm.kcal)} kcal
        </span>
      </div>
      <div className="max-h-[184px] space-y-2 overflow-y-auto">
        {meal.items.length === 0 && (
          <p className="rounded-2xl bg-white/[0.04] p-3 text-center text-sm text-muted">
            Nessun alimento. Tocca un cibo qui sotto per aggiungerlo.
          </p>
        )}
        {meal.items.map((it, i) => {
          const f = state.foods.find((x) => x.id === it.foodId)
          const m = itemMacros(it, state.foods)
          return (
            <div key={i} className="flex items-center gap-2 rounded-2xl bg-surface px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{f?.nome ?? '—'}</div>
                <div className="font-mono text-xs text-muted tabular">{Math.round(m.kcal)} kcal</div>
              </div>
              <Stepper
                value={it.grammi}
                onChange={(v) => setItemGrams(date, mealId, i, v)}
                step={5}
                editable
                suffix={f?.unita ?? 'g'}
              />
              <button
                onClick={() => removeItem(date, mealId, i)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted"
                aria-label="Rimuovi"
              >
                <Icon.close size={16} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Ricerca (fissa) */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface2 px-4 ring-1 ring-white/[0.05] focus-within:ring-teal/30">
        <span className="text-muted">
          <Icon.search size={18} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca alimento…"
          className="min-h-[46px] flex-1 bg-transparent outline-none"
        />
        {q && (
          <button onClick={() => setQ('')} className="text-muted" aria-label="Pulisci">
            <Icon.close size={18} />
          </button>
        )}
      </div>

      {/* Filtri — Mix + categorie fisse, sempre presenti (niente salti) */}
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {['Mix', ...CHIP_CATS].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`min-h-[34px] shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-medium tracking-wide transition ${
              cat === c && !q.trim()
                ? 'bg-teal text-[#1a1012]'
                : c === 'Mix'
                  ? 'bg-teal/12 text-teal'
                  : 'bg-surface2 text-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Lista — Mix preimpostati oppure alimenti; altezza FISSA (~6 righe) */}
      <div className="mt-2 h-72 space-y-1.5 overflow-y-auto">
        {cat === 'Mix' && !q.trim() ? (
          <>
            <button
              onClick={saveAsMix}
              disabled={meal.items.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-sm text-muted disabled:opacity-40"
            >
              <Icon.plus size={16} /> Salva questo pasto come mix
            </button>
            {state.mealPresets.length === 0 && (
              <p className="rounded-2xl bg-white/[0.04] p-3 text-center text-sm text-muted">
                Nessun mix salvato. Assembla un pasto e salvalo qui.
              </p>
            )}
            {state.mealPresets.map((p) => (
              <div key={p.id} className="flex items-center gap-1 rounded-2xl bg-surface2 px-2 py-1.5">
                <button
                  onClick={() => confirm(`Eliminare il mix "${p.nome}"?`) && deleteMealPreset(p.id)}
                  className="flex h-9 w-9 items-center justify-center text-muted"
                  aria-label="Elimina mix"
                >
                  <Icon.trash size={16} />
                </button>
                <button
                  onClick={() => applyPreset(date, mealId, p.id)}
                  className="flex flex-1 items-center gap-2 py-1 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{p.nome}</div>
                    <div className="font-mono text-[11px] text-muted tabular">
                      {p.items.length} alimenti · {Math.round(presetKcal(p.items))} kcal
                    </div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/15 text-teal">
                    <Icon.plus size={18} />
                  </span>
                </button>
              </div>
            ))}
          </>
        ) : (
          <>
        {quick.length === 0 && (
          <p className="rounded-2xl bg-white/[0.04] p-3 text-center text-sm text-muted">
            Nessun alimento qui.
          </p>
        )}
        {quick.map((f, vi) => {
          const inMeal = meal.items.filter((it) => it.foodId === f.id).length
          const canOrder = !q.trim()
          return (
            <div key={f.id} className="flex items-center gap-1 rounded-2xl bg-surface2 px-2 py-1.5">
              {canOrder && (
                <div className="flex flex-col">
                  <button
                    onClick={() => vi > 0 && swapFoods(f.id, quick[vi - 1].id)}
                    disabled={vi === 0}
                    className="flex h-5 w-6 items-center justify-center text-muted disabled:opacity-20"
                    aria-label="Sposta su"
                  >
                    <Icon.chevronUp size={16} />
                  </button>
                  <button
                    onClick={() => vi < quick.length - 1 && swapFoods(f.id, quick[vi + 1].id)}
                    disabled={vi === quick.length - 1}
                    className="flex h-5 w-6 items-center justify-center text-muted disabled:opacity-20"
                    aria-label="Sposta giù"
                  >
                    <Icon.chevronDown size={16} />
                  </button>
                </div>
              )}
              <button
                onClick={() => toggleFav(f.id)}
                className="flex h-9 w-9 items-center justify-center"
                aria-label="Preferito"
              >
                {f.preferito ? (
                  <Icon.star size={18} className="text-teal" />
                ) : (
                  <Icon.starOutline size={18} className="text-muted" />
                )}
              </button>
              <button onClick={() => addQuick(f)} className="flex flex-1 items-center gap-2 py-1 text-left">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{f.nome}</div>
                  <div className="font-mono text-[11px] text-muted tabular">
                    {Math.round(foodKcal100(f))} kcal/100{f.unita}
                    {f.ultimiGrammi ? ` · ${f.ultimiGrammi}${f.unita}` : ''}
                  </div>
                </div>
                {inMeal > 0 && (
                  <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium text-teal">
                    ×{inMeal}
                  </span>
                )}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/15 text-teal">
                  <Icon.plus size={18} />
                </span>
              </button>
            </div>
          )
        })}
          </>
        )}
      </div>

    </Sheet>
  )
}

function MealActionsSheet({
  open, onClose, onAddMeal, onStruct, onDB, onShop,
}: {
  open: boolean
  onClose: () => void
  onAddMeal: () => void
  onStruct: () => void
  onDB: () => void
  onShop: () => void
}) {
  const act = (fn: () => void) => () => {
    onClose()
    fn()
  }
  const items = [
    { icon: <Icon.plus size={18} />, label: 'Aggiungi pasto', run: act(onAddMeal) },
    { icon: <Icon.edit size={18} />, label: 'Modifica pasti', run: act(onStruct) },
    { icon: <Icon.db size={18} />, label: 'Database alimenti', run: act(onDB) },
    { icon: <Icon.cart size={18} />, label: 'Lista della spesa', run: act(onShop) },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Azioni">
      <div className="space-y-1.5">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.run}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface2 px-4 py-3.5 text-left transition active:scale-[0.99]"
          >
            <span className="text-teal">{it.icon}</span>
            <span className="text-sm font-medium tracking-wide">{it.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function MacroTile({
  color, label, c, t, cp, tp,
}: {
  color: string
  label: string
  c: number
  t: number
  cp: number
  tp: number
}) {
  const pct = t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs font-medium tracking-wide">{label}</span>
      </div>
      <div className="mt-1.5 font-mono text-sm font-medium tabular">
        {Math.round(c)}
        <span className="text-xs font-normal text-muted">/{t}g</span>
      </div>
      <div className="font-mono text-[10px] text-muted tabular">
        {cp}% <span className="opacity-60">/ {tp}%</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ===== Struttura pasti (predefinito per ogni giorno) =====
function MealStructureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, updateMealDefault } = useStore()
  const list = state.mealDefault

  const rename = (id: string, nome: string) =>
    updateMealDefault((l) => l.map((s) => (s.id === id ? { ...s, nome } : s)))
  const remove = (id: string) => updateMealDefault((l) => l.filter((s) => s.id !== id))
  const add = () => updateMealDefault((l) => [...l, { id: uid(), nome: 'Pasto' }])
  const move = (id: string, dir: -1 | 1) =>
    updateMealDefault((l) => {
      const i = l.findIndex((s) => s.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= l.length) return l
      const n = l.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  return (
    <Sheet open={open} onClose={onClose} title="Struttura pasti">
      <p className="mb-3 text-sm leading-relaxed text-muted">
        Definisci i pasti di una giornata: nome, ordine e quanti sono. Vale per i giorni non ancora
        compilati.
      </p>
      <div className="space-y-1.5">
        {list.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 rounded-2xl bg-surface2 px-2 py-1.5">
            <div className="flex flex-col">
              <button
                onClick={() => move(s.id, -1)}
                disabled={i === 0}
                className="flex h-5 w-6 items-center justify-center text-muted disabled:opacity-20"
                aria-label="Su"
              >
                <Icon.chevronUp size={16} />
              </button>
              <button
                onClick={() => move(s.id, 1)}
                disabled={i === list.length - 1}
                className="flex h-5 w-6 items-center justify-center text-muted disabled:opacity-20"
                aria-label="Giù"
              >
                <Icon.chevronDown size={16} />
              </button>
            </div>
            <input
              value={s.nome}
              onChange={(e) => rename(s.id, e.target.value)}
              className="min-h-[42px] flex-1 rounded-xl bg-transparent px-2 text-sm outline-none focus:bg-white/[0.04]"
            />
            <button
              onClick={() => list.length > 1 && remove(s.id)}
              disabled={list.length <= 1}
              className="flex h-9 w-9 items-center justify-center text-red-300 disabled:opacity-30"
              aria-label="Elimina pasto"
            >
              <Icon.trash size={16} />
            </button>
          </div>
        ))}
      </div>
      <Button variant="soft" className="mt-3 w-full" onClick={add}>
        <Icon.plus size={16} /> Aggiungi pasto
      </Button>
    </Sheet>
  )
}

// ===== Lista della spesa =====
const GROUP_ORDER = ['Protein', 'Carbo', 'Vegetables', 'Fruit', 'Sweet', 'Other']

function fmtQty(q: number, unita: string): string {
  if (unita === 'ml') return q >= 1000 ? `${(q / 1000).toFixed(1)} L` : `${Math.round(q)} ml`
  return q >= 1000 ? `${(q / 1000).toFixed(2)} kg` : `${Math.round(q)} g`
}

function ShoppingListSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore()
  const oggi = dateKey()
  const domani = dateKey(addDays(parseKey(oggi), 1))
  const fra7 = dateKey(addDays(parseKey(oggi), 7))

  const [mode, setMode] = useState<'7next' | 'custom'>('7next')
  const [customStart, setCustomStart] = useState(domani)
  const [customEnd, setCustomEnd] = useState(fra7)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // "Prossimi 7 giorni" = da domani a +7 (giorno corrente escluso)
  const start = mode === '7next' ? domani : customStart
  const end = mode === '7next' ? fra7 : customEnd

  // Aggrega gli alimenti dei pasti pianificati nel periodo.
  const groups = useMemo(() => {
    const acc = new Map<string, number>()
    for (const [dateStr, meals] of Object.entries(state.diario)) {
      if (dateStr < start || dateStr > end) continue
      for (const m of meals) for (const it of m.items) {
        acc.set(it.foodId, (acc.get(it.foodId) ?? 0) + it.grammi)
      }
    }
    const byGroup: Record<string, { id: string; nome: string; qty: number; unita: string }[]> = {}
    for (const [foodId, qty] of acc) {
      const f = state.foods.find((x) => x.id === foodId)
      if (!f) continue
      const g = bucketOf(f.categoria)
      ;(byGroup[g] ??= []).push({ id: foodId, nome: f.nome, qty, unita: f.unita })
    }
    for (const g of Object.keys(byGroup)) byGroup[g].sort((a, b) => a.nome.localeCompare(b.nome))
    return byGroup
  }, [state.diario, state.foods, start, end])

  const total = Object.values(groups).reduce((a, xs) => a + xs.length, 0)
  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const copyList = () => {
    let txt = `Lista della spesa (${formatLong(parseKey(start))} – ${formatLong(parseKey(end))})\n`
    for (const g of GROUP_ORDER) {
      const xs = groups[g]
      if (!xs?.length) continue
      txt += `\n${g}\n` + xs.map((x) => `- ${x.nome} · ${fmtQty(x.qty, x.unita)}`).join('\n') + '\n'
    }
    navigator.clipboard?.writeText(txt.trim()).then(
      () => alert('Lista copiata negli appunti.'),
      () => alert('Copia non riuscita.'),
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Lista della spesa" flush>
      <div className="shrink-0">
        <div className="mb-3 flex gap-1.5">
          {([
            { v: '7next', label: 'Prossimi 7 giorni' },
            { v: 'custom', label: 'Scegli date' },
          ] as const).map((o) => (
            <button
              key={o.v}
              onClick={() => setMode(o.v)}
              className={`min-h-[34px] flex-1 rounded-full px-2 text-xs font-medium tracking-wide transition ${
                mode === o.v ? 'bg-teal text-[#1a1012]' : 'bg-surface2 text-muted'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {mode === 'custom' && (
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="px-1 text-[11px] uppercase tracking-[0.12em] text-muted">Da</span>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="min-h-[42px] rounded-2xl bg-surface2 px-3 text-sm outline-none ring-1 ring-white/[0.05]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="px-1 text-[11px] uppercase tracking-[0.12em] text-muted">A</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="min-h-[42px] rounded-2xl bg-surface2 px-3 text-sm outline-none ring-1 ring-white/[0.05]"
              />
            </label>
          </div>
        )}
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs text-muted">
            {formatLong(parseKey(start))} – {formatLong(parseKey(end))}
          </span>
          {total > 0 && (
            <button onClick={copyList} className="text-xs text-teal">
              Copia
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {total === 0 ? (
          <p className="rounded-2xl bg-white/[0.04] p-4 text-center text-sm text-muted">
            Nessun pasto pianificato in questo periodo.
          </p>
        ) : (
          GROUP_ORDER.map((g) => {
            const xs = groups[g]
            if (!xs?.length) return null
            return (
              <div key={g}>
                <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  {g}
                </div>
                <div className="space-y-1.5">
                  {xs.map((x) => {
                    const on = checked.has(x.id)
                    return (
                      <button
                        key={x.id}
                        onClick={() => toggle(x.id)}
                        className="flex w-full items-center gap-3 rounded-2xl bg-surface2 px-3 py-2.5 text-left"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            on ? 'border-teal bg-teal text-[#1a1012]' : 'border-white/25 text-transparent'
                          }`}
                        >
                          <Icon.check size={13} />
                        </span>
                        <span className={`flex-1 text-sm ${on ? 'text-muted line-through' : 'text-ink'}`}>
                          {x.nome}
                        </span>
                        <span className={`font-mono text-xs tabular ${on ? 'text-muted' : 'text-teal'}`}>
                          {fmtQty(x.qty, x.unita)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Sheet>
  )
}

// ===== Database alimenti =====
const emptyFood: Omit<Food, 'id'> = {
  nome: '',
  p100: 0,
  c100: 0,
  g100: 0,
  k100: 0,
  categoria: 'Other',
  unita: 'g',
  qualita: 2,
}

function FoodDB({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addFood, updateFood, deleteFood, toggleFav } = useStore()
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState<Omit<Food, 'id'>>(emptyFood)
  const [editId, setEditId] = useState<string | null>(null)

  const list = state.foods.filter((f) => f.nome.toLowerCase().includes(q.toLowerCase()))

  function save() {
    if (!draft.nome.trim()) return
    if (editId) updateFood(editId, draft)
    else addFood(draft)
    setDraft(emptyFood)
    setEditId(null)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Database alimenti" flush>
      <div className="shrink-0">
      <Card className="mb-3 !bg-surface">
        <div className="space-y-2">
          <input
            value={draft.nome}
            onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
            placeholder="Nome alimento"
            className="min-h-[44px] w-full rounded-2xl bg-white/[0.06] px-3 font-semibold outline-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Prot/100">
              <NumberInput value={draft.p100} onChange={(v) => setDraft({ ...draft, p100: v })} />
            </Field>
            <Field label="Carb/100">
              <NumberInput value={draft.c100} onChange={(v) => setDraft({ ...draft, c100: v })} />
            </Field>
            <Field label="Gras/100">
              <NumberInput value={draft.g100} onChange={(v) => setDraft({ ...draft, g100: v })} />
            </Field>
          </div>
          <Field label="Kcal/100 (opzionale · auto dai macro se vuoto)">
            <NumberInput
              value={draft.k100 || ''}
              onChange={(v) => setDraft({ ...draft, k100: v })}
              suffix="kcal"
              placeholder={`auto: ${Math.round(foodKcal100({ ...draft, k100: 0 } as Food))}`}
            />
          </Field>
          <Field label="Categoria">
            <div className="flex flex-wrap gap-1.5">
              {FOOD_CATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft({ ...draft, categoria: c })}
                  className={`min-h-[36px] rounded-full px-3 text-xs font-medium tracking-wide transition ${
                    bucketOf(draft.categoria) === c ? 'bg-teal text-[#1a1012]' : 'bg-white/[0.06] text-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Unità">
            <Segmented<FoodUnit>
              options={[
                { value: 'g', label: 'g' },
                { value: 'ml', label: 'ml' },
              ]}
              value={draft.unita}
              onChange={(v) => setDraft({ ...draft, unita: v })}
            />
          </Field>
          <Field label={`Qualità: ${'★'.repeat(draft.qualita)}`}>
            <Segmented
              options={[
                { value: '1', label: '★' },
                { value: '2', label: '★★' },
                { value: '3', label: '★★★' },
              ]}
              value={String(draft.qualita)}
              onChange={(v) => setDraft({ ...draft, qualita: Number(v) })}
            />
          </Field>
          <Button className="w-full" onClick={save}>
            {editId ? 'Salva modifiche' : '+ Aggiungi al database'}
          </Button>
        </div>
      </Card>

      <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface px-4 ring-1 ring-white/[0.05] focus-within:ring-teal/30">
        <span className="text-muted">
          <Icon.search size={18} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca / filtra…"
          className="min-h-[44px] flex-1 bg-transparent outline-none"
        />
      </div>
      </div>

      {/* Solo questa lista scorre; il form sopra resta fisso */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {list.map((f) => (
          <div key={f.id} className="flex items-center gap-1 rounded-2xl bg-surface px-2 py-2">
            <button
              onClick={() => toggleFav(f.id)}
              className="flex h-9 w-9 items-center justify-center"
              aria-label="Preferito"
            >
              {f.preferito ? (
                <Icon.star size={18} className="text-teal" />
              ) : (
                <Icon.starOutline size={18} className="text-muted" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{f.nome}</div>
              <div className="font-mono text-[11px] text-muted tabular">
                {bucketOf(f.categoria)} · {Math.round(foodKcal100(f))}kcal · P{f.p100} C{f.c100} G{f.g100}
              </div>
            </div>
            <button
              onClick={() => {
                const { id: _id, ...rest } = f
                void _id
                setDraft({ ...rest, categoria: bucketOf(rest.categoria) })
                setEditId(f.id)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted"
              aria-label="Modifica"
            >
              <Icon.edit size={17} />
            </button>
            <button
              onClick={() => confirm(`Eliminare ${f.nome}?`) && deleteFood(f.id)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-red-300"
              aria-label="Elimina"
            >
              <Icon.trash size={17} />
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
