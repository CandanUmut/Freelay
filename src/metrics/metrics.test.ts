import { describe, expect, it } from 'vitest'
import { addDays, diffDays, lastNDays, localDateOf } from '../lib/dates'
import { SEED_ITEMS } from '../db/seed'
import type { DayEntry, LocalDate } from '../db/types'
import {
  abstinenceRate,
  factorImpact,
  itemScore,
  riskWindow,
  streaks,
  topFactors,
  totalCleanDays,
  type Snapshot,
} from './metrics'

const TODAY = '2026-09-26'
const day = (date: LocalDate, entries: DayEntry['entries']): DayEntry => ({ date, entries, loggedAt: '', backfilled: false })
const clean = (date: LocalDate, extra: DayEntry['entries'] = {}) => day(date, { 'abs-sites': false, ...extra })
const setback = (date: LocalDate, extra: DayEntry['entries'] = {}) => day(date, { 'abs-sites': true, ...extra })
const snap = (days: DayEntry[]): Snapshot => ({ items: SEED_ITEMS, days, urges: [], today: TODAY })

describe('dates', () => {
  it('applies the day boundary', () => {
    expect(localDateOf(new Date(2026, 8, 26, 1, 30), 4)).toBe('2026-09-25')
    expect(localDateOf(new Date(2026, 8, 26, 4, 0), 4)).toBe('2026-09-26')
    expect(localDateOf(new Date(2026, 8, 26, 1, 30), 0)).toBe('2026-09-26')
  })
  it('does arithmetic across month and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31)
    expect(lastNDays(TODAY, 3)).toEqual(['2026-09-24', '2026-09-25', '2026-09-26'])
  })
})

describe('abstinence rate', () => {
  it('29 clean of 30 reads ~97%, not zero', () => {
    const days = lastNDays(TODAY, 30).map((d, i) => (i === 29 ? setback(d) : clean(d)))
    const r = abstinenceRate(snap(days))
    expect(r.rate).toBeCloseTo(29 / 30)
    expect(streaks(snap(days)).current).toBe(0)
  })
  it('excludes unreported days from the denominator and reports coverage', () => {
    const days = lastNDays(TODAY, 30).filter((_, i) => i % 3 !== 0).map((d) => clean(d))
    const r = abstinenceRate(snap(days))
    expect(r.rate).toBe(1)
    expect(r.reported).toBe(20)
    expect(r.coverage).toBeCloseTo(20 / 30)
  })
  it('treats a day with no abstinence answer as unreported', () => {
    const r = abstinenceRate(snap([day(TODAY, { 'bnd-phone': true })]))
    expect(r.reported).toBe(0)
    expect(r.rate).toBeNull()
  })
})

describe('streaks and totals', () => {
  it('counts current streak through yesterday when today is unreported', () => {
    const days = [setback(addDays(TODAY, -5)), ...[4, 3, 2, 1].map((n) => clean(addDays(TODAY, -n)))]
    const s = streaks(snap(days))
    expect(s.current).toBe(4)
    expect(s.best).toBe(4)
    expect(s.daysSinceSetback).toBe(5)
  })
  it('an unreported gap ends a streak; best survives a setback', () => {
    const days = [
      ...[20, 19, 18, 17, 16, 15].map((n) => clean(addDays(TODAY, -n))),
      setback(addDays(TODAY, -14)),
      ...[5, 4].map((n) => clean(addDays(TODAY, -n))),
      // day -3 unreported
      ...[2, 1, 0].map((n) => clean(addDays(TODAY, -n))),
    ]
    const s = streaks(snap(days))
    expect(s.best).toBe(6)
    expect(s.current).toBe(3)
    expect(totalCleanDays(snap(days))).toBe(11)
  })
})

describe('item scores', () => {
  it('scores a perWeek target against the target, not against 7', () => {
    const fast = SEED_ITEMS.find((i) => i.id === 'sc-fast')!
    // Two fasts per week for four weeks: 100%.
    const days = lastNDays(TODAY, 28).map((d, i) => day(d, { 'sc-fast': i % 7 < 2 }))
    expect(itemScore(fast, new Map(days.map((d) => [d.date, d])), TODAY, 28)).toBe(1)
  })
  it('scores a count target by threshold', () => {
    const steps = SEED_ITEMS.find((i) => i.id === 'sc-steps')!
    const days = [day(TODAY, { 'sc-steps': 6 }), day(addDays(TODAY, -1), { 'sc-steps': 3 })]
    expect(itemScore(steps, new Map(days.map((d) => [d.date, d])), TODAY, 30)).toBe(0.5)
  })
})

describe('factor impact', () => {
  it('computes held vs not-held rates with exact counts', () => {
    // 10 days with midnight sleep, all clean; 10 without, 5 setbacks.
    const dates = lastNDays(TODAY, 20)
    const days = dates.map((d, i) =>
      i < 10 ? clean(d, { 'sc-midnight': true }) : i % 2 ? setback(d, { 'sc-midnight': false }) : clean(d, { 'sc-midnight': false }),
    )
    const f = factorImpact(snap(days)).find((x) => x.item.id === 'sc-midnight')!
    expect(f.sameDay.held).toMatchObject({ n: 10, clean: 10, rate: 1 })
    expect(f.sameDay.notHeld).toMatchObject({ n: 10, clean: 5, rate: 0.5 })
    expect(f.sameDay.diff).toBeCloseTo(0.5)
    // 50 points apart but only 20 days: z≈2.6, so moderate rather than strong.
    expect(f.sameDay.strength).toBe('moderate')
  })
  it('withholds a result below the minimum sample and says how many more are needed', () => {
    const days = lastNDays(TODAY, 11).map((d, i) => clean(d, { 'bnd-phone': i < 3 }))
    const f = factorImpact(snap(days)).find((x) => x.item.id === 'bnd-phone')!
    // phone crossed on 3 days -> notHeld arm has 3, needs 5 more.
    expect(f.sameDay.diff).toBeNull()
    expect(f.sameDay.needed).toBe(5)
    expect(f.best).toBeNull()
  })
  it('detects a next-day effect that has no same-day signal', () => {
    // Short night on day D -> setback on D+1, repeated.
    const days: DayEntry[] = []
    lastNDays(TODAY, 40).forEach((d, i) => {
      const short = i % 4 === 0
      const afterShort = i % 4 === 1
      days.push(afterShort ? setback(d, { 'bnd-sleep': false }) : clean(d, { 'bnd-sleep': short }))
    })
    const f = factorImpact(snap(days)).find((x) => x.item.id === 'bnd-sleep')!
    expect(f.nextDay.held.rate).toBe(1 - 0) // held (no short night) -> next day mostly clean
    expect(f.nextDay.notHeld.rate).toBe(0)
    expect(Math.abs(f.nextDay.diff!)).toBeGreaterThan(Math.abs(f.sameDay.diff!))
    expect(f.best?.lag).toBe(1)
  })
  it('labels a small difference as weak', () => {
    const days = lastNDays(TODAY, 40).map((d, i) =>
      // prayer on even days; one setback in each arm -> ~0 difference
      i === 2 || i === 3 ? setback(d, { 'sc-prayer': i % 2 === 0 }) : clean(d, { 'sc-prayer': i % 2 === 0 }),
    )
    const f = factorImpact(snap(days)).find((x) => x.item.id === 'sc-prayer')!
    expect(f.sameDay.strength).toBe('weak')
  })
})

describe('risk window', () => {
  it('flags today when it falls where past setbacks clustered', () => {
    // Setbacks with gaps 11, 13, 12, 15, then today is day 12.
    let d = addDays(TODAY, -(11 + 13 + 12 + 15 + 12))
    const days = [setback(d)]
    for (const g of [11, 13, 12, 15]) {
      d = addDays(d, g)
      days.push(setback(d))
    }
    const r = riskWindow(snap(days))!
    expect(r.day).toBe(12)
    expect(r.from).toBe(11)
    expect(r.to).toBe(15)
    expect(r.hits).toBe(4)
    expect(r.inWindow).toBe(true)
  })
  it('returns null without enough setbacks or with no cluster', () => {
    expect(riskWindow(snap([setback(addDays(TODAY, -3))]))).toBeNull()
    let d = addDays(TODAY, -200)
    const days = [setback(d)]
    for (const g of [2, 30, 60, 9]) {
      d = addDays(d, g)
      days.push(setback(d))
    }
    expect(riskWindow(snap(days))).toBeNull()
  })
  it('reports days until the window opens', () => {
    let d = addDays(TODAY, -(10 + 10 + 11 + 5))
    const days = [setback(d)]
    for (const g of [10, 10, 11]) {
      d = addDays(d, g)
      days.push(setback(d))
    }
    const r = riskWindow(snap(days))!
    expect(r.day).toBe(5)
    expect(r.inWindow).toBe(false)
    expect(r.daysUntil).toBe(5)
  })
})

describe('top factors', () => {
  it('ranks only factors with enough data', () => {
    const days = lastNDays(TODAY, 20).map((d, i) =>
      i < 10 ? clean(d, { 'sc-midnight': true }) : i % 2 ? setback(d, { 'sc-midnight': false }) : clean(d, { 'sc-midnight': false }),
    )
    const top = topFactors(snap(days))
    expect(top.map((f) => f.item.id)).toEqual(['sc-midnight'])
  })
})
