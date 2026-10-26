import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { Card, Sheet } from './ui'
import { addDays, dateKey, MESI_BREVI, mondayOf, parseKey, rangeLabel } from '../lib/date'
import { GOALS, has, lastWeeks, monthStat, streak } from '../lib/mlw'

const INIZ = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const MESI_L = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const todayDate = () => parseKey(dateKey())
const giorni = (n: number) => (n === 1 ? '1 giorno di fila' : `${n} giorni di fila`)

function Check({ on, color, size = 30 }: { on: boolean; color: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[9px] border-2 transition-colors"
      style={{ width: size, height: size, borderColor: color, background: on ? color : 'transparent' }}
    >
      {on && (
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden>
          <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#faf7f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

// ===================== CARD HOME =====================
export function MlwCard() {
  const { state, toggleMlw } = useStore()
  const [open, setOpen] = useState(false)
  const log = state.mlw ?? {}
  const today = todayDate()
  const tk = dateKey(today)
  const score = GOALS.filter((_, i) => has(log, tk, i)).length

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Move · Learn · Work</span>
        <span className="font-display text-2xl tabular">
          {score}
          <span className="text-base text-muted">/3</span>
        </span>
      </div>
      <div className="space-y-2">
        {GOALS.map((g, i) => {
          const on = has(log, tk, i)
          return (
            <button
              key={g.k}
              onClick={() => toggleMlw(tk, i)}
              aria-pressed={on}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99]"
              style={{
                background: on ? `${g.color}14` : 'transparent',
                boxShadow: `inset 0 0 0 1px ${on ? `${g.color}66` : 'rgba(33,29,25,0.08)'}`,
              }}
            >
              <Check on={on} color={g.color} />
              <span className="flex-1 font-display text-lg tracking-tight">{g.n}</span>
              <span className="font-mono text-xs text-muted tabular">{giorni(streak(log, i, today))}</span>
            </button>
          )
        })}
      </div>
      <button onClick={() => setOpen(true)} className="mt-3 text-xs text-teal">
        Settimana e andamento →
      </button>
      {open && (
        <Sheet open onClose={() => setOpen(false)} title="Move · Learn · Work">
          <MlwFull />
        </Sheet>
      )}
    </Card>
  )
}

// ===================== VISTA COMPLETA =====================
export function MlwFull() {
  const { state, toggleMlw } = useStore()
  const log = state.mlw ?? {}
  const today = todayDate()
  const cw = mondayOf(today)
  const [weekStart, setWeekStart] = useState<Date>(cw)
  const isCurWeek = weekStart.getTime() >= cw.getTime()

  const weeks = useMemo(() => lastWeeks(log, today), [log, today.getTime()]) // eslint-disable-line react-hooks/exhaustive-deps
  const [selWeek, setSelWeek] = useState<string>(dateKey(cw))
  const sel = weeks.find((w) => w.key === selWeek && w.den > 0) ?? weeks[weeks.length - 1]
  const month = monthStat(log, today)
  const anyData = Object.keys(log).length > 0

  return (
    <div className="space-y-5 pb-2">
      {/* ---- Settimana ---- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base">Settimana</h3>
          <div className="flex items-center gap-1.5">
            <NavBtn label="Settimana precedente" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</NavBtn>
            <span className="min-w-[104px] text-center font-mono text-xs tabular">
              {rangeLabel(weekStart, addDays(weekStart, 6))}
            </span>
            <NavBtn label="Settimana successiva" disabled={isCurWeek} onClick={() => setWeekStart(addDays(weekStart, 7))}>›</NavBtn>
          </div>
        </div>
        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] items-center gap-1.5">
          <span />
          {INIZ.map((l, j) => {
            const d = addDays(weekStart, j)
            const isT = d.getTime() === today.getTime()
            return (
              <span key={j} className={`grid justify-items-center text-[11px] leading-tight ${isT ? 'font-semibold text-ink' : 'text-muted'}`}>
                <span>{l}</span>
                <span className="font-mono tabular">{d.getDate()}</span>
              </span>
            )
          })}
          {GOALS.map((g, i) => (
            <Row key={g.k}>
              <span className="text-[13px] font-medium">{g.n}</span>
              {INIZ.map((_, j) => {
                const d = addDays(weekStart, j)
                const k = dateKey(d)
                if (d > today)
                  return <span key={j} className="aspect-square w-full max-w-[40px] justify-self-center rounded-lg border-[1.5px] border-dashed opacity-40" style={{ borderColor: g.color }} />
                const on = has(log, k, i)
                const isT = d.getTime() === today.getTime()
                return (
                  <button
                    key={j}
                    onClick={() => toggleMlw(k, i)}
                    aria-pressed={on}
                    aria-label={`${g.n}, ${d.getDate()} ${MESI_L[d.getMonth()]}: ${on ? 'fatto' : 'non fatto'}`}
                    className={`aspect-square w-full max-w-[40px] justify-self-center rounded-lg border-[1.5px] transition-colors ${isT ? 'outline outline-2 outline-offset-2 outline-black/30' : ''}`}
                    style={{ borderColor: on ? g.color : 'rgba(33,29,25,0.14)', background: on ? g.color : 'transparent' }}
                  />
                )
              })}
            </Row>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-muted">
          Tocca una casella per segnare o togliere un giorno. Con ‹ torni indietro e riporti le settimane passate.
        </p>
      </section>

      {/* ---- Andamento ---- */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-display text-base">Andamento settimanale</h3>
          <span className="font-mono text-[11px] text-muted">% di giorni fatti</span>
        </div>
        {!anyData ? (
          <p className="text-sm text-muted">Le barre compaiono quando segni i primi giorni: ogni gruppo è una settimana.</p>
        ) : (
          <>
            <div className="mb-2 flex gap-3 text-xs text-muted">
              {GOALS.map((g) => (
                <span key={g.k} className="inline-flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />
                  {g.n}
                </span>
              ))}
            </div>
            <div className="grid h-36 grid-cols-[30px_minmax(0,1fr)]">
              <div className="relative font-mono text-[10px] text-muted">
                <span className="absolute right-1.5 top-0 -translate-y-1/2">100%</span>
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2">50%</span>
                <span className="absolute bottom-0 right-1.5 translate-y-1/2">0</span>
              </div>
              <div className="relative">
                <span className="absolute inset-x-0 top-0 h-px bg-black/[0.06]" />
                <span className="absolute inset-x-0 top-1/2 h-px bg-black/[0.06]" />
                <span className="absolute inset-x-0 bottom-0 h-px bg-black/[0.15]" />
                <div className="absolute inset-0 grid grid-cols-8 gap-1">
                  {weeks.map((w) =>
                    w.den ? (
                      <button
                        key={w.key}
                        onClick={() => setSelWeek(w.key)}
                        className={`flex h-full items-end justify-center gap-[2px] rounded-t-md px-0.5 ${w.key === sel.key ? 'bg-black/[0.05]' : ''}`}
                        aria-label={`Settimana del ${w.start.getDate()} ${MESI_L[w.start.getMonth()]}`}
                      >
                        {GOALS.map((g, i) => (
                          <span
                            key={g.k}
                            className="w-[30%] max-w-[8px] rounded-t-[3px]"
                            style={{ height: `${Math.round((w.done[i] / w.den) * 100)}%`, minHeight: 2, background: g.color }}
                          />
                        ))}
                      </button>
                    ) : (
                      <span key={w.key} />
                    ),
                  )}
                </div>
              </div>
            </div>
            <div className="ml-[30px] mt-1.5 grid grid-cols-8 gap-1 text-center font-mono text-[10px] leading-tight text-muted">
              {weeks.map((w) => (
                <span key={w.key} className={w.key === dateKey(cw) ? 'font-semibold text-ink' : ''}>
                  {w.start.getDate()}
                  <br />
                  {MESI_BREVI[w.start.getMonth()].toLowerCase()}
                </span>
              ))}
            </div>
            {sel.den > 0 && (
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <b className="font-medium text-ink">{rangeLabel(sel.start, addDays(sel.start, 6))}</b>
                {GOALS.map((g, i) => (
                  <span key={g.k} className="inline-flex items-center gap-1.5">
                    <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: g.color }} />
                    {g.n} {sel.done[i]}/{sel.den}
                  </span>
                ))}
              </p>
            )}
          </>
        )}
      </section>

      {/* ---- Mese ---- */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-display text-base">{MESI_L[today.getMonth()].replace(/^./, (c) => c.toUpperCase())}</h3>
          <span className="font-mono text-[11px] text-muted">giorni fatti</span>
        </div>
        {month.den === 0 ? (
          <p className="text-sm text-muted">Qui vedi quanti giorni hai fatto ogni obiettivo nel mese, così capisci quale stai trascurando.</p>
        ) : (
          <div className="space-y-2.5">
            {GOALS.map((g, i) => {
              const pct = Math.round((month.done[i] / month.den) * 100)
              return (
                <div key={g.k} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2.5">
                  <span className="text-[13px] font-medium">{g.n}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                    <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: g.color }} />
                  </span>
                  <span className="min-w-[78px] text-right font-mono text-xs text-muted tabular">
                    {month.done[i]}/{month.den} · {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function NavBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-muted ring-1 ring-black/[0.08] disabled:opacity-30"
    >
      {children}
    </button>
  )
}
