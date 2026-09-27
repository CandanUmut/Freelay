/** Local calendar date, `YYYY-MM-DD`, already adjusted for the day-boundary offset. */
export type LocalDate = string

export type Layer = 'abstinence' | 'boundary' | 'selfcare'

export const LAYERS: readonly Layer[] = ['abstinence', 'boundary', 'selfcare']

export interface Target {
  /** `count`: a numeric daily value must reach `value` (e.g. 5 = 5k steps).
   *  `perWeek`: a boolean item should be done `value` days per week. */
  type: 'count' | 'perWeek'
  value: number
}

export interface TrackedItem {
  id: string
  layer: Layer
  name: string
  active: boolean
  target?: Target
  sortOrder: number
}

/**
 * Values record whether the named thing *happened* that day, for every layer:
 *   abstinence  true = did it (a breach)
 *   boundary    true = crossed (the risk condition was present)
 *   selfcare    true = done; a number for `count` targets
 * A missing key means "not answered", which is different from false.
 * Use `isHeld()` in metrics rather than reading the raw polarity.
 */
export type EntryValue = boolean | number

export interface DayEntry {
  date: LocalDate
  entries: Record<string, EntryValue>
  note?: string
  mood?: 1 | 2 | 3 | 4 | 5
  loggedAt: string
  backfilled: boolean
}

export interface Urge {
  id: string
  at: string
  intensity: number
  triggerItemIds: string[]
  triggerText?: string
  context?: string
  outcome: 'resisted' | 'acted'
  durationMin?: number
  note?: string
  /** For acted urges: how much it was actually enjoyed, 1-10, rated afterwards. */
  enjoyed?: number
}

export interface Plan {
  id: string
  triggerItemIds: string[]
  ifText: string
  thenText: string
  timesUsed: number
  active: boolean
}

export interface LapsePlan {
  steps: string[]
}

export interface JournalEntry {
  id: string
  at: string
  text: string
  tags?: string[]
}

export interface Settings {
  dayBoundaryHour: number
  pinEnabled: boolean
  pinHash?: string
  /** WebAuthn credential id (base64) used as a Face ID / Touch ID gate. */
  biometricCredId?: string
  replacementHabit?: string
  habitStartDate?: LocalDate
  theme: 'dark'
}

export const DEFAULT_SETTINGS: Settings = {
  dayBoundaryHour: 4,
  pinEnabled: false,
  theme: 'dark',
}

/** Small app state that isn't user data proper but should survive a restore. */
export interface Meta {
  lastExportAt?: string
  /** Lesson id -> local date it was opened. */
  lessonsRead: Record<string, LocalDate>
  /** Lesson id -> local date its contextual card was dismissed. */
  lessonsDismissed: Record<string, LocalDate>
  /** The setback date whose lapse protocol has been seen. */
  lapseSeenFor?: LocalDate
  /** Insight id -> last local date it was the Today card, so the card rotates. */
  insightsShown?: Record<string, LocalDate>
  /** Local date the weekly review was last dismissed. */
  reviewSeen?: LocalDate
  /** Getting-started checklist: items reviewed, and whether the card was dismissed. */
  itemsReviewed?: boolean
  setupDismissed?: boolean
}

export const DEFAULT_META: Meta = { lessonsRead: {}, lessonsDismissed: {}, insightsShown: {} }

/** Singleton rows (settings, lapse plan, meta) live in a key/value table. */
export type KvRow =
  | { key: 'settings'; value: Settings }
  | { key: 'lapsePlan'; value: LapsePlan }
  | { key: 'meta'; value: Meta }
