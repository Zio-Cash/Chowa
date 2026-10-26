import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useAuth } from '../auth/AuthProvider'
import { dateKey, formatLong, MESI_BREVI, parseKey } from '../lib/date'
import { dayMacros, macroPct, macroRatioOk } from '../lib/nutrition'
import { BADGES, type BadgeState } from '../lib/gamification'
import { quoteOfDay } from '../lib/dojo'
import { currentCycle, prediction } from '../lib/cycle'
import type { ViewId } from '../types'
import { Button, Card, CardTitle, NumberInput } from '../components/ui'
import { Icon } from '../components/brand'
import { MlwCard } from '../components/MoveLearnWork'
import { MacroDonut } from '../components/charts'
import { fmtSteps, fmtWater, WATER_STEP_ML } from '../lib/goals'
import { bmr } from '../lib/calories'

const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Songti SC", serif'

// "Risultati di oggi": quattro obiettivi, in orizzontale.
const RISULTATI: { id: string; label: string; icon: keyof typeof Icon }[] = [
  { id: 'pesata', label: 'Weight check', icon: 'weight' },
  { id: 'calorie', label: 'Deficit', icon: 'flame' },
  { id: 'acqua', label: 'Hydration', icon: 'drop' },
  { id: 'passi', label: 'Steps', icon: 'steps' },
]

export default function Oggi({ goTo }: { goTo: (v: ViewId) => void }) {
  const { state, getMeals, setWeight, setSteps, addWater, setActiveKcal, maybeAwardPerfect } =
    useStore()
  const { user } = useAuth()
  const firstName =
    state.account.nome?.trim().split(/\s+/)[0] || (user?.displayName || '').trim().split(/\s+/)[0] || 'Praticante'
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

  // ── Bilancio / deficit calorico ──
  // assunte (dai pasti) − attive bruciate (smartwatch) − metabolismo basale. < 0 = deficit.
  const profilo = state.settings.profilo
  const metabolismo = Math.round(bmr(profilo.sesso, profilo.peso, profilo.altezza, profilo.eta))
  const bilancioDi = (date: string) => {
    const assunte = Math.round(dayMacros(getMeals(date), state.foods, true).kcal)
    return { assunte, bilancio: assunte - (state.activeKcalLog[date] ?? 0) - metabolismo }
  }
  const { bilancio } = bilancioDi(today)

  const computeBadges = (date: string): BadgeState => {
    const dConsumed = dayMacros(getMeals(date), state.foods, true)
    const b = bilancioDi(date)
    return {
      pesata: date in state.weightLog,
      // deficit raggiunto = pasti registrati e bilancio sotto zero (in surplus non vale)
      calorie: b.assunte > 0 && b.bilancio < 0,
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

  const cycle = currentCycle(state.cycle, oggi)
  const pred = prediction(state.cycle, oggi)
  const quote = quoteOfDay(parseKey(oggi))
  const fmtGiorno = (k: string) => {
    const d = parseKey(k)
    return `${d.getDate()} ${MESI_BREVI[d.getMonth()].toLowerCase()}`
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Giorno — minimale */}
      <div className="flex items-center justify-center gap-3 text-muted">
        <button onClick={() => shiftDay(-1)} aria-label="Giorno precedente" className="px-2 text-lg transition active:scale-90">
          ‹
        </button>
        <button onClick={() => setToday(oggi)} className="min-w-[96px] text-[11px] font-medium uppercase tracking-[0.22em]">
          {isToday ? 'Oggi' : formatLong(parseKey(today))}
        </button>
        <button
          onClick={() => shiftDay(1)}
          disabled={isToday}
          aria-label="Giorno successivo"
          className="px-2 text-lg transition active:scale-90 disabled:opacity-20"
        >
          ›
        </button>
      </div>

      {/* Saluto + frase del giorno, 調和 a destra */}
      <div className="flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-tight tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1.5 font-quote text-sm font-extralight italic leading-snug text-ink/75">{quote}</p>
        </div>
        <span
          className="shrink-0 text-[22px] leading-none tracking-[0.15em] text-ink/80"
          style={{ fontFamily: MINCHO, writingMode: 'vertical-rl' }}
          aria-hidden
        >
          調和
        </span>
      </div>

      {/* Streak */}
      <Card>
        <div className="flex items-baseline gap-3">
          <span className="font-display text-4xl tabular">{state.gamification.streak}</span>
          <span className="text-sm text-muted">
            {state.gamification.streak === 1 ? 'giorno consecutivo' : 'giorni consecutivi'}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Streak</div>
      </Card>

      <MlwCard />

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
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="font-display text-xl tracking-tight">{cycle.phase.nome}</span>
              <span className="font-mono text-xs text-muted tabular">Giorno {cycle.day}</span>
            </div>
            {pred && (
              <div className="mt-1 text-sm text-muted">
                Prossima mestruazione:{' '}
                <span className="text-ink">
                  {fmtGiorno(pred.nextStart)}
                  {pred.daysToNext > 0
                    ? ` · tra ${pred.daysToNext} ${pred.daysToNext === 1 ? 'giorno' : 'giorni'}`
                    : pred.daysToNext === 0
                      ? ' · oggi'
                      : ` · in ritardo di ${-pred.daysToNext}`}
                </span>
              </div>
            )}
            <p className="mt-3 border-l-2 border-teal/50 pl-3 text-sm leading-relaxed text-ink/85">
              <span className="font-medium">Allenamento di oggi:</span> {cycle.phase.consiglio}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">Segna l'inizio del ciclo per vedere qui la tua fase.</p>
        )}
      </Card>

      {/* Weight check */}
      <Card>
        <CardTitle>Weight check</CardTitle>
        <div className="flex items-center gap-2.5">
          <NumberInput value={peso || ''} onChange={setPeso} suffix="kg" className="flex-1" placeholder="0.0" />
          <Button onClick={() => peso > 0 && setWeight(today, peso)}>Registra</Button>
        </div>
        {today in state.weightLog && (
          <p className="mt-2.5 font-mono text-xs text-verde tabular">Oggi · {state.weightLog[today]} kg</p>
        )}
      </Card>

      {/* Meal */}
      <Card>
        <CardTitle>Meal</CardTitle>
        <div className="flex justify-center">
          <MacroDonut proteine={consumed.proteine} carboidrati={consumed.carboidrati} grassi={consumed.grassi} size={168}>
            <span className="font-mono text-2xl font-medium tabular">{Math.round(consumed.kcal)}</span>
            <span className="text-xs text-muted">/ {targets.kcal} kcal</span>
          </MacroDonut>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <MacroTile color="bg-prot" label="Proteine" c={consumed.proteine} t={targets.proteine} cp={consumedPct.p} tp={targetPct.p} />
          <MacroTile color="bg-carb" label="Carbo" c={consumed.carboidrati} t={targets.carboidrati} cp={consumedPct.c} tp={targetPct.c} />
          <MacroTile color="bg-fat" label="Grassi" c={consumed.grassi} t={targets.grassi} cp={consumedPct.g} tp={targetPct.g} />
        </div>
        <div className={`mt-3 rounded-2xl px-3 py-2 text-center font-mono text-xs tabular ${badges.macro ? 'bg-verde/10 text-verde' : 'bg-black/[0.04] text-muted'}`}>
          rapporto {consumedPct.p}/{consumedPct.c}/{consumedPct.g}% · obiettivo {targetPct.p}/{targetPct.c}/{targetPct.g}%
        </div>
        <Button variant="soft" className="mt-4 w-full" onClick={() => goTo('dieta')}>
          Apri il diario
        </Button>
      </Card>

      {/* Deficit + Energia spesa */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardTitle>Deficit</CardTitle>
          <div className={`font-mono text-3xl tabular ${bilancio < 0 ? 'text-verde' : bilancio > 0 ? 'text-arancio' : 'text-ink'}`}>
            {bilancio > 0 ? '+' : bilancio < 0 ? '−' : ''}
            {Math.abs(bilancio)}
          </div>
          <div className="mt-0.5 text-xs text-muted">kcal · {bilancio < 0 ? 'deficit' : bilancio > 0 ? 'surplus' : 'in pari'}</div>
        </Card>
        <Card>
          <CardTitle>Energia spesa</CardTitle>
          <NumberInput value={attive || ''} onChange={setAttive} suffix="kcal" className="w-full" placeholder="0" />
          <Button className="mt-2 w-full" onClick={() => setActiveKcal(today, attive)}>
            Registra
          </Button>
          {(state.activeKcalLog[today] ?? 0) > 0 && (
            <p className="mt-2 font-mono text-xs text-verde tabular">Oggi · {state.activeKcalLog[today]} kcal</p>
          )}
        </Card>
      </div>

      {/* Hydration + Steps, affiancate */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="!p-4">
          <CardTitle>Hydration</CardTitle>
          <div className="mt-2 font-mono text-2xl tabular">{fmtWater(acqua)}</div>
          <div className="text-[11px] text-muted">/ {fmtWater(goals.waterTarget)}</div>
          <Progress value={acqua} max={goals.waterTarget} />
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <SmallBtn onClick={() => addWater(today, WATER_STEP_ML)}>+{WATER_STEP_ML}</SmallBtn>
            <SmallBtn onClick={() => addWater(today, 500)}>+500</SmallBtn>
          </div>
          {acqua > 0 && (
            <button onClick={() => addWater(today, -WATER_STEP_ML)} className="mt-2 w-full text-center text-[11px] text-muted">
              − {WATER_STEP_ML} ml
            </button>
          )}
        </Card>
        <Card className="!p-4">
          <CardTitle>Steps</CardTitle>
          <div className="mt-2 font-mono text-2xl tabular">{fmtSteps(passiOggi)}</div>
          <div className="text-[11px] text-muted">/ {fmtSteps(goals.stepTarget)}</div>
          <Progress value={passiOggi} max={goals.stepTarget} />
          <NumberInput value={passi || ''} onChange={setPassi} className="mt-3 w-full !px-3" placeholder="passi" />
          <SmallBtn className="mt-1.5 w-full" onClick={() => setSteps(today, passi)}>
            Registra
          </SmallBtn>
        </Card>
      </div>

      {/* Risultati di oggi — in orizzontale */}
      <Card>
        <CardTitle>Risultati di oggi</CardTitle>
        <div className="grid grid-cols-4 gap-2">
          {RISULTATI.map((r) => {
            const on = badges[r.id]
            const Ico = Icon[r.icon]
            return (
              <div key={r.id} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                    on ? 'bg-teal text-[#faf7f1]' : 'bg-black/[0.045] text-muted/50'
                  }`}
                >
                  <Ico size={19} />
                </span>
                <span className={`text-[11px] leading-tight ${on ? 'text-ink' : 'text-muted'}`}>{r.label}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
      <div className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-verde' : 'bg-teal'}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function SmallBtn({ children, onClick, className = '' }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[36px] rounded-xl bg-teal/[0.1] px-2 text-xs font-medium text-teal transition active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
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
    <div className="rounded-2xl bg-black/[0.04] p-3">
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
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
