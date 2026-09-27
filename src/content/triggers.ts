import { addDays, diffDays, lastNDays } from '../lib/dates'
import type { LocalDate, Meta, Plan, Settings } from '../db/types'
import { dayOutcome, riskWindow, setbackDates, topFactors, type Snapshot } from '../metrics/metrics'
import { lessonById, type Lesson } from './lessons'

export interface Ctx {
  s: Snapshot
  plans: Plan[]
  settings: Settings
  meta: Meta
  dateOf: (u: { at: string }) => LocalDate
}

/** A rule returns the reason the lesson is relevant now, or null. */
type Rule = (c: Ctx) => string | null

const recentUrges = (c: Ctx, days: number) => {
  const from = addDays(c.s.today, -(days - 1))
  return c.s.urges.filter((u) => c.dateOf(u) >= from)
}
const urgesTagged = (c: Ctx, ids: string[], days = 14) => recentUrges(c, days).filter((u) => u.triggerItemIds.some((t) => ids.includes(t)))
const crossedDays = (c: Ctx, id: string, days = 7) => {
  const map = new Map(c.s.days.map((d) => [d.date, d]))
  return lastNDays(c.s.today, days).filter((d) => map.get(d)?.entries[id] === true).length
}
const itemName = (c: Ctx, id: string) => c.s.items.find((i) => i.id === id)?.name.toLowerCase() ?? id

/**
 * Ordered by priority: the first rule that fires (and hasn't been dismissed
 * or read recently) becomes the Today card. Rules key off seed item ids, so
 * a renamed item still works; a deleted one just never fires.
 */
const RULES: [string, Rule][] = [
  [
    'day-after',
    (c) => {
      const last = setbackDates(c.s).at(-1)
      return last && diffDays(last, c.s.today) === 1 ? 'You logged a setback yesterday.' : null
    },
  ],
  [
    'ave',
    (c) => {
      const recent = setbackDates(c.s).filter((d) => diffDays(d, c.s.today) <= 7)
      return recent.length >= 2 ? `${recent.length} setbacks in the last week.` : null
    },
  ],
  [
    'relapse-data',
    (c) => {
      const r = riskWindow(c.s)
      return r && (r.inWindow || (r.daysUntil > 0 && r.daysUntil <= 2)) ? `Today is near the range where your setbacks have clustered (days ${r.from}–${r.to}).` : null
    },
  ],
  [
    'extinction',
    (c) => {
      const week = recentUrges(c, 7).length
      const prior = recentUrges(c, 35).length - week
      // A clear rise after a quieter stretch: at least double the weekly average of the 4 weeks before.
      return prior >= 4 && week >= 4 && week >= (prior / 4) * 2 ? `${week} urges this week, about double your recent average.` : null
    },
  ],
  [
    'wanting-liking',
    (c) => {
      const acted = recentUrges(c, 30).filter((u) => u.outcome === 'acted' && u.intensity >= 7).length
      return acted >= 2 ? `${acted} strong urges acted on this month. Worth knowing what the pull is and isn't.` : null
    },
  ],
  [
    'sleep',
    (c) => {
      const u = urgesTagged(c, ['bnd-sleep'])
      if (u.length >= 3) return `${u.length} of your urges in the last two weeks were tagged ${itemName(c, 'bnd-sleep')}.`
      const n = crossedDays(c, 'bnd-sleep')
      return n >= 4 ? `${itemName(c, 'bnd-sleep')} on ${n} of the last 7 days.` : null
    },
  ],
  [
    'loneliness',
    (c) => {
      const u = urgesTagged(c, ['bnd-lonely', 'bnd-alone'])
      if (u.length >= 3) return `${u.length} urges in the last two weeks came with loneliness or a day alone.`
      const n = crossedDays(c, 'bnd-lonely')
      return n >= 3 ? `Loneliness on ${n} of the last 7 days.` : null
    },
  ],
  [
    'phone-in-bed',
    (c) => {
      const u = urgesTagged(c, ['bnd-phone', 'bnd-shorts'])
      if (u.length >= 3) return `${u.length} urges in the last two weeks were tagged with the phone or short-form feeds.`
      const n = crossedDays(c, 'bnd-phone')
      return n >= 4 ? `Phone in bed on ${n} of the last 7 days.` : null
    },
  ],
  [
    'if-then',
    (c) => {
      const planned = new Set(c.plans.filter((p) => p.active).flatMap((p) => p.triggerItemIds))
      const counts = new Map<string, number>()
      for (const u of recentUrges(c, 14)) for (const t of u.triggerItemIds) if (!planned.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1)
      const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])
      return top && top[1] >= 2 ? `${top[1]} recent urges tagged ${itemName(c, top[0])}, and no plan for it yet.` : null
    },
  ],
  [
    'urge-surfing',
    (c) => {
      const acted = recentUrges(c, 14).filter((u) => u.outcome === 'acted').length
      if (acted >= 2) return `${acted} urges acted on in the last two weeks.`
      const timed = c.s.urges.some((u) => u.durationMin !== undefined)
      return c.s.urges.length >= 1 && !timed ? "You've logged urges but haven't timed one yet." : null
    },
  ],
  [
    'halt',
    (c) => {
      const map = new Map(c.s.days.map((d) => [d.date, d]))
      const low = lastNDays(c.s.today, 5).filter((d) => (map.get(d)?.mood ?? 5) <= 2).length
      return low >= 2 ? `Low mood on ${low} of the last 5 days.` : null
    },
  ],
  [
    'shame',
    (c) => {
      const absIds = c.s.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
      const map = new Map(c.s.days.map((d) => [d.date, d]))
      const hit = lastNDays(c.s.today, 3).find((d) => dayOutcome(map.get(d), absIds) === 'setback' && (map.get(d)?.mood ?? 5) <= 2)
      return hit ? 'A setback and a low mood together.' : null
    },
  ],
  [
    'reading-data',
    (c) => (topFactors(c.s).length > 0 && !c.meta.lessonsRead['reading-data'] ? 'Your first factor comparisons are ready in Insights.' : null),
  ],
  [
    'replacement',
    (c) => (!c.settings.replacementHabit && c.s.days.length >= 7 ? 'A week of check-ins in. Time to name one replacement habit.' : null),
  ],
  ['rates', (c) => (c.s.days.length >= 1 && c.s.days.length <= 7 ? 'Why the headline number is a rate.' : null)],
  ['dopamine', (c) => (c.s.urges.length >= 3 && c.s.days.length <= 21 ? `You've logged ${c.s.urges.length} urges. Here's what's behind them.` : null)],
]

export interface Suggestion {
  lesson: Lesson
  reason: string
}

const DISMISS_DAYS = 7
const READ_DAYS = 21

export function suggestLesson(c: Ctx): Suggestion | null {
  // Pace suggestions: after one is read or set aside, wait a day before the next,
  // so the card is a nudge, not a feed.
  const recent = (m: Record<string, LocalDate>) => Object.values(m).some((d) => diffDays(d, c.s.today) <= 1)
  if (recent(c.meta.lessonsDismissed) || recent(c.meta.lessonsRead)) return null
  for (const [id, rule] of RULES) {
    const dismissed = c.meta.lessonsDismissed[id]
    if (dismissed && diffDays(dismissed, c.s.today) < DISMISS_DAYS) continue
    const read = c.meta.lessonsRead[id]
    if (read && diffDays(read, c.s.today) < READ_DAYS) continue
    const reason = rule(c)
    const lesson = lessonById(id)
    if (reason && lesson) return { lesson, reason }
  }
  return null
}

export const RULE_IDS = RULES.map(([id]) => id)
