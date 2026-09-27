import { describe, expect, it } from 'vitest'
import { SEED_ITEMS } from '../db/seed'
import type { DayEntry, Urge } from '../db/types'
import { addDays, lastNDays } from '../lib/dates'
import { PERSONAS } from '../sim/personas'
import { summarize } from '../sim/run'
import { buildInsights, pickInsight, urgeFactors, weekReview } from './insights'
import type { Snapshot } from './metrics'

const TODAY = '2026-09-26'
const dateOf = (u: { at: string }) => u.at.slice(0, 10)
const day = (date: string, extra: DayEntry['entries'] = {}): DayEntry => ({ date, entries: { 'abs-sites': false, ...extra }, loggedAt: '', backfilled: false })
const urge = (date: string, n: number, over: Partial<Urge> = {}): Urge => ({
  id: `${date}-${n}`,
  at: `${date}T22:${String(10 + n).padStart(2, '0')}:00`,
  intensity: 6,
  triggerItemIds: [],
  outcome: 'resisted',
  ...over,
})
const snap = (days: DayEntry[], urges: Urge[] = []): Snapshot => ({ items: SEED_ITEMS, days, urges, today: TODAY })

describe('insights from day one', () => {
  it('has something true to say after a single urge', () => {
    const list = buildInsights(snap([day(TODAY)], [urge(TODAY, 1)]), { dateOf })
    expect(list.map((i) => i.id)).toContain('fact:resisted')
    expect(list.every((i) => i.confidence === 'fact')).toBe(true)
  })

  it('reports when urges concentrate in a few hours', () => {
    const urges = lastNDays(TODAY, 5).map((d, i) => urge(d, i))
    const hours = buildInsights(snap([day(TODAY)], urges), { dateOf }).find((i) => i.id === 'fact:hours')
    expect(hours?.text).toMatch(/^5 of your 5 urges came between 2[0-2]:00/)
  })
})

describe('wanting vs liking', () => {
  it('reports the gap once three acted urges have an enjoyment rating', () => {
    const urges = [1, 2, 3].map((n) => urge(addDays(TODAY, -n), n, { outcome: 'acted', intensity: 8, enjoyed: 4 }))
    const f = buildInsights(snap([day(TODAY)], urges), { dateOf }).find((i) => i.id === 'fact:wanting-liking')
    expect(f?.text).toBe('The 3 urges you acted on and rated felt like 8 out of 10 beforehand. You rated the enjoyment 4 afterwards.')
    expect(buildInsights(snap([day(TODAY)], urges.slice(0, 2)), { dateOf }).some((i) => i.id === 'fact:wanting-liking')).toBe(false)
  })
})

describe('urge factors', () => {
  it('detects a strong same-day effect and states it as urges per day', () => {
    // Phone in bed every other day; 3 urges on those days, 0-1 otherwise, for 50 days
    // (long enough for the pattern to have held on each of the last 5 days).
    const dates = lastNDays(TODAY, 50)
    const days = dates.map((d, i) => day(d, { 'bnd-phone': i % 2 === 0 }))
    const urges = dates.flatMap((d, i) => (i % 2 === 0 ? [1, 2, 3].map((n) => urge(d, n)) : i % 4 === 1 ? [urge(d, 1)] : []))
    const f = urgeFactors(snap(days, urges), dateOf).find((x) => x.item.id === 'bnd-phone' && x.lag === 0)!
    expect(f.on.rate).toBe(3)
    expect(f.off.rate).toBeCloseTo(0.52, 1)
    const claim = buildInsights(snap(days, urges), { dateOf }).find((i) => i.id === 'urge:bnd-phone')!
    expect(claim.direction).toBe(1)
    expect(claim.text).toMatch(/^On days with phone in bed you logged 3 urges a day; without it, 0\.5\.$/)
    // The same data cut off at day 40 is too new to have persisted.
    const young = { ...snap(days.slice(-40), urges.filter((u) => dateOf(u) >= dates[10]!)) }
    expect(buildInsights(young, { dateOf }).some((i) => i.id === 'urge:bnd-phone')).toBe(false)
  })

  it('drops a pattern that only exists in one half of the window', () => {
    // Strong effect in the last 30 days, the opposite in the 30 before.
    const dates = lastNDays(TODAY, 60)
    const days = dates.map((d, i) => day(d, { 'bnd-phone': i % 2 === 0 }))
    const urges = dates.flatMap((d, i) => {
      const recent = i >= 30
      const on = i % 2 === 0
      return (recent ? on : !on) ? [1, 2, 3, 4].map((n) => urge(d, n)) : []
    })
    expect(buildInsights(snap(days, urges), { dateOf }).find((i) => i.id === 'urge:bnd-phone')).toBeUndefined()
  })
})

describe('Today card rotation', () => {
  it('keeps today’s card stable and rotates to a fresh one tomorrow', () => {
    const list = [
      { id: 'a', kind: 'fact' as const, confidence: 'fact' as const, text: 'a', score: 0.9 },
      { id: 'b', kind: 'fact' as const, confidence: 'fact' as const, text: 'b', score: 0.5 },
    ]
    expect(pickInsight(list, {}, TODAY)?.id).toBe('a')
    expect(pickInsight(list, { a: TODAY }, TODAY)?.id).toBe('a')
    expect(pickInsight(list, { a: TODAY }, addDays(TODAY, 1))?.id).toBe('b')
  })
})

describe('week review', () => {
  it('compares the last 7 days with the 7 before', () => {
    const dates = lastNDays(TODAY, 14)
    const days = dates.map((d, i) => day(d, { 'abs-sites': i === 2 }))
    const r = weekReview(snap(days, [urge(TODAY, 1), urge(addDays(TODAY, -9), 1, { outcome: 'acted' })]), dateOf)!
    expect(r.reported).toBe(7)
    expect(r.clean).toBe(7)
    expect(r.prev?.clean).toBe(6)
    expect(r.resisted).toBe(1)
    expect(r.prev?.resisted).toBe(0)
  })
})

// Guards the behaviour the simulator was used to tune (see docs/simulation-report.md).
describe('simulated users', () => {
  const run = (id: string) => summarize(PERSONAS.find((p) => p.id === id)!, 'current', [1, 2])

  it('never leaves a new user with nothing to read', () => {
    for (const s of run('improver')) {
      expect(s.firstFact).toBeLessThanOrEqual(4)
      expect(s.emptyCardDays).toBe(0)
    }
  })

  it('rarely makes a claim about a user whose data has no pattern', () => {
    // Measured: 0-11% of days across seeds, almost all labelled "early signal".
    // Before replication and the stricter thresholds this was ~50%.
    for (const s of run('null')) expect(s.falseClaimDays / 180).toBeLessThan(0.15)
  })

  it('flags the risk window where it predicts setbacks', () => {
    const lifts = run('cycle').map((s) => s.riskLift)
    expect(lifts.every((l) => l !== null && l > 1.5)).toBe(true)
  })
}, 60_000)
