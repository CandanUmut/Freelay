import { addDays, diffDays, lastNDays, weekdayOf } from '../lib/dates'
import type { LocalDate, TrackedItem, Urge } from '../db/types'
import { abstinenceRate, dayOutcome, factorImpact, isHeld, type Snapshot } from './metrics'

/**
 * Everything the app can honestly say about the user's data, from day one.
 *
 * Tiers, from always-true to inferred:
 *   fact      descriptive counts; no inference, shown as soon as they exist
 *   trend     this period vs the last one; descriptive
 *   early     item vs urges (urges are 5-10x more frequent than setbacks,
 *             so patterns show within weeks, not months)
 *   moderate / strong   passed a stricter test (urges or setbacks)
 *
 * Inferred claims use a dispersion-corrected rate test with thresholds set
 * for ~20 simultaneous comparisons. The simulator (src/sim) measures how
 * often each tier is wrong on synthetic users with known ground truth.
 */

export type Confidence = 'fact' | 'early' | 'moderate' | 'strong'
export type InsightKind = 'fact' | 'trend' | 'urge-factor' | 'setback-factor'

export interface Insight {
  /** Stable id, used to rotate what Today shows. */
  id: string
  kind: InsightKind
  confidence: Confidence
  text: string
  /** Secondary line: sample sizes, caveats. */
  detail?: string
  itemId?: string
  /** For factor claims: +1 when holding the item goes with better outcomes. */
  direction?: 1 | -1
  lag?: 0 | 1
  /** Higher is more worth showing. */
  score: number
}

export interface InsightOptions {
  dateOf: (u: { at: string }) => LocalDate
  /** Window for factor analysis. */
  windowDays?: number
}

const hhmm = (h: number) => `${String(h % 24).padStart(2, '0')}:00`
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const fmt1 = (x: number) => (Math.round(x * 10) / 10).toString()
const pctS = (x: number) => `${Math.round(x * 100)}%`
const CONF_RANK: Record<Confidence, number> = { strong: 4, moderate: 3, early: 2, fact: 1 }

// ---------------------------------------------------------------- facts

function resistedFact(urges: Urge[]): Insight | null {
  if (!urges.length) return null
  const r = urges.filter((u) => u.outcome === 'resisted').length
  const n = urges.length
  return {
    id: 'fact:resisted',
    kind: 'fact',
    confidence: 'fact',
    text: n === 1 ? (r ? 'You logged one urge and resisted it.' : 'You logged one urge.') : `You resisted ${r} of the ${n} urges you logged.`,
    detail: r === n && n >= 3 ? 'Every one of them.' : undefined,
    score: 0.4 + Math.min(0.3, n / 60),
  }
}

function hoursFact(urges: Urge[]): Insight | null {
  if (urges.length < 4) return null
  const byHour = new Array<number>(24).fill(0)
  for (const u of urges) byHour[new Date(u.at).getHours()]!++
  let best = 0
  let bestSum = -1
  for (let h = 0; h < 24; h++) {
    const s = byHour[h]! + byHour[(h + 1) % 24]! + byHour[(h + 2) % 24]!
    if (s > bestSum) {
      bestSum = s
      best = h
    }
  }
  const share = bestSum / urges.length
  // Three hours are 12.5% of the day; only worth saying when clearly concentrated.
  if (share < 0.4) return null
  return {
    id: 'fact:hours',
    kind: 'fact',
    confidence: 'fact',
    text: `${bestSum} of your ${urges.length} urges came between ${hhmm(best)} and ${hhmm(best + 3)}.`,
    detail: 'Those three hours are worth a plan of their own.',
    score: 0.5 + share * 0.3,
  }
}

function triggerFact(urges: Urge[], items: Map<string, TrackedItem>): Insight | null {
  const tagged = urges.filter((u) => u.triggerItemIds.length)
  if (tagged.length < 3) return null
  const counts = new Map<string, number>()
  for (const u of tagged) for (const t of u.triggerItemIds) counts.set(t, (counts.get(t) ?? 0) + 1)
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (!top || top[1] < 2) return null
  const name = items.get(top[0])?.name
  if (!name) return null
  return {
    id: 'fact:trigger',
    kind: 'fact',
    confidence: 'fact',
    text: `${name} came up in ${top[1]} of your ${tagged.length} tagged urges, more than any other trigger.`,
    itemId: top[0],
    score: 0.5 + (top[1] / tagged.length) * 0.2,
  }
}

function durationFact(urges: Urge[]): Insight | null {
  const timed = urges.filter((u) => typeof u.durationMin === 'number')
  if (timed.length < 2) return null
  const avg = timed.reduce((a, u) => a + u.durationMin!, 0) / timed.length
  const max = Math.max(...timed.map((u) => u.durationMin!))
  return {
    id: 'fact:duration',
    kind: 'fact',
    confidence: 'fact',
    text: `The ${timed.length} urges you timed lasted ${Math.round(avg)} minutes on average. The longest was ${max}.`,
    detail: 'Every one of them ended.',
    score: 0.55 + Math.min(0.2, timed.length / 50),
  }
}

function coverageFact(s: Snapshot): Insight | null {
  const r = abstinenceRate(s, 30)
  const window = Math.min(30, 1 + diffDays(s.days.map((d) => d.date).sort()[0] ?? s.today, s.today))
  if (window < 7 || r.reported / window >= 0.8) return null
  return {
    id: 'fact:coverage',
    kind: 'fact',
    confidence: 'fact',
    text: `You checked in on ${r.reported} of the last ${window} days.`,
    detail: 'Rates are only as good as the days behind them. Missed days can be filled in from the calendar.',
    score: 0.45,
  }
}

// ---------------------------------------------------------------- trends

function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

function intensityTrend(s: Snapshot, dateOf: InsightOptions['dateOf']): Insight | null {
  const recent = s.urges.filter((u) => diffDays(dateOf(u), s.today) < 14)
  const prior = s.urges.filter((u) => {
    const d = diffDays(dateOf(u), s.today)
    return d >= 14 && d < 28
  })
  if (recent.length < 3 || prior.length < 3) return null
  const a = avg(recent.map((u) => u.intensity))!
  const b = avg(prior.map((u) => u.intensity))!
  if (Math.abs(a - b) < 0.7) return null
  const down = a < b
  return {
    id: 'trend:intensity',
    kind: 'trend',
    confidence: 'fact',
    text: `Urge intensity averaged ${fmt1(a)} over the last two weeks, ${down ? 'down' : 'up'} from ${fmt1(b)}.`,
    detail: down ? 'Smaller waves are progress even while setbacks still happen.' : undefined,
    score: down ? 0.7 : 0.45,
  }
}

function resistTrend(s: Snapshot, dateOf: InsightOptions['dateOf']): Insight | null {
  const win = (from: number, to: number) => s.urges.filter((u) => {
    const d = diffDays(dateOf(u), s.today)
    return d >= from && d < to
  })
  const recent = win(0, 14)
  const prior = win(14, 28)
  if (recent.length < 4 || prior.length < 4) return null
  const ra = recent.filter((u) => u.outcome === 'resisted').length / recent.length
  const rb = prior.filter((u) => u.outcome === 'resisted').length / prior.length
  if (ra - rb < 0.15) return null
  return {
    id: 'trend:resist',
    kind: 'trend',
    confidence: 'fact',
    text: `You resisted ${pctS(ra)} of urges in the last two weeks, up from ${pctS(rb)} the two weeks before.`,
    score: 0.75,
  }
}

function boundaryTrend(s: Snapshot): Insight | null {
  const map = new Map(s.days.map((d) => [d.date, d]))
  const recentDates = lastNDays(s.today, 7)
  const priorDates = lastNDays(addDays(s.today, -7), 7)
  let best: { item: TrackedItem; a: number; na: number; b: number; nb: number; change: number } | null = null
  for (const item of s.items) {
    if (!item.active || item.layer === 'abstinence' || item.target?.type === 'perWeek') continue
    const held = (dates: LocalDate[]) => {
      let h = 0
      let n = 0
      for (const d of dates) {
        const v = isHeld(item, map.get(d)?.entries[item.id])
        if (v === undefined) continue
        n++
        if (v) h++
      }
      return { h, n }
    }
    const A = held(recentDates)
    const B = held(priorDates)
    if (A.n < 5 || B.n < 5) continue
    const change = A.h / A.n - B.h / B.n
    if (change >= 0.25 && (!best || change > best.change)) best = { item, a: A.h, na: A.n, b: B.h, nb: B.n, change }
  }
  if (!best) return null
  const verb = best.item.layer === 'boundary' ? `kept clear of ${lower(best.item.name)}` : `did ${lower(best.item.name)}`
  return {
    id: `trend:boundary:${best.item.id}`,
    kind: 'trend',
    confidence: 'fact',
    itemId: best.item.id,
    text: `You ${verb} on ${best.a} of the last ${best.na} days you checked in, up from ${best.b} of ${best.nb} the week before.`,
    score: 0.65,
  }
}

function cleanRunFact(s: Snapshot): Insight | null {
  const absIds = s.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  const dates = lastNDays(s.today, 14)
  const map = new Map(s.days.map((d) => [d.date, d]))
  const outcomes = dates.map((d) => dayOutcome(map.get(d), absIds)).filter(Boolean)
  if (outcomes.length < 5) return null
  const clean = outcomes.filter((o) => o === 'clean').length
  if (clean / outcomes.length < 0.75) return null
  return {
    id: 'fact:clean14',
    kind: 'fact',
    confidence: 'fact',
    text: `${clean} of the last ${outcomes.length} days you reported were clean.`,
    score: 0.35,
  }
}

const RESIST_MILESTONES = [5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000]

/** Short-lived: shown for two days after crossing a round number of resisted urges. */
function resistedMilestone(s: Snapshot, dateOf: InsightOptions['dateOf']): Insight | null {
  const resisted = s.urges.filter((u) => u.outcome === 'resisted').sort((a, b) => a.at.localeCompare(b.at))
  for (let k = RESIST_MILESTONES.length - 1; k >= 0; k--) {
    const m = RESIST_MILESTONES[k]!
    const u = resisted[m - 1]
    if (u && diffDays(dateOf(u), s.today) <= 1)
      return {
        id: `fact:resisted-${m}`,
        kind: 'fact',
        confidence: 'fact',
        text: `That's ${m} urges resisted. ${m >= 50 ? 'Each one was a wave that passed without you acting on it.' : 'Every one of them counts.'}`,
        score: 0.95,
      }
  }
  return null
}

function selfcareConsistency(s: Snapshot): Insight | null {
  const map = new Map(s.days.map((d) => [d.date, d]))
  const dates = lastNDays(s.today, 14).filter((d) => map.has(d))
  if (dates.length < 7) return null
  let best: { item: TrackedItem; done: number } | null = null
  for (const item of s.items) {
    if (!item.active || item.layer !== 'selfcare' || item.target?.type === 'perWeek') continue
    const done = dates.filter((d) => isHeld(item, map.get(d)?.entries[item.id]) === true).length
    if (!best || done > best.done) best = { item, done }
  }
  if (!best || best.done / dates.length < 0.7) return null
  return {
    id: `fact:selfcare:${best.item.id}`,
    kind: 'fact',
    confidence: 'fact',
    itemId: best.item.id,
    text: `${best.item.name} on ${best.done} of the last ${dates.length} days you checked in: your most consistent self care.`,
    score: 0.5,
  }
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

function weekdayFact(s: Snapshot, dateOf: InsightOptions['dateOf']): Insight | null {
  const map = new Map(s.days.map((d) => [d.date, d]))
  const dates = lastNDays(s.today, 56).filter((d) => map.has(d))
  if (dates.length < 21) return null
  const perDay = new Map<LocalDate, number>()
  for (const u of s.urges) perDay.set(dateOf(u), (perDay.get(dateOf(u)) ?? 0) + 1)
  const total = dates.reduce((a, d) => a + (perDay.get(d) ?? 0), 0)
  if (total < 10) return null
  let best: { wd: number; rate: number; n: number; other: number } | null = null
  for (let wd = 0; wd < 7; wd++) {
    const on = dates.filter((d) => weekdayOf(d) === wd)
    const off = dates.filter((d) => weekdayOf(d) !== wd)
    if (on.length < 3) continue
    const rate = on.reduce((a, d) => a + (perDay.get(d) ?? 0), 0) / on.length
    const other = off.reduce((a, d) => a + (perDay.get(d) ?? 0), 0) / off.length
    if (!best || rate / Math.max(other, 0.05) > best.rate / Math.max(best.other, 0.05)) best = { wd, rate, n: on.length, other }
  }
  if (!best || best.rate / Math.max(best.other, 0.05) < 1.6) return null
  return {
    id: 'fact:weekday',
    kind: 'fact',
    confidence: 'fact',
    text: `${WEEKDAYS[best.wd]} have been your heaviest day: ${fmt1(best.rate)} urges logged on average, against ${fmt1(best.other)} on other days.`,
    detail: `Over the last ${best.n} ${WEEKDAYS[best.wd]!.toLowerCase()}. Worth a plan for that day.`,
    score: 0.6,
  }
}

function quietDays(s: Snapshot, dateOf: InsightOptions['dateOf']): Insight | null {
  const map = new Map(s.days.map((d) => [d.date, d]))
  const dates = lastNDays(s.today, 14).filter((d) => map.has(d))
  if (dates.length < 7 || s.urges.length < 5) return null
  const withUrges = new Set(s.urges.map(dateOf))
  const quiet = dates.filter((d) => !withUrges.has(d)).length
  if (quiet / dates.length < 0.5) return null
  return {
    id: 'fact:quiet',
    kind: 'fact',
    confidence: 'fact',
    text: `No urges logged on ${quiet} of the last ${dates.length} days you checked in.`,
    score: 0.4,
  }
}

function urgeCountTrend(s: Snapshot, dateOf: InsightOptions['dateOf']): Insight | null {
  const map = new Map(s.days.map((d) => [d.date, d]))
  const count = (from: number, to: number) => {
    const ds = lastNDays(addDays(s.today, -from), to - from).filter((d) => map.has(d))
    const set = new Set(ds)
    return { days: ds.length, urges: s.urges.filter((u) => set.has(dateOf(u))).length }
  }
  const a = count(0, 14)
  const b = count(14, 28)
  if (a.days < 7 || b.days < 7 || b.urges < 6) return null
  const ra = a.urges / a.days
  const rb = b.urges / b.days
  if (ra > rb * 0.7) return null
  return {
    id: 'trend:urge-count',
    kind: 'trend',
    confidence: 'fact',
    text: `You logged ${fmt1(ra)} urges a day over the last two weeks, down from ${fmt1(rb)}.`,
    detail: 'Fewer urges, or fewer logged. Only you know which, but the first is common as a new routine settles in.',
    score: 0.7,
  }
}

// ---------------------------------------------------------------- urge factors

export interface UrgeFactor {
  item: TrackedItem
  lag: 0 | 1
  /** Logged urges per day when the item happened / did not happen. */
  on: { days: number; urges: number; rate: number }
  off: { days: number; urges: number; rate: number }
  z: number
}

export const URGE_MIN_DAYS = 5
export const URGE_MIN_TOTAL = 8

/**
 * Logged urges per reported day, split by whether an item happened (same day
 * or the day before). Urges cluster on bad days, so the Poisson standard
 * error is scaled by the observed dispersion (quasi-Poisson).
 */
export function urgeFactors(s: Snapshot, dateOf: InsightOptions['dateOf'], windowDays = 60): UrgeFactor[] {
  const map = new Map(s.days.map((d) => [d.date, d]))
  const perDay = new Map<LocalDate, number>()
  for (const u of s.urges) {
    const d = dateOf(u)
    perDay.set(d, (perDay.get(d) ?? 0) + 1)
  }
  const dates = lastNDays(s.today, windowDays).filter((d) => map.has(d))
  const counts = dates.map((d) => perDay.get(d) ?? 0)
  const total = counts.reduce((a, b) => a + b, 0)
  if (dates.length < URGE_MIN_DAYS * 2 || total < URGE_MIN_TOTAL) return []
  const mean = total / counts.length
  const variance = counts.reduce((a, c) => a + (c - mean) ** 2, 0) / Math.max(1, counts.length - 1)
  const dispersion = Math.max(1, variance / Math.max(mean, 1e-9))

  const out: UrgeFactor[] = []
  for (const item of s.items) {
    if (!item.active || item.layer === 'abstinence') continue
    for (const lag of [0, 1] as const) {
      const on = { days: 0, urges: 0, rate: 0 }
      const off = { days: 0, urges: 0, rate: 0 }
      for (const d of dates) {
        const factorDay = lag ? addDays(d, -1) : d
        const v = map.get(factorDay)?.entries[item.id]
        if (v === undefined) continue
        const happened = item.layer === 'selfcare' ? isHeld(item, v) : Boolean(v)
        const arm = happened ? on : off
        arm.days++
        arm.urges += perDay.get(d) ?? 0
      }
      if (on.days < URGE_MIN_DAYS || off.days < URGE_MIN_DAYS) continue
      on.rate = on.urges / on.days
      off.rate = off.urges / off.days
      const pooled = (on.urges + off.urges) / (on.days + off.days)
      const se = Math.sqrt(dispersion * pooled * (1 / on.days + 1 / off.days))
      const z = se > 0 ? (on.rate - off.rate) / se : 0
      out.push({ item, lag, on, off, z })
    }
  }
  return out
}

function urgeConfidence(f: UrgeFactor): Confidence | null {
  const az = Math.abs(f.z)
  const hi = Math.max(f.on.rate, f.off.rate)
  const lo = Math.max(0.05, Math.min(f.on.rate, f.off.rate))
  if (hi / lo < 1.3) return null
  if (az >= 4) return 'strong'
  if (az >= 3.3) return 'moderate'
  if (az >= 3.0) return 'early'
  return null
}

/**
 * Split-half replication: the pattern must point the same way in the older
 * and the newer half of the window, independently. Re-testing ~20 items every
 * day finds chance patterns eventually; chance rarely repeats in both halves.
 */
function replicates(sign: number, halves: (number | null)[]): boolean {
  return halves.every((h) => h !== null && Math.sign(h) === sign && Math.abs(h) > 0)
}

function urgeFactorInsights(s: Snapshot, dateOf: InsightOptions['dateOf'], windowDays: number): Insight[] {
  const half = Math.floor(windowDays / 2)
  const key = (f: UrgeFactor) => `${f.item.id}:${f.lag}`
  const diffOf = (list: UrgeFactor[]) => new Map(list.map((f) => [key(f), f.on.rate - f.off.rate]))
  const recent = diffOf(urgeFactors(s, dateOf, half))
  const older = diffOf(urgeFactors({ ...s, today: addDays(s.today, -half) }, dateOf, half))

  // One claim per item: the lag with the larger |z|.
  const best = new Map<string, UrgeFactor>()
  for (const f of urgeFactors(s, dateOf, windowDays)) {
    const cur = best.get(f.item.id)
    if (!cur || Math.abs(f.z) > Math.abs(cur.z)) best.set(f.item.id, f)
  }
  const out: Insight[] = []
  for (const f of best.values()) {
    const conf = urgeConfidence(f)
    if (!conf) continue
    if (!replicates(Math.sign(f.z), [recent.get(key(f)) ?? null, older.get(key(f)) ?? null])) continue
    const name = lower(f.item.name)
    const when =
      f.item.layer === 'boundary'
        ? [f.lag ? `The day after ${name}` : `On days with ${name}`, f.lag ? 'after days without it' : 'without it']
        : [f.lag ? `The day after you did ${name}` : `On days you did ${name}`, f.lag ? 'after days you didn’t' : 'on days you didn’t']
    // "happened" raises urges for a boundary -> holding it is better (+1).
    const happenedWorse = f.on.rate > f.off.rate
    const direction: 1 | -1 = f.item.layer === 'boundary' ? (happenedWorse ? 1 : -1) : happenedWorse ? -1 : 1
    out.push({
      id: `urge:${f.item.id}`,
      kind: 'urge-factor',
      confidence: conf,
      itemId: f.item.id,
      lag: f.lag,
      direction,
      text: `${when[0]} you logged ${fmt1(f.on.rate)} urges a day; ${when[1]}, ${fmt1(f.off.rate)}.`,
      detail: `${f.on.days} vs ${f.off.days} days. ${conf === 'early' ? 'An early signal; it can still change.' : conf === 'moderate' ? 'A fairly consistent pattern so far.' : 'A clear pattern in your data.'}`,
      score: 0.6 + CONF_RANK[conf] * 0.1 + Math.min(0.1, Math.abs(f.z) / 100),
    })
  }
  return out
}

// ---------------------------------------------------------------- setback factors

function setbackFactorInsights(s: Snapshot, windowDays: number): Insight[] {
  const out: Insight[] = []
  const half = Math.floor(windowDays / 2)
  // Halves use a looser sample rule: they only need to agree in direction.
  const halfDiff = (snap: Snapshot) =>
    new Map(
      factorImpact(snap, half).flatMap((f) =>
        [f.sameDay, f.nextDay].map((r) => [`${f.item.id}:${r.lag}` as string, r.held.n >= 3 && r.notHeld.n >= 3 ? r.held.rate! - r.notHeld.rate! : null] as const),
      ),
    )
  const recent = halfDiff(s)
  const older = halfDiff({ ...s, today: addDays(s.today, -half) })
  for (const f of factorImpact(s, windowDays)) {
    const r = f.best
    if (!r || r.strength === 'weak' || r.strength === null) continue
    const k = `${f.item.id}:${r.lag}`
    if (!replicates(Math.sign(r.diff!), [recent.get(k) ?? null, older.get(k) ?? null])) continue
    const name = lower(f.item.name)
    const [a, b] = f.item.layer === 'boundary' ? [r.notHeld, r.held] : [r.held, r.notHeld]
    const when =
      f.item.layer === 'boundary'
        ? [r.lag ? `The day after ${name}` : `On days with ${name}`, 'without it']
        : [r.lag ? `The day after you did ${name}` : `On days you did ${name}`, "when you didn't"]
    out.push({
      id: `setback:${f.item.id}`,
      kind: 'setback-factor',
      confidence: r.strength,
      itemId: f.item.id,
      lag: r.lag,
      direction: r.diff! > 0 ? 1 : -1,
      text: `${when[0]}, ${pctS(a.rate!)} of days were clean (${a.n} days); ${when[1]}, ${pctS(b.rate!)} (${b.n} days).`,
      detail: r.strength === 'strong' ? 'A clear difference in your setbacks.' : 'A moderate difference in your setbacks; could still be partly chance.',
      score: 0.8 + CONF_RANK[r.strength] * 0.05,
    })
  }
  return out
}

// ---------------------------------------------------------------- week review

export interface WeekReview {
  from: LocalDate
  to: LocalDate
  reported: number
  clean: number
  urges: number
  resisted: number
  boundaryHeld: number | null
  selfcareDone: number | null
  prev: { reported: number; clean: number; urges: number; resisted: number; boundaryHeld: number | null; selfcareDone: number | null } | null
}

function weekStats(s: Snapshot, dateOf: InsightOptions['dateOf'], end: LocalDate) {
  const dates = lastNDays(end, 7)
  const set = new Set(dates)
  const map = new Map(s.days.map((d) => [d.date, d]))
  const absIds = s.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  let reported = 0
  let clean = 0
  const layerShare = (layer: 'boundary' | 'selfcare') => {
    let h = 0
    let n = 0
    for (const d of dates)
      for (const i of s.items) {
        if (!i.active || i.layer !== layer || i.target?.type === 'perWeek') continue
        const v = isHeld(i, map.get(d)?.entries[i.id])
        if (v === undefined) continue
        n++
        if (v) h++
      }
    return n ? h / n : null
  }
  for (const d of dates) {
    const o = dayOutcome(map.get(d), absIds)
    if (!o) continue
    reported++
    if (o === 'clean') clean++
  }
  const us = s.urges.filter((u) => set.has(dateOf(u)))
  return {
    reported,
    clean,
    urges: us.length,
    resisted: us.filter((u) => u.outcome === 'resisted').length,
    boundaryHeld: layerShare('boundary'),
    selfcareDone: layerShare('selfcare'),
  }
}

/** The last 7 days against the 7 before. Null until there is a week of data. */
export function weekReview(s: Snapshot, dateOf: InsightOptions['dateOf']): WeekReview | null {
  const first = s.days.map((d) => d.date).sort()[0]
  if (!first || diffDays(first, s.today) < 6) return null
  const cur = weekStats(s, dateOf, s.today)
  if (cur.reported === 0) return null
  const hasPrev = diffDays(first, s.today) >= 13
  return {
    from: addDays(s.today, -6),
    to: s.today,
    ...cur,
    prev: hasPrev ? weekStats(s, dateOf, addDays(s.today, -7)) : null,
  }
}

/** Show the review once a week, on the weekday the user started. */
export function isReviewDay(s: Snapshot): boolean {
  const first = s.days.map((d) => d.date).sort()[0]
  return Boolean(first) && diffDays(first!, s.today) >= 7 && weekdayOf(first!) === weekdayOf(s.today)
}

// ---------------------------------------------------------------- assemble

export function buildInsights(s: Snapshot, o: InsightOptions): Insight[] {
  const windowDays = o.windowDays ?? 60
  const recentUrges = s.urges.filter((u) => diffDays(o.dateOf(u), s.today) < windowDays)
  const items = new Map(s.items.map((i) => [i.id, i]))
  const list = [
    ...setbackFactorInsights(s, windowDays),
    ...urgeFactorInsights(s, o.dateOf, windowDays),
    resistedMilestone(s, o.dateOf),
    resistTrend(s, o.dateOf),
    intensityTrend(s, o.dateOf),
    urgeCountTrend(s, o.dateOf),
    weekdayFact(s, o.dateOf),
    selfcareConsistency(s),
    quietDays(s, o.dateOf),
    boundaryTrend(s),
    durationFact(s.urges),
    hoursFact(recentUrges),
    triggerFact(recentUrges, items),
    resistedFact(recentUrges),
    coverageFact(s),
    cleanRunFact(s),
  ].filter((x): x is Insight => x !== null)

  // If the same item has both a setback and an urge claim, keep the stronger one.
  const byItem = new Map<string, Insight>()
  const rest: Insight[] = []
  for (const i of list) {
    if (!i.itemId || (i.kind !== 'setback-factor' && i.kind !== 'urge-factor')) {
      rest.push(i)
      continue
    }
    const cur = byItem.get(i.itemId)
    if (!cur || CONF_RANK[i.confidence] > CONF_RANK[cur.confidence] || (CONF_RANK[i.confidence] === CONF_RANK[cur.confidence] && i.kind === 'setback-factor'))
      byItem.set(i.itemId, i)
  }
  return [...byItem.values(), ...rest].sort((a, b) => b.score - a.score)
}

/**
 * One insight for Today. Stable within a day. Otherwise the best-scoring
 * insight not shown in the last `cooldown` days, with a bonus for how long
 * it has been since it was shown (never shown counts as long ago), so every
 * true thing gets its turn instead of the top three cycling.
 */
export function pickInsight(list: Insight[], shown: Record<string, LocalDate>, today: LocalDate, cooldown = 3): Insight | null {
  const already = list.find((i) => shown[i.id] === today)
  if (already) return already
  const staleness = (i: Insight) => {
    const d = shown[i.id]
    return d ? Math.min(0.3, diffDays(d, today) * 0.02) : 0.3
  }
  const fresh = list.filter((i) => {
    const d = shown[i.id]
    return !d || diffDays(d, today) >= cooldown
  })
  const pool = fresh.length ? fresh : list
  return pool.reduce<Insight | null>((best, i) => (!best || i.score + staleness(i) > best.score + staleness(best) ? i : best), null)
}

// ---------------------------------------------------------------- pattern finder

/** Rough amount of data at which the simulator saw the first reliable patterns. */
export const PATTERN_DAYS = 56
export const PATTERN_URGES = 40

export interface PatternProgress {
  days: number
  urges: number
  /** 0..1 */
  progress: number
  ready: boolean
}

/**
 * How close the data is to supporting pattern claims. Honest by design: it
 * reports the amount of data, not a promise, since some people's data never
 * shows a pattern (which is information too).
 */
export function patternProgress(s: Snapshot, dateOf: InsightOptions['dateOf'], insights: Insight[]): PatternProgress {
  const window = new Set(lastNDays(s.today, 60))
  const days = s.days.filter((d) => window.has(d.date)).length
  const urges = s.urges.filter((u) => window.has(dateOf(u))).length
  const progress = Math.min(1, (Math.min(1, days / PATTERN_DAYS) + Math.min(1, urges / PATTERN_URGES)) / 2)
  return { days, urges, progress, ready: insights.some((i) => i.kind === 'urge-factor' || i.kind === 'setback-factor') }
}
