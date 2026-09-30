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
import { dateKey, MESI_BREVI, MONITOR_START, parseKey, rangeLabel, weeksOfMonth } from '../lib/date'
import { fmtSteps } from '../lib/goals'
import { Card, CardTitle, NumberInput } from '../components/ui'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export default function Passi() {
  const { state, setSteps } = useStore()
  const stepTarget = state.settings.goals.stepTarget
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [openMonth, setOpenMonth] = useState<number | null>(now.getMonth())

  // Mesi visibili: solo dall'inizio del monitoraggio (giugno 2026) in poi
  const startY = Number(MONITOR_START.slice(0, 4))
  const startM = Number(MONITOR_START.slice(5, 7)) - 1
  const monthVisible = (mi: number) =>
    year > startY || (year === startY && mi >= startM)

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
      <Card gradient="bg-gradient-to-br from-[#1c1c1c] to-[#121212] text-ink">
        <div className="flex items-center justify-between">
          <CardTitle>
            <span className="text-white">Passi {year}</span>
          </CardTitle>
          <div className="flex gap-1">
            <button onClick={() => setYear((y) => y - 1)} className="h-8 w-8 rounded-full bg-white/15">
              ‹
            </button>
            <button onClick={() => setYear((y) => y + 1)} className="h-8 w-8 rounded-full bg-white/15">
              ›
            </button>
          </div>
        </div>
        <div className="font-mono text-3xl font-bold tabular">{fmtSteps(Math.round(yearAvg))}</div>
        <div className="text-xs opacity-80">media giornaliera annuale · obiettivo {fmtSteps(stepTarget)}</div>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="m" tick={{ fill: '#ffffffcc', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#ffffff20' }}
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12, background: '#1e2128', color: '#eef1f3' }}
                formatter={(v) => [fmtSteps(Number(v)), 'media']}
              />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {chart.map((_, i) => (
                  <Cell key={i} fill={i === now.getMonth() && year === now.getFullYear() ? '#f4f0e7' : '#6f6a62'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="space-y-2">
        {MESI_BREVI.map((nome, mi) => {
          if (!monthVisible(mi)) return null
          const isCurrent = mi === now.getMonth() && year === now.getFullYear()
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
                  <span className="text-muted">{open ? '▾' : '▸'}</span>
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
    <div className="border-t border-white/[0.07] p-2">
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
              className="flex w-full items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2"
            >
              <span className="text-sm">{rangeLabel(w.start, w.end)}</span>
              <span className="flex items-center gap-2 font-mono text-xs tabular">
                <span className={wAvg ? '' : 'text-muted'}>{fmtSteps(Math.round(wAvg))}</span>
                <span className="text-muted">{open ? '▾' : '▸'}</span>
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
