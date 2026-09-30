import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './brand'

export function Card({
  children,
  className = '',
  gradient,
}: {
  children: ReactNode
  className?: string
  gradient?: string
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] p-5 shadow-[0_16px_50px_-20px_rgba(0,0,0,0.7)] ${
        gradient ?? 'bg-surface2 ring-1 ring-white/[0.04]'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, icon }: { children: ReactNode; icon?: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 font-display text-[15px] font-medium tracking-wide text-ink">
      {icon && (
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-base">
          {icon}
        </span>
      )}
      {children}
    </h2>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger'
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium tracking-wide transition active:scale-[0.98] disabled:opacity-40'
  const styles: Record<string, string> = {
    primary: 'bg-teal text-[#1a1012] shadow-[0_10px_30px_-12px_rgba(244,240,231,0.35)]',
    soft: 'bg-teal/[0.12] text-teal',
    ghost: 'bg-white/[0.05] text-ink',
    danger: 'bg-red-500/10 text-red-300',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  editable = false,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  editable?: boolean
}) {
  const clamp = (v: number) => {
    let n = Math.round(v * 100) / 100
    if (min != null) n = Math.max(min, n)
    if (max != null) n = Math.min(max, n)
    return n
  }

  // Buffer di testo: consente di digitare decimali con virgola o punto
  // (es. "150,5") senza che il valore venga riscritto a ogni tasto.
  const [text, setText] = useState(String(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(String(value))
  }, [value])

  const handleText = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.,]/g, '')
    setText(cleaned)
    if (cleaned.trim() === '') return
    const n = parseFloat(cleaned.replace(',', '.'))
    // niente clamp mentre digiti: si applica all'uscita dal campo
    if (!Number.isNaN(n)) onChange(n)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="h-9 w-9 shrink-0 rounded-full bg-white/[0.07] text-lg font-bold text-ink active:scale-90"
      >
        −
      </button>
      {editable ? (
        <div className="flex min-w-[4rem] items-center justify-center rounded-xl bg-white/[0.06] px-1">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onFocus={() => {
              focused.current = true
            }}
            onBlur={() => {
              focused.current = false
              const n = parseFloat(text.replace(',', '.'))
              const v = Number.isNaN(n) ? min ?? 0 : clamp(n)
              onChange(v)
              setText(String(v))
            }}
            onChange={(e) => handleText(e.target.value)}
            className="w-12 min-h-[36px] bg-transparent text-center font-mono text-base font-bold tabular outline-none"
          />
          {suffix && <span className="text-xs text-muted">{suffix}</span>}
        </div>
      ) : (
        <span className="min-w-[3.5rem] text-center font-mono text-base font-bold tabular">
          {value}
          {suffix && <span className="ml-0.5 text-xs text-muted">{suffix}</span>}
        </span>
      )}
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="h-9 w-9 shrink-0 rounded-full bg-white/[0.07] text-lg font-bold text-ink active:scale-90"
      >
        +
      </button>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  className = '',
  commitOnBlur = false,
}: {
  value: number | ''
  onChange: (v: number) => void
  suffix?: string
  placeholder?: string
  className?: string
  /**
   * Se true, `onChange` scatta solo all'uscita dal campo (blur), non ad ogni
   * tasto. Utile dove ogni onChange scrive sullo store (Peso/Passi): evita un
   * update globale per ogni battitura.
   */
  commitOnBlur?: boolean
}) {
  // Buffer di testo locale: consente di digitare valori decimali con la
  // virgola o il punto (es. "70,5") senza che il valore venga azzerato a ogni
  // tasto. Il prop numerico viene risincronizzato solo quando l'input non è
  // attivo (cambio giorno, reset, ecc.).
  const [text, setText] = useState(value === '' ? '' : String(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(value === '' ? '' : String(value))
  }, [value])

  const parse = (raw: string): number => {
    const cleaned = raw.trim()
    if (cleaned === '') return 0
    const n = parseFloat(cleaned.replace(',', '.'))
    return Number.isNaN(n) ? (value === '' ? 0 : value) : n
  }

  const handle = (raw: string) => {
    // accetta solo cifre e un separatore decimale
    const cleaned = raw.replace(/[^0-9.,]/g, '')
    setText(cleaned)
    if (commitOnBlur) return // in modalità "commit al blur" non scriviamo live
    if (cleaned.trim() === '') {
      onChange(0)
      return
    }
    const n = parseFloat(cleaned.replace(',', '.'))
    if (!Number.isNaN(n)) onChange(n)
  }

  return (
    <div className={`flex items-center rounded-2xl bg-white/[0.05] px-4 ring-1 ring-white/[0.04] focus-within:ring-teal/30 ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onFocus={() => {
          focused.current = true
        }}
        onBlur={() => {
          focused.current = false
          if (commitOnBlur) {
            const v = parse(text)
            onChange(v)
            setText(v === 0 && text.trim() === '' ? '' : String(v))
          } else {
            setText(value === '' ? '' : String(value))
          }
        }}
        onChange={(e) => handle(e.target.value)}
        className="min-h-[44px] w-full bg-transparent text-right font-mono text-base font-bold tabular outline-none"
      />
      {suffix && <span className="ml-1 text-sm text-muted">{suffix}</span>}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.05] p-1 ring-1 ring-white/[0.04]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-[40px] flex-1 whitespace-nowrap rounded-xl px-3 text-sm font-medium tracking-wide transition ${
            value === o.value ? 'bg-surface2 text-teal shadow-sm' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  flush = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Se true, il corpo non scorre: lo scroll lo gestiscono i figli (header fisso). */
  flush?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`animate-fade-up relative flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-surface p-5 pb-8 ring-1 ring-white/[0.05] ${
          flush ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h3 className="font-display text-xl font-medium tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] active:scale-90"
          >
            <Icon.close size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
