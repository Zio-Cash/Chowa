import { useEffect } from 'react'

/**
 * Tiene lo schermo sveglio mentre l'app è in primo piano (utile durante
 * l'allenamento). Usa la Wake Lock API — supportata su iOS 16.4+ come PWA
 * installata e su Android. Ri-acquisisce il lock quando si torna sull'app
 * (il sistema lo rilascia se passi ad altro o blocchi lo schermo).
 */
export function useWakeLock() {
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const request = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        sentinel = await nav.wakeLock!.request('screen')
        if (cancelled) {
          sentinel.release?.()
          sentinel = null
        }
      } catch {
        // permesso negato / batteria bassa: si ignora silenziosamente
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinel) request()
    }

    request()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      try {
        sentinel?.release?.()
      } catch {
        /* noop */
      }
      sentinel = null
    }
  }, [])
}

interface WakeLockSentinelLike {
  release?: () => void
}
