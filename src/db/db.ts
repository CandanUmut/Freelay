import Dexie, { type EntityTable } from 'dexie'
import type { DayEntry, JournalEntry, KvRow, Plan, TrackedItem, Urge } from './types'

export const SCHEMA_VERSION = 1

export class LedgerDB extends Dexie {
  items!: EntityTable<TrackedItem, 'id'>
  days!: EntityTable<DayEntry, 'date'>
  urges!: EntityTable<Urge, 'id'>
  plans!: EntityTable<Plan, 'id'>
  journal!: EntityTable<JournalEntry, 'id'>
  kv!: EntityTable<KvRow, 'key'>

  constructor(name = 'ledger') {
    super(name)
    // Booleans are not indexable in IndexedDB, so `active` is filtered in memory.
    this.version(SCHEMA_VERSION).stores({
      items: 'id, layer, sortOrder',
      days: 'date',
      urges: 'id, at',
      plans: 'id, *triggerItemIds',
      journal: 'id, at',
      kv: 'key',
    })
  }
}

export const TABLES = ['items', 'days', 'urges', 'plans', 'journal', 'kv'] as const
export type TableName = (typeof TABLES)[number]

export const db = new LedgerDB()

export const newId = () => crypto.randomUUID()
