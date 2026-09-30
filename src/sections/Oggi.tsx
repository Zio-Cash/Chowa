import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useAuth } from '../auth/AuthProvider'
import { dateKey, formatLong, parseKey } from '../lib/date'
import { dayMacros, macroPct, macroRatioOk } from '../lib/nutrition'
import { BADGES, type BadgeState } from '../lib/gamification'
import { quoteOfDay } from '../lib/dojo'
import { currentCycle } from '../lib/cycle'
import type { ViewId } from '../types'
import { Button, Card, CardTitle, NumberInput } from '../components/ui'
import { Enso } from '../components/brand'
import { MacroDonut, Ring } from '../components/charts'
import { fmtSteps, fmtWater, WATER_STEP_ML } from '../lib/goals'
import { bmr } from '../lib/calories'

// Voci mostrate in "Rituali di oggi" (niente macro né perfetta).
const RITUALI: { id: string; label: string }[] = [
  { id: 'pesata', label: 'Weight check' },
  { id: 'calorie', label: 'Calorie deficit' },
  { id: 'workout', label: 'Training' },
  { id: 'acqua', label: 'Hydration' },
  { id: 'passi', label: 'Steps' },
]

export default function Oggi({ goTo }: { goTo: (v: ViewId) => void }) {
  const { state, getMeals, setWeight, setSteps, addWater, setActiveKcal, maybeAwardPerfect } =
    useStore()
  const { user } = useAuth()
  const firstName = (user?.displayName || '').trim().split(/\s+/)[0] || 'Praticante'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buongiorno'
    if (h < 18) return 'Buon pomeriggio'
    return 'Buonasera'
  })()
  const oggi = dateKey()
  const [today, setToday] = useState(oggi)
  const isToday = today === oggi
  const shiftDay = (delta: number) => {
    const d = parseKey(today)
    d.setDate(d.getDate() + delta)
    const key = dateKey(d)
    if (key <= oggi) setToday(key)
  }
  const meals = getMeals(today)
  const targets = state.settings.targets
  const consumed = useMemo(() => dayMacros(meals, state.foods, true), [meals, state.foods])
  const goals = state.settings.goals
  const acqua = state.waterLog[today] ?? 0
  const passiOggi = state.stepsLog[today] ?? 0

  const targetPct = macroPct(targets.proteine, targets.carboidrati, targets.grassi)
  const consumedPct = macroPct(consumed.proteine, consumed.carboidrati, consumed.grassi)

  const computeBadges = (date: string): BadgeState => {
    const dConsumed = dayMacros(getMeals(date), state.foods, true)
    return {
      pesata: date in state.weightLog,
      calorie: dConsumed.kcal >= goals.kcalMin && dConsumed.kcal <= targets.kcal,
      macro: macroRatioOk(dConsumed, targets),
      workout: (state.gamification.eventi[date] ?? []).some((e) => e.startsWith('workout:')),
      acqua: (state.waterLog[date] ?? 0) >= goals.waterTarget,
      passi: (state.stepsLog[date] ?? 0) >= goals.stepTarget,
    }
  }

  const badges: BadgeState = computeBadges(today)
  badges.perfetta = BADGES.filter((b) => b.id !== 'perfetta').every((b) => badges[b.id])

  useEffect(() => {
    if (badges.perfetta) maybeAwardPerfect(today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges.perfetta])

  const [peso, setPeso] = useState<number>(state.weightLog[today] ?? 0)
  const [passi, setPassi] = useState<number>(state.stepsLog[today] ?? 0)
  const [attive, setAttive] = useState<number>(state.activeKcalLog[today] ?? 0)

  useEffect(() => {
    setPeso(state.weightLog[today] ?? 0)
    setPassi(state.stepsLog[today] ?? 0)
    setAttive(state.activeKcalLog[today] ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  // ── Contenuto "dojo" derivato da dati esistenti ──
  // L'energia e la citazione riguardano sempre OGGI, non il giorno sfogliato,
  // per restare coerenti con lo streak (che è sempre quello corrente).
  const base = BADGES.filter((b) => b.id !== 'perfetta')
  const todayBadges = today === oggi ? badges : computeBadges(oggi)
  const praticheDone = base.filter((b) => todayBadges[b.id]).length
  const cycle = currentCycle(state.cycle, oggi)
  const quote = quoteOfDay(parseKey(oggi))

  // ── Bilancio / deficit calorico del giorno ──
  // assunte (dai pasti) − attive bruciate (smartwatch) − metabolismo basale.
  const profilo = state.settings.profilo
  const metabolismo = Math.round(bmr(profilo.sesso, profilo.peso, profilo.altezza, profilo.eta))
  const attiveOggi = state.activeKcalLog[today] ?? 0
  const assunte = Math.round(consumed.kcal)
  const bilancio = assunte - attiveOggi - metabolismo // < 0 = deficit

  return (
    <div className="space-y-5 pb-6">
      {/* Selettore giorno */}
      <div className="flex items-center justify-between rounded-2xl bg-surface px-2 py-1.5 ring-1 ring-white/[0.05]">
        <button
          onClick={() => shiftDay(-1)}
          className="h-9 w-9 rounded-full text-lg text-muted transition active:scale-90"
        >
          ‹
        </button>
        <button onClick={() => setToday(oggi)} className="font-display text-sm font-medium tracking-wide">
          {isToday ? 'Oggi' : formatLong(parseKey(today))}
        </button>
        <button
          onClick={() => shiftDay(1)}
          disabled={isToday}
          className="h-9 w-9 rounded-full text-lg text-muted transition active:scale-90 disabled:opacity-20"
        >
          ›
        </button>
      </div>

      {/* Ingresso — saluto + massima */}
      <div className="px-1 pt-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
              {greeting}
            </div>
            <h1 className="mt-1 font-display text-3xl tracking-tight">{firstName}</h1>
          </div>
          <Enso size={54} className="mt-1 shrink-0" />
        </div>
        <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap font-quote text-sm font-extralight italic leading-snug text-ink/80">
          {quote}
        </p>
      </div>

      {/* Streak + pratiche di oggi */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Streak
            </div>
            <div className="mt-1 font-display text-4xl tabular">{state.gamification.streak}</div>
            <div className="mt-0.5 text-xs text-muted">giorni consecutivi</div>
          </div>
          <Ring value={praticheDone} max={base.length} size={78} stroke={6} color="#f4f0e7">
            <span className="font-display text-2xl tabular text-teal">
              {praticheDone}
              <span className="text-sm text-muted">/{base.length}</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted">oggi</span>
          </Ring>
        </div>
      </Card>

      {/* Ciclo */}
      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Ciclo</span>
          <button onClick={() => goTo('cycle')} className="text-xs text-teal">
            {cycle ? 'Apri →' : 'Imposta →'}
          </button>
        </div>
        {cycle ? (
          <>
            <div className="mt-1.5 font-display text-lg tracking-tight">
              {cycle.phase.nome}{' '}
              <span className="text-base text-muted">· Giorno {cycle.day} di {cycle.length}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{cycle.phase.descrizione}</p>
          </>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Segna l'inizio del ciclo per vedere qui la tua fase.
          </p>
        )}
      </Card>

      {/* Nutrimento di oggi */}
      <Card>
        <CardTitle>Nutrimento di oggi</CardTitle>
        <div className="flex justify-center">
          <MacroDonut
            proteine={consumed.proteine}
            carboidrati={consumed.carboidrati}
            grassi={consumed.grassi}
            size={168}
          >
            <span className="font-mono text-2xl font-medium tabular">{Math.round(consumed.kcal)}</span>
            <span className="text-xs text-muted">/ {targets.kcal} kcal</span>
          </MacroDonut>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <MacroTile color="bg-prot" label="Proteine" c={consumed.proteine} t={targets.proteine} cp={consumedPct.p} tp={targetPct.p} />
          <MacroTile color="bg-carb" label="Carbo" c={consumed.carboidrati} t={targets.carboidrati} cp={consumedPct.c} tp={targetPct.c} />
          <MacroTile color="bg-fat" label="Grassi" c={consumed.grassi} t={targets.grassi} cp={consumedPct.g} tp={targetPct.g} />
        </div>
        <div className={`mt-3 rounded-2xl px-3 py-2 text-center font-mono text-xs tabular ${badges.macro ? 'bg-verde/10 text-verde' : 'bg-white/[0.04] text-muted'}`}>
          rapporto {consumedPct.p}/{consumedPct.c}/{consumedPct.g}% · obiettivo {targetPct.p}/{targetPct.c}/{targetPct.g}%
          {badges.macro && ' ·'}
        </div>
        <Button variant="soft" className="mt-4 w-full" onClick={() => goTo('dieta')}>
          Apri il diario
        </Button>
      </Card>

      {/* Deficit calorico + Energia spesa — sulla stessa riga */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardTitle>Deficit</CardTitle>
          <div
            className={`font-mono text-3xl tabular ${
              bilancio < 0 ? 'text-verde' : bilancio > 0 ? 'text-arancio' : 'text-ink'
            }`}
          >
            {bilancio > 0 ? '+' : bilancio < 0 ? '−' : ''}
            {Math.abs(bilancio)}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            kcal · {bilancio < 0 ? 'deficit' : bilancio > 0 ? 'surplus' : 'in pari'}
          </div>
        </Card>

        <Card>
          <CardTitle>Energia spesa</CardTitle>
          <NumberInput
            value={attive || ''}
            onChange={setAttive}
            suffix="kcal"
            className="w-full"
            placeholder="0"
          />
          <Button className="mt-2 w-full" onClick={() => setActiveKcal(today, attive)}>
            Registra
          </Button>
          {(state.activeKcalLog[today] ?? 0) > 0 && (
            <p className="mt-2 font-mono text-xs text-verde tabular">
              Oggi · {state.activeKcalLog[today]} kcal
            </p>
          )}
        </Card>
      </div>

      {/* Pesata */}
      <Card>
        <CardTitle>Pesata del mattino</CardTitle>
        <div className="flex items-center gap-2.5">
          <NumberInput value={peso || ''} onChange={setPeso} suffix="kg" className="flex-1" placeholder="0.0" />
          <Button onClick={() => peso > 0 && setWeight(today, peso)}>Registra</Button>
        </div>
        {today in state.weightLog && (
          <p className="mt-2.5 font-mono text-xs text-verde tabular">
            Oggi · {state.weightLog[today]} kg
          </p>
        )}
      </Card>

      {/* Idratazione */}
      <Card>
        <CardTitle>Idratazione</CardTitle>
        <div className="flex items-center gap-5">
          <Ring value={acqua} max={goals.waterTarget} size={110} stroke={11} color="#f4f0e7">
            <span className="font-mono text-base font-medium tabular">{fmtWater(acqua)}</span>
            <span className="text-[10px] text-muted">/ {fmtWater(goals.waterTarget)}</span>
          </Ring>
          <div className="flex flex-1 flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="soft" onClick={() => addWater(today, WATER_STEP_ML)}>
                + {WATER_STEP_ML} ml
              </Button>
              <Button variant="soft" onClick={() => addWater(today, 500)}>
                + 500 ml
              </Button>
            </div>
            {acqua > 0 && (
              <Button variant="ghost" className="!min-h-[38px]" onClick={() => addWater(today, -WATER_STEP_ML)}>
                − {WATER_STEP_ML} ml
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Movimento */}
      <Card>
        <CardTitle>Movimento di oggi</CardTitle>
        <div className="flex items-center gap-2.5">
          <NumberInput value={passi || ''} onChange={setPassi} suffix="passi" className="flex-1" placeholder="0" />
          <Button onClick={() => setSteps(today, passi)}>Registra</Button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-teal/80 transition-all duration-500"
            style={{
              width: `${goals.stepTarget > 0 ? Math.min(100, Math.round((passiOggi / goals.stepTarget) * 100)) : 0}%`,
            }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-muted tabular">
          {fmtSteps(passiOggi)} / {fmtSteps(goals.stepTarget)}
          {passiOggi >= goals.stepTarget && <span className="text-verde"> ·</span>}
        </p>
      </Card>

      {/* Rituali di oggi */}
      <Card>
        <CardTitle>Rituali di oggi</CardTitle>
        <div className="space-y-1">
          {RITUALI.map((r) => {
            const on = badges[r.id]
            return (
              <div key={r.id} className="flex items-center justify-between rounded-xl px-1 py-2">
                <span className={`text-sm tracking-wide transition ${on ? 'text-ink' : 'text-muted/70'}`}>
                  {r.label}
                </span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition ${
                    on ? 'bg-teal/15 text-teal ring-1 ring-teal/30' : 'bg-white/[0.04] text-transparent'
                  }`}
                >
                  ✓
                </span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function MacroTile({
  color,
  label,
  c,
  t,
  cp,
  tp,
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
