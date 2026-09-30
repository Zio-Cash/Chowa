import { useId, type ReactNode } from 'react'

/**
 * Enso — il logo del dojo, disegnato in SVG (nessun file esterno). Un cerchio
 * pennellato aperto, in rosa, con bordo irregolare "a pennello" (turbolenza).
 * Compare con dissolvenza + leggero ingrandimento; con `spin` ruota lentamente.
 */
export function Enso({
  size = 64,
  className = '',
  spin = false,
}: {
  size?: number
  className?: string
  spin?: boolean
}) {
  const uid = useId().replace(/[:]/g, '')
  const grad = `enso-grad-${uid}`
  const brush = `enso-brush-${uid}`
  const anim = `logo-reveal ${spin ? 'logo-spin' : ''}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden
      className={`${anim} select-none ${className}`}
    >
      <defs>
        <linearGradient id={grad} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#e9e4da" />
          <stop offset="100%" stopColor="#9a958c" />
        </linearGradient>
        {/* Bordo irregolare, effetto pennello */}
        <filter id={brush} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" />
        </filter>
      </defs>
      <g filter={`url(#${brush})`} transform="rotate(-20 50 50)">
        {/* tratto principale, aperto in basso a sinistra */}
        <circle
          cx="50"
          cy="50"
          r="37"
          fill="none"
          stroke={`url(#${grad})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="196 46"
          strokeDashoffset="18"
        />
        {/* seconda passata sottile per dare corpo al pennello */}
        <circle
          cx="50"
          cy="50"
          r="37"
          fill="none"
          stroke={`url(#${grad})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="150 88"
          strokeDashoffset="6"
          opacity="0.55"
        />
      </g>
    </svg>
  )
}

/** Wordmark Chōwa (調和) con tagline. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="font-brand text-3xl font-extralight tracking-[0.2em] text-ink">Chōwa</span>
      <span className="mt-1.5 font-display text-lg tracking-[0.3em] text-teal/80">調和</span>
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.34em] text-muted">
        Strength in Balance
      </span>
    </div>
  )
}

/** Piccolo accento kanji per i titoli di sezione. */
export function Kanji({ char, className = '' }: { char: string; className?: string }) {
  return (
    <span className={`font-display text-teal/70 leading-none ${className}`} aria-hidden>
      {char}
    </span>
  )
}

/**
 * Set minimo di icone lineari (stroke) usate al posto delle emoji.
 * currentColor => ereditano il colore del testo.
 */
type IconProps = { size?: number; className?: string }
const svg = (path: ReactNode, size = 20, className = '') => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {path}
  </svg>
)

export const Icon = {
  home: ({ size, className }: IconProps) =>
    svg(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></>, size, className),
  practice: ({ size, className }: IconProps) =>
    svg(<><circle cx="12" cy="5" r="2" /><path d="M5 21l3-6 4-2 2 3 3 1" /><path d="M8 15l-1-4 5-1 3 2" /></>, size, className),
  progress: ({ size, className }: IconProps) =>
    svg(<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>, size, className),
  journey: ({ size, className }: IconProps) =>
    svg(<><circle cx="12" cy="12" r="9" /><path d="M12 12l3-5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>, size, className),
  balance: ({ size, className }: IconProps) =>
    svg(<><circle cx="12" cy="12" r="9" /><path d="M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9" /></>, size, className),
  bowl: ({ size, className }: IconProps) =>
    svg(<><path d="M3 11h18" /><path d="M4 11a8 8 0 0 0 16 0" /><path d="M9 7c0-1.5 1-2.5 1.5-3M13 7c0-1.5 1-2.5 1.5-3" /></>, size, className),
  weight: ({ size, className }: IconProps) =>
    svg(<><path d="M6 8h12l1.5 11a1 1 0 0 1-1 1.2H5.5a1 1 0 0 1-1-1.2L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>, size, className),
  drop: ({ size, className }: IconProps) =>
    svg(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />, size, className),
  steps: ({ size, className }: IconProps) =>
    svg(<><path d="M7 4c1.5 0 2 1.5 2 4s.5 5-1.5 5S5 11 5 8s.5-4 2-4Z" /><path d="M16 8c1.5 0 2 1.5 2 4s.5 5-1.5 5-2-2-2-5 .5-4 1.5-4Z" /></>, size, className),
  flame: ({ size, className }: IconProps) =>
    svg(<path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0 3 2 3 2 6a4 4 0 0 1-8 0c0-4 4-6 4-13Z" />, size, className),
  moon: ({ size, className }: IconProps) =>
    svg(<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />, size, className),
  person: ({ size, className }: IconProps) =>
    svg(<><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>, size, className),
  // Figura seduta in meditazione: testa + base arrotondata (non una persona in piedi).
  seated: ({ size = 20, className = '' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="6.6" r="2.4" />
      <path d="M5 18.4c0-4.1 3.1-7 7-7s7 2.9 7 7a.6.6 0 0 1-.6.6H5.6a.6.6 0 0 1-.6-.6Z" />
    </svg>
  ),
  search: ({ size, className }: IconProps) =>
    svg(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.2-4.2" /></>, size, className),
  plus: ({ size, className }: IconProps) =>
    svg(<><path d="M12 5v14" /><path d="M5 12h14" /></>, size, className),
  close: ({ size, className }: IconProps) =>
    svg(<><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>, size, className),
  trash: ({ size, className }: IconProps) =>
    svg(<><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" /></>, size, className),
  edit: ({ size, className }: IconProps) =>
    svg(<><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></>, size, className),
  chevronUp: ({ size, className }: IconProps) => svg(<path d="M6 15l6-6 6 6" />, size, className),
  chevronDown: ({ size, className }: IconProps) => svg(<path d="M6 9l6 6 6-6" />, size, className),
  cart: ({ size, className }: IconProps) =>
    svg(<><path d="M4 5h2l1.6 9.2a1 1 0 0 0 1 .8h7.8a1 1 0 0 0 1-.8L19 8H6.2" /><circle cx="9" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></>, size, className),
  db: ({ size, className }: IconProps) =>
    svg(<><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>, size, className),
  dots: ({ size = 20, className = '' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  ),
  play: ({ size, className }: IconProps) => svg(<path d="M7 5l12 7-12 7V5Z" />, size, className),
  pause: ({ size, className }: IconProps) => svg(<><path d="M9 5v14" /><path d="M15 5v14" /></>, size, className),
  reset: ({ size, className }: IconProps) =>
    svg(<><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v3.5h3.5" /></>, size, className),
  check: ({ size, className }: IconProps) => svg(<path d="M4 12l5 5L20 6" />, size, className),
  starOutline: ({ size, className }: IconProps) =>
    svg(<path d="M12 3.6l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.9l-5.2 2.73.99-5.8L3.58 9.72l5.82-.85L12 3.6Z" />, size, className),
  star: ({ size = 20, className = '' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3.6l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.9l-5.2 2.73.99-5.8L3.58 9.72l5.82-.85L12 3.6Z" />
    </svg>
  ),
}
