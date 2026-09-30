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

export default function LoginGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn, authError } = useAuth()
  // La schermata di benvenuto compare a ogni apertura: si entra solo al tocco.
  const [entered, setEntered] = useState(false)
  const pending = useRef(false)

  // Dopo un login riuscito partito dalla Welcome, entra automaticamente.
  useEffect(() => {
    if (user && pending.current) {
      pending.current = false
      setEntered(true)
    }
  }, [user])

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

  if (loading) {
    return (
      <Centered>
        <p className="text-center text-sm text-muted">Caricamento…</p>
      </Centered>
    )
  }

  if (!entered || !user) {
    const handleEnter = () => {
      if (user) setEntered(true)
      else {
        pending.current = true
        signIn()
      }
    }
    return <Welcome onEnter={handleEnter} inApp={isInAppBrowser()} authError={authError} />
  }

  return <>{children}</>
}
