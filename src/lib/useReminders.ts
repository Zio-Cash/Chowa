import { useEffect, useRef } from 'react'
import type { ReminderItem } from '../types'

/**
 * Promemoria "best effort": mentre l'app è aperta, controlla ogni 30s e invia
 * una notifica all'orario impostato (una volta al giorno per promemoria).
 * Su iPhone/PWA le notifiche in background non sono garantite: per l'affidabilità
 * piena serve l'app nativa.
 */
export function useReminders(reminders: ReminderItem[]) {
  const fired = useRef<Record<string, string>>({})
  const ref = useRef(reminders)
  ref.current = reminders

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    const check = () => {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
      for (const r of ref.current) {
        if (!r.on) continue
        if (r.time === hhmm && fired.current[r.id] !== today) {
          fired.current[r.id] = today
          try {
            new Notification('Chōwa 調和', { body: `${r.emoji} ${r.label}`, tag: r.id })
          } catch {
            /* ignora */
          }
        }
      }
    }
    check()
    const iv = window.setInterval(check, 30000)
    return () => window.clearInterval(iv)
  }, [])
}
