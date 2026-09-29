import type { LedgerDB } from './db'
import { DEFAULT_META, DEFAULT_SETTINGS, type LapsePlan, type Meta, type Settings, type TrackedItem } from './types'

/**
 * The original starter items. No longer added automatically (new users pick
 * from suggestions in content/suggestions.ts); kept for the sample data,
 * tests and simulator. Ids are stable slugs that lesson rules refer to.
 */
export const SEED_ITEMS: TrackedItem[] = [
  { id: 'abs-sites', layer: 'abstinence', name: 'Explicit websites', active: true, sortOrder: 0 },
  { id: 'abs-social', layer: 'abstinence', name: 'Explicit social media content', active: true, sortOrder: 1 },
  { id: 'abs-other', layer: 'abstinence', name: 'Other (lusting, etc.)', active: true, sortOrder: 2 },

  { id: 'bnd-alone', layer: 'boundary', name: 'Alone at home all day', active: true, sortOrder: 0 },
  { id: 'bnd-lonely', layer: 'boundary', name: 'Loneliness', active: true, sortOrder: 1 },
  { id: 'bnd-sleep', layer: 'boundary', name: 'Not enough sleep', active: true, sortOrder: 2 },
  { id: 'bnd-phone', layer: 'boundary', name: 'Phone in bed', active: true, sortOrder: 3 },
  { id: 'bnd-shorts', layer: 'boundary', name: 'Short-form social media', active: true, sortOrder: 4 },

  { id: 'sc-fast', layer: 'selfcare', name: 'Fasting', active: true, sortOrder: 0, target: { type: 'perWeek', value: 2 } },
  { id: 'sc-prayer', layer: 'selfcare', name: 'Prayer', active: true, sortOrder: 1 },
  { id: 'sc-midnight', layer: 'selfcare', name: 'Sleep before midnight', active: true, sortOrder: 2 },
  { id: 'sc-steps', layer: 'selfcare', name: 'Steps (thousands)', active: true, sortOrder: 3, target: { type: 'count', value: 5 } },
  { id: 'sc-family', layer: 'selfcare', name: 'Call family', active: true, sortOrder: 4 },
  { id: 'sc-clean', layer: 'selfcare', name: 'Deep clean home', active: true, sortOrder: 5 },
]

export const DEFAULT_LAPSE_PLAN: LapsePlan = {
  steps: [
    'Write one honest line about what happened. No verdict, just facts.',
    'Look at what came before it: sleep, being alone, phone in bed.',
    'Pick the one boundary to defend today and do the first step now.',
    'Do one self-care item before noon.',
  ],
}

/** Idempotent. Creates settings and the default lapse plan; tracked items are the user's to choose. */
export async function ensureSeeded(db: LedgerDB): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    if (!(await db.kv.get('settings'))) await db.kv.put({ key: 'settings', value: DEFAULT_SETTINGS })
    if (!(await db.kv.get('lapsePlan'))) await db.kv.put({ key: 'lapsePlan', value: DEFAULT_LAPSE_PLAN })
  })
}

export async function getSettings(db: LedgerDB): Promise<Settings> {
  const row = await db.kv.get('settings')
  return row?.key === 'settings' ? { ...DEFAULT_SETTINGS, ...row.value } : DEFAULT_SETTINGS
}

export async function saveSettings(db: LedgerDB, patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings(db)), ...patch }
  await db.kv.put({ key: 'settings', value: next })
  return next
}

export async function getLapsePlan(db: LedgerDB): Promise<LapsePlan> {
  const row = await db.kv.get('lapsePlan')
  return row?.key === 'lapsePlan' ? row.value : DEFAULT_LAPSE_PLAN
}

export async function getMeta(db: LedgerDB): Promise<Meta> {
  const row = await db.kv.get('meta')
  return row?.key === 'meta' ? { ...DEFAULT_META, ...row.value } : DEFAULT_META
}

export async function saveMeta(db: LedgerDB, patch: Partial<Meta>): Promise<Meta> {
  const next = { ...(await getMeta(db)), ...patch }
  await db.kv.put({ key: 'meta', value: next })
  return next
}

export async function saveLapsePlan(db: LedgerDB, plan: LapsePlan): Promise<void> {
  await db.kv.put({ key: 'lapsePlan', value: plan })
}
