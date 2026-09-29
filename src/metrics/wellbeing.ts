import { needById, promiseById, REFLECTION } from '../content/needs'
import type { LocalDate, Reflection, ReflectionKey, Step, Urge } from '../db/types'
import { diffDays } from '../lib/dates'
import type { Insight } from './insights'
import { dayOutcome, type Snapshot } from './metrics'

/**
 * Beyond urges: how the person is doing (reflections), what the urges were
 * really about (needs), and what they did toward those needs (steps).
 *
 * These produce descriptive facts and trends only. A tempting claim like
 * "days with a step had fewer urges" would be confounded: steps are usually
 * logged right after an urge, so they cluster on urge days.
 */

export const REFLECTION_EVERY_DAYS = 3

/** Ask every few days, and the day after a setback (when compassion matters most). */
export function reflectionDue(s: Snapshot, reflections: Reflection[], skipped: LocalDate | undefined): boolean {
  if (skipped === s.today) return false
  if (s.days.length === 0) return false
  const last = reflections.at(-1)
  if (!last) return true
  const since = diffDays(last.date, s.today)
  if (since >= REFLECTION_EVERY_DAYS) return true
  const absIds = s.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  const yesterday = s.days.find((d) => diffDays(d.date, s.today) === 1)
  // Only if the last reflection came before that setback day.
  return since >= 2 && dayOutcome(yesterday, absIds) === 'setback'
}

export interface ScoreTrend {
  key: ReflectionKey
  label: string
  latest: number
  /** Average of the reflections before the latest two, when there are enough. */
  earlier: number | null
  recent: number
  better: boolean | null
}

/** Latest two reflections against the ones before, per question. */
export function reflectionTrends(reflections: Reflection[]): ScoreTrend[] {
  const out: ScoreTrend[] = []
  for (const q of REFLECTION) {
    const vals = reflections.map((r) => r[q.key]).filter((v): v is number => typeof v === 'number')
    if (!vals.length) continue
    const recentVals = vals.slice(-2)
    const earlierVals = vals.slice(0, -2).slice(-4)
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const recent = avg(recentVals)
    const earlier = earlierVals.length >= 2 ? avg(earlierVals) : null
    const d = earlier === null ? 0 : recent - earlier
    out.push({
      key: q.key,
      label: q.label,
      latest: vals.at(-1)!,
      earlier,
      recent,
      better: earlier === null || Math.abs(d) < 0.5 ? null : q.higherIsBetter ? d > 0 : d < 0,
    })
  }
  return out
}

export interface NeedCount {
  id: string
  label: string
  n: number
}

function count(ids: string[], label: (id: string) => string | undefined): NeedCount[] {
  const m = new Map<string, number>()
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1)
  return [...m.entries()]
    .map(([id, n]) => ({ id, n, label: label(id) ?? id }))
    .sort((a, b) => b.n - a.n)
}

/** What urges promised and what was needed, from urges and reflections in the window. */
export function needSummary(urges: Urge[], reflections: Reflection[], dateOf: (u: { at: string }) => LocalDate, today: LocalDate, windowDays = 60) {
  const recent = urges.filter((u) => diffDays(dateOf(u), today) < windowDays)
  const withNeeds = recent.filter((u) => u.needs?.length)
  const refl = reflections.filter((r) => diffDays(r.date, today) < windowDays)
  return {
    urgesWithNeeds: withNeeds.length,
    needs: count([...withNeeds.flatMap((u) => u.needs!), ...refl.flatMap((r) => r.needs ?? [])], (id) => needById(id)?.label),
    promises: count(recent.flatMap((u) => u.promise ?? []), (id) => promiseById(id)?.label),
  }
}

export function stepSummary(steps: Step[], today: LocalDate, days = 7) {
  const recent = steps.filter((s) => diffDays(s.at.slice(0, 10), today) < days)
  return { total: recent.length, byNeed: count(recent.map((s) => s.need), (id) => needById(id)?.label) }
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const fmt1 = (x: number) => (Math.round(x * 10) / 10).toString()

/** Insights about needs, steps and reflections, in the same shape as insights.ts. */
export function wellbeingInsights(
  s: Snapshot,
  reflections: Reflection[],
  steps: Step[],
  dateOf: (u: { at: string }) => LocalDate,
): Insight[] {
  const out: Insight[] = []
  const ns = needSummary(s.urges, reflections, dateOf, s.today)
  const topNeed = ns.needs[0]
  const topPromise = ns.promises[0]
  if (topNeed && topNeed.n >= 3) {
    out.push({
      id: 'fact:needs',
      kind: 'fact',
      confidence: 'fact',
      text: topPromise
        ? `Your urges have mostly promised ${lower(topPromise.label)}. Underneath, what you've needed most is ${lower(topNeed.label)} (${topNeed.n} times).`
        : `What you've needed most lately is ${lower(topNeed.label)} (${topNeed.n} times).`,
      detail: 'The urge is one way of trying to meet that. Plans has other ways.',
      score: 0.85,
    })
  }
  const st = stepSummary(steps, s.today)
  if (st.total > 0) {
    const top = st.byNeed[0]!
    out.push({
      id: 'fact:steps',
      kind: 'fact',
      confidence: 'fact',
      text: `${st.total} ${st.total === 1 ? 'step' : 'steps'} toward what you actually need this week${st.byNeed.length > 1 ? `, most for ${lower(top.label)}` : `, all for ${lower(top.label)}`}.`,
      score: 0.8,
    })
  }
  for (const t of reflectionTrends(reflections)) {
    if (t.better === null || t.earlier === null) continue
    out.push({
      id: `trend:reflect:${t.key}`,
      kind: 'trend',
      confidence: 'fact',
      text: `${t.label}: ${fmt1(t.recent)} out of 5 in your last two reflections, ${t.recent > t.earlier ? 'up' : 'down'} from ${fmt1(t.earlier)}.`,
      detail: t.better ? undefined : t.key === 'compassion' ? 'Harshness after a slip tends to feed the next one. The Shame lesson is short.' : undefined,
      score: t.better ? 0.75 : 0.55,
    })
  }
  return out
}
