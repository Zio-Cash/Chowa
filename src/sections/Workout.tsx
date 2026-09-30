import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { dateKey, formatLong, parseKey } from '../lib/date'
import { beep, mmss, vibrate } from '../lib/sound'
import type { ExExercise } from '../types'
import { Button, Card, CardTitle, NumberInput, Segmented } from '../components/ui'
import { Icon } from '../components/brand'
import Esercizi from './Esercizi'
import Routine from './Routine'

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
    <div className="space-y-4 pb-24">
      <Segmented
        options={[
          { value: 'train', label: 'Allenamento' },
          { value: 'routine', label: 'Routine' },
          { value: 'catalog', label: 'Esercizi' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TrainingTab)}
      />
      {tab === 'train' && <Execution />}
      {tab === 'routine' && <Routine />}
      {tab === 'catalog' && <Esercizi />}
    </div>
  )
}

// ===== Esecuzione =====
interface TimerState {
  sec: number
  total: number
  label: string
  running: boolean
}

function Execution() {
  const { state, getSession, toggleSet, setSessionLoad, completeWorkout, resetSession } = useStore()
  const oggi = dateKey()
  const [today, setToday] = useState(oggi)
  const isToday = today === oggi
  const shiftDay = (delta: number) => {
    const d = parseKey(today)
    d.setDate(d.getDate() + delta)
    const key = dateKey(d)
    if (key <= oggi) setToday(key)
  }
  const plan = state.executionPlan
  const [dayId, setDayId] = useState(plan[0]?.id ?? '')
  const day = plan.find((d) => d.id === dayId) ?? plan[0]
  const sessionRaw = getSession(today)
  const session = sessionRaw && sessionRaw.dayId === day?.id ? sessionRaw : undefined

  // ---- Timer ----
  const [timer, setTimer] = useState<TimerState | null>(null)
  const tick = useRef<number | null>(null)
  useEffect(() => {
    if (timer?.running) {
      tick.current = window.setInterval(() => {
        setTimer((t) => {
          if (!t) return t
          if (t.sec <= 1) {
            beep(880, 250)
            vibrate([200, 100, 200])
            return { ...t, sec: 0, running: false }
          }
          if (t.sec <= 4) beep(660, 90)
          return { ...t, sec: t.sec - 1 }
        })
      }, 1000)
    }
    return () => {
      if (tick.current) window.clearInterval(tick.current)
    }
  }, [timer?.running])

  const startTimer = (sec: number, label: string) => setTimer({ sec, total: sec, label, running: true })

  // Riferimento "ultima volta": ultima sessione precedente per lo stesso giorno.
  const lastByEx = useMemo(() => {
    const entries = Object.values(state.workoutProgress)
      .filter((s) => s.dayId === (day?.id ?? '') && s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
    const last: Record<string, LastRef> = {}
    for (const s of entries) {
      for (const [exId, e] of Object.entries(s.esercizi)) {
        if (!(exId in last)) {
          last[exId] = { carico: e.carico, done: e.sets.filter(Boolean).length, date: s.date }
        }
      }
    }
    return last
  }, [state.workoutProgress, day?.id, today])

  if (!day) {
    return (
      <Card className="py-8 text-center">
        <p className="text-sm leading-relaxed text-muted">
          Nessuna scheda ancora. Vai su <span className="text-teal">Routine</span> per costruire i tuoi
          giorni di allenamento.
        </p>
      </Card>
    )
  }

  const totalSets = day.blocchi
    .flatMap((b) => b.esercizi)
    .filter((e) => e.tipo === 'reps')
    .reduce((a, e) => a + e.serie, 0)
  const doneSets = Object.values(session?.esercizi ?? {}).reduce((a, e) => a + e.sets.filter(Boolean).length, 0)

  return (
    <>
      {/* Selettore data */}
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

      {/* Selettore giornata */}
      {plan.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {plan.map((d) => (
            <button
              key={d.id}
              onClick={() => setDayId(d.id)}
              className={`shrink-0 rounded-2xl px-3.5 py-2 text-sm font-medium tracking-wide transition ${
                d.id === day.id ? 'bg-teal text-[#1a1012]' : 'bg-surface2 text-muted'
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
          {doneSets}/{totalSets} serie completate
        </div>

        <div className="mt-3 space-y-4">
          {day.blocchi.map((b) => (
            <div key={b.id}>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{b.nome}</div>
              <div className="space-y-2">
                {b.esercizi.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    ex={ex}
                    last={lastByEx[ex.id]}
                    sets={session?.esercizi[ex.id]?.sets ?? []}
                    carico={session?.esercizi[ex.id]?.carico}
                    onToggleSet={(i, wasDone) => {
                      toggleSet(today, day.id, ex.id, i, ex.serie)
                      if (!wasDone && ex.tipo === 'reps') startTimer(ex.riposoSec, `Riposo · ${ex.nome}`)
                    }}
                    onLoad={(v) => setSessionLoad(today, day.id, ex.id, v)}
                    onStartTime={() => startTimer(ex.durataSec ?? 60, ex.nome)}
                  />
                ))}
                {b.esercizi.length === 0 && (
                  <p className="rounded-2xl bg-white/[0.04] px-3 py-2 text-xs text-muted">Blocco vuoto.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => confirm('Azzerare la sessione di oggi?') && resetSession(today)}>
            <Icon.reset size={16} /> Azzera
          </Button>
          <Button onClick={() => completeWorkout(today, day.id)}>
            <Icon.check size={16} /> Completa
          </Button>
        </div>
      </Card>

      {/* Timer di recupero — sopra la tab bar */}
      {timer && (
        <div
          className="fixed inset-x-0 z-50 mx-auto max-w-[480px] px-3"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 74px)' }}
        >
          <div className="glass rounded-3xl bg-surface2/90 p-4 shadow-2xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted">{timer.label}</div>
                <div className="font-mono text-3xl tabular">{mmss(timer.sec)}</div>
              </div>
              <div className="flex gap-1.5">
                <TBtn onClick={() => setTimer((t) => (t ? { ...t, sec: Math.max(0, t.sec - 15) } : t))}>−15</TBtn>
                <TBtn onClick={() => setTimer((t) => (t ? { ...t, sec: t.sec + 15 } : t))}>+15</TBtn>
                <TBtn onClick={() => setTimer((t) => (t ? { ...t, running: !t.running } : t))}>
                  {timer.running ? <Icon.pause size={16} /> : <Icon.play size={16} />}
                </TBtn>
                <TBtn onClick={() => setTimer(null)}>
                  <Icon.close size={16} />
                </TBtn>
              </div>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-teal transition-all"
                style={{ width: `${timer.total ? (timer.sec / timer.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-white/[0.08] px-3 font-mono text-sm active:scale-90"
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
    <div className="rounded-2xl bg-surface2 p-2.5 ring-1 ring-white/[0.03]">
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
              Ultima: {last!.carico ? `${last!.carico} kg · ` : ''}
              {last!.done} serie
            </div>
          )}
        </div>
        {ex.tipo === 'tempo' && (
          <Button variant="soft" className="!min-h-[38px] !px-3" onClick={onStartTime}>
            <Icon.play size={15} /> Avvia
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
                  done ? 'bg-verde text-[#14231c]' : 'bg-white/[0.06] text-ink'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
          <div className="ml-auto w-28">
            <NumberInput value={carico ?? ''} onChange={onLoad} suffix="kg" placeholder="carico" />
          </div>
        </div>
      )}
    </div>
  )
}
