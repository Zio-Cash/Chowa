import type { ReactNode } from 'react'

const COLORS = {
  prot: '#ece6d9',
  carb: '#cbb48f',
  fat: '#8f8a81',
}

/** Anello a valore singolo con contenuto centrale. */
export function Ring({
  value,
  max,
  size = 160,
  stroke = 16,
  color = '#f4f0e7',
  children,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff14" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

/** Donut a segmenti dei macro (per kcal). */
export function MacroDonut({
  proteine,
  carboidrati,
  grassi,
  size = 160,
  stroke = 16,
  children,
}: {
  proteine: number
  carboidrati: number
  grassi: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const segs = [
    { v: proteine * 4, color: COLORS.prot },
    { v: carboidrati * 4, color: COLORS.carb },
    { v: grassi * 9, color: COLORS.fat },
  ]
  const total = segs.reduce((a, b) => a + b.v, 0)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff14" strokeWidth={stroke} />
        {total > 0 &&
          segs.map((s, i) => {
            const frac = s.v / total
            const len = frac * c
            const off = acc
            acc += len
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-off}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
