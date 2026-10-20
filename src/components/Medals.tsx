import { useEffect, useId, useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { Button, Card, Sheet } from './ui'
import { Icon } from './brand'
import { dateKey, parseKey } from '../lib/date'
import {
  CATEGORIES,
  INIT_KEY,
  medalById,
  medalLabel,
  medalStatus,
  newlyEarned,
  type MedalStatus,
  type Tier,
} from '../lib/medals'

const TIERS: Record<Tier, { hi: string; mid: string; lo: string; ribbon: string; label: string }> = {
  bronze: { hi: '#f2c59b', mid: '#c4844f', lo: '#7e4c28', ribbon: '#8a5530', label: 'Bronzo' },
  silver: { hi: '#f6f7f9', mid: '#c3c8cf', lo: '#7d838c', ribbon: '#6b7079', label: 'Argento' },
  gold: { hi: '#fbe7a0', mid: '#d9ad45', lo: '#8f6a18', ribbon: '#9a7420', label: 'Oro' },
  platinum: { hi: '#f1f8fa', mid: '#a9cbd5', lo: '#5d828d', ribbon: '#4f6f79', label: 'Platino' },
}
const LOCKED = { hi: '#f1eee8', mid: '#dcd7cd', lo: '#b5aea2', ribbon: '#cfc9be' }

/** Medaglia: nastro + disco metallico col colore del livello e l'icona della categoria. */
export function MedalBadge({
  tier,
  icon,
  earned,
  size = 64,
  label,
}: {
  tier: Tier
  icon: string
  earned: boolean
  size?: number
  label?: string
}) {
  const gid = useId().replace(/:/g, '')
  const c = earned ? TIERS[tier] : LOCKED
  const Ico = Icon[icon as keyof typeof Icon] ?? Icon.star
  return (
    <span className="relative inline-block" style={{ width: size, height: size * 1.2 }}>
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-hidden>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c.hi} />
            <stop offset="55%" stopColor={c.mid} />
            <stop offset="100%" stopColor={c.lo} />
          </linearGradient>
          <linearGradient id={`i${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={earned ? 0.95 : 0.7} />
            <stop offset="100%" stopColor={c.hi} stopOpacity={earned ? 0.9 : 0.6} />
          </linearGradient>
        </defs>
        {/* nastro */}
        <polygon points="30,0 46,0 54,40 38,40" fill={c.ribbon} />
        <polygon points="70,0 54,0 46,40 62,40" fill={c.ribbon} opacity="0.82" />
        {/* disco */}
        <circle cx="50" cy="74" r="40" fill={`url(#g${gid})`} />
        <circle cx="50" cy="74" r="40" fill="none" stroke={c.lo} strokeOpacity="0.35" strokeWidth="1.5" />
        <circle cx="50" cy="74" r="31" fill={`url(#i${gid})`} />
        <circle cx="50" cy="74" r="31" fill="none" stroke={c.lo} strokeOpacity="0.3" strokeWidth="1" />
        {/* riflesso */}
        <path d="M22 62 A30 30 0 0 1 46 38" fill="none" stroke="#ffffff" strokeOpacity={earned ? 0.6 : 0.3} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span
        className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none"
        style={{ top: `${(74 / 120) * 100}%`, color: c.lo }}
      >
        {label ? (
          <>
            <Ico size={Math.max(8, Math.round(size * 0.17))} />
            <span
              className="mt-[2px] font-brand font-medium tabular"
              style={{ fontSize: Math.max(9, Math.round(size * (label.length > 3 ? 0.17 : 0.22))) }}
            >
              {label}
            </span>
          </>
        ) : (
          <Ico size={Math.round(size * 0.34)} />
        )}
      </span>
    </span>
  )
}

const fmtNum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const fmtVal = (n: number, unit?: string) => (unit === 'kg' ? n.toFixed(1) : fmtNum(n))
const fmtDate = (k: string) =>
  parseKey(k).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

// ===================== BACHECA =====================
export function MedalWall() {
  const { state } = useStore()
  const list = useMemo(() => medalStatus(state), [state])
  const [open, setOpen] = useState<MedalStatus | null>(null)
  const earned = list.filter((m) => m.earned)
  const byTier = (t: Tier) => earned.filter((m) => m.def.tier === t).length

  return (
    <div className="space-y-5 pb-4">
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Medaglie</div>
            <div className="mt-1 font-display text-4xl tabular">
              {earned.length}
              <span className="text-lg text-muted"> / {list.length}</span>
            </div>
          </div>
          <div className="flex gap-3 pb-1">
            {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((t) => (
              <div key={t} className="flex flex-col items-center">
                <span className="h-3 w-3 rounded-full" style={{ background: TIERS[t].mid }} />
                <span className="mt-1 font-mono text-xs tabular text-ink">{byTier(t)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full rounded-full bg-teal" style={{ width: `${(earned.length / list.length) * 100}%` }} />
        </div>
      </Card>

      {CATEGORIES.map((cat) => {
        const items = list.filter((m) => m.def.cat === cat)
        return (
          <div key={cat}>
            <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{cat}</div>
            <div className="grid grid-cols-3 gap-2">
              {items.map((m) => (
                <button
                  key={m.def.id}
                  onClick={() => setOpen(m)}
                  className="flex flex-col items-center rounded-2xl bg-surface2 px-1.5 pb-3 pt-2.5 ring-1 ring-black/[0.03] transition active:scale-[0.97]"
                >
                  <MedalBadge label={medalLabel(m.def)} tier={m.def.tier} icon={m.def.icon} earned={m.earned} size={54} />
                  <span className={`mt-1 line-clamp-2 text-center text-[11px] leading-tight ${m.earned ? 'text-ink' : 'text-muted'}`}>
                    {m.def.nome}
                  </span>
                  {!m.earned && (
                    <span className="mt-1.5 h-1 w-3/4 overflow-hidden rounded-full bg-black/[0.06]">
                      <span className="block h-full rounded-full bg-muted/60" style={{ width: `${m.pct * 100}%` }} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {open && (
        <Sheet open onClose={() => setOpen(null)} title={open.def.nome}>
          <div className="flex flex-col items-center pb-2 text-center">
            <MedalBadge label={medalLabel(open.def)} tier={open.def.tier} icon={open.def.icon} earned={open.earned} size={120} />
            <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              {TIERS[open.def.tier].label} · {open.def.cat}
            </div>
            <p className="mt-2 text-sm text-ink">{open.def.desc}</p>
            {open.earned ? (
              <p className="mt-4 rounded-full bg-teal/[0.08] px-4 py-1.5 text-sm font-medium text-teal">
                {open.date ? `Conquistata il ${fmtDate(open.date)}` : 'Conquistata'}
              </p>
            ) : (
              <div className="mt-4 w-full">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>Progresso</span>
                  <span className="font-mono tabular">
                    {fmtVal(open.value, open.def.unit)} / {fmtVal(open.def.goal, open.def.unit)} {open.def.unit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${open.pct * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </div>
  )
}

/** Riepilogo compatto per la scheda "Io": conteggio + ultime conquistate. */
export function MedalTeaser({ onOpen }: { onOpen: () => void }) {
  const { state } = useStore()
  const list = useMemo(() => medalStatus(state), [state])
  const earned = list.filter((m) => m.earned)
  const recent = [...earned].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 4)
  const next = list
    .filter((m) => !m.earned)
    .sort((a, b) => b.pct - a.pct)[0]
  return (
    <Card>
      <button onClick={onOpen} className="w-full text-left">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Medaglie</span>
          <span className="text-xs text-teal">
            {earned.length} / {list.length} →
          </span>
        </div>
        <div className="flex items-center gap-2">
          {recent.length ? (
            recent.map((m) => <MedalBadge key={m.def.id} label={medalLabel(m.def)} tier={m.def.tier} icon={m.def.icon} earned size={40} />)
          ) : (
            <span className="text-sm text-muted">Ancora nessuna: la prima è vicina.</span>
          )}
        </div>
        {next && (
          <p className="mt-3 text-xs text-muted">
            Prossima: <span className="text-ink">{next.def.nome}</span> · {Math.round(next.pct * 100)}%
          </p>
        )}
      </button>
    </Card>
  )
}

// ===================== CONQUISTA =====================
/**
 * Controlla i dati e, quando una medaglia viene raggiunta, la registra e la festeggia.
 * Al primo avvio assegna in silenzio quelle già guadagnate in passato.
 */
export function MedalWatcher() {
  const { state, readOnly, awardMedals } = useStore()
  const [queue, setQueue] = useState<string[]>([])

  useEffect(() => {
    if (readOnly) return
    const t = window.setTimeout(() => {
      const ids = newlyEarned(state)
      const first = !(INIT_KEY in (state.medals ?? {}))
      if (first) {
        awardMedals(ids, '', INIT_KEY)
        return
      }
      if (!ids.length) return
      awardMedals(ids, dateKey())
      setQueue((q) => [...q, ...ids])
      try {
        navigator.vibrate?.([60, 40, 120])
      } catch {
        /* noop */
      }
    }, 1500)
    return () => window.clearTimeout(t)
  }, [state, readOnly, awardMedals])

  const cur = queue[0] ? medalById(queue[0]) : null
  if (!cur) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={() => setQueue((q) => q.slice(1))} />
      <div className="animate-pop relative w-full max-w-[340px] rounded-[28px] bg-surface2 px-6 pb-6 pt-7 text-center shadow-[0_20px_60px_-20px_rgba(33,29,25,0.35)]">
        <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted">Nuova medaglia</div>
        <div className="relative mx-auto mt-4 flex h-[170px] w-[170px] items-center justify-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(closest-side, ${TIERS[cur.tier].hi}, transparent 70%)`,
              animation: 'auraPulse 2.4s ease-in-out infinite',
            }}
          />
          <span className="relative">
            <MedalBadge label={medalLabel(cur)} tier={cur.tier} icon={cur.icon} earned size={124} />
          </span>
        </div>
        <h3 className="mt-2 font-display text-2xl tracking-tight text-ink">{cur.nome}</h3>
        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{TIERS[cur.tier].label}</div>
        <p className="mt-3 text-sm text-ink/80">{cur.desc}</p>
        <Button className="mt-5 w-full" onClick={() => setQueue((q) => q.slice(1))}>
          {queue.length > 1 ? `Avanti (${queue.length - 1})` : 'Continua'}
        </Button>
      </div>
    </div>
  )
}
