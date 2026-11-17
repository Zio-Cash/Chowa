import { useEffect, useRef } from 'react'
import type { ReminderItem } from '../types'

/**
 * Promemoria "best effort": mentre l'app è aperta, controlla ogni 30s e invia
 * una notifica all'orario impostato (una volta al giorno per promemoria).
 * Su iPhone/PWA le notifiche in background non sono garantite: per l'affidabilità
 * piena serve l'app nativa.
 */
/** Etichette visibili per i promemoria di default (le label salvate restano in italiano). */
const REMINDER_LABELS: Record<string, string> = {
  pesata: 'Weigh in',
  acqua: 'Drink water',
  pranzo: 'Log lunch',
  workout: 'Workout',
  cena: 'Log dinner',
}

export const reminderLabel = (r: ReminderItem): string => REMINDER_LABELS[r.id] ?? r.label

/** Android e le PWA installate su iPhone mostrano notifiche solo dal service worker. */
function notify(body: string, tag: string) {
  const opts = { body, tag, icon: '/icon-192.png' }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((r) => r.showNotification('Chōwa 調和', opts))
      .catch(() => {
        try {
          new Notification('Chōwa 調和', opts)
        } catch {
          /* ignora */
        }
      })
    return
  }
  try {
    new Notification('Chōwa 調和', opts)
  } catch {
    /* ignora */
  }
}

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
        // >= e non ===: se il controllo salta il minuto esatto (app in
        // background, timer rallentati) il promemoria parte appena possibile.
        if (r.time <= hhmm && fired.current[r.id] !== today) {
          fired.current[r.id] = today
          // la prima volta (apertura dopo l'orario) non si notifica in ritardo
          if (!armed) continue
          notify(reminderLabel(r), r.id)
        }
      }
    }
    let armed = false
    check()
    armed = true
    const iv = window.setInterval(check, 30000)
    return () => window.clearInterval(iv)
  }, [])
}
