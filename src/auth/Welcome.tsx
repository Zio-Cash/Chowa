import InstallButton from '../components/InstallButton'
import { quoteOfDay } from '../lib/dojo'

const rise = (delay: number) => ({ animationDelay: `${delay}s`, animationFillMode: 'both' as const })

// Kanji resi con un serif giapponese (stile pennello) per l'eleganza.
const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Songti SC", serif'

export default function Welcome({
  onEnter,
  inApp,
  authError,
  busy = false,
  needsSignIn = false,
}: {
  onEnter: () => void
  inApp: boolean
  authError: string | null
  busy?: boolean
  needsSignIn?: boolean
}) {
  const quote = quoteOfDay()

  return (
    <div className="flex min-h-dvh justify-center bg-bg">
      <div className="relative w-full max-w-[480px] overflow-hidden">
        {/* Alone radiale dietro il kanji */}
        <div
          className="kanji-aura pointer-events-none absolute inset-x-0 top-[30%] mx-auto h-[60vh] max-h-[520px] w-[80%]"
          style={{
            background:
              'radial-gradient(closest-side, rgba(33, 29, 25,0.08), rgba(33, 29, 25,0.03) 55%, transparent 72%)',
          }}
        />

        {/* Contenuto. Se non sei loggata, tocca lo schermo per entrare. */}
        <div
          onClick={needsSignIn ? onEnter : undefined}
          className={`relative z-10 flex min-h-dvh flex-col items-center px-7 ${
            needsSignIn ? 'cursor-pointer' : ''
          }`}
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
          }}
        >
          <div className="flex-1" />

          {/* 調和 — protagonista */}
          <div
            className="kanji-glow flex items-center justify-center gap-2"
            style={{ fontFamily: MINCHO }}
          >
            <span
              className="kanji-hero leading-none"
              style={{ fontSize: 'clamp(88px, 27vw, 128px)', animationDelay: '0s, 1.2s' }}
            >
              調
            </span>
            <span
              className="kanji-hero leading-none"
              style={{ fontSize: 'clamp(88px, 27vw, 128px)', animationDelay: '0.22s, 1.2s' }}
            >
              和
            </span>
          </div>

          {/* Wordmark + tagline + proverbio */}
          <div className="mt-8 flex flex-col items-center text-center">
            <div className="animate-fade-up h-5 w-px bg-teal/45" style={rise(0.9)} />
            <h1
              className="animate-fade-up mt-4 font-brand text-3xl font-extralight tracking-[0.42em] text-ink"
              style={rise(1.0)}
            >
              CHOWA
            </h1>
            <p
              className="animate-fade-up mt-3 text-[11px] font-medium uppercase tracking-[0.34em] text-muted"
              style={rise(1.12)}
            >
              Strength in Balance
            </p>
            <p
              className="animate-fade-up mt-5 max-w-[26ch] font-quote text-sm font-extralight italic leading-snug text-ink/70"
              style={rise(1.5)}
            >
              {quote}
            </p>
          </div>

          <div className="flex-1" />

          {inApp && (
            <div
              className="mb-4 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-700"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1 font-semibold">Apri in Safari</p>
              <p className="text-amber-700/90">
                Stai usando il browser interno di un'altra app: tocca i ··· e scegli “Apri in
                Safari”, poi entra da lì.
              </p>
            </div>
          )}

          {/* Stato d'ingresso (nessun pulsante) */}
          <div className="animate-fade-up flex min-h-[20px] items-center justify-center" style={rise(1.9)}>
            {busy ? (
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted/30 border-t-muted" />
                Accesso…
              </span>
            ) : needsSignIn ? (
              <span className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Tocca per entrare
              </span>
            ) : (
              <span
                className="h-1.5 w-1.5 rounded-full bg-teal"
                style={{ animation: 'shimmer 1.6s ease-in-out infinite' }}
                aria-hidden
              />
            )}
          </div>

          {authError && <p className="mt-3 text-center text-xs text-red-500">{authError}</p>}

          <div
            className="animate-fade-up mt-4 flex justify-center"
            style={rise(2.2)}
            onClick={(e) => e.stopPropagation()}
          >
            <InstallButton />
          </div>
        </div>
      </div>
    </div>
  )
}
