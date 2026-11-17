import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { dateKey, formatLong, parseKey } from '../lib/date'
import { mmss } from '../lib/sound'
import { restTimer, useRestTimer } from '../lib/restTimer'
import type { ExExercise } from '../types'
import { Button, Card, CardTitle, NumberInput, Segmented } from '../components/ui'
import { Icon } from '../components/brand'
import Esercizi from './Esercizi'
import Routine from './Routine'
import { useDayCursor } from '../lib/useToday'

/** Riferimento "ultima volta" per un esercizio. */
interface LastRef {
  carico?: number
  done: number
  date: string
}

type TrainingTab = 'train' | 'routine' | 'catalog'

export default function Workout() {
  const [tab, setTab] = useState<TrainingTab>('train')
  return (
    <div className="space-y-4 pb-6">
      <Segmented
        options={[
          { value: 'train', label: 'Workout' },
          { value: 'routine', label: 'Routine' },
          { value: 'catalog', label: 'Exercises' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TrainingTab)}
      />
      {tab === 'train' && (
        <>
          <Execution />
          <PRCard />
        </>
      )}
      {tab === 'routine' && <Routine />}
      {tab === 'catalog' && <Esercizi />}
      <RestTimerBar />
    </div>
  )
}

// Timer di recupero — sopra la tab bar, visibile su tutte le sotto-schede
function RestTimerBar() {
  const timer = useRestTimer()
  if (!timer) return null
  const p = timer.total ? Math.min(1, timer.sec / timer.total) : 0
  return (
    <>
      {/* spazio in fondo: il timer non copre gli ultimi esercizi */}
      <div className="h-24" aria-hidden />
      <div
        className="sheet-in fixed inset-x-0 z-50 mx-auto max-w-[480px] px-3"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 74px)' }}
      >
        <div className="glass rounded-3xl bg-surface2/90 p-4 shadow-2xl ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[11px] uppercase tracking-[0.16em] text-muted">{timer.label}</div>
              <div className="font-mono text-3xl tabular">{mmss(timer.sec)}</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <TBtn label="Remove 15 seconds" onClick={() => restTimer.add(-15)}>
                −15
              </TBtn>
              <TBtn label="Add 15 seconds" onClick={() => restTimer.add(15)}>
                +15
              </TBtn>
              <TBtn label={timer.running ? 'Pause' : 'Resume'} onClick={restTimer.toggle}>
                {timer.running ? <Icon.pause size={16} /> : <Icon.play size={16} />}
              </TBtn>
              <TBtn label="Close timer" onClick={restTimer.stop}>
                <Icon.close size={16} />
              </TBtn>
            </div>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.08]">
            <div
              className="h-full w-full origin-left rounded-full bg-teal transition-transform duration-300 ease-linear"
              style={{ transform: `scaleX(${p})` }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

// ===== Esecuzione =====

function Execution() {
  const { state, getSession, toggleSet, setSessionLoad, completeWorkout, resetSession } = useStore()
  const [today, setToday, oggi] = useDayCursor()
  const isToday = today === oggi
  const shiftDay = (delta: number) => {
    const d = parseKey(today)
    d.setDate(d.getDate() + delta)
    const key = dateKey(d)
    if (key <= oggi) setToday(key)
  }
  const plan = state.executionPlan
  const sessionRaw = getSession(today)
  // Giornata mostrata: quella scelta, altrimenti quella già iniziata in quella data.
  const [picked, setPicked] = useState<{ date: string; id: string } | null>(null)
  const dayId = picked?.date === today ? picked.id : (sessionRaw?.dayId ?? plan[0]?.id ?? '')
  const setDayId = (id: string) => setPicked({ date: today, id })
  const day = plan.find((d) => d.id === dayId) ?? plan[0]
  const session = sessionRaw && sessionRaw.dayId === day?.id ? sessionRaw : undefined
  // In una data c'è una sola sessione: prima di iniziarne un'altra si chiede.
  const otherStarted =
    sessionRaw &&
    day &&
    sessionRaw.dayId !== day.id &&
    Object.values(sessionRaw.esercizi).some((e) => e.sets.some(Boolean) || e.carico != null)
  const canWrite = () =>
    !otherStarted ||
    confirm(
      `You already logged sets for "${plan.find((d) => d.id === sessionRaw?.dayId)?.nome ?? 'another day'}" on this date. Replace them with "${day?.nome}"?`,
    )

  const startTimer = restTimer.start

  // Riferimento "ultima volta": ultima sessione precedente per lo stesso giorno.
  const lastByEx = useMemo(() => {
    const entries = Object.values(state.workoutProgress)
      .filter((s) => s.dayId === (day?.id ?? '') && s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
    const last: Record<string, LastRef> = {}
    for (const s of entries) {
      for (const [exId, e] of Object.entries(s.esercizi)) {
        if (!(exId in last)) {
          last[exId] = {
            carico: e.carico,
            done: e.sets.filter(Boolean).length,
            date: s.date,
          }
        }
      }
    }
    return last
  }, [state.workoutProgress, day?.id, today])

  if (!day) {
    return (
      <Card className="py-8 text-center">
        <p className="text-sm leading-relaxed text-muted">
          No routine yet. Head to <span className="text-teal">Routine</span> to build your workout
          days.
        </p>
      </Card>
    )
  }

  const totalSets = day.blocchi
    .flatMap((b) => b.esercizi)
    .filter((e) => e.tipo === 'reps')
    .reduce((a, e) => a + e.serie, 0)
  const doneSets = Object.values(session?.esercizi ?? {}).reduce(
    (a, e) => a + e.sets.filter(Boolean).length,
    0,
  )

  return (
    <>
      {/* Selettore data */}
      <div className="flex items-center justify-between rounded-2xl bg-surface px-2 py-1.5 ring-1 ring-black/[0.05]">
        <button
          onClick={() => shiftDay(-1)}
          aria-label="Previous day"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:bg-black/[0.05]"
        >
          <Icon.chevronLeft size={16} />
        </button>
        <button onClick={() => setToday(oggi)} className="font-display text-sm font-medium tracking-wide">
          {isToday ? 'Today' : formatLong(parseKey(today))}
        </button>
        <button
          onClick={() => shiftDay(1)}
          disabled={isToday}
          aria-label="Next day"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:bg-black/[0.05] disabled:opacity-20"
        >
          <Icon.chevronRight size={16} />
        </button>
      </div>

      {/* Selettore giornata */}
      {plan.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {plan.map((d) => (
            <button
              key={d.id}
              onClick={() => setDayId(d.id)}
              className={`shrink-0 rounded-2xl px-3.5 py-2 text-sm font-medium tracking-wide transition ${
                d.id === day.id ? 'bg-teal text-[#faf7f1]' : 'bg-surface2 text-muted'
              }`}
            >
              {d.nome}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardTitle>{day.nome}</CardTitle>
        <div className="-mt-2 mb-1 font-mono text-xs text-muted tabular">
          {doneSets}/{totalSets} sets done
        </div>

        <div className="mt-3 space-y-4">
          {day.blocchi.map((b) => (
            <div key={b.id}>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                {b.nome}
              </div>
              <div className="space-y-2">
                {b.esercizi.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    ex={ex}
                    last={lastByEx[ex.id]}
                    sets={session?.esercizi[ex.id]?.sets ?? []}
                    carico={session?.esercizi[ex.id]?.carico}
                    onToggleSet={(i, wasDone) => {
                      if (!canWrite()) return
                      toggleSet(today, day.id, ex.id, i, ex.serie)
                      if (!wasDone && ex.tipo === 'reps') startTimer(ex.riposoSec, `Rest · ${ex.nome}`)
                    }}
                    onLoad={(v) => canWrite() && setSessionLoad(today, day.id, ex.id, v)}
                    onStartTime={() => startTimer(ex.durataSec ?? 60, ex.nome)}
                  />
                ))}
                {b.esercizi.length === 0 && (
                  <p className="rounded-2xl bg-black/[0.04] px-3 py-2 text-xs text-muted">Empty block.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => confirm('Reset today’s session?') && resetSession(today)}>
            <Icon.reset size={16} /> Reset
          </Button>
          <Button onClick={() => completeWorkout(today, day.id)}>
            <Icon.check size={16} /> Complete
          </Button>
        </div>
      </Card>
    </>
  )
}

function TBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-black/[0.08] px-3 font-mono text-sm active:scale-90"
    >
      {children}
    </button>
  )
}

function ExerciseRow({
  ex,
  last,
  sets,
  carico,
  onToggleSet,
  onLoad,
  onStartTime,
}: {
  ex: ExExercise
  last?: LastRef
  sets: boolean[]
  carico?: number
  onToggleSet: (i: number, wasDone: boolean) => void
  onLoad: (v: number) => void
  onStartTime: () => void
}) {
  const schemeTxt = ex.tipo === 'reps' ? `${ex.serie}×${ex.reps}` : mmss(ex.durataSec ?? 0)
  const showLast = ex.tipo === 'reps' && last && (last.carico || last.done)
  return (
    <div className="rounded-2xl bg-surface2 p-2.5 ring-1 ring-black/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{ex.nome}</div>
          <div className="font-mono text-[11px] text-muted tabular">
            {schemeTxt}
            {ex.carico ? ` @${ex.carico}` : ''}
            {ex.note ? ` · ${ex.note}` : ''}
          </div>
          {showLast && (
            <div className="mt-0.5 font-mono text-[11px] text-teal/70 tabular">
              Last time: {last!.carico ? `${last!.carico} kg · ` : ''}
              {last!.done} {last!.done === 1 ? 'set' : 'sets'}
            </div>
          )}
        </div>
        {ex.tipo === 'tempo' && (
          <Button variant="soft" className="!min-h-[38px] !px-3" onClick={onStartTime}>
            <Icon.play size={15} /> Start
          </Button>
        )}
      </div>

      {ex.tipo === 'reps' && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {Array.from({ length: ex.serie }).map((_, i) => {
            const done = sets[i]
            return (
              <button
                key={i}
                onClick={() => onToggleSet(i, !!done)}
                className={`h-9 w-9 rounded-xl font-mono text-sm transition active:scale-90 ${
                  done ? 'bg-verde text-[#faf7f1]' : 'bg-black/[0.06] text-ink'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
          <div className="ml-auto w-28">
            <NumberInput value={carico ?? ''} onChange={onLoad} suffix="kg" placeholder="load" />
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Record personali =====
function PRCard() {
  const { state } = useStore()
  const nameById: Record<string, string> = {}
  for (const d of state.executionPlan)
    for (const b of d.blocchi) for (const e of b.esercizi) nameById[e.id] = e.nome
  const best: Record<string, number> = {}
  for (const s of Object.values(state.workoutProgress))
    for (const [exId, e] of Object.entries(s.esercizi)) {
      if (e.carico && e.carico > 0) {
        const nm = nameById[exId]
        if (nm) best[nm] = Math.max(best[nm] ?? 0, e.carico)
      }
    }
  const list = Object.entries(best)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  if (list.length === 0) return null
  return (
    <Card>
      <CardTitle>Personal records</CardTitle>
      <div className="space-y-1.5">
        {list.map(([nome, carico]) => (
          <div key={nome} className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-3 py-2">
            <span className="text-sm">{nome}</span>
            <span className="font-mono text-sm font-bold tabular">{carico} kg</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
