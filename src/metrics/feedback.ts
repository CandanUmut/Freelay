import { lastNDays } from '../lib/dates'
import type { DayEntry, Layer, LocalDate, TrackedItem } from '../db/types'
import { buildInsights } from './insights'
import { abstinenceRate, dayOutcome, isHeld, totalCleanDays, type FactorImpact, type LagResult, type Snapshot } from './metrics'

export interface LayerCount {
  held: number
  total: number
  /** Average held per reported day over the previous 30 days (excluding this day). */
  avg: number | null
}

export interface CheckInFeedback {
  outcome: 'clean' | 'setback' | undefined
  rateBefore: number | null
  rateAfter: number | null
  totalClean: number
  boundary: LayerCount
  selfcare: LayerCount
  insight: string | null
}

const pct = (x: number) => `${Math.round(x * 100)}%`

function layerCount(items: TrackedItem[], layer: Layer, day: DayEntry | undefined): { held: number; total: number } {
  let held = 0
  let total = 0
  for (const i of items) {
    if (i.layer !== layer || !i.active) continue
    const h = isHeld(i, day?.entries[i.id])
    if (h === undefined) continue
    total++
    if (h) held++
  }
  return { held, total }
}

function layerAvg(s: Snapshot, layer: Layer, exclude: LocalDate): number | null {
  const map = new Map(s.days.map((d) => [d.date, d]))
  const counts = lastNDays(s.today, 30)
    .filter((d) => d !== exclude && map.has(d))
    .map((d) => layerCount(s.items, layer, map.get(d)))
    .filter((c) => c.total > 0)
    .map((c) => c.held)
  return counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : null
}

/** One sentence about a factor, stated as an observed rate difference. */
export function factorSentence(f: FactorImpact, r: LagResult): string {
  const name = f.item.name.toLowerCase()
  const when = r.lag === 1 ? 'the day after' : 'on days'
  const [yes, no] =
    f.item.layer === 'boundary'
      ? [`${when} with ${name}`, 'without it']
      : [`${when} you did ${name}`, "when you didn't"]
  // For a boundary, "held" means the risk was absent, so the crossed arm is notHeld.
  const [a, b] = f.item.layer === 'boundary' ? [r.notHeld, r.held] : [r.held, r.notHeld]
  const cap = yes.charAt(0).toUpperCase() + yes.slice(1)
  return `${cap}, your clean rate is ${pct(a.rate!)} (${a.n} days); ${no}, ${pct(b.rate!)} (${b.n} days).`
}

export function strengthNote(r: LagResult): string {
  if (r.strength === 'strong') return 'A clear difference in your data.'
  if (r.strength === 'moderate') return 'A moderate difference; could still be partly chance.'
  return 'Weak: this could easily be chance.'
}

export function factorNeeds(f: FactorImpact): string {
  const r = f.sameDay
  if (r.needed > 0) return `${f.item.name}: not enough data yet. ${r.needed} more ${r.needed === 1 ? 'day' : 'days'} needed on the less common side.`
  return `${f.item.name}: needs ${r.neededSetbacks} more ${r.neededSetbacks === 1 ? 'setback' : 'setbacks'} in the last 60 days before a comparison means anything. Fewer is the better problem to have.`
}

/**
 * What a check-in changed, computed the moment it is saved. `after` must
 * already include the saved day.
 */
export function checkInFeedback(before: Snapshot, after: Snapshot, date: LocalDate, dateOf: (u: { at: string }) => LocalDate): CheckInFeedback {
  const absIds = after.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  const day = after.days.find((d) => d.date === date)
  const outcome = dayOutcome(day, absIds)

  // Prefer a pattern about something that happened today (a boundary crossed,
  // self care missed); otherwise the strongest thing the data can say.
  // perWeek items aren't expected daily, so not doing one today isn't "missed".
  const missed = new Set(
    after.items.filter((i) => i.target?.type !== 'perWeek' && isHeld(i, day?.entries[i.id]) === false).map((i) => i.id),
  )
  const all = buildInsights(after, { dateOf })
  const pick = all.find((i) => i.itemId && missed.has(i.itemId) && i.confidence !== 'fact') ?? all.find((i) => i.confidence !== 'fact') ?? all[0]
  const insight = pick ? [pick.text, pick.detail].filter(Boolean).join(' ') : null

  return {
    outcome,
    rateBefore: abstinenceRate(before).rate,
    rateAfter: abstinenceRate(after).rate,
    totalClean: totalCleanDays(after),
    boundary: { ...layerCount(after.items, 'boundary', day), avg: layerAvg(after, 'boundary', date) },
    selfcare: { ...layerCount(after.items, 'selfcare', day), avg: layerAvg(after, 'selfcare', date) },
    insight,
  }
}

/** Replace or insert one day in a snapshot. */
export function withDay(s: Snapshot, day: DayEntry): Snapshot {
  return { ...s, days: [...s.days.filter((d) => d.date !== day.date), day] }
}
