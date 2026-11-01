import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { useStore } from '../store/store'
import {
  dateKey,
  MESI_BREVI,
  MONITOR_START,
  parseKey,
  rangeLabel,
  weekMonthOf,
  weeksOfMonth,
} from '../lib/date'
import { fmtSteps } from '../lib/goals'
import { Card, NavArrows, NumberInput } from '../components/ui'
import { Icon } from '../components/brand'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export default function Passi() {
  const { state, setSteps } = useStore()
  const stepTarget = state.settings.goals.stepTarget
  // Mese corrente = quello della settimana in corso (regola del giovedì).
  const cur = weekMonthOf()
  const [year, setYear] = useState(cur.year)
  const [openMonth, setOpenMonth] = useState<number | null>(cur.month0)

  // Mesi visibili: dall'inizio del monitoraggio (giugno 2026) fino al mese
  // della settimana in corso (i mesi futuri vuoti restano nascosti).
  const startY = Number(MONITOR_START.slice(0, 4))
  const startM = Number(MONITOR_START.slice(5, 7)) - 1
  const monthVisible = (mi: number) =>
    (year > startY || (year === startY && mi >= startM)) &&
    (year < cur.year || (year === cur.year && mi <= cur.month0))

  const { monthly, yearAvg, chart } = useMemo(() => {
    const monthly: number[][] = Array.from({ length: 12 }, () => [])
    for (const [k, n] of Object.entries(state.stepsLog)) {
      if (k < MONITOR_START) continue
      const [y, m] = k.split('-').map(Number)
      if (y === year) monthly[m - 1].push(n)
    }
    const all = monthly.flat()
    const chart = monthly
      .map((xs, i) => ({ i, m: MESI_BREVI[i], avg: Math.round(avg(xs)) }))
      .filter((r) => year > startY || (year === startY && r.i >= startM))
    return { monthly, yearAvg: avg(all), chart }
  }, [state.stepsLog, year, startY, startM])

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base tracking-wide">Passi {year}</h2>
          <NavArrows
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
            prevDisabled={year <= startY}
            nextDisabled={year >= cur.year}
          />
        </div>
        <div className="font-mono text-3xl font-bold tabular">{fmtSteps(Math.round(yearAvg))}</div>
        <div className="text-xs text-muted">media giornaliera annuale · obiettivo {fmtSteps(stepTarget)}</div>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="m" tick={{ fill: '#837b6e', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#211d1914' }}
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12, background: '#fdfbf6', color: '#211d19' }}
                formatter={(v) => [fmtSteps(Number(v)), 'media']}
              />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {chart.map((r) => (
                  <Cell
                    key={r.i}
                    fill={r.i === cur.month0 && year === cur.year ? '#211d19' : '#cbc4b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="space-y-2">
        {MESI_BREVI.map((nome, mi) => {
          if (!monthVisible(mi)) return null
          const isCurrent = mi === cur.month0 && year === cur.year
          const mAvg = avg(monthly[mi])
          const open = openMonth === mi
          return (
            <Card key={mi} className={`!p-0 overflow-hidden ${isCurrent ? 'ring-2 ring-arancio' : ''}`}>
              <button
                onClick={() => setOpenMonth(open ? null : mi)}
                className="flex w-full items-center justify-between p-3"
              >
                <span className="font-semibold">
                  {nome} {isCurrent && <span className="text-arancio">●</span>}
                </span>
                <span className="flex items-center gap-2 font-mono text-sm tabular">
                  <span className={mAvg ? '' : 'text-muted'}>{fmtSteps(Math.round(mAvg))}</span>
                  {open ? <Icon.chevronUp size={14} className="text-muted" /> : <Icon.chevronDown size={14} className="text-muted" />}
                </span>
              </button>
              {open && <MonthBody year={year} month={mi} stepsLog={state.stepsLog} onSet={setSteps} />}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function MonthBody({
  year,
  month,
  stepsLog,
  onSet,
}: {
  year: number
  month: number
  stepsLog: Record<string, number>
  onSet: (date: string, passi: number) => void
}) {
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const oggi = dateKey()
  const weeks = weeksOfMonth(year, month)

  return (
    <div className="border-t border-black/[0.07] p-2">
      {weeks.map((w, wi) => {
        // settimana sempre lun→dom; mostro solo i giorni entro il monitoraggio
        const keys = w.days.map(dateKey).filter((k) => k >= MONITOR_START && k <= oggi)
        if (keys.length === 0) return null
        const vals = keys.map((k) => stepsLog[k]).filter(Boolean) as number[]
        const wAvg = avg(vals)
        const open = openWeek === wi
        return (
          <div key={wi} className="mb-1">
            <button
              onClick={() => setOpenWeek(open ? null : wi)}
              className="flex w-full items-center justify-between rounded-xl bg-black/[0.05] px-3 py-2"
            >
              <span className="text-sm">{rangeLabel(w.start, w.end)}</span>
              <span className="flex items-center gap-2 font-mono text-xs tabular">
                <span className={wAvg ? '' : 'text-muted'}>{fmtSteps(Math.round(wAvg))}</span>
                {open ? <Icon.chevronUp size={14} className="text-muted" /> : <Icon.chevronDown size={14} className="text-muted" />}
              </span>
            </button>
            {open && (
              <div className="mt-1 grid grid-cols-1 gap-1 px-1">
                {keys.map((key) => {
                  const d = parseKey(key)
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-xl px-2 py-1">
                      <span className="w-14 font-mono text-xs text-muted tabular">
                        {d.getDate()}/{d.getMonth() + 1}
                      </span>
                      <NumberInput
                        value={stepsLog[key] ?? ''}
                        onChange={(v) => onSet(key, v)}
                        suffix="passi"
                        placeholder="—"
                        className="flex-1"
                        commitOnBlur
                        integer
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
