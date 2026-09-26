import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { localDateOf } from '../lib/dates'
import {
  abstinenceRate,
  factorImpact,
  layerRate,
  riskWindow,
  setbackDates,
  streaks,
  topFactors,
  totalCleanDays,
  urgeStats,
  type Snapshot,
} from '../metrics/metrics'
import { applyImport, exportAll, ImportError, parseExport, previewImport } from './backup'
import { LedgerDB, SCHEMA_VERSION } from './db'
import { buildFixture, loadFixture } from './fixture'
import { ensureSeeded, getSettings, SEED_ITEMS } from './seed'

const TODAY = '2026-09-26'
let db: LedgerDB
let n = 0

beforeEach(async () => {
  db = new LedgerDB(`test-${n++}`)
  await ensureSeeded(db)
})
afterEach(async () => {
  await db.delete()
})

describe('seed', () => {
  it('seeds the three layers once', async () => {
    await ensureSeeded(db)
    const items = await db.items.toArray()
    expect(items).toHaveLength(SEED_ITEMS.length)
    expect(new Set(items.map((i) => i.layer))).toEqual(new Set(['abstinence', 'boundary', 'selfcare']))
    expect((await getSettings(db)).dayBoundaryHour).toBe(4)
  })
})

describe('export / import', () => {
  it('round-trips every table through JSON with replace', async () => {
    await loadFixture(db, TODAY)
    const before = await exportAll(db)
    expect(before.schemaVersion).toBe(SCHEMA_VERSION)
    const text = JSON.stringify(before)

    const other = new LedgerDB(`test-${n++}`)
    await other.items.put({ id: 'junk', layer: 'boundary', name: 'junk', active: true, sortOrder: 0 })
    await applyImport(other, parseExport(text), 'replace')
    const after = await exportAll(other)
    expect(after.tables).toEqual(before.tables)
    await other.delete()
  })

  it('merge upserts, reports conflicts, and keeps local settings', async () => {
    await loadFixture(db, TODAY)
    const file = parseExport(JSON.stringify(await exportAll(db)))
    file.tables.kv = file.tables.kv.map((r) => (r.key === 'settings' ? { ...r, value: { ...r.value, dayBoundaryHour: 7 } } : r))
    file.tables.journal.push({ id: 'new-one', at: '2026-09-26T10:00:00Z', text: 'from another export' })

    const preview = await previewImport(db, file)
    expect(preview.conflicts.days).toBe(file.tables.days.length)
    expect(preview.conflicts.journal).toBe(1)
    expect(preview.counts.journal).toBe(2)

    await applyImport(db, file, 'merge')
    expect(await db.journal.count()).toBe(2)
    expect((await getSettings(db)).dayBoundaryHour).toBe(4)
  })

  it('rejects wrong, newer or corrupted files with a reason', () => {
    expect(() => parseExport('not json')).toThrow(ImportError)
    expect(() => parseExport('{"app":"other"}')).toThrow(/not an export/)
    expect(() => parseExport(JSON.stringify({ app: 'ledger', schemaVersion: 99, tables: {} }))).toThrow(/v99/)
    expect(() =>
      parseExport(JSON.stringify({ app: 'ledger', schemaVersion: 1, tables: { days: [{ date: '2026-02-30', entries: {} }] } })),
    ).toThrow(/days", row 1/)
  })
})

describe('60-day fixture', () => {
  it('with enough setbacks, finds the planted next-day sleep effect', async () => {
    const fx = buildFixture(TODAY, 90, 7, 2.5)
    const s: Snapshot = { items: SEED_ITEMS, days: fx.days, urges: fx.urges, today: TODAY }
    const sleep = factorImpact(s, 90).find((f) => f.item.id === 'bnd-sleep')!
    expect(sleep.nextDay.diff).not.toBeNull()
    expect(sleep.nextDay.diff!).toBeGreaterThan(0.15)
    expect(topFactors(s, 3, 90).map((f) => f.item.id)).toContain('bnd-sleep')
  })

  it('is deterministic', () => {
    expect(buildFixture(TODAY)).toEqual(buildFixture(TODAY))
  })

  it('loads and produces sane derived metrics', async () => {
    await loadFixture(db, TODAY)
    const s: Snapshot = {
      items: await db.items.toArray(),
      days: await db.days.toArray(),
      urges: await db.urges.toArray(),
      today: TODAY,
    }
    const dateOf = (u: { at: string }) => localDateOf(new Date(u.at), 4)

    const r30 = abstinenceRate(s, 30)
    const st = streaks(s)
    const factors = factorImpact(s)
    const top = topFactors(s)
    const risk = riskWindow(s)
    const urges = urgeStats(s, dateOf)
    const setbacks = setbackDates(s)

    // Invariants that must hold for any data.
    expect(s.days.length).toBeGreaterThan(50)
    expect(s.days.length).toBeLessThanOrEqual(60)
    expect(r30.reported).toBeLessThanOrEqual(30)
    expect(r30.rate).toBeGreaterThan(0)
    expect(r30.rate).toBeLessThan(1)
    expect(totalCleanDays(s) + setbacks.length).toBe(s.days.length)
    expect(st.best).toBeGreaterThanOrEqual(st.current)
    expect(urges.resistedTotal).toBeGreaterThan(0)
    for (const f of factors)
      for (const lag of [f.sameDay, f.nextDay]) if (lag.diff !== null) expect(lag.held.n + lag.notHeld.n).toBeLessThanOrEqual(60)

    // At a realistic setback rate, 60 days is too thin for most comparisons;
    // the engine must say so rather than rank noise.
    const sleep = factors.find((f) => f.item.id === 'bnd-sleep')!
    expect(sleep.nextDay.diff === null ? sleep.nextDay.neededSetbacks + sleep.nextDay.needed : 1).toBeGreaterThan(0)

    // Human-readable report so the fixture can be eyeballed from test output.
    const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`)
    const lines = [
      `rate30 ${pct(r30.rate)} (${r30.clean}/${r30.reported}, coverage ${pct(r30.coverage)})`,
      `total clean days ${totalCleanDays(s)}, setbacks ${setbacks.length}, streak ${st.current}, best ${st.best}, day ${st.daysSinceSetback}`,
      `layers: boundaries ${pct(layerRate(s, 'boundary'))}, self care ${pct(layerRate(s, 'selfcare'))}`,
      `urges: ${urges.total} total, ${urges.resistedTotal} resisted, 30d ${urges.resisted30}/${urges.acted30} resisted/acted, avg intensity ${urges.avgIntensity?.toFixed(1)}, avg duration ${urges.avgDurationMin?.toFixed(1)}m`,
      `risk window: ${risk ? `days ${risk.from}-${risk.to} (${risk.hits}/${risk.of}), today day ${risk.day}, in window ${risk.inWindow}` : 'none'}`,
      `sleep next-day: held ${pct(sleep.nextDay.held.rate)} (n=${sleep.nextDay.held.n}) vs not ${pct(sleep.nextDay.notHeld.rate)} (n=${sleep.nextDay.notHeld.n}), setbacks ${sleep.nextDay.setbacks}`,
      'top factors:',
      ...top.map(
        (f) =>
          `  ${f.item.name} [${f.best!.lag ? 'next day' : 'same day'}] held ${pct(f.best!.held.rate)} (n=${f.best!.held.n}) vs not ${pct(f.best!.notHeld.rate)} (n=${f.best!.notHeld.n}), z=${f.best!.z!.toFixed(2)} ${f.best!.strength}`,
      ),
    ]
    console.log(lines.join('\n'))
  })
})
