import { lazy, Suspense, useEffect } from 'react'
import { useNav, type Overlay, type Tab } from './app/nav'
import { CheckIn } from './screens/CheckIn'
import { DataSettings } from './screens/DataSettings'
import { DayDetail } from './screens/DayDetail'
import { ItemsEditor } from './screens/ItemsEditor'
import { JournalScreen } from './screens/Journal'
import { LapseScreen } from './screens/Lapse'
import { Learn, LessonScreen } from './screens/Learn'
import { LogUrge } from './screens/LogUrge'
import { Panic } from './screens/Panic'
import { Plans } from './screens/Plans'
import { Reflect } from './screens/Reflect'
import { SettingsScreen } from './screens/Settings'
import { Today } from './screens/Today'
import { IconLearn, IconLog, IconPlans, IconProgress, IconToday } from './ui/icons'

// Charts are the heaviest dependency; keep them off the launch path so Log Urge stays instant.
const Progress = lazy(() => import('./screens/Progress'))

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'today', label: 'Today', icon: <IconToday /> },
  { id: 'log', label: 'Log', icon: <IconLog /> },
  { id: 'progress', label: 'Progress', icon: <IconProgress /> },
  { id: 'plans', label: 'Plans', icon: <IconPlans /> },
  { id: 'learn', label: 'Learn', icon: <IconLearn /> },
]

export function App() {
  const nav = useNav()
  const top = nav.overlays.at(-1)

  // Lock page scroll behind a full-screen overlay.
  useEffect(() => {
    document.body.style.overflow = top ? 'hidden' : ''
  }, [top])

  return (
    <>
      <main className="pt-safe px-safe mx-auto max-w-lg pb-28" aria-hidden={top ? true : undefined}>
        {nav.tab === 'today' && <Today />}
        {nav.tab === 'log' && <LogUrge />}
        {nav.tab === 'progress' && (
          <Suspense fallback={null}>
            <Progress />
          </Suspense>
        )}
        {nav.tab === 'plans' && <Plans />}
        {nav.tab === 'learn' && <Learn />}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur" aria-label="Main">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => {
            const active = nav.tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => nav.setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] ${active ? 'text-ink' : 'text-muted'}`}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      {nav.overlays.map((o, i) => (
        <OverlayView key={i} o={o} onClose={nav.pop} />
      ))}
    </>
  )
}

function OverlayView({ o, onClose }: { o: Overlay; onClose: () => void }) {
  switch (o.kind) {
    case 'checkin':
      return <CheckIn date={o.date} onClose={onClose} />
    case 'day':
      return <DayDetail date={o.date} onClose={onClose} />
    case 'panic':
      return <Panic urgeId={o.urgeId} onClose={onClose} />
    case 'journal':
      return <JournalScreen id={o.id} onClose={onClose} />
    case 'lesson':
      return <LessonScreen id={o.id} onClose={onClose} />
    case 'lapse':
      return <LapseScreen onClose={onClose} />
    case 'settings':
      return <SettingsScreen onClose={onClose} />
    case 'items':
      return <ItemsEditor onClose={onClose} />
    case 'data':
      return <DataSettings onClose={onClose} />
    case 'reflect':
      return <Reflect onClose={onClose} />
  }
}
