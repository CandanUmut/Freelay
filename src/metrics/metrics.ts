import { addDays, diffDays, lastNDays } from '../lib/dates'
import type { DayEntry, EntryValue, Layer, LocalDate, TrackedItem, Urge } from '../db/types'

/**
 * Everything here is derived on read from the raw tables. Nothing is stored.
 * All functions are pure so they can be tested against fixtures.
 */
export interface Snapshot {
  items: TrackedItem[]
  days: DayEntry[]
  urges: Urge[]
  today: LocalDate
}

type DayMap = Map<LocalDate, DayEntry>
const byDate = (days: DayEntry[]): DayMap => new Map(days.map((d) => [d.date, d]))

/** Whether a value is the "good" outcome for its item, or undefined when unanswered. */
export function isHeld(item: TrackedItem, value: EntryValue | undefined): boolean | undefined {
  if (value === undefined) return undefined
  if (item.layer === 'selfcare') {
    if (typeof value === 'number') return value >= (item.target?.type === 'count' ? item.target.value : 1)
    return value
  }
  return !value
}

/**
 * Abstinence outcome for a day: 'clean', 'setback', or undefined when no
 * abstinence item was answered. Any single breach makes it a setback.
 */
export function dayOutcome(day: DayEntry | undefined, abstinenceIds: string[]): 'clean' | 'setback' | undefined {
  if (!day) return undefined
  let answered = false
  for (const id of abstinenceIds) {
    const v = day.entries[id]
    if (v === undefined) continue
    answered = true
    if (v) return 'setback'
  }
  return answered ? 'clean' : undefined
}

// Abstinence outcome uses every abstinence item, archived ones included, so
// archiving an item never rewrites history.
const abstinenceIds = (items: TrackedItem[]) => items.filter((i) => i.layer === 'abstinence').map((i) => i.id)

export interface Rate {
  /** Clean days / reported days, or null when nothing was reported. */
  rate: number | null
  clean: number
  reported: number
  /** Reported days / window length. Shown alongside the rate so gaps are visible. */
  coverage: number
  window: number
}

export function abstinenceRate(s: Snapshot, windowDays = 30, end = s.today): Rate {
  const map = byDate(s.days)
  const ids = abstinenceIds(s.items)
  let clean = 0
  let reported = 0
  for (const d of lastNDays(end, windowDays)) {
    const o = dayOutcome(map.get(d), ids)
    if (!o) continue
    reported++
    if (o === 'clean') clean++
  }
  return { rate: reported ? clean / reported : null, clean, reported, coverage: reported / windowDays, window: windowDays }
}

export const rate30 = (s: Snapshot) => abstinenceRate(s, 30)

export function totalCleanDays(s: Snapshot): number {
  const ids = abstinenceIds(s.items)
  return s.days.filter((d) => d.date <= s.today && dayOutcome(d, ids) === 'clean').length
}

export function setbackDates(s: Snapshot): LocalDate[] {
  const ids = abstinenceIds(s.items)
  return s.days
    .filter((d) => d.date <= s.today && dayOutcome(d, ids) === 'setback')
    .map((d) => d.date)
    .sort()
}

export interface Streaks {
  /** Consecutive clean reported days ending today, or yesterday if today isn't reported yet. */
  current: number
  best: number
  /** Calendar days since the last setback (the day after a setback is day 1). Null if none. */
  daysSinceSetback: number | null
}

/**
 * An unreported day ends a streak: the app can't claim a day it knows nothing
 * about. Backfilling the day restores it.
 */
export function streaks(s: Snapshot): Streaks {
  const map = byDate(s.days)
  const ids = abstinenceIds(s.items)
  const dates = s.days.map((d) => d.date).filter((d) => d <= s.today).sort()

  let best = 0
  let run = 0
  let prev: LocalDate | null = null
  for (const d of dates) {
    const o = dayOutcome(map.get(d), ids)
    if (o === undefined) continue
    if (o === 'clean') {
      run = prev !== null && diffDays(prev, d) === 1 && run > 0 ? run + 1 : 1
      best = Math.max(best, run)
    } else run = 0
    prev = d
  }

  let current = 0
  let cursor = dayOutcome(map.get(s.today), ids) === undefined ? addDays(s.today, -1) : s.today
  while (dayOutcome(map.get(cursor), ids) === 'clean') {
    current++
    cursor = addDays(cursor, -1)
  }

  const setbacks = setbackDates(s)
  const last = setbacks.at(-1)
  return { current, best, daysSinceSetback: last ? diffDays(last, s.today) : null }
}

// ---------------------------------------------------------------- layers

/**
 * Score for one item over a window, 0..1, or null if never answered.
 * Daily items: held days / answered days. perWeek items: for each 7-day block
 * ending at `end`, min(done, target) / target, averaged — so fasting 2 of 7
 * days scores 100%, not 29%.
 */
export function itemScore(item: TrackedItem, map: DayMap, end: LocalDate, windowDays: number): number | null {
  if (item.target?.type === 'perWeek') {
    const weeks = Math.floor(windowDays / 7)
    const scores: number[] = []
    for (let w = 0; w < weeks; w++) {
      let done = 0
      let answered = false
      for (const d of lastNDays(addDays(end, -7 * w), 7)) {
        const h = isHeld(item, map.get(d)?.entries[item.id])
        if (h === undefined) continue
        answered = true
        if (h) done++
      }
      if (answered) scores.push(Math.min(done, item.target.value) / item.target.value)
    }
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  }
  let held = 0
  let answered = 0
  for (const d of lastNDays(end, windowDays)) {
    const h = isHeld(item, map.get(d)?.entries[item.id])
    if (h === undefined) continue
    answered++
    if (h) held++
  }
  return answered ? held / answered : null
}

export function layerRate(s: Snapshot, layer: Layer, windowDays = 30): number | null {
  if (layer === 'abstinence') return abstinenceRate(s, windowDays).rate
  const map = byDate(s.days)
  const scores = s.items
    .filter((i) => i.layer === layer && i.active)
    .map((i) => itemScore(i, map, s.today, windowDays))
    .filter((x): x is number => x !== null)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
}

// ---------------------------------------------------------------- factors

export const MIN_ARM = 8
/**
 * The spec's 8-days-per-arm rule alone is not enough: with few setbacks both
 * arms are near 100% and any difference is one or two events. Require this
 * many setbacks in the sample too.
 */
export const MIN_SETBACKS = 5
export type Strength = 'strong' | 'moderate' | 'weak'

export interface Arm {
  n: number
  clean: number
  rate: number | null
}

export interface LagResult {
  /** 0 = same day, 1 = the factor on day D vs abstinence on day D+1. */
  lag: 0 | 1
  held: Arm
  notHeld: Arm
  /** held.rate - notHeld.rate, in 0..1 units. Null until both arms have MIN_ARM days. */
  diff: number | null
  /** Days still needed in the smaller arm before a difference is shown. */
  needed: number
  /** Setbacks in the sample, and how many more are needed (MIN_SETBACKS). */
  setbacks: number
  neededSetbacks: number
  /** Two-proportion z statistic; a rough guard against reading noise as signal. */
  z: number | null
  strength: Strength | null
}

export interface FactorImpact {
  item: TrackedItem
  sameDay: LagResult
  nextDay: LagResult
  /** The lag with the larger absolute difference, used for ranking. */
  best: LagResult | null
}

/**
 * Thresholds account for ~22 simultaneous comparisons (11 items x 2 lags):
 * a Bonferroni-style bar of |z| >= 3 keeps the chance of any false "moderate"
 * near 5%. The simulator (npm run sim) showed |z| >= 2 produced confident
 * claims on a synthetic user whose data had no pattern at all.
 */
function classify(diff: number, z: number): Strength {
  const a = Math.abs(diff)
  const az = Math.abs(z)
  if (a >= 0.15 && az >= 3.5) return 'strong'
  if (a >= 0.1 && az >= 3) return 'moderate'
  return 'weak'
}

const STRENGTH_RANK: Record<Strength, number> = { strong: 0, moderate: 1, weak: 2 }

function lagResult(item: TrackedItem, map: DayMap, absIds: string[], dates: LocalDate[], lag: 0 | 1): LagResult {
  const held: Arm = { n: 0, clean: 0, rate: null }
  const notHeld: Arm = { n: 0, clean: 0, rate: null }
  for (const d of dates) {
    const h = isHeld(item, map.get(d)?.entries[item.id])
    if (h === undefined) continue
    const o = dayOutcome(map.get(addDays(d, lag)), absIds)
    if (o === undefined) continue
    const arm = h ? held : notHeld
    arm.n++
    if (o === 'clean') arm.clean++
  }
  for (const arm of [held, notHeld]) arm.rate = arm.n ? arm.clean / arm.n : null
  const needed = Math.max(0, MIN_ARM - Math.min(held.n, notHeld.n))
  const setbacks = held.n - held.clean + notHeld.n - notHeld.clean
  const neededSetbacks = Math.max(0, MIN_SETBACKS - setbacks)
  const base = { lag, held, notHeld, needed, setbacks, neededSetbacks }
  if (needed > 0 || neededSetbacks > 0) return { ...base, diff: null, z: null, strength: null }

  const diff = held.rate! - notHeld.rate!
  const pooled = (held.clean + notHeld.clean) / (held.n + notHeld.n)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / held.n + 1 / notHeld.n))
  const z = se > 0 ? diff / se : 0
  return { ...base, diff, z, strength: classify(diff, z) }
}

/**
 * For each active boundary and self-care item: abstinence rate on days the
 * item was held vs not held, same-day and next-day, over the last `windowDays`.
 * These are observed rate differences in one person's data, not causes.
 * With ~11 items x 2 lags, some "moderate" results will be chance; the
 * strength label exists so the UI can say so.
 */
export function factorImpact(s: Snapshot, windowDays = 60): FactorImpact[] {
  const map = byDate(s.days)
  const absIds = abstinenceIds(s.items)
  // For next-day lag the factor day must have a following day inside the window.
  const dates = lastNDays(s.today, windowDays)
  const datesLag1 = dates.slice(0, -1)
  return s.items
    .filter((i) => i.active && i.layer !== 'abstinence')
    .map((item) => {
      const sameDay = lagResult(item, map, absIds, dates, 0)
      const nextDay = lagResult(item, map, absIds, datesLag1, 1)
      const candidates = [sameDay, nextDay].filter((r) => r.diff !== null)
      const best = candidates.sort((a, b) => Math.abs(b.diff!) - Math.abs(a.diff!))[0] ?? null
      return { item, sameDay, nextDay, best }
    })
}

/**
 * Factors with enough data, ranked by strength tier, then by size of
 * difference. Pure size ranking lets a 100%-vs-84% split from a handful of
 * setbacks outrank a real but smaller effect.
 */
export function topFactors(s: Snapshot, n = 3, windowDays = 60): FactorImpact[] {
  return factorImpact(s, windowDays)
    .filter((f) => f.best !== null)
    .sort(
      (a, b) =>
        STRENGTH_RANK[a.best!.strength!] - STRENGTH_RANK[b.best!.strength!] ||
        Math.abs(b.best!.diff!) - Math.abs(a.best!.diff!),
    )
    .slice(0, n)
}

// ---------------------------------------------------------------- risk window

export interface RiskWindow {
  /** Today's position: days since the last setback. */
  day: number
  from: number
  to: number
  /** Setbacks that came on a day inside [from, to] after the previous one. */
  hits: number
  /** All setbacks considered (each measured from the one before it). */
  of: number
  /** How many times more likely a setback was inside the window than overall. */
  ratio: number
  inWindow: boolean
  /** Days until the window opens; 0 when inside it, negative once past it. */
  daysUntil: number
}

/**
 * Hazard-based: for each candidate range of "days since the last setback",
 * compares setbacks per day-at-risk inside the range with the overall rate.
 * A range is flagged only when it is clearly riskier (>= 2x, at least 3
 * setbacks, and a one-sided Poisson z >= 2.5 to cover the many ranges tried).
 *
 * The first version flagged the range where gaps merely clustered; the
 * simulator showed that fired on most days for people whose setbacks are
 * frequent anyway, and predicted nothing. Clustering alone isn't risk.
 */
export function riskWindow(s: Snapshot, maxWidth = 7): RiskWindow | null {
  const setbacks = setbackDates(s).filter((d) => diffDays(d, s.today) <= 365)
  if (setbacks.length < 4) return null
  const gaps = setbacks.slice(1).map((d, i) => diffDays(setbacks[i]!, d))
  const day = diffDays(setbacks.at(-1)!, s.today)
  // Days already survived in the current run (today's outcome is not known yet).
  const current = Math.max(0, day - 1)
  const totalExposure = gaps.reduce((a, g) => a + g, 0) + current
  const H = gaps.length / Math.max(1, totalExposure)
  const maxGap = Math.max(...gaps)

  let best: { from: number; to: number; hits: number; ratio: number; z: number } | null = null
  for (let from = 1; from <= maxGap; from++) {
    for (let w = 3; w <= maxWidth; w++) {
      const to = from + w - 1
      let hits = 0
      let exposure = 0
      for (const g of gaps) {
        if (g >= from && g <= to) hits++
        exposure += Math.max(0, Math.min(g, to) - from + 1)
      }
      exposure += Math.max(0, Math.min(current, to) - from + 1)
      if (hits < 3 || exposure === 0) continue
      const expected = exposure * H
      const ratio = hits / exposure / H
      const z = (hits - expected) / Math.sqrt(expected)
      if (ratio < 2 || z < 2.5) continue
      if (!best || z > best.z) best = { from, to, hits, ratio, z }
    }
  }
  if (!best) return null
  return {
    day,
    from: best.from,
    to: best.to,
    hits: best.hits,
    of: gaps.length,
    ratio: best.ratio,
    inWindow: day >= best.from && day <= best.to,
    daysUntil: day < best.from ? best.from - day : day <= best.to ? 0 : best.to - day,
  }
}

// ---------------------------------------------------------------- urges

export interface UrgeStats {
  total: number
  resistedTotal: number
  /** Last 30 days. */
  resisted30: number
  acted30: number
  avgIntensity: number | null
  avgDurationMin: number | null
  /** Urges that have a recorded duration (from the panic timer). */
  timed: number
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function urgeStats(s: Snapshot, dateOf: (u: Urge) => LocalDate): UrgeStats {
  const from = addDays(s.today, -29)
  const recent = s.urges.filter((u) => {
    const d = dateOf(u)
    return d >= from && d <= s.today
  })
  const timed = s.urges.filter((u) => typeof u.durationMin === 'number')
  return {
    total: s.urges.length,
    resistedTotal: s.urges.filter((u) => u.outcome === 'resisted').length,
    resisted30: recent.filter((u) => u.outcome === 'resisted').length,
    acted30: recent.filter((u) => u.outcome === 'acted').length,
    avgIntensity: avg(s.urges.map((u) => u.intensity)),
    avgDurationMin: avg(timed.map((u) => u.durationMin!)),
    timed: timed.length,
  }
}

export interface WeekPoint {
  weekEnding: LocalDate
  count: number
  resisted: number
  acted: number
  avgIntensity: number | null
  avgDurationMin: number | null
}

/** Weekly urge frequency, intensity and duration, oldest first. */
export function urgeTrend(s: Snapshot, dateOf: (u: Urge) => LocalDate, weeks = 8): WeekPoint[] {
  return Array.from({ length: weeks }, (_, k) => {
    const end = addDays(s.today, -7 * (weeks - 1 - k))
    const start = addDays(end, -6)
    const us = s.urges.filter((u) => {
      const d = dateOf(u)
      return d >= start && d <= end
    })
    return {
      weekEnding: end,
      count: us.length,
      resisted: us.filter((u) => u.outcome === 'resisted').length,
      acted: us.filter((u) => u.outcome === 'acted').length,
      avgIntensity: avg(us.map((u) => u.intensity)),
      avgDurationMin: avg(us.filter((u) => u.durationMin !== undefined).map((u) => u.durationMin!)),
    }
  })
}

export interface RatePoint {
  date: LocalDate
  abstinence: number | null
  boundary: number | null
  selfcare: number | null
}

/**
 * Rolling 30-day rate per layer, sampled weekly, oldest first. Starts once
 * there is at least a week of data so the first points aren't one-day noise.
 */
export function rateSeries(s: Snapshot, weeks = 26): RatePoint[] {
  const first = s.days.map((d) => d.date).sort()[0]
  if (!first) return []
  const out: RatePoint[] = []
  for (let k = weeks - 1; k >= 0; k--) {
    const end = addDays(s.today, -7 * k)
    if (diffDays(first, end) < 6) continue
    const at = { ...s, today: end }
    out.push({ date: end, abstinence: abstinenceRate(at).rate, boundary: layerRate(at, 'boundary'), selfcare: layerRate(at, 'selfcare') })
  }
  return out
}
