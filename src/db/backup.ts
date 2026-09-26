import { isValidLocalDate } from '../lib/dates'
import { SCHEMA_VERSION, TABLES, type LedgerDB, type TableName } from './db'
import type { DayEntry, JournalEntry, KvRow, Plan, TrackedItem, Urge } from './types'

export const APP_ID = 'ledger'

export interface ExportFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  tables: {
    items: TrackedItem[]
    days: DayEntry[]
    urges: Urge[]
    plans: Plan[]
    journal: JournalEntry[]
    kv: KvRow[]
  }
}

export async function exportAll(db: LedgerDB): Promise<ExportFile> {
  return db.transaction('r', TABLES.map((t) => db.table(t)), async () => ({
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables: {
      items: await db.items.toArray(),
      days: await db.days.toArray(),
      urges: await db.urges.toArray(),
      plans: await db.plans.toArray(),
      journal: await db.journal.toArray(),
      kv: await db.kv.toArray(),
    },
  }))
}

export class ImportError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

// Structural checks only: enough to refuse a wrong or corrupted file before it
// touches the database, not a full schema validator.
const rowChecks: Record<TableName, (r: Record<string, unknown>) => boolean> = {
  items: (r) => isStr(r.id) && ['abstinence', 'boundary', 'selfcare'].includes(r.layer as string) && isStr(r.name),
  days: (r) => isValidLocalDate(r.date) && isObj(r.entries),
  urges: (r) => isStr(r.id) && isStr(r.at) && typeof r.intensity === 'number' && (r.outcome === 'resisted' || r.outcome === 'acted'),
  plans: (r) => isStr(r.id) && Array.isArray(r.triggerItemIds) && isStr(r.ifText) && isStr(r.thenText),
  journal: (r) => isStr(r.id) && isStr(r.at) && isStr(r.text),
  kv: (r) => r.key === 'settings' || r.key === 'lapsePlan',
}

/** Parse and validate an export file. Throws ImportError with a readable reason. */
export function parseExport(text: string): ExportFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('Not a JSON file.')
  }
  if (!isObj(data) || data.app !== APP_ID) throw new ImportError('This is not an export from this app.')
  if (typeof data.schemaVersion !== 'number') throw new ImportError('Missing schema version.')
  if (data.schemaVersion > SCHEMA_VERSION)
    throw new ImportError(`File is schema v${data.schemaVersion}; this app understands up to v${SCHEMA_VERSION}. Update the app first.`)
  if (!isObj(data.tables)) throw new ImportError('Missing tables.')

  const tables = data.tables
  for (const t of TABLES) {
    const rows = tables[t] ?? []
    if (!Array.isArray(rows)) throw new ImportError(`Table "${t}" is not a list.`)
    const bad = rows.findIndex((r) => !isObj(r) || !rowChecks[t](r))
    if (bad !== -1) throw new ImportError(`Table "${t}", row ${bad + 1} is malformed.`)
    tables[t] = rows
  }
  // Future schema migrations of older files go here, keyed on data.schemaVersion.
  return data as unknown as ExportFile
}

export interface ImportPreview {
  counts: Record<TableName, number>
  /** Rows in the file whose key already exists locally (merge would overwrite them). */
  conflicts: Record<TableName, number>
}

export async function previewImport(db: LedgerDB, file: ExportFile): Promise<ImportPreview> {
  const counts = {} as Record<TableName, number>
  const conflicts = {} as Record<TableName, number>
  for (const t of TABLES) {
    const rows = file.tables[t] as Record<string, unknown>[]
    const table = db.table(t)
    const keyPath = table.schema.primKey.keyPath as string
    const existing = await table.bulkGet(rows.map((r) => r[keyPath] as string))
    counts[t] = rows.length
    conflicts[t] = existing.filter(Boolean).length
  }
  return { counts, conflicts }
}

/**
 * replace: wipe every table, then load the file.
 * merge:   upsert the file's rows; on the same key the file wins. Local settings
 *          are kept in merge mode, since they describe this device.
 */
export async function applyImport(db: LedgerDB, file: ExportFile, mode: 'replace' | 'merge'): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      let rows = file.tables[t] as unknown[]
      if (mode === 'replace') await db.table(t).clear()
      if (mode === 'merge' && t === 'kv') rows = (rows as KvRow[]).filter((r) => r.key !== 'settings')
      await db.table(t).bulkPut(rows)
    }
  })
}
