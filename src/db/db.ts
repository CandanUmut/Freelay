import Dexie, { type EntityTable } from 'dexie'
import type { DayEntry, JournalEntry, KvRow, Plan, Reflection, Step, TrackedItem, Urge } from './types'

export const SCHEMA_VERSION = 2

export class LedgerDB extends Dexie {
  items!: EntityTable<TrackedItem, 'id'>
  days!: EntityTable<DayEntry, 'date'>
  urges!: EntityTable<Urge, 'id'>
  plans!: EntityTable<Plan, 'id'>
  journal!: EntityTable<JournalEntry, 'id'>
  kv!: EntityTable<KvRow, 'key'>
  reflections!: EntityTable<Reflection, 'id'>
  steps!: EntityTable<Step, 'id'>

  constructor(name = 'ledger') {
    super(name)
    // Booleans are not indexable in IndexedDB, so `active` is filtered in memory.
    this.version(1).stores({
      items: 'id, layer, sortOrder',
      days: 'date',
      urges: 'id, at',
      plans: 'id, *triggerItemIds',
      journal: 'id, at',
      kv: 'key',
    })
    // v2: reflections and steps toward needs. Existing data is untouched; the
    // only change is the theme, which had a single (dark) value before and
    // now defaults to light.
    this.version(2)
      .stores({ reflections: 'id, date', steps: 'id, at' })
      .upgrade(async (tx) => {
        const kv = tx.table('kv')
        const row = await kv.get('settings')
        if (row?.value?.theme === 'dark') await kv.put({ key: 'settings', value: { ...row.value, theme: 'light' } })
        // Anyone upgrading with items already set the app up; don't show first-run setup.
        if ((await tx.table('items').count()) > 0) {
          const meta = await kv.get('meta')
          await kv.put({ key: 'meta', value: { ...(meta?.value ?? {}), onboarded: true } })
        }
      })
  }
}

export const TABLES = ['items', 'days', 'urges', 'plans', 'journal', 'kv', 'reflections', 'steps'] as const
export type TableName = (typeof TABLES)[number]

export const db = new LedgerDB()

export const newId = () => crypto.randomUUID()
