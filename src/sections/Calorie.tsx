import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import {
  ACTIVITY_LABEL,
  computeTargets,
  GOAL_LABEL,
  kcalFromMacros,
  SEX_LABEL,
} from '../lib/calories'
import type { Activity, CalorieProfile, Goal, Sex } from '../types'
import { Button, Card, CardTitle, Field, NumberInput, Segmented, Stepper } from '../components/ui'
import { MacroDonut } from '../components/charts'
import { Icon } from '../components/brand'
import { macroPct } from '../lib/nutrition'
import { weightTrend } from '../lib/weight'
import { dateKey } from '../lib/date'
import type { AppState, Targets } from '../types'

const sexOpts = (Object.keys(SEX_LABEL) as Sex[]).map((v) => ({ value: v, label: SEX_LABEL[v] }))
const actOpts = (Object.keys(ACTIVITY_LABEL) as Activity[]).map((v) => ({
  value: v,
  label: ACTIVITY_LABEL[v],
}))
const goalOpts = (Object.keys(GOAL_LABEL) as Goal[]).map((v) => ({ value: v, label: GOAL_LABEL[v] }))

interface Macros {
  proteine: number
  carboidrati: number
  grassi: number
}

export default function Calorie() {
  const { state, setProfile, setTargets, setGoals } = useStore()
  const goals = state.settings.goals
  const [profilo, setProfiloLocal] = useState<CalorieProfile>(state.settings.profilo)
  const calc = useMemo(() => computeTargets(profilo), [profilo])
  const [macros, setMacros] = useState<Macros>({
    proteine: calc.proteine,
    carboidrati: calc.carboidrati,
    grassi: calc.grassi,
  })

  // Modifica profilo: aggiorna anche i macro dalla formula.
  function patch(p: Partial<CalorieProfile>) {
    const next = { ...profilo, ...p }
    setProfiloLocal(next)
    const c = computeTargets(next)
    setMacros({ proteine: c.proteine, carboidrati: c.carboidrati, grassi: c.grassi })
  }

  const kcal = kcalFromMacros(macros)
  const pct = macroPct(macros.proteine, macros.carboidrati, macros.grassi)

  function ricalcola() {
    setMacros({ proteine: calc.proteine, carboidrati: calc.carboidrati, grassi: calc.grassi })
  }
  function imposta() {
    setProfile(profilo)
    setTargets({ kcal, proteine: macros.proteine, carboidrati: macros.carboidrati, grassi: macros.grassi })
    alert('Targets updated')
  }

  return (
    <div className="space-y-4 pb-4">
      <AdaptiveCard state={state} onApply={setTargets} />

      <Card>
        <CardTitle>Daily needs calculator</CardTitle>
        <p className="-mt-2 mb-3 text-xs text-muted">Revised Harris-Benedict (Roza–Shizgal)</p>
        <div className="space-y-3">
          <Field label="Sex">
            <Segmented options={sexOpts} value={profilo.sesso} onChange={(v) => patch({ sesso: v })} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Weight kg">
              <NumberInput value={profilo.peso} onChange={(v) => patch({ peso: v })} />
            </Field>
            <Field label="Height cm">
              <NumberInput value={profilo.altezza} onChange={(v) => patch({ altezza: v })} />
            </Field>
            <Field label="Age">
              <NumberInput value={profilo.eta} onChange={(v) => patch({ eta: v })} />
            </Field>
          </div>
          <Field label="Activity level">
            <Segmented options={actOpts} value={profilo.attivita} onChange={(v) => patch({ attivita: v })} />
          </Field>
          <Field label="Goal">
            <Segmented options={goalOpts} value={profilo.obiettivo} onChange={(v) => patch({ obiettivo: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Protein g/kg">
              <NumberInput value={profilo.protGkg} onChange={(v) => patch({ protGkg: v })} />
            </Field>
            <Field label="Fat g/kg">
              <NumberInput value={profilo.grassiGkg} onChange={(v) => patch({ grassiGkg: v })} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="BMR" value={calc.bmr} />
          <Stat label="TDEE" value={calc.tdee} />
          <Stat label="Kcal" value={kcal} highlight />
        </div>

        <div className="flex justify-center">
          <MacroDonut proteine={macros.proteine} carboidrati={macros.carboidrati} grassi={macros.grassi} size={180}>
            <span className="font-mono text-3xl font-bold tabular">{kcal}</span>
            <span className="text-xs text-muted">kcal</span>
          </MacroDonut>
        </div>

        <div className="mt-4 space-y-2">
          <MacroRow
            color="bg-prot"
            label="Protein"
            grams={macros.proteine}
            kcal={macros.proteine * 4}
            pct={pct.p}
            onChange={(proteine) => setMacros((m) => ({ ...m, proteine }))}
          />
          <MacroRow
            color="bg-carb"
            label="Carbs"
            grams={macros.carboidrati}
            kcal={macros.carboidrati * 4}
            pct={pct.c}
            onChange={(carboidrati) => setMacros((m) => ({ ...m, carboidrati }))}
          />
          <MacroRow
            color="bg-fat"
            label="Fat"
            grams={macros.grassi}
            kcal={macros.grassi * 9}
            pct={pct.g}
            onChange={(grassi) => setMacros((m) => ({ ...m, grassi }))}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={ricalcola}>
            ↺ Recalculate
          </Button>
          <Button onClick={imposta}>✓ Set targets</Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Daily goals</CardTitle>
        <p className="-mt-2 mb-3 text-xs text-muted">Used for milestones and the perfect day</p>
        <div className="space-y-2">
          <GoalRow
            color="bg-magenta"
            icon="steps"
            label="Steps"
            value={goals.stepTarget}
            step={500}
            min={500}
            suffix=""
            onChange={(stepTarget) => setGoals({ ...goals, stepTarget })}
          />
          <GoalRow
            color="bg-teal"
            icon="drop"
            label="Water"
            value={goals.waterTarget}
            step={250}
            min={250}
            suffix="ml"
            onChange={(waterTarget) => setGoals({ ...goals, waterTarget })}
          />
          <GoalRow
            color="bg-arancio"
            icon="flame"
            label="Minimum kcal"
            value={goals.kcalMin}
            step={50}
            suffix="kcal"
            onChange={(kcalMin) => setGoals({ ...goals, kcalMin })}
          />
        </div>
        <p className="mt-3 rounded-2xl bg-black/[0.05] px-3 py-2 text-xs text-muted">
          Calorie milestone: between <b>{goals.kcalMin}</b> and <b>{state.settings.targets.kcal}</b> kcal
          (the maximum comes from your daily needs).
        </p>
      </Card>
    </div>
  )
}

function GoalRow({
  color,
  icon,
  label,
  value,
  step,
  suffix,
  onChange,
  min,
}: {
  color: string
  icon: keyof typeof Icon
  label: string
  value: number
  step: number
  suffix: string
  onChange: (v: number) => void
  min?: number
}) {
  const Ico = Icon[icon]
  return (
    <div className="flex items-center justify-between rounded-2xl bg-black/[0.05] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${color} text-[#faf7f1]`}>
          <Ico size={16} />
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <Stepper value={value} onChange={onChange} step={step} suffix={suffix} min={min} />
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${highlight ? 'bg-teal text-[#faf7f1]' : 'bg-black/[0.06]'}`}>
      <div className="text-xs font-semibold uppercase opacity-70">{label}</div>
      <div className="font-mono text-xl font-bold tabular">{value}</div>
    </div>
  )
}

function MacroRow({
  color,
  label,
  grams,
  kcal,
  pct,
  onChange,
}: {
  color: string
  label: string
  grams: number
  kcal: number
  pct: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="font-mono text-xs text-muted tabular">
            {Math.round(kcal)} kcal · <span className="text-ink">{pct}%</span>
          </div>
        </div>
      </div>
      <Stepper value={grams} onChange={onChange} step={5} suffix="g" />
    </div>
  )
}

function AdaptiveCard({ state, onApply }: { state: AppState; onApply: (t: Targets) => void }) {
  const targets = state.settings.targets
  const goals = state.settings.goals
  const pesi = Object.entries(state.weightLog)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
  const current = pesi[pesi.length - 1]
  const trend = weightTrend(state.weightLog, dateKey(), 21)
  if (!trend || !current) return null

  const vuoleDimagrire = (goals.pesoTarget ?? 0) > 0 ? goals.pesoTarget! < current : true
  const s = trend.slopePerWeek
  let delta = 0
  let msg = ''
  if (vuoleDimagrire && s >= -0.05) {
    delta = -150
    msg = `Your weight has barely moved (${s > 0 ? '+' : ''}${s.toFixed(2)} kg/wk) over the last few weeks. To get going again, you can cut about 150 kcal a day.`
  } else if (s <= -0.9) {
    delta = 150
    msg = `You’re losing weight fast (${s.toFixed(2)} kg/wk): better add about 150 kcal to protect muscle mass and metabolism.`
  } else {
    msg = `Your pace is good (${s < 0 ? '' : '+'}${s.toFixed(2)} kg/wk): keep your current calories.`
  }

  const nuove: Targets = {
    ...targets,
    kcal: Math.max(1000, targets.kcal + delta),
    carboidrati: Math.max(0, targets.carboidrati + Math.round(delta / 4)),
  }

  return (
    <Card>
      <CardTitle>Adaptive calories</CardTitle>
      <p className="-mt-2 text-sm leading-relaxed text-ink/85">{msg}</p>
      {delta !== 0 && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-black/[0.04] px-3 py-2 text-sm">
          <span className="text-muted">
            {targets.kcal} → <b className="text-ink">{nuove.kcal}</b> kcal
          </span>
          <Button onClick={() => onApply(nuove)}>
            Apply {delta > 0 ? '+' : ''}
            {delta}
          </Button>
        </div>
      )}
    </Card>
  )
}
