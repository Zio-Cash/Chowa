import { useEffect, useRef, useState, type ReactNode } from 'react'
import { firebaseReady } from '../lib/firebase'
import { Card } from '../components/ui'
import { useAuth } from './AuthProvider'
import Welcome from './Welcome'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

/**
 * Rileva i browser "incorporati" delle app (WhatsApp, Instagram, Facebook…),
 * dove Google blocca il login. Su iOS i webview non espongono i token
 * "Version/" + "Safari" del Safari vero.
 */
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/(FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|; wv\)|GSA\/)/i.test(ua)) return true
  const iOS = /iPhone|iPod|iPad/.test(ua)
  if (iOS) {
    const isSafari = /Safari/.test(ua) && /Version\//.test(ua)
    const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    if (!isSafari && !isOtherBrowser) return true
  }
  return false
}

// Durata dell'intro della Welcome prima dell'apertura automatica.
const ANIM_MS = 2600

export default function LoginGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn, authError } = useAuth()
  const [entered, setEntered] = useState(false)
  const [busy, setBusy] = useState(false)
  const intent = useRef(false)

  // Se sei già autenticata, dopo l'animazione l'app si apre DA SOLA (niente pulsante).
  useEffect(() => {
    if (entered || !user) return
    const t = setTimeout(() => setEntered(true), ANIM_MS)
    return () => clearTimeout(t)
  }, [user, entered])

  // Login riuscito (dopo un tocco quando non eri loggata) → entra.
  useEffect(() => {
    if (user && busy) {
      setBusy(false)
      setEntered(true)
    }
  }, [user, busy])

  // Tocco mentre l'auth non è ancora risolta → completa appena si risolve.
  useEffect(() => {
    if (!loading && intent.current) {
      intent.current = false
      if (user) setEntered(true)
      else signIn()
    }
  }, [loading, user, signIn])

  // Login fallito o annullato → sblocco.
  useEffect(() => {
    if (authError) setBusy(false)
  }, [authError])

  if (!firebaseReady) {
    return (
      <Centered>
        <Card>
          <h1 className="mb-2 font-display text-xl font-semibold text-ink">Configurazione mancante</h1>
          <p className="text-sm text-muted">
            Il collegamento al cloud non è ancora configurato. Inserisci la configurazione Firebase in{' '}
            <span className="font-mono text-ink">src/lib/firebase.ts</span> per attivare login e
            sincronizzazione.
          </p>
        </Card>
      </Centered>
    )
  }

  if (!entered || !user) {
    // Serve un tocco solo quando NON sei autenticata (Google richiede un gesto).
    const needsSignIn = !loading && !user
    const handleEnter = () => {
      if (user) {
        setEntered(true)
        return
      }
      setBusy(true)
      if (loading) {
        intent.current = true
        return
      }
      signIn()
    }
    return (
      <Welcome
        onEnter={handleEnter}
        busy={busy}
        needsSignIn={needsSignIn}
        inApp={isInAppBrowser()}
        authError={authError}
      />
    )
  }

  return <>{children}</>
}
