import { useState } from 'react'
import { useStore } from '../store/store'
import { dateKey, formatLong, parseKey } from '../lib/date'
import { currentCycle, dayKind, prediction, type CurrentCycle } from '../lib/cycle'
import { Button, Card, CardTitle, Field, Segmented, Stepper } from '../components/ui'
import { Enso } from '../components/brand'

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function Cycle() {
  const { state } = useStore()
  const oggi = dateKey()
  const [tab, setTab] = useState<'fase' | 'calendario'>('fase')
  const cur = currentCycle(state.cycle, oggi)

  return (
    <div className="space-y-4 pb-6">
      <Segmented
        options={[
          { value: 'fase', label: 'Fase' },
          { value: 'calendario', label: 'Calendario' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as 'fase' | 'calendario')}
      />
      {tab === 'fase' ? <FaseView cur={cur} onGoCalendar={() => setTab('calendario')} /> : <CalendarView />}
    </div>
  )
}

// ===== Orbita / luna =====
function CycleOrbit({ day, length, size = 132 }: { day: number; length: number; size?: number }) {
  const R = size / 2
  const orbit = R - 8
  // Se il ciclo è in ritardo (day > length) l'indicatore resta sull'ultimo giorno.
  const d = Math.min(Math.max(day, 1), length)
  const dots = Array.from({ length }).map((_, i) => {
    const ang = ((-90 + (i / length) * 360) * Math.PI) / 180
    return {
      cx: R + orbit * Math.cos(ang),
      cy: R + orbit * Math.sin(ang),
      current: i === d - 1,
      passed: i < d,
    }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <defs>
        <radialGradient id="cycle-moon" cx="40%" cy="36%" r="70%">
          <stop offset="0%" stopColor="#33302c" />
          <stop offset="55%" stopColor="#1b1a18" />
          <stop offset="100%" stopColor="#101010" />
        </radialGradient>
      </defs>
      <circle cx={R} cy={R} r={orbit * 0.52} fill="url(#cycle-moon)" />
      <circle cx={R} cy={R} r={orbit * 0.52} fill="none" stroke="#f4f0e7" strokeOpacity="0.18" />
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.current ? 4 : 2}
          fill={d.current ? '#ffffff' : d.passed ? '#d8d3c8' : '#3a3a37'}
          opacity={d.passed ? 0.95 : 0.5}
        />
      ))}
    </svg>
  )
}

// ===== Vista Fase =====
function FaseView({ cur, onGoCalendar }: { cur: CurrentCycle | null; onGoCalendar: () => void }) {
  if (!cur) {
    return (
      <Card className="py-8 text-center">
        <div className="mx-auto mb-4 w-fit">
          <Enso size={64} />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Nessun ciclo registrato. Vai su <span className="text-teal">Calendario</span> e segna il primo
          giorno delle mestruazioni per vedere la tua fase.
        </p>
        <Button variant="soft" className="mx-auto mt-4" onClick={onGoCalendar}>
          Apri il calendario
        </Button>
      </Card>
    )
  }

  const p = cur.phase
  const impatto = [
    { label: 'Energia', value: p.energia },
    { label: 'Forza', value: p.forza },
    { label: 'Recupero', value: p.recupero },
    { label: 'Focus', value: p.focus },
  ]
  const corpo = [
    { label: 'Durata', value: p.durata },
    { label: 'Cosa succede', value: p.cosaSucede },
    { label: 'Sintomi / cambiamenti', value: p.note },
    { label: 'Scopo', value: p.scopo },
  ]

  return (
    <div className="space-y-4">
      {/* Intestazione + orbita */}
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">Fase attuale</div>
          <h1 className="mt-1 font-display text-3xl tracking-tight">{p.nome}</h1>
          <div className="mt-1 text-sm text-muted">
            {cur.late ? (
              <>
                Giorno {cur.day} ·{' '}
                <span className="text-arancio">in ritardo di {cur.day - cur.length}</span>
              </>
            ) : (
              <>
                Giorno {cur.day} di {cur.length}
              </>
            )}
          </div>
          <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-muted">{p.descrizione}</p>
        </div>
        <CycleOrbit day={cur.day} length={cur.length} />
      </div>

      {/* Impatto sull'allenamento */}
      <Card>
        <CardTitle>Impatto sull'allenamento</CardTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {impatto.map((r) => (
            <div key={r.label} className="rounded-2xl bg-white/[0.04] p-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{r.label}</div>
              <div className="mt-1 font-display text-lg tracking-tight text-teal">{r.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 border-l border-teal/40 pl-3 text-sm leading-relaxed text-ink/85">{p.consiglio}</p>
      </Card>

      {/* Il corpo in questa fase */}
      <Card>
        <CardTitle>Il tuo corpo in questa fase</CardTitle>
        <div className="space-y-3">
          {corpo.map((r) => (
            <div key={r.label}>
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{r.label}</div>
              <p className="mt-0.5 text-sm leading-relaxed text-ink/85">{r.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ===== Vista Calendario =====
function CalendarView() {
  const { state, logCycleStart, removeCycleStart, setCycleSettings } = useStore()
  const cycle = state.cycle
  const oggi = dateKey()
  const now = parseKey(oggi)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const pred = prediction(cycle, oggi)

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // lun = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateKey(new Date(year, month, d)))

  const toggleStart = (key: string) => {
    if (key > oggi) return
    if (cycle.starts.includes(key)) removeCycleStart(key)
    else logCycleStart(key)
  }

  return (
    <div className="space-y-4">
      {/* Previsione */}
      {pred ? (
        <Card>
          <CardTitle>Previsione</CardTitle>
          <div className="space-y-1.5 text-sm">
            <Row label="Ultimo ciclo" value={formatLong(parseKey(pred.lastStart))} />
            <Row
              label="Prossimo previsto"
              value={`${formatLong(parseKey(pred.nextStart))} · tra ${Math.max(0, pred.daysToNext)} gg`}
              accent
            />
            <Row label="Ovulazione stimata" value={formatLong(parseKey(pred.ovulation))} />
          </div>
        </Card>
      ) : (
        <p className="rounded-2xl bg-white/[0.04] p-4 text-center text-sm text-muted">
          Tocca un giorno del calendario (fino a oggi) per segnare l'inizio del ciclo.
        </p>
      )}

      {/* Calendario */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-base tracking-tight">{MESI[month]} {year}</span>
          <div className="flex gap-1">
            <button onClick={prev} className="h-8 w-8 rounded-full text-muted">‹</button>
            <button onClick={next} className="h-8 w-8 rounded-full text-muted">›</button>
          </div>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted">
          {GIORNI.map((g) => (
            <div key={g}>{g}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={i} />
            const kind = dayKind(cycle, key)
            const isToday = key === oggi
            const future = key > oggi
            const n = parseKey(key).getDate()
            const cls =
              kind === 'period'
                ? 'bg-teal text-[#1a1012]'
                : kind === 'predicted'
                  ? 'text-teal ring-1 ring-teal/40'
                  : kind === 'ovulation'
                    ? 'text-verde ring-1 ring-verde/40'
                    : 'text-ink'
            return (
              <button
                key={i}
                onClick={() => toggleStart(key)}
                disabled={future}
                className={`flex h-9 items-center justify-center rounded-xl font-mono text-sm tabular transition ${cls} ${
                  isToday ? 'outline outline-1 outline-white/40' : ''
                } ${future ? 'opacity-40' : 'active:scale-90'}`}
              >
                {n}
              </button>
            )
          })}
        </div>
        {/* Legenda */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <Legend cls="bg-teal" label="Mestruazioni" />
          <Legend cls="ring-1 ring-teal/50" label="Previsto" />
          <Legend cls="ring-1 ring-verde/50" label="Ovulazione" />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Tocca un giorno (fino a oggi) per segnare o rimuovere l'inizio del ciclo.
        </p>
      </Card>

      {/* Impostazioni */}
      <Card>
        <CardTitle>Impostazioni ciclo</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durata ciclo (gg)">
            <Stepper
              value={cycle.cycleLength}
              onChange={(v) => setCycleSettings({ cycleLength: v })}
              min={21}
              max={40}
              editable
            />
          </Field>
          <Field label="Durata mestruazioni (gg)">
            <Stepper
              value={cycle.periodLength}
              onChange={(v) => setCycleSettings({ periodLength: v })}
              min={2}
              max={10}
              editable
            />
          </Field>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Con almeno due inizi registrati la durata media viene calcolata dai tuoi dati reali.
        </p>
      </Card>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-mono tabular ${accent ? 'text-teal' : 'text-ink'}`}>{value}</span>
    </div>
  )
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-full ${cls}`} />
      {label}
    </span>
  )
}
