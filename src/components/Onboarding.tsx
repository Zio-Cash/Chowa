import { useState, type ReactNode } from 'react'
import { useStore } from '../store/store'
import { useAuth } from '../auth/AuthProvider'
import { ACTIVITY_LABEL, computeTargets, GOAL_LABEL, SEX_LABEL } from '../lib/calories'
import { dateKey } from '../lib/date'
import type { Activity, CalorieProfile, Goal, Sex } from '../types'
import { Button, Field, NumberInput, Segmented } from './ui'

const DONE_KEY = 'chowa:onboarded'

function alreadyDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return true
  }
}

const options = <K extends string>(r: Record<K, string>) =>
  (Object.keys(r) as K[]).map((value) => ({ value, label: r[value] }))

/**
 * Primo avvio: tre passi per avere obiettivi veri invece di numeri di default.
 * Compare solo a chi non ha ancora dati (nessuna pesata e nessuna routine).
 */
export function Onboarding() {
  const { state, setAccount, setProfile, setTargets, setWeight, logCycleStart, readOnly } = useStore()
  const { user } = useAuth()
  const isNew = Object.keys(state.weightLog).length === 0 && state.executionPlan.length === 0
  const [open, setOpen] = useState(() => !alreadyDone() && isNew)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(state.account.nome || (user?.displayName ?? '').split(/\s+/)[0] || '')
  // Si parte da "Maintain": è la scelta più prudente finché non si sa altro.
  const [p, setP] = useState<CalorieProfile>(() => ({ ...state.settings.profilo, obiettivo: 'manten' }))
  const [period, setPeriod] = useState('')

  if (!open || readOnly) return null

  const set = (patch: Partial<CalorieProfile>) => setP((x) => ({ ...x, ...patch }))
  const calc = computeTargets(p)
  const steps = p.sesso === 'donna' ? 4 : 3
  const last = step === steps - 1
  const valid = step !== 1 || (p.eta > 0 && p.altezza > 0 && p.peso > 0)

  const finish = () => {
    if (name.trim()) setAccount({ nome: name.trim() })
    setProfile(p)
    setTargets({ kcal: calc.kcal, proteine: calc.proteine, carboidrati: calc.carboidrati, grassi: calc.grassi })
    setWeight(dateKey(), p.peso)
    if (period) logCycleStart(period)
    close()
  }
  const close = () => {
    try {
      localStorage.setItem(DONE_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[55] flex justify-center overflow-y-auto bg-bg">
      <div
        className="flex min-h-dvh w-full max-w-[480px] flex-col px-6"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps}`}>
            {Array.from({ length: steps }, (_, i) => (
              <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? 'bg-teal' : 'bg-black/10'}`} />
            ))}
          </div>
          <button onClick={close} className="min-h-[44px] px-2 text-sm text-ink/70">
            Skip
          </button>
        </div>

        <div key={step} className="animate-fade-up mt-10 flex-1 space-y-5">
          {step === 0 && (
            <>
              <Title eyebrow="Welcome to Chōwa" title="Let’s set up your targets" body="Three quick questions, so your calories and macros fit you instead of a default." />
              <Field label="Your name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name"
                  className="min-h-[48px] rounded-2xl bg-black/[0.05] px-4 text-base outline-none ring-1 ring-black/[0.04] focus:ring-teal/30"
                />
              </Field>
              <Group label="Sex (for the BMR formula)">
                <Segmented<Sex> value={p.sesso} onChange={(sesso) => set({ sesso })} options={options(SEX_LABEL)} />
              </Group>
            </>
          )}

          {step === 1 && (
            <>
              <Title eyebrow="Step 2" title="About you" body="Used only to estimate how much energy you burn." />
              <Field label="Age">
                <NumberInput value={p.eta || ''} onChange={(eta) => set({ eta: Math.round(eta) })} suffix="years" />
              </Field>
              <Field label="Height">
                <NumberInput value={p.altezza || ''} onChange={(altezza) => set({ altezza })} suffix="cm" />
              </Field>
              <Field label="Weight today">
                <NumberInput value={p.peso || ''} onChange={(peso) => set({ peso })} suffix="kg" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Title eyebrow="Step 3" title="Your goal" body="You can change this any time in Profile → Balance." />
              <Group label="Goal">
                <Segmented<Goal> value={p.obiettivo} onChange={(obiettivo) => set({ obiettivo })} options={options(GOAL_LABEL)} />
              </Group>
              <Group label="Activity level">
                <Segmented<Activity> value={p.attivita} onChange={(attivita) => set({ attivita })} options={options(ACTIVITY_LABEL)} />
              </Group>
              <div className="rounded-[var(--radius-card)] bg-surface2 p-5 ring-1 ring-black/[0.04]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Your daily target</div>
                <div className="mt-1 font-display text-4xl tabular">
                  {calc.kcal} <span className="text-base text-ink/70">kcal</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Macro label="Protein" g={calc.proteine} color="bg-prot" />
                  <Macro label="Carbs" g={calc.carboidrati} color="bg-carb" />
                  <Macro label="Fat" g={calc.grassi} color="bg-fat" />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Title
                eyebrow="Optional"
                title="Your cycle"
                body="Add the first day of your last period and Chōwa adapts training tips to your phase. You can skip this."
              />
              <Field label="First day of last period">
                <input
                  type="date"
                  value={period}
                  max={dateKey()}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="min-h-[48px] rounded-2xl bg-black/[0.05] px-4 text-base outline-none ring-1 ring-black/[0.04]"
                />
              </Field>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-[auto_1fr] gap-3">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            Back
          </Button>
          <Button onClick={() => (last ? finish() : setStep((s) => s + 1))} disabled={!valid}>
            {last ? 'Start' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Come Field, ma senza <label>: un gruppo di pulsanti non va dentro un'etichetta. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </div>
  )
}

function Title({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/70">{eyebrow}</div>
      <h1 className="mt-2 font-display text-3xl leading-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink/75">{body}</p>
    </div>
  )
}

function Macro({ label, g, color }: { label: string; g: number; color: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.04] py-2.5">
      <div className="flex items-center justify-center gap-1.5 text-xs text-ink/80">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </div>
      <div className="mt-0.5 font-mono text-base font-semibold tabular">{g} g</div>
    </div>
  )
}
