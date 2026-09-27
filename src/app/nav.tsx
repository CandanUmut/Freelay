import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { LocalDate } from '../db/types'

export type Tab = 'today' | 'log' | 'progress' | 'plans' | 'learn'

/** Full-screen layers that sit above the tabs. */
export type Overlay =
  | { kind: 'checkin'; date?: LocalDate }
  | { kind: 'day'; date: LocalDate }
  | { kind: 'panic'; urgeId?: string }
  | { kind: 'journal'; id?: string }
  | { kind: 'lesson'; id: string }
  | { kind: 'lapse' }
  | { kind: 'settings' }
  | { kind: 'items' }
  | { kind: 'data' }

interface Nav {
  tab: Tab
  setTab: (t: Tab) => void
  overlays: Overlay[]
  push: (o: Overlay) => void
  /** Close the top overlay. */
  pop: () => void
  /** Replace the top overlay (e.g. check-in -> lapse protocol). */
  replace: (o: Overlay) => void
  closeAll: () => void
}

const Ctx = createContext<Nav | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('today')
  const [overlays, setOverlays] = useState<Overlay[]>([])

  const setTab = useCallback((t: Tab) => {
    setOverlays([])
    setTabState(t)
    window.scrollTo(0, 0)
  }, [])
  const push = useCallback((o: Overlay) => setOverlays((s) => [...s, o]), [])
  const pop = useCallback(() => setOverlays((s) => s.slice(0, -1)), [])
  const replace = useCallback((o: Overlay) => setOverlays((s) => [...s.slice(0, -1), o]), [])
  const closeAll = useCallback(() => setOverlays([]), [])

  const value = useMemo(() => ({ tab, setTab, overlays, push, pop, replace, closeAll }), [tab, setTab, overlays, push, pop, replace, closeAll])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNav(): Nav {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNav outside NavProvider')
  return v
}
