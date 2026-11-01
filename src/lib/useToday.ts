import { useState, useSyncExternalStore } from 'react'
import { dateKey } from './date'

// "Oggi" che cambia davvero: si aggiorna a mezzanotte e quando l'app torna in
// primo piano (una PWA può restare aperta in background per giorni).
function subscribe(cb: () => void) {
  let t: ReturnType<typeof setTimeout>
  const arm = () => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
    t = setTimeout(() => {
      cb()
      arm()
    }, next.getTime() - now.getTime())
  }
  arm()
  const onShow = () => {
    if (document.visibilityState === 'visible') cb()
  }
  document.addEventListener('visibilitychange', onShow)
  window.addEventListener('focus', cb)
  return () => {
    clearTimeout(t)
    document.removeEventListener('visibilitychange', onShow)
    window.removeEventListener('focus', cb)
  }
}

export function useToday(): string {
  return useSyncExternalStore(subscribe, dateKey)
}

/**
 * Giorno selezionato in una schermata con le frecce ‹ ›. Se stavi guardando
 * "oggi" e scatta la mezzanotte, segue il nuovo giorno; se eri su un giorno
 * passato, resta lì.
 */
export function useDayCursor() {
  const oggi = useToday()
  const [day, setDay] = useState(oggi)
  const [prevOggi, setPrevOggi] = useState(oggi)
  if (prevOggi !== oggi) {
    setPrevOggi(oggi)
    if (day === prevOggi) setDay(oggi)
  }
  return [day, setDay, oggi] as const
}
