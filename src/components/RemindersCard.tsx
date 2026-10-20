import { useState } from 'react'
import { useStore } from '../store/store'
import { Card, CardTitle } from './ui'

export default function RemindersCard() {
  const { state, setReminders } = useStore()
  const reminders = state.reminders ?? []
  const hasNotif = typeof Notification !== 'undefined'
  const [perm, setPerm] = useState<NotificationPermission>(
    hasNotif ? Notification.permission : 'denied',
  )
  const anyOn = reminders.some((r) => r.on)

  async function ensurePerm(): Promise<boolean> {
    if (!hasNotif) return false
    if (Notification.permission === 'granted') return true
    const p = await Notification.requestPermission()
    setPerm(p)
    return p === 'granted'
  }

  async function toggle(id: string) {
    const r = reminders.find((x) => x.id === id)
    if (!r) return
    if (!r.on) await ensurePerm()
    setReminders(reminders.map((x) => (x.id === id ? { ...x, on: !x.on } : x)))
  }

  function setTime(id: string, time: string) {
    setReminders(reminders.map((x) => (x.id === id ? { ...x, time } : x)))
  }

  return (
    <Card>
      <CardTitle icon="🔔">Promemoria</CardTitle>
      <div className="space-y-2">
        {reminders.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-black/[0.04] px-3 py-2">
            <span className="text-lg">{r.emoji}</span>
            <span className="flex-1 text-sm">{r.label}</span>
            <input
              type="time"
              value={r.time}
              onChange={(e) => setTime(r.id, e.target.value)}
              disabled={!r.on}
              className="rounded-lg bg-black/[0.05] px-2 py-1 font-mono text-sm tabular disabled:opacity-40"
            />
            <Toggle on={r.on} onClick={() => toggle(r.id)} />
          </div>
        ))}
      </div>
      {anyOn && perm !== 'granted' && (
        <button
          onClick={ensurePerm}
          className="mt-3 w-full rounded-2xl bg-teal py-2.5 text-sm font-medium text-[#fafafa] active:scale-[0.98]"
        >
          Attiva le notifiche
        </button>
      )}
      <p className="mt-2 text-[11px] leading-snug text-muted">
        Su iPhone i promemoria arrivano con l'app installata; per notifiche sempre affidabili (anche
        ad app chiusa) servirà la versione nativa.
      </p>
    </Card>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Attiva/disattiva"
      className={`h-6 w-10 shrink-0 rounded-full p-0.5 transition ${on ? 'bg-teal' : 'bg-black/15'}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition ${on ? 'translate-x-4' : ''}`}
      />
    </button>
  )
}
