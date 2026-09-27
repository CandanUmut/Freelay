import { afterEach, describe, expect, it } from 'vitest'
import { markSetback, saveDay } from '../app/actions'
import { db } from '../db/db'
import { ensureSeeded, SEED_ITEMS } from '../db/seed'
import type { DayEntry } from '../db/types'
import { lastNDays } from '../lib/dates'
import { checkInFeedback, withDay } from './feedback'
import { dayOutcome, type Snapshot } from './metrics'

const TODAY = '2026-09-26'
const day = (date: string, entries: DayEntry['entries']): DayEntry => ({ date, entries, loggedAt: '', backfilled: false })

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('check-in feedback', () => {
  it('reports the rate change and today vs the usual, without counting perWeek items as missed', () => {
    const past = lastNDays('2026-09-25', 10).map((d) => day(d, { 'abs-sites': false, 'bnd-phone': false, 'bnd-lonely': false }))
    const before: Snapshot = { items: SEED_ITEMS, days: past, urges: [], today: TODAY }
    const today = day(TODAY, { 'abs-sites': true, 'bnd-phone': true, 'bnd-lonely': false, 'sc-fast': false })
    const f = checkInFeedback(before, withDay(before, today), TODAY, (u) => u.at.slice(0, 10))
    expect(f.outcome).toBe('setback')
    expect(f.rateBefore).toBe(1)
    expect(f.rateAfter).toBeCloseTo(10 / 11)
    expect(f.totalClean).toBe(10)
    expect(f.boundary).toEqual({ held: 1, total: 2, avg: 2 })
    // Eleven days is too little for a pattern; the feedback falls back to a plain fact.
    expect(f.insight).toMatch(/of the last 11 days you reported were clean/)
  })
})

describe('acted urge writes the setback into the day', () => {
  it('creates or updates the day entry, keeping other answers', async () => {
    await ensureSeeded(db)
    await markSetback(TODAY, TODAY, 'abs-other')
    expect((await db.days.get(TODAY))?.entries).toEqual({ 'abs-other': true })
    await saveDay('2026-09-24', TODAY, { entries: { 'abs-sites': false, 'bnd-phone': true } })
    await markSetback('2026-09-24', TODAY, 'abs-sites')
    const d = (await db.days.get('2026-09-24'))!
    expect(d.entries).toEqual({ 'abs-sites': true, 'bnd-phone': true })
    expect(d.backfilled).toBe(true)
    expect(dayOutcome(d, ['abs-sites'])).toBe('setback')
  })
})
