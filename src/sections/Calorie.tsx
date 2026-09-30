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
import { macroPct } from '../lib/nutrition'

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
    alert('Obiettivi impostati')
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardTitle>Calcolatore fabbisogno</CardTitle>
        <p className="-mt-2 mb-3 text-xs text-muted">Harris-Benedict riveduta (Roza–Shizgal)</p>
        <div className="space-y-3">
          <Field label="Sesso">
            <Segmented options={sexOpts} value={profilo.sesso} onChange={(v) => patch({ sesso: v })} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Peso kg">
              <NumberInput value={profilo.peso} onChange={(v) => patch({ peso: v })} />
            </Field>
            <Field label="Altezza cm">
              <NumberInput value={profilo.altezza} onChange={(v) => patch({ altezza: v })} />
            </Field>
            <Field label="Età">
              <NumberInput value={profilo.eta} onChange={(v) => patch({ eta: v })} />
            </Field>
          </div>
          <Field label="Livello attività">
            <Segmented options={actOpts} value={profilo.attivita} onChange={(v) => patch({ attivita: v })} />
          </Field>
          <Field label="Obiettivo">
            <Segmented options={goalOpts} value={profilo.obiettivo} onChange={(v) => patch({ obiettivo: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Proteine g/kg">
              <NumberInput value={profilo.protGkg} onChange={(v) => patch({ protGkg: v })} />
            </Field>
            <Field label="Grassi g/kg">
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
            label="Proteine"
            grams={macros.proteine}
            kcal={macros.proteine * 4}
            pct={pct.p}
            onChange={(proteine) => setMacros((m) => ({ ...m, proteine }))}
          />
          <MacroRow
            color="bg-carb"
            label="Carboidrati"
            grams={macros.carboidrati}
            kcal={macros.carboidrati * 4}
            pct={pct.c}
            onChange={(carboidrati) => setMacros((m) => ({ ...m, carboidrati }))}
          />
          <MacroRow
            color="bg-fat"
            label="Grassi"
            grams={macros.grassi}
            kcal={macros.grassi * 9}
            pct={pct.g}
            onChange={(grassi) => setMacros((m) => ({ ...m, grassi }))}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={ricalcola}>
            ↺ Ricalcola
          </Button>
          <Button onClick={imposta}>✓ Imposta obiettivi</Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Obiettivi giornalieri</CardTitle>
        <p className="-mt-2 mb-3 text-xs text-muted">Usati per i traguardi e la giornata perfetta</p>
        <div className="space-y-2">
          <GoalRow
            color="bg-magenta"
            icon="👟"
            label="Passi"
            value={goals.stepTarget}
            step={500}
            suffix=""
            onChange={(stepTarget) => setGoals({ ...goals, stepTarget })}
          />
          <GoalRow
            color="bg-teal"
            icon="💧"
            label="Acqua"
            value={goals.waterTarget}
            step={250}
            suffix="ml"
            onChange={(waterTarget) => setGoals({ ...goals, waterTarget })}
          />
          <GoalRow
            color="bg-arancio"
            icon="🔥"
            label="Kcal minime"
            value={goals.kcalMin}
            step={50}
            suffix="kcal"
            onChange={(kcalMin) => setGoals({ ...goals, kcalMin })}
          />
        </div>
        <p className="mt-3 rounded-2xl bg-white/[0.05] px-3 py-2 text-xs text-muted">
          Traguardo calorie: tra <b>{goals.kcalMin}</b> e <b>{state.settings.targets.kcal}</b> kcal
          (massimo dal fabbisogno).
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
}: {
  color: string
  icon: string
  label: string
  value: number
  step: number
  suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${color} text-[#141210]`}>
          {icon}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <Stepper value={value} onChange={onChange} step={step} suffix={suffix} />
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${highlight ? 'bg-teal text-[#141210]' : 'bg-white/[0.06]'}`}>
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
    <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2">
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
