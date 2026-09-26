import { describe, expect, it } from 'vitest'
import { addDays, lastNDays } from '../lib/dates'
import { SEED_ITEMS } from '../db/seed'
import { DEFAULT_META, DEFAULT_SETTINGS, type DayEntry } from '../db/types'
import { LESSONS, readingMinutes } from './lessons'
import { RULE_IDS, suggestLesson, type Ctx } from './triggers'

const TODAY = '2026-09-26'
const day = (date: string, extra: DayEntry['entries'] = {}, mood?: DayEntry['mood']): DayEntry => ({
  date,
  entries: { 'abs-sites': false, ...extra },
  mood,
  loggedAt: '',
  backfilled: false,
})
const ctx = (days: DayEntry[], urges: Ctx['s']['urges'] = [], meta = DEFAULT_META): Ctx => ({
  s: { items: SEED_ITEMS, days, urges, today: TODAY },
  plans: [],
  settings: DEFAULT_SETTINGS,
  meta,
  dateOf: (u) => u.at.slice(0, 10),
})

describe('lessons', () => {
  it('has ~15 lessons of 2-4 minutes with unique ids, and every rule has a lesson', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(15)
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
    for (const l of LESSONS) {
      expect(readingMinutes(l), l.id).toBeGreaterThanOrEqual(2)
      expect(readingMinutes(l), l.id).toBeLessThanOrEqual(4)
    }
    for (const id of RULE_IDS) expect(LESSONS.some((l) => l.id === id), id).toBe(true)
  })
})

describe('contextual lesson', () => {
  it('surfaces the sleep lesson after three sleep-tagged urges', () => {
    const urges = [1, 2, 3].map((n) => ({
      id: `u${n}`,
      at: `${addDays(TODAY, -n)}T22:00:00`,
      intensity: 6,
      triggerItemIds: ['bnd-sleep'],
      outcome: 'resisted' as const,
    }))
    const days = lastNDays(TODAY, 20).map((d) => day(d))
    const s = suggestLesson(ctx(days, urges))
    expect(s?.lesson.id).toBe('sleep')
    expect(s?.reason).toMatch(/3 of your urges/)
  })
  it('puts the day-after lesson first after a setback, and respects dismissal', () => {
    const days = lastNDays(TODAY, 20).map((d, i) => (i === 18 ? day(d, { 'abs-sites': true }) : day(d)))
    expect(suggestLesson(ctx(days))?.lesson.id).toBe('day-after')
    const meta = { ...DEFAULT_META, lessonsDismissed: { 'day-after': TODAY } }
    expect(suggestLesson(ctx(days, [], meta))?.lesson.id).not.toBe('day-after')
  })
  it('stays quiet when nothing is going on', () => {
    const days = lastNDays(TODAY, 20).map((d) => day(d))
    const settings = { ...DEFAULT_SETTINGS, replacementHabit: 'Walk', habitStartDate: TODAY }
    expect(suggestLesson({ ...ctx(days), settings })).toBeNull()
  })
})
