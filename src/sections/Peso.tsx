import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
import { Button, Card, CardTitle, NumberInput } from '../components/ui'
import { projectToTarget, weightTrend } from '../lib/weight'
import type { DailyGoals } from '../types'
import { Icon } from '../components/brand'

const fmt = (n?: number) => (n ? n.toFixed(1) : '—')
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const fmtData = (k: string) => {
  const d = parseKey(k)
  return `${MESI_BREVI[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export default function Peso() {
  const { state, setWeight, setGoals } = useStore()
  const oggi = dateKey()
  // Mese corrente = quello della settimana in corso (regola del giovedì).
  const cur = weekMonthOf()
  const [openMonth, setOpenMonth] = useState<string | null>(`${cur.year}-${cur.month0}`)

  // Serie reale delle pesate (dall'inizio monitoraggio a oggi), in ordine di data
  const { serie, primo, ultimo, delta } = useMemo(() => {
    const serie = Object.entries(state.weightLog)
      .filter(([k]) => k >= MONITOR_START && k <= oggi)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, kg]) => {
        const d = parseKey(k)
        return { k, label: `${MESI_BREVI[d.getMonth()]} ${d.getDate()}`, kg }
      })
    const primo = serie[0]?.kg
    const ultimo = serie[serie.length - 1]?.kg
    const delta = primo != null && ultimo != null ? Math.round((ultimo - primo) * 10) / 10 : 0
    return { serie, primo, ultimo, delta }
  }, [state.weightLog, oggi])

  // Mesi visibili: dall'inizio monitoraggio fino al mese della settimana in corso
  const mesi = useMemo(() => {
    const startY = Number(MONITOR_START.slice(0, 4))
    const startM = Number(MONITOR_START.slice(5, 7)) - 1
    const out: { y: number; m: number }[] = []
    let y = startY
    let m = startM
    while (y < cur.year || (y === cur.year && m <= cur.month0)) {
      out.push({ y, m })
      if (m === 11) { m = 0; y++ } else m++
    }
    return out.reverse() // il mese più recente in cima
  }, [cur.year, cur.month0])

  return (
    <div className="space-y-4 pb-4">
      <GoalCard
        goals={state.settings.goals}
        current={ultimo}
        start={primo}
        weightLog={state.weightLog}
        oggi={oggi}
        onSetTarget={(pesoTarget) => setGoals({ ...state.settings.goals, pesoTarget })}
      />

      <Card>
        <CardTitle>Weight trend</CardTitle>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl tabular">{fmt(ultimo)} kg</span>
          {serie.length > 1 && (
            <span
              className={`font-mono text-sm tabular ${
                delta < 0 ? 'text-verde' : delta > 0 ? 'text-arancio' : 'text-muted'
              }`}
            >
              {delta > 0 ? '+' : delta < 0 ? '−' : ''}
              {Math.abs(delta).toFixed(1)} kg
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {serie.length > 1 ? `from ${fmt(primo)} kg at the start` : 'log your weight to see the trend'}
        </div>

        <div className="mt-4 h-48">
          {serie.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#211d1910" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#837b6e', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
                <YAxis
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  tick={{ fill: '#837b6e', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => Number(v).toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    fontSize: 12,
                    background: '#fdfbf6',
                    color: '#211d19',
                  }}
                  formatter={(v) => [`${v} kg`, 'weight']}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="#211d19"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#211d19", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              You need at least two weigh-ins.
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-2">
        {mesi.map(({ y, m }) => {
          const id = `${y}-${m}`
          const isCurrent = m === cur.month0 && y === cur.year
          const open = openMonth === id
          // variazione del mese: ultima pesata − prima pesata del mese
          const vals = Object.entries(state.weightLog)
            .filter(([k]) => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`) && k <= oggi)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, kg]) => kg)
          const mDelta = vals.length > 1 ? Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10 : null
          return (
            <Card key={id} className="!p-0 overflow-hidden">
              <button
                onClick={() => setOpenMonth(open ? null : id)}
                className="flex w-full items-center justify-between p-3"
              >
                <span className="font-display text-base">
                  {MESI_BREVI[m]} {y}
                  {isCurrent && <span className="ml-1 text-teal">•</span>}
                </span>
                <span className="flex items-center gap-2 font-mono text-sm tabular">
                  <span className={mDelta == null ? 'text-muted' : mDelta < 0 ? 'text-verde' : mDelta > 0 ? 'text-arancio' : ''}>
                    {mDelta == null ? '—' : `${mDelta > 0 ? '+' : mDelta < 0 ? '−' : ''}${Math.abs(mDelta).toFixed(1)} kg`}
                  </span>
                  {open ? <Icon.chevronUp size={14} className="text-muted" /> : <Icon.chevronDown size={14} className="text-muted" />}
                </span>
              </button>
              {open && (
                <MonthBody year={y} month={m} weightLog={state.weightLog} onSet={setWeight} oggi={oggi} />
              )}
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
  weightLog,
  onSet,
  oggi,
}: {
  year: number
  month: number
  weightLog: Record<string, number>
  onSet: (date: string, kg: number) => void
  oggi: string
}) {
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const weeks = weeksOfMonth(year, month)

  return (
    <div className="border-t border-black/[0.06] p-2">
      {weeks.map((w, wi) => {
        // settimana sempre lun→dom; mostro solo i giorni entro il monitoraggio
        const keys = w.days.map(dateKey).filter((k) => k >= MONITOR_START && k <= oggi)
        if (keys.length === 0) return null
        const vals = keys.map((k) => weightLog[k]).filter(Boolean) as number[]
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
                <span className={wAvg ? '' : 'text-muted'}>{fmt(wAvg)} kg</span>
                {open ? <Icon.chevronUp size={14} className="text-muted" /> : <Icon.chevronDown size={14} className="text-muted" />}
              </span>
            </button>
            {open && (
              <div className="mt-1 space-y-1 px-1">
                {keys.map((key) => {
                  const d = parseKey(key)
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-xl px-2 py-1">
                      <span className="w-14 font-mono text-xs text-muted tabular">
                        {MESI_BREVI[d.getMonth()]} {d.getDate()}
                      </span>
                      <NumberInput
                        value={weightLog[key] ?? ''}
                        onChange={(v) => onSet(key, v)}
                        suffix="kg"
                        placeholder="—"
                        className="flex-1"
                        commitOnBlur
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

function GoalCard({
  goals,
  current,
  start,
  weightLog,
  oggi,
  onSetTarget,
}: {
  goals: DailyGoals
  current?: number
  start?: number
  weightLog: Record<string, number>
  oggi: string
  onSetTarget: (kg: number) => void
}) {
  const target = goals.pesoTarget ?? 0
  const [editing, setEditing] = useState(target <= 0)
  const [draft, setDraft] = useState<number>(target || (current ? Math.round(current) : 70))
  const trend = weightTrend(weightLog, oggi, 28)
  const proj =
    target > 0 && current ? projectToTarget(current, target, trend?.slopePerWeek ?? 0, oggi) : null

  if (editing || target <= 0) {
    return (
      <Card>
        <CardTitle>Weight goal</CardTitle>
        <p className="-mt-2 mb-3 text-xs text-muted">
          Set the weight you want to reach: you’ll see a projection at your current pace.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <NumberInput value={draft || ''} onChange={setDraft} suffix="kg" placeholder="e.g. 68" />
          </div>
          <Button
            onClick={() => {
              if (draft > 0) {
                onSetTarget(draft)
                setEditing(false)
              }
            }}
          >
            Save
          </Button>
        </div>
      </Card>
    )
  }

  const base = start ?? current ?? target
  const totale = base - target
  const fatto = base - (current ?? base)
  const pct = totale !== 0 ? Math.min(1, Math.max(0, fatto / totale)) : current === target ? 1 : 0
  const resta = current != null ? Math.round(Math.abs(current - target) * 10) / 10 : null

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Weight goal</CardTitle>
        <button
          onClick={() => {
            setDraft(target)
            setEditing(true)
          }}
          className="text-xs text-muted underline"
        >
          edit
        </button>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-3xl tabular">
          {fmt(current)} <span className="text-base text-muted">→ {target} kg</span>
        </span>
        {resta != null && resta > 0 && (
          <span className="text-sm text-muted">
            {current != null && target > current ? '+' : '−'}
            {resta} kg
          </span>
        )}
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full w-full origin-left rounded-full bg-teal transition-transform duration-500"
          style={{ transform: `scaleX(${pct})` }}
        />
      </div>
      <div className="mt-3 text-sm">
        {proj ? (
          proj.weeksToGo <= 0 ? (
            <span className="font-medium text-verde">Goal reached</span>
          ) : (
            <span className="text-ink">
              At your current pace ({proj.perWeek < 0 ? '−' : '+'}
              {Math.abs(proj.perWeek).toFixed(2)} kg/wk) you’ll get there around{' '}
              <b>{fmtData(proj.etaDate)}</b>.
            </span>
          )
        ) : (
          <span className="text-muted">
            {trend
              ? 'Your current pace isn’t moving you toward your goal: adjust your diet or workouts.'
              : 'Log a few weigh-ins to see your projection.'}
          </span>
        )}
      </div>
    </Card>
  )
}
