import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store/store'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import LoginGate from './auth/LoginGate'
import { Icon } from './components/brand'
import type { ViewId } from './types'
import { useWakeLock } from './lib/useWakeLock'

// Sezioni caricate on-demand: il primo avvio scarica solo la schermata attiva,
// il resto (e le librerie pesanti come i grafici) arriva quando serve.
const Oggi = lazy(() => import('./sections/Oggi'))
const Dieta = lazy(() => import('./sections/Dieta'))
const Workout = lazy(() => import('./sections/Workout'))
const Cycle = lazy(() => import('./sections/Cycle'))
const Profilo = lazy(() => import('./sections/Profilo'))

type Tab = { id: ViewId; label: string; icon: (p: { size?: number; className?: string }) => ReactNode }

const TABS: Tab[] = [
  { id: 'oggi', label: 'Home', icon: Icon.home },
  { id: 'workout', label: 'Training', icon: Icon.practice },
  { id: 'dieta', label: 'Meal', icon: Icon.bowl },
  { id: 'cycle', label: 'Cycle', icon: Icon.moon },
  { id: 'profilo', label: 'Profile', icon: Icon.person },
]

function TopBar() {
  return (
    <header
      className="glass sticky top-0 z-40 border-b border-white/[0.06]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-[480px] items-center justify-between px-5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-brand text-lg font-extralight tracking-[0.16em] text-ink">Chōwa</span>
          <span className="font-display text-sm tracking-[0.2em] text-teal/70">調和</span>
        </div>
      </div>
    </header>
  )
}

function TabBar({ view, setView }: { view: ViewId; setView: (v: ViewId) => void }) {
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-2">
        {TABS.map((t) => {
          const active = t.id === view
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition active:scale-95 ${
                active ? 'text-teal' : 'text-muted'
              }`}
            >
              <t.icon size={22} />
              <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function SectionFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-teal" />
    </div>
  )
}

function Shell() {
  const [view, setView] = useState<ViewId>('oggi')
  const { persistent, readOnly } = useStore()
  const { setViewingUid } = useAuth()
  useWakeLock()
  return (
    <div className="min-h-dvh pb-24">
      <TopBar />
      {readOnly && (
        <div className="mx-auto max-w-[480px] px-4 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-teal/10 px-4 py-2 text-sm text-teal">
            <span>Stai guardando i dati di un'altra persona (sola lettura).</span>
            <button onClick={() => setViewingUid(null)} className="shrink-0 font-semibold underline">
              Esci
            </button>
          </div>
        </div>
      )}
      {!persistent && (
        <div className="mx-auto max-w-[480px] px-4 pt-3">
          <div className="rounded-2xl bg-amber-100 px-4 py-2 text-sm text-amber-800">
            ⚠️ Memoria del browser non disponibile: i dati non verranno salvati tra le sessioni.
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[480px] px-4 pt-4">
        <Suspense fallback={<SectionFallback />}>
          {view === 'oggi' && <Oggi goTo={setView} />}
          {view === 'workout' && <Workout />}
          {view === 'dieta' && <Dieta />}
          {view === 'cycle' && <Cycle />}
          {view === 'profilo' && <Profilo />}
        </Suspense>
      </main>
      <TabBar view={view} setView={setView} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <StoreProvider>
          <Shell />
        </StoreProvider>
      </LoginGate>
    </AuthProvider>
  )
}
