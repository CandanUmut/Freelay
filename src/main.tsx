import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { DataProvider, useData } from './app/data'
import { NavProvider } from './app/nav'
import { db } from './db/db'
import { ensureSeeded } from './db/seed'
import { LockScreen } from './screens/Lock'
import './index.css'

// Ask the browser not to evict IndexedDB under storage pressure. Not guaranteed on iOS.
void navigator.storage?.persist?.()

// Cover the screen the moment the app is hidden, so the app switcher snapshot is blank.
// Done on the DOM directly: a React re-render may land after iOS takes the snapshot.
const cover = (on: boolean) => document.documentElement.classList.toggle('privacy-cover', on)
document.addEventListener('visibilitychange', () => cover(document.visibilityState === 'hidden'))
window.addEventListener('pagehide', () => cover(true))
window.addEventListener('pageshow', () => cover(false))

const RELOCK_AFTER_MS = 60_000

function Gate() {
  const { settings } = useData()
  // Locked at launch only if a PIN was already set; turning the PIN on doesn't lock you out mid-session.
  const [unlocked, setUnlocked] = useState(() => !(settings.pinEnabled && settings.pinHash))
  const hiddenAt = useRef<number | null>(null)

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS) setUnlocked(false)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (settings.pinEnabled && settings.pinHash && !unlocked) return <LockScreen settings={settings} onUnlock={() => setUnlocked(true)} />
  return <App />
}

void ensureSeeded(db).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DataProvider>
        <NavProvider>
          <Gate />
        </NavProvider>
      </DataProvider>
    </StrictMode>,
  ),
)

if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
