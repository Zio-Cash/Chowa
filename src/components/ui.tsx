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
      className={`rounded-[var(--radius-card)] p-5 shadow-[0_4px_16px_-12px_rgba(33,29,25,0.12)] ${
        gradient ?? 'bg-surface2 ring-1 ring-black/[0.04]'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 font-display text-base tracking-wide text-ink">{children}</h2>
}

/** Etichetta piccola in maiuscolo: unica per tutta l'app. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] font-medium uppercase tracking-[0.16em] text-muted ${className}`}>{children}</div>
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
    primary: 'bg-teal text-[#faf7f1] shadow-[0_10px_30px_-12px_rgba(33,29,25,0.35)]',
    soft: 'bg-teal/[0.12] text-teal',
    ghost: 'bg-black/[0.05] text-ink',
    danger: 'bg-shu/10 text-shu',
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
    // mentre digiti si salva solo un valore già nei limiti (es. "2" mentre
    // scrivi "28" non deve finire nello store); il resto si sistema al blur
    if (!Number.isNaN(n) && n === clamp(n)) onChange(n)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        aria-label="Decrease"
        className="h-10 w-10 shrink-0 rounded-full bg-black/[0.07] text-lg font-bold text-ink transition active:scale-90"
      >
        −
      </button>
      {editable ? (
        <div className="flex min-w-[4rem] items-center justify-center rounded-xl bg-black/[0.06] px-1">
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
        aria-label="Increase"
        className="h-10 w-10 shrink-0 rounded-full bg-black/[0.07] text-lg font-bold text-ink transition active:scale-90"
      >
        +
      </button>
    </div>
  )
}

// <div> e non <label>: un'etichetta "clicca" il primo pulsante che contiene,
// quindi toccare il titolo cambiava la scelta (Sesso, Categoria, Serie…).
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{label}</span>
      {children}
    </div>
  )
}

export function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  className = '',
  commitOnBlur = false,
  integer = false,
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
  /**
   * Numeri interi (passi, kcal): punti e virgole sono separatori delle
   * migliaia, così "10.000" vale 10000 e non 10.
   */
  integer?: boolean
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

  const toNum = (raw: string) =>
    integer ? parseInt(raw.replace(/[^0-9]/g, ''), 10) : parseFloat(raw.replace(',', '.'))

  const parse = (raw: string): number => {
    const cleaned = raw.trim()
    if (cleaned === '') return 0
    const n = toNum(cleaned)
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
    const n = toNum(cleaned)
    if (!Number.isNaN(n)) onChange(n)
  }

  return (
    <div className={`flex items-center rounded-2xl bg-black/[0.05] px-4 ring-1 ring-black/[0.04] focus-within:ring-teal/30 ${className}`}>
      <input
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
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

/** Frecce ‹ › per mese/anno: stesse ovunque. */
export function NavArrows({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  onPrev: () => void
  onNext: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
}) {
  const cls =
    'flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] text-muted transition active:bg-black/[0.08] disabled:opacity-25'
  return (
    <div className="flex gap-1">
      <button onClick={onPrev} disabled={prevDisabled} aria-label="Previous" className={cls}>
        <Icon.chevronLeft size={16} />
      </button>
      <button onClick={onNext} disabled={nextDisabled} aria-label="Next" className={cls}>
        <Icon.chevronRight size={16} />
      </button>
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
    <div className="flex gap-1 overflow-x-auto rounded-2xl bg-black/[0.05] p-1 ring-1 ring-black/[0.04]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-[40px] flex-1 whitespace-nowrap rounded-xl px-3 text-sm font-medium tracking-wide transition active:scale-[0.97] ${
            value === o.value ? 'bg-surface2 text-teal shadow-sm' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Blocco dello scroll della pagina sotto ai fogli (contatore: fogli annidati).
let sheetLocks = 0
function lockScroll() {
  if (sheetLocks++ === 0) document.documentElement.style.overflow = 'hidden'
  return () => {
    if (--sheetLocks === 0) document.documentElement.style.overflow = ''
  }
}

const SHEET_OUT_MS = 220

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
  // Il foglio resta montato durante l'animazione di uscita. La chiusura dal
  // pulsante o dallo sfondo anima prima e poi avvisa il genitore, così scorre
  // via anche quando il genitore lo smonta subito ({x && <Sheet …/>}).
  const [shown, setShown] = useState(open)
  const [closing, setClosing] = useState(false)
  if (open && !shown) {
    setShown(true)
    setClosing(false)
  }
  if (!open && shown && !closing) setClosing(true)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  const internal = useRef(false)

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => {
      setShown(false)
      setClosing(false)
      if (internal.current) {
        internal.current = false
        onCloseRef.current()
      }
    }, SHEET_OUT_MS)
    return () => clearTimeout(t)
  }, [closing])

  useEffect(() => {
    if (!shown) return
    const unlock = lockScroll()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        internal.current = true
        setClosing(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unlock()
      window.removeEventListener('keydown', onKey)
    }
  }, [shown])

  if (!shown) return null
  const requestClose = () => {
    if (closing) return
    internal.current = true
    setClosing(true)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 touch-none bg-black/40 ${closing ? 'backdrop-out' : 'backdrop-in'}`}
        onClick={requestClose}
      />
      <div
        className={`relative flex max-h-[88dvh] w-full max-w-[480px] flex-col overscroll-contain rounded-t-[28px] bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] ring-1 ring-black/[0.05] ${
          flush ? 'overflow-hidden' : 'overflow-y-auto'
        } ${closing ? 'sheet-out' : 'sheet-in'}`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h3 className="font-display text-xl tracking-wide">{title}</h3>
          <button
            onClick={requestClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] transition active:scale-90"
          >
            <Icon.close size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
