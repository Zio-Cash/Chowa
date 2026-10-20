import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

/**
 * Pulsante "Installa app". Su desktop/Android usa l'evento nativo
 * beforeinstallprompt; su iPhone (dove non esiste) mostra le istruzioni
 * "Condividi → Aggiungi a Home". Non appare se l'app è già installata.
 */
export default function InstallButton({ className = '' }: { className?: string }) {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null)
  const [canPrompt, setCanPrompt] = useState(false)
  const [installed, setInstalled] = useState(isStandalone())
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferred.current = e as BeforeInstallPromptEvent
      setCanPrompt(true)
    }
    const onInstalled = () => {
      setInstalled(true)
      setCanPrompt(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  // Mostra il pulsante solo se possiamo davvero installare (Android/desktop)
  // oppure se siamo su iPhone (istruzioni manuali).
  const ios = isIOS()
  if (!canPrompt && !ios) return null

  async function handleClick() {
    if (deferred.current) {
      await deferred.current.prompt()
      const choice = await deferred.current.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      deferred.current = null
      setCanPrompt(false)
    } else {
      setShowIOS(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted transition active:scale-[0.98] ${className}`}
      >
        <span aria-hidden>↓</span> Installa l'app
      </button>

      {showIOS && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowIOS(false)} />
          <div className="animate-fade-up relative w-full max-w-[480px] rounded-t-[28px] bg-surface p-6 pb-10 ring-1 ring-black/[0.06]">
            <h3 className="font-display text-xl font-medium text-ink">Installa Chōwa</h3>
            <p className="mt-2 text-sm text-muted">
              Su iPhone l'app si aggiunge dalla schermata Home di Safari:
            </p>
            <ol className="mt-4 space-y-3 text-sm text-ink">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-[#faf7f1]">1</span>
                Tocca il pulsante <b>Condividi</b> ⬆️ nella barra di Safari
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-[#faf7f1]">2</span>
                Scorri e scegli <b>Aggiungi a Home</b>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-[#faf7f1]">3</span>
                Conferma con <b>Aggiungi</b>: l'icona comparirà come un'app
              </li>
            </ol>
            <button
              onClick={() => setShowIOS(false)}
              className="mt-6 w-full rounded-2xl bg-teal py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#faf7f1] active:scale-[0.98]"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  )
}
