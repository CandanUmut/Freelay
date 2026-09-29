import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '../db/db'
import { getLapsePlan, getMeta, getSettings } from '../db/seed'
import type { DayEntry, JournalEntry, LapsePlan, LocalDate, Meta, NeedMap, Plan, Reflection, Settings, Step, TrackedItem, Urge } from '../db/types'
import { applyTheme, PALETTES, useResolvedTheme, type Palette, type ThemeName } from '../ui/theme'
import { localDateOf } from '../lib/dates'
import type { Snapshot } from '../metrics/metrics'

export interface AppData {
  settings: Settings
  meta: Meta
  lapsePlan: LapsePlan
  today: LocalDate
  items: TrackedItem[]
  /** Active items, sorted per layer by sortOrder. */
  active: TrackedItem[]
  itemById: Map<string, TrackedItem>
  days: DayEntry[]
  dayByDate: Map<LocalDate, DayEntry>
  urges: Urge[]
  plans: Plan[]
  journal: JournalEntry[]
  snapshot: Snapshot
  /** Local date an urge belongs to, honouring the day boundary. */
  dateOf: (u: { at: string }) => LocalDate
  reflections: Reflection[]
  steps: Step[]
  needMap: NeedMap
  theme: ThemeName
  palette: Palette
}

const Ctx = createContext<AppData | null>(null)

/** Re-evaluate "today" every minute so the day rolls over while the app is open. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return now
}

export function DataProvider({ children }: { children: ReactNode }) {
  const raw = useLiveQuery(async () => {
    const [settings, meta, lapsePlan, items, days, urges, plans, journal, reflections, steps, needsRow] = await Promise.all([
      getSettings(db),
      getMeta(db),
      getLapsePlan(db),
      db.items.orderBy('sortOrder').toArray(),
      db.days.toArray(),
      db.urges.orderBy('at').toArray(),
      db.plans.toArray(),
      db.journal.orderBy('at').reverse().toArray(),
      db.reflections.orderBy('date').toArray(),
      db.steps.orderBy('at').toArray(),
      db.kv.get('needs'),
    ])
    const needMap: NeedMap = needsRow?.key === 'needs' ? needsRow.value : {}
    return { settings, meta, lapsePlan, items, days, urges, plans, journal, reflections, steps, needMap }
  })
  const now = useNow()
  const theme = useResolvedTheme(raw?.settings.theme ?? 'light')
  // Wait for settings before applying, so a stored dark theme isn't flashed to light.
  const loaded = raw !== undefined
  useEffect(() => {
    if (loaded) applyTheme(theme)
  }, [theme, loaded])

  const value = useMemo<AppData | null>(() => {
    if (!raw) return null
    const boundary = raw.settings.dayBoundaryHour
    const today = localDateOf(now, boundary)
    const dateOf = (u: { at: string }) => localDateOf(new Date(u.at), boundary)
    return {
      ...raw,
      today,
      active: raw.items.filter((i) => i.active),
      itemById: new Map(raw.items.map((i) => [i.id, i])),
      dayByDate: new Map(raw.days.map((d) => [d.date, d])),
      snapshot: { items: raw.items, days: raw.days, urges: raw.urges, today },
      dateOf,
      theme,
      palette: PALETTES[theme],
    }
    // `now` changes every minute; only the date matters, but recomputing is cheap.
  }, [raw, now, theme])

  if (!value) return null
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): AppData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData outside DataProvider')
  return v
}
