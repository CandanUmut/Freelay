import { afterEach, describe, expect, it } from 'vitest'
import { addItems } from '../app/actions'
import { suggestionsFor } from '../content/suggestions'
import { applyImport, parseExport } from '../db/backup'
import { db } from '../db/db'
import { SEED_ITEMS } from '../db/seed'
import type { DayEntry, Reflection, Step, Urge } from '../db/types'
import { addDays, lastNDays } from '../lib/dates'
import { buildInsights } from './insights'
import type { Snapshot } from './metrics'
import { needSummary, reflectionDue, reflectionTrends, stepSummary } from './wellbeing'

const TODAY = '2026-09-29'
const dateOf = (u: { at: string }) => u.at.slice(0, 10)
const day = (date: string, breach = false): DayEntry => ({ date, entries: { 'abs-sites': breach }, loggedAt: '', backfilled: false })
const snap = (days: DayEntry[], urges: Urge[] = []): Snapshot => ({ items: SEED_ITEMS, days, urges, today: TODAY })
const refl = (date: string, r: Partial<Reflection>): Reflection => ({ id: date, date, at: `${date}T20:00:00`, ...r })
const urge = (date: string, over: Partial<Urge> = {}): Urge => ({ id: `${date}-${Math.random()}`, at: `${date}T21:00:00`, intensity: 6, triggerItemIds: [], outcome: 'resisted', ...over })

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('reflection prompt', () => {
  it('asks every few days, and the day after a setback', () => {
    const days = lastNDays(TODAY, 5).map((d) => day(d))
    expect(reflectionDue(snap(days), [], undefined)).toBe(true)
    expect(reflectionDue(snap(days), [refl(addDays(TODAY, -1), { confidence: 3 })], undefined)).toBe(false)
    expect(reflectionDue(snap(days), [refl(addDays(TODAY, -3), { confidence: 3 })], undefined)).toBe(true)
    const setbackYesterday = [...days.slice(0, -2), day(addDays(TODAY, -1), true), day(TODAY)]
    expect(reflectionDue(snap(setbackYesterday), [refl(addDays(TODAY, -1), { confidence: 3 })], undefined)).toBe(false)
    expect(reflectionDue(snap(setbackYesterday), [refl(addDays(TODAY, -2), { confidence: 3 })], undefined)).toBe(true)
    expect(reflectionDue(snap(days), [], TODAY)).toBe(false)
    expect(reflectionDue(snap([]), [], undefined)).toBe(false)
  })
})

describe('reflection trends', () => {
  it('compares the last two with the ones before, with stress improving downward', () => {
    const rs = [2, 2, 2, 4, 4].map((c, i) => refl(addDays(TODAY, -12 + i * 3), { confidence: c, stress: 6 - c }))
    const t = reflectionTrends(rs)
    const conf = t.find((x) => x.key === 'confidence')!
    expect(conf).toMatchObject({ recent: 4, earlier: 2, better: true })
    expect(t.find((x) => x.key === 'stress')).toMatchObject({ recent: 2, earlier: 4, better: true })
    const list = buildInsights(snap([day(TODAY)]), { dateOf, reflections: rs })
    expect(list.find((i) => i.id === 'trend:reflect:confidence')?.text).toBe('Confidence: 4 out of 5 in your last two reflections, up from 2.')
  })
})

describe('needs and steps', () => {
  it('summarises what urges promised and what was needed, and counts steps', () => {
    const urges = [
      urge(TODAY, { promise: ['escape'], needs: ['connection'] }),
      urge(addDays(TODAY, -1), { promise: ['escape'], needs: ['connection', 'rest'] }),
      urge(addDays(TODAY, -2), { promise: ['relief'], needs: ['connection'] }),
    ]
    const n = needSummary(urges, [], dateOf, TODAY)
    expect(n.needs[0]).toMatchObject({ id: 'connection', n: 3 })
    expect(n.promises[0]).toMatchObject({ id: 'escape', n: 2 })
    const steps: Step[] = [
      { id: 'a', at: `${TODAY}T10:00:00`, need: 'connection', text: 'Text one person' },
      { id: 'b', at: `${addDays(TODAY, -10)}T10:00:00`, need: 'rest', text: 'Nap' },
    ]
    expect(stepSummary(steps, TODAY).total).toBe(1)
    const list = buildInsights(snap([day(TODAY)], urges), { dateOf, steps })
    expect(list.find((i) => i.id === 'fact:needs')?.text).toBe(
      "Your urges have mostly promised escape. Underneath, what you've needed most is connection (3 times).",
    )
    expect(list.find((i) => i.id === 'fact:steps')?.text).toBe('1 step toward what you actually need this week, all for connection.')
  })
})

describe('suggestions and adding items', () => {
  it('puts topic matches first and keeps stable ids', async () => {
    const abs = suggestionsFor('abstinence', ['gambling'], new Set())
    expect(abs[0]!.topics).toContain('gambling')
    await addItems([
      { id: 'bnd-sleep', layer: 'boundary', name: 'Not enough sleep' },
      { layer: 'boundary', name: 'My own trigger' },
    ])
    await addItems([{ id: 'bnd-sleep', layer: 'boundary', name: 'Not enough sleep' }])
    const items = await db.items.toArray()
    expect(items.filter((i) => i.id === 'bnd-sleep')).toHaveLength(1)
    expect(items.map((i) => i.sortOrder).sort()).toEqual([0, 1])
  })
})

describe('backups', () => {
  it('imports a v1 export that has no reflections or steps', async () => {
    const v1 = { app: 'ledger', schemaVersion: 1, exportedAt: '2026-09-01T00:00:00Z', tables: { items: SEED_ITEMS, days: [day(TODAY)], urges: [], plans: [], journal: [], kv: [] } }
    await applyImport(db, parseExport(JSON.stringify(v1)), 'replace')
    expect(await db.items.count()).toBe(SEED_ITEMS.length)
    expect(await db.reflections.count()).toBe(0)
  })
})
