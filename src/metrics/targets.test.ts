import { describe, expect, it } from 'vitest'
import { addDays, lastNDays } from '../lib/dates'
import { hashPin, isValidPin, verifyPin } from '../lib/pin'
import { SEED_ITEMS } from '../db/seed'
import { DEFAULT_SETTINGS, type DayEntry } from '../db/types'
import { forwardTarget, riskText } from './targets'
import { buildTimeline } from './timeline'

const TODAY = '2026-09-26'
const st = (current: number, best: number) => ({ current, best, daysSinceSetback: null })
const day = (date: string, breach: boolean, extra: DayEntry['entries'] = {}): DayEntry => ({
  date,
  entries: { 'abs-sites': breach, ...extra },
  loggedAt: '',
  backfilled: false,
})

describe('forward target', () => {
  it('always gives one concrete thing ahead', () => {
    expect(forwardTarget(st(0, 0), 0, DEFAULT_SETTINGS, TODAY).headline).toMatch(/Check in today/)
    expect(forwardTarget(st(13, 26), 20, DEFAULT_SETTINGS, TODAY).headline).toBe('14 days to beat your best (26).')
    expect(forwardTarget(st(12, 26), 20, DEFAULT_SETTINGS, TODAY).headline).toBe('Day 12. 2 more days to 14 in a row.')
    // A 1-day "best" is not worth talking about.
    expect(forwardTarget(st(1, 1), 1, DEFAULT_SETTINGS, TODAY).headline).toBe('Day 1. 2 more days to 3 in a row.')
    expect(forwardTarget(st(0, 5), 9, DEFAULT_SETTINGS, TODAY, true).headline).toMatch(/starting tomorrow/)
    expect(forwardTarget(st(26, 26), 30, DEFAULT_SETTINGS, TODAY).headline).toMatch(/longest run/)
    expect(forwardTarget(st(5, 40), 50, DEFAULT_SETTINGS, TODAY).headline).toBe('Day 5. 2 more days to 7 in a row.')
    expect(forwardTarget(st(0, 40), 50, DEFAULT_SETTINGS, TODAY).headline).toMatch(/^3 clean days in a row/)
  })
  it('puts the replacement habit first when there is no streak yet', () => {
    const settings = { ...DEFAULT_SETTINGS, replacementHabit: 'Evening walk', habitStartDate: addDays(TODAY, -30) }
    const t = forwardTarget(st(0, 10), 40, settings, TODAY)
    expect(t.headline).toBe('Day 31 of 66: Evening walk')
    expect(t.sub).toMatch(/^3 clean days/)
    expect(forwardTarget(st(10, 10), 40, settings, TODAY).sub).toBe('Day 31 of 66: Evening walk')
  })
})

describe('risk text', () => {
  it('speaks only inside or just before the window', () => {
    const base = { from: 10, to: 16, hits: 4, of: 5, ratio: 3.2 }
    expect(riskText({ ...base, day: 12, inWindow: true, daysUntil: 0 })).toBe(
      'Day 12. Setbacks have been about 3× as likely on days 10–16 after the last one (4 of 5). Today is inside that range.',
    )
    expect(riskText({ ...base, day: 9, inWindow: false, daysUntil: 1 })).toMatch(/starts in 1 day\./)
    expect(riskText({ ...base, day: 3, inWindow: false, daysUntil: 7 })).toBeNull()
    expect(riskText(null)).toBeNull()
  })
})

describe('timeline', () => {
  it('lists bests, milestones and setbacks with what preceded them', () => {
    const dates = lastNDays(TODAY, 12)
    const days = dates.map((d, i) => day(d, i === 8, i === 7 ? { 'bnd-sleep': true } : i === 8 ? { 'bnd-phone': true } : {}))
    const ev = buildTimeline(
      {
        items: SEED_ITEMS,
        days,
        urges: [{ id: 'u', at: `${dates[8]}T22:15:00`, intensity: 8, triggerItemIds: ['bnd-phone'], outcome: 'acted' }],
        today: TODAY,
      },
      4,
    )
    const setback = ev.find((e) => e.kind === 'setback')!
    expect(setback.date).toBe(dates[8])
    expect(setback.detail).toEqual(['Day before: not enough sleep', 'That day: phone in bed', 'Urge around 22:00, intensity 8, phone in bed'])
    expect(ev.find((e) => e.kind === 'best')?.title).toBe('Personal best: 8 clean days in a row')
    expect(ev.find((e) => e.kind === 'milestone')?.title).toBe('7 clean days in total')
    expect(ev.at(-1)?.kind).toBe('start')
  })
})

describe('pin', () => {
  it('hashes with a salt and verifies', async () => {
    const h = await hashPin('4821')
    expect(h).not.toBe(await hashPin('4821'))
    expect(await verifyPin('4821', h)).toBe(true)
    expect(await verifyPin('4822', h)).toBe(false)
    expect(isValidPin('12')).toBe(false)
    expect(isValidPin('123456')).toBe(true)
  })
})
