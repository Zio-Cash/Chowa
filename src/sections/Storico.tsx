import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { addDays, dateKey, formatLong, MESI_BREVI, MONITOR_START, parseKey, weekMonthOf } from '../lib/date'
import { fmtSteps, fmtWater } from '../lib/goals'
import { dayRating, periodStats, weeksForMonth, type DaySummary } from '../lib/history'
import { Icon } from '../components/brand'
import { Card, CardTitle, NavArrows } from '../components/ui'

const MESI = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface Area {
  key: string
  label: string
  on: (d: DaySummary) => boolean
}
const AREAS: Area[] = [
  { key: 'weight', label: 'Weight', on: (d) => d.weight != null },
  { key: 'kcal', label: 'Calories', on: (d) => d.kcalOk },
  { key: 'macro', label: 'Macros', on: (d) => d.macroOk },
  { key: 'workout', label: 'Workout', on: (d) => d.workoutDone },
  { key: 'water', label: 'Water', on: (d) => d.waterOk },
  { key: 'steps', label: 'Steps', on: (d) => d.stepsOk },
]

/** "−320" / "+150" / "—" */
const fmtDeficit = (n: number) => (n === 0 ? '—' : `${n > 0 ? '+' : '−'}${Math.abs(n)}`)

export default function Storico() {
  const { state } = useStore()
  // Mese "corrente" = quello a cui appartiene la settimana in corso (regola del
  // giovedì): così a fine mese ottobre e la settimana in corso si vedono subito.
  const cur = weekMonthOf()
  const [year, setYear] = useState(cur.year)
  const [month, setMonth] = useState(cur.month0)
  const [openDay, setOpenDay] = useState<string | null>(dateKey())

  const todayKey = dateKey()

  // Settimane sempre lunedì→domenica (7 giorni), assegnate al mese col giovedì.
  const weeks = useMemo(
    () => weeksForMonth(state, year, month, todayKey),
    [state, year, month, todayKey],
  )

  // Le statistiche del mese derivano dalle stesse settimane mostrate: un solo
  // calcolo (niente doppio scan) e numeri coerenti con le card sotto.
  const visibleDays = useMemo(() => weeks.flatMap((w) => w.days), [weeks])
  const stats = useMemo(() => periodStats(visibleDays), [visibleDays])

  // limiti di navigazione: non si va prima dell'inizio monitoraggio
  const startY = Number(MONITOR_START.slice(0, 4))
  const startM = Number(MONITOR_START.slice(5, 7)) - 1
  const atStart = year === startY && month === startM
  const atEnd = year === cur.year && month === cur.month0

  const prev = () => {
    if (atStart) return
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  const next = () => {
    if (atEnd) return
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base tracking-wide">
            {MESI[month]} {year}
          </h2>
          <NavArrows onPrev={prev} onNext={next} prevDisabled={atStart} nextDisabled={atEnd} />
        </div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <Stat n={stats.allenamenti} label="Workouts" />
          <Stat n={stats.giorniDieta} label="On-target days" />
          <Stat n={stats.giorniPerfetti} label="Perfect days" />
          <Stat n={stats.mediaKcal} label="Avg kcal" />
          <Stat n={fmtDeficit(stats.mediaDeficit)} label="Avg balance" />
          <Stat n={fmtSteps(stats.mediaPassi)} label="Avg steps" />
        </div>
      </Card>

      {/* Medie settimana per settimana (la più recente in alto) */}
      {weeks.some((w) => w.days.length > 0) && (
        <Card>
          <CardTitle>Weekly averages</CardTitle>
          <div className="divide-y divide-black/[0.06]">
            {[...weeks]
              .filter((w) => w.days.length > 0)
              .reverse()
              .map((w) => {
                const ws = periodStats(w.days)
                const logged = w.days.filter((d) => d.dietKcal > 0).length
                const isCur = w.days.some((d) => d.date === todayKey)
                return (
                  <div key={w.startDate.getTime()} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{isCur ? 'This week' : weekLabel(w.startDate, w.endDate)}</div>
                      <div className="truncate text-[11px] text-muted">
                        {logged}/{w.days.length} days logged · {ws.allenamenti}{' '}
                        {ws.allenamenti === 1 ? 'workout' : 'workouts'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold tabular">
                        {ws.mediaKcal > 0 ? ws.mediaKcal.toLocaleString('en-US') : '—'}
                      </div>
                      <div className="text-[11px] text-muted">avg kcal</div>
                    </div>
                    <div className="w-16 text-right">
                      <div
                        className={`font-mono text-lg font-bold tabular ${
                          logged === 0 ? 'text-muted/60' : ws.mediaDeficit < 0 ? 'text-verde' : ws.mediaDeficit > 0 ? 'text-arancio' : ''
                        }`}
                      >
                        {logged === 0 ? '—' : fmtDeficit(ws.mediaDeficit)}
                      </div>
                      <div className="text-[11px] text-muted">balance</div>
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Mese a colpo d'occhio: un quadratino per giorno, più scuro = più obiettivi */}
      <Card>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-ink/60">
          {WEEKDAYS.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
        <div className="mt-2 space-y-1.5">
          {weeks.map((w, wi) => {
            const byDate = new Map(w.days.map((d) => [d.date, d]))
            return (
              <div key={wi} className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }, (_, i) => {
                  const key = dateKey(addDays(w.startDate, i))
                  const d = byDate.get(key)
                  const n = d ? AREAS.filter((a) => a.on(d)).length : 0
                  const sel = key === openDay
                  return (
                    <button
                      key={key}
                      disabled={!d}
                      onClick={() => setOpenDay(key)}
                      aria-label={`${formatLong(parseKey(key))}: ${n} of ${AREAS.length} goals${d?.perfetta ? ', perfect day' : ''}`}
                      className={`relative flex aspect-square items-center justify-center rounded-xl font-mono text-xs tabular transition active:scale-95 disabled:opacity-30 ${
                        sel ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface2' : ''
                      }`}
                      style={{ background: d ? heat(n) : 'rgba(33,29,25,0.03)', color: n >= 4 ? '#faf7f1' : '#211d19' }}
                    >
                      {parseKey(key).getDate()}
                      {d?.perfetta && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#faf7f1]" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-ink/65">
          Fewer goals
          {[0, 2, 4, 6].map((n) => (
            <span key={n} className="h-3 w-3 rounded-[4px]" style={{ background: heat(n) }} />
          ))}
          More
        </div>
      </Card>

      {openDay && (() => {
        const d = weeks.flatMap((w) => w.days).find((x) => x.date === openDay)
        if (!d) return null
        const rating = dayRating(d.score)
        return (
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <CardTitle>{openDay === todayKey ? 'Today' : formatLong(parseKey(openDay))}</CardTitle>
              {rating && <span className={`-mt-4 rounded-full px-2 py-0.5 text-[11px] font-bold ${rating.cls}`}>{rating.label}</span>}
            </div>
            <DayDetail d={d} />
          </Card>
        )
      })()}
    </div>
  )
}

/** "3–9 Nov" oppure "27 Oct – 2 Nov" se la settimana scavalca il mese. */
function weekLabel(a: Date, b: Date): string {
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MESI_BREVI[b.getMonth()]}`
    : `${a.getDate()} ${MESI_BREVI[a.getMonth()]} – ${b.getDate()} ${MESI_BREVI[b.getMonth()]}`
}

/** Scala onice: 0 obiettivi = carta, 6 = onice pieno. */
function heat(n: number): string {
  const a = [0.05, 0.14, 0.26, 0.4, 0.58, 0.76, 0.92][Math.max(0, Math.min(6, n))]
  return `rgba(33, 29, 25, ${a})`
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.06] px-2 py-2 text-center">
      <div className="font-mono text-xl font-bold tabular">{n}</div>
      <div className="text-[11px] text-ink/75">{label}</div>
    </div>
  )
}

function DayDetail({ d }: { d: DaySummary }) {
  const { state } = useStore()
  const g = state.settings.goals
  const rows: { icon: keyof typeof Icon; label: string; value: string; ok?: boolean }[] = [
    { icon: 'weight', label: 'Weight', value: d.weight != null ? `${d.weight} kg` : 'not logged', ok: d.weight != null },
    {
      icon: 'bowl',
      label: 'Calories',
      value: d.mealsTotal ? `${Math.round(d.dietKcal)} kcal` : 'no meals',
      ok: d.kcalOk,
    },
    {
      icon: 'practice',
      label: 'Workout',
      value: d.workoutDone
        ? `${d.workoutNome ?? 'Session'}${d.workoutSetsTotal ? ` · ${d.workoutSetsDone}/${d.workoutSetsTotal} sets` : ''}`
        : 'rest',
      ok: d.workoutDone,
    },
    { icon: 'drop', label: 'Water', value: `${fmtWater(d.water)} / ${fmtWater(g.waterTarget)}`, ok: d.waterOk },
    { icon: 'steps', label: 'Steps', value: `${fmtSteps(d.steps)} / ${fmtSteps(g.stepTarget)}`, ok: d.stepsOk },
    {
      icon: 'flame',
      label: 'Active energy',
      value: d.activeKcal > 0 ? `${d.activeKcal} kcal` : 'not logged',
      ok: d.activeKcal > 0,
    },
    {
      icon: 'progress',
      label: 'Balance',
      value: d.dietKcal > 0 ? `${fmtDeficit(d.deficit)} kcal` : 'no meals',
      ok: d.dietKcal > 0 && d.deficit < 0,
    },
  ]
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-1">
          <span className="flex w-5 justify-center text-muted">{(() => { const Ico = Icon[r.icon]; return <Ico size={15} /> })()}</span>
          <span className="w-28 text-sm text-ink/80">{r.label}</span>
          <span className={`flex-1 text-right font-mono text-sm tabular ${r.ok ? 'text-verde' : 'text-ink'}`}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}
