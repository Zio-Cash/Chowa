import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { dateKey, MONITOR_START, parseKey, rangeLabel } from '../lib/date'
import { fmtSteps, fmtWater } from '../lib/goals'
import { dayRating, monthSummaries, periodStats, weeksForMonth, type DaySummary } from '../lib/history'
import { Card, CardTitle } from '../components/ui'

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

interface Area {
  key: string
  emoji: string
  label: string
  color: string
  on: (d: DaySummary) => boolean
}
const AREAS: Area[] = [
  { key: 'weight', emoji: 'P', label: 'Peso', color: 'bg-blunotte', on: (d) => d.weight != null },
  { key: 'kcal', emoji: 'N', label: 'Nutrimento', color: 'bg-arancio', on: (d) => d.kcalOk },
  { key: 'macro', emoji: 'M', label: 'Macro', color: 'bg-carb', on: (d) => d.macroOk },
  { key: 'workout', emoji: 'A', label: 'Pratica', color: 'bg-verde', on: (d) => d.workoutDone },
  { key: 'water', emoji: 'I', label: 'Acqua', color: 'bg-teal', on: (d) => d.waterOk },
  { key: 'steps', emoji: 'S', label: 'Passi', color: 'bg-magenta', on: (d) => d.stepsOk },
]

/** "−320" / "+150" / "—" */
const fmtDeficit = (n: number) => (n === 0 ? '—' : `${n > 0 ? '+' : '−'}${Math.abs(n)}`)

export default function Storico() {
  const { state } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [openDay, setOpenDay] = useState<string | null>(dateKey())

  const todayKey = dateKey()
  const days = useMemo(() => monthSummaries(state, year, month), [state, year, month])

  // solo i giorni fino ad oggi e dall'inizio del monitoraggio (giugno 2026)
  const visibleDays = days.filter((d) => d.date <= todayKey && d.date >= MONITOR_START)
  const stats = useMemo(() => periodStats(visibleDays), [visibleDays])

  // limiti di navigazione: non si va prima dell'inizio monitoraggio
  const startY = Number(MONITOR_START.slice(0, 4))
  const startM = Number(MONITOR_START.slice(5, 7)) - 1
  const atStart = year === startY && month === startM
  const atEnd = year === now.getFullYear() && month === now.getMonth()

  const prev = () => {
    if (atStart) return
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  const next = () => {
    if (atEnd) return
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  // settimane sempre lunedì→domenica (7 giorni), anche a cavallo di due mesi
  const weeks = useMemo(
    () => weeksForMonth(state, year, month, todayKey),
    [state, year, month, todayKey],
  )

  return (
    <div className="space-y-4 pb-4">
      <Card gradient="bg-gradient-to-br from-[#1c1c1c] to-[#121212] text-ink">
        <div className="flex items-center justify-between">
          <CardTitle>
            <span className="text-ink">{MESI[month]} {year}</span>
          </CardTitle>
          <div className="flex gap-1">
            <button onClick={prev} disabled={atStart} className="h-8 w-8 rounded-full bg-white/15 disabled:opacity-25">‹</button>
            <button onClick={next} disabled={atEnd} className="h-8 w-8 rounded-full bg-white/15 disabled:opacity-25">›</button>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <Stat n={stats.allenamenti} label="Allenamenti" />
          <Stat n={stats.giorniDieta} label="Dieta ok" />
          <Stat n={stats.giorniPerfetti} label="Perfetti" />
          <Stat n={stats.mediaKcal} label="Media kcal" />
          <Stat n={fmtDeficit(stats.mediaDeficit)} label="Media deficit" />
          <Stat n={fmtSteps(stats.mediaPassi)} label="Media passi" />
        </div>
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 px-1">
        {AREAS.map((a) => (
          <span key={a.key} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-ink/40" />
            {a.label}
          </span>
        ))}
      </div>

      {weeks.map((w, wi) => {
        const wStats = periodStats(w.days)
        return (
          <Card key={wi} className="!p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="font-display text-base">{rangeLabel(w.startDate, w.endDate)}</span>
              <span className="font-mono text-xs text-muted tabular">
                {wStats.allenamenti} allen · {wStats.giorniPerfetti} perf
              </span>
            </div>
            <div className="mb-2 flex gap-2 font-mono text-xs tabular">
              {wStats.mediaKcal > 0 && (
                <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-muted">
                  media {wStats.mediaKcal} kcal
                </span>
              )}
              {wStats.mediaDeficit !== 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    wStats.mediaDeficit < 0 ? 'bg-verde/15 text-verde' : 'bg-arancio/15 text-arancio'
                  }`}
                >
                  deficit {fmtDeficit(wStats.mediaDeficit)}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {w.days.map((d) => (
                <DayRow
                  key={d.date}
                  d={d}
                  open={openDay === d.date}
                  onToggle={() => setOpenDay(openDay === d.date ? null : d.date)}
                />
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-2 py-2 text-center">
      <div className="font-mono text-xl font-bold tabular">{n}</div>
      <div className="text-[10px] opacity-80">{label}</div>
    </div>
  )
}

function DayRow({ d, open, onToggle }: { d: DaySummary; open: boolean; onToggle: () => void }) {
  const date = parseKey(d.date)
  const isToday = d.date === dateKey()
  const rating = dayRating(d.score)
  return (
    <div className={`rounded-2xl ${d.perfetta ? 'bg-viola/10' : 'bg-white/[0.05]'}`}>
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2">
        <span className="flex w-14 flex-col items-start leading-tight">
          <span className="font-mono text-sm font-bold tabular">
            {GIORNI[date.getDay()]} {date.getDate()}
          </span>
          {isToday && <span className="text-[10px] font-semibold text-arancio">oggi</span>}
        </span>
        <span className="flex flex-1 items-center gap-1">
          {AREAS.map((a) => {
            const on = a.on(d)
            return (
              <span
                key={a.key}
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-medium transition ${
                  on ? 'bg-teal text-[#141210] shadow-sm' : 'bg-white/[0.05] text-muted/40'
                }`}
              >
                {a.emoji}
              </span>
            )
          })}
        </span>
        {rating && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${rating.cls}`}>
            {rating.label}
          </span>
        )}
        <span className="text-xs text-muted">{open ? '▾' : '▸'}</span>
      </button>
      {open && <DayDetail d={d} />}
    </div>
  )
}

function DayDetail({ d }: { d: DaySummary }) {
  const { state } = useStore()
  const g = state.settings.goals
  const rows: { icon: string; label: string; value: string; ok?: boolean }[] = [
    { icon: '⚖️', label: 'Peso', value: d.weight != null ? `${d.weight} kg` : 'non registrato', ok: d.weight != null },
    {
      icon: '🔥',
      label: 'Calorie',
      value: d.mealsTotal ? `${Math.round(d.dietKcal)} kcal` : 'nessun pasto',
      ok: d.kcalOk,
    },
    {
      icon: '🏋️',
      label: 'Allenamento',
      value: d.workoutDone
        ? `${d.workoutEmoji ?? ''} ${d.workoutNome ?? 'Sessione'}${d.workoutSetsTotal ? ` · ${d.workoutSetsDone}/${d.workoutSetsTotal} serie` : ''}`
        : 'riposo',
      ok: d.workoutDone,
    },
    { icon: '💧', label: 'Acqua', value: `${fmtWater(d.water)} / ${fmtWater(g.waterTarget)}`, ok: d.waterOk },
    { icon: '👟', label: 'Passi', value: `${fmtSteps(d.steps)} / ${fmtSteps(g.stepTarget)}`, ok: d.stepsOk },
    {
      icon: '⚡',
      label: 'Attive bruciate',
      value: d.activeKcal > 0 ? `${d.activeKcal} kcal` : 'non registrate',
      ok: d.activeKcal > 0,
    },
    {
      icon: '∆',
      label: 'Deficit',
      value: d.dietKcal > 0 ? `${fmtDeficit(d.deficit)} kcal` : 'nessun pasto',
      ok: d.dietKcal > 0 && d.deficit < 0,
    },
  ]
  return (
    <div className="border-t border-white/[0.07] px-3 py-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-1">
          <span className="w-5 text-center">{r.icon}</span>
          <span className="w-24 text-xs font-semibold text-muted">{r.label}</span>
          <span className={`flex-1 text-right font-mono text-xs tabular ${r.ok ? 'text-verde' : 'text-ink'}`}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}
