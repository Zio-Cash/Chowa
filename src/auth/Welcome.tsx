const rise = (delay: number) => ({ animationDelay: `${delay}s`, animationFillMode: 'both' as const })

// Kanji resi con un serif giapponese (stile pennello) per l'eleganza.
const MINCHO =
  '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Songti SC", serif'

export default function Welcome({
  onEnter,
  inApp,
  authError,
  busy = false,
}: {
  onEnter: () => void
  inApp: boolean
  authError: string | null
  busy?: boolean
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-bg">
      <div className="relative w-full max-w-[480px] overflow-hidden">
        {/* Alone radiale perla dietro il kanji */}
        <div
          className="kanji-aura pointer-events-none absolute inset-x-0 top-[30%] mx-auto h-[60vh] max-h-[520px] w-[80%]"
          style={{
            background:
              'radial-gradient(closest-side, rgba(244,240,231,0.10), rgba(244,240,231,0.03) 55%, transparent 72%)',
          }}
        />

        {/* Contenuto */}
        <div
          className="relative z-10 flex min-h-dvh flex-col items-center px-7"
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

          {/* Wordmark + tagline */}
          <div className="mt-8 flex flex-col items-center">
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
          </div>

          <div className="flex-1" />

          {inApp && (
            <div className="mb-4 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-300">
              <p className="mb-1 font-semibold">Apri in Safari</p>
              <p className="text-amber-200/90">
                Stai usando il browser interno di un'altra app: tocca i ··· e scegli “Apri in
                Safari”, poi entra da lì.
              </p>
            </div>
          )}

          {/* Azione */}
          <button
            onClick={onEnter}
            disabled={busy}
            className="animate-fade-up flex w-full items-center justify-center gap-2.5 rounded-2xl bg-teal/90 py-3.5 text-[13px] font-medium uppercase tracking-[0.24em] text-[#1a1012] shadow-[0_10px_26px_-18px_rgba(244,240,231,0.45)] transition active:scale-[0.98] disabled:opacity-80"
            style={rise(1.3)}
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a1012]/30 border-t-[#1a1012]" />
            )}
            {busy ? 'Attendi…' : 'Enter your dojo'}
          </button>
          {authError && <p className="mt-3 text-center text-xs text-red-400">{authError}</p>}
        </div>
      </div>
    </div>
  )
}
