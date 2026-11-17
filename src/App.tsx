import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store/store'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import LoginGate from './auth/LoginGate'
import { Icon } from './components/brand'
import type { ViewId } from './types'
import { useWakeLock } from './lib/useWakeLock'
import { useReminders } from './lib/useReminders'
import { MedalWatcher } from './components/Medals'
import { useToday } from './lib/useToday'
import { Onboarding } from './components/Onboarding'

// Sezioni in chunk separati: la Home parte subito (si scarica durante l'intro),
// le altre appena l'app è aperta e il telefono è libero, così il primo tocco
// su una scheda non mostra più la rotellina.
const loadOggi = () => import('./sections/Oggi')
const loaders = [
  () => import('./sections/Workout'),
  () => import('./sections/Dieta'),
  () => import('./sections/Cycle'),
  () => import('./sections/Profilo'),
]
const Oggi = lazy(loadOggi)
const Workout = lazy(loaders[0])
const Dieta = lazy(loaders[1])
const Cycle = lazy(loaders[2])
const Profilo = lazy(loaders[3])
loadOggi().catch(() => {})

function usePrefetchSections() {
  useEffect(() => {
    const run = () => loaders.forEach((l) => l().catch(() => {}))
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(run, { timeout: 2500 })
      return () => cancelIdleCallback(id)
    }
    const t = setTimeout(run, 1200)
    return () => clearTimeout(t)
  }, [])
}

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
      className="glass sticky top-0 z-40 border-b border-black/[0.06]"
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
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06]"
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
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-teal" />
    </div>
  )
}

function Shell() {
  const [view, setViewState] = useState<ViewId>('oggi')
  // Cambiando scheda si riparte dall'alto (non a metà della pagina precedente).
  const setView = useCallback((v: ViewId) => {
    setViewState(v)
    window.scrollTo(0, 0)
  }, [])
  usePrefetchSections()
  // Ridisegna tutto quando cambia il giorno (mezzanotte o ritorno in primo piano):
  // le schermate che leggono dateKey() non restano ferme su ieri.
  useToday()
  const { state, persistent, readOnly, syncError } = useStore()
  const { setViewingUid } = useAuth()
  useWakeLock()
  useReminders(state.reminders ?? [])
  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <TopBar />
      {readOnly && (
        <div className="mx-auto max-w-[480px] px-4 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-teal/10 px-4 py-2 text-sm text-teal">
            <span>You’re viewing someone else’s data (read-only).</span>
            <button onClick={() => setViewingUid(null)} className="shrink-0 font-semibold underline">
              Exit
            </button>
          </div>
        </div>
      )}
      {!persistent && (
        <div className="mx-auto max-w-[480px] px-4 pt-3">
          <div className="rounded-2xl bg-arancio/10 px-4 py-2 text-sm text-ink">
            Browser storage isn’t available: your data won’t be kept between sessions.
          </div>
        </div>
      )}
      {syncError && !readOnly && (
        <div className="mx-auto max-w-[480px] px-4 pt-3">
          <div className="rounded-2xl bg-arancio/10 px-4 py-2 text-sm text-ink">
            Can’t save to the cloud right now: your data stays on this phone. I’ll retry on
            your next change.
          </div>
        </div>
      )}
      <main key={view} className="view-in mx-auto max-w-[480px] px-4 pt-4">
        <Suspense fallback={<SectionFallback />}>
          {view === 'oggi' && <Oggi goTo={setView} />}
          {view === 'workout' && <Workout />}
          {view === 'dieta' && <Dieta />}
          {view === 'cycle' && <Cycle />}
          {view === 'profilo' && <Profilo />}
        </Suspense>
      </main>
      <TabBar view={view} setView={setView} />
      <MedalWatcher />
      <Onboarding />
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
