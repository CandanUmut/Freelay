import { suggestLesson } from '../content/triggers'
import { DEFAULT_META, DEFAULT_SETTINGS, type DayEntry, type LocalDate, type Meta, type Plan, type Urge } from '../db/types'
import { lastNDays, localDateOf } from '../lib/dates'
import { buildInsights, isReviewDay, pickInsight, weekReview, type Confidence, type Insight } from '../metrics/insights'
import { abstinenceRate, riskWindow, streaks, topFactors, type Snapshot } from '../metrics/metrics'
import { forwardTarget, riskText } from '../metrics/targets'
import { generate, type Persona, type SimDay } from './personas'

/**
 * Plays a persona through the app day by day, as if they opened it every
 * evening after checking in, and records what each screen would show.
 */

export type Engine = 'baseline' | 'current'

export interface DayView {
  day: number
  date: LocalDate
  insights: Insight[]
  card: Insight | null
  lesson: string | null
  risk: boolean
  target: string
  review: boolean
  trueSetback: boolean
}

/** Items whose "happened" moves with an effect item, so claims about them are real associations. */
const LINKED: Record<string, string[]> = {
  'sc-midnight': ['bnd-sleep', 'bnd-phone'],
  'bnd-shorts': ['bnd-phone'],
  'bnd-lonely': ['bnd-alone'],
  'bnd-alone': ['bnd-lonely'],
  'bnd-phone': ['sc-midnight'],
  'bnd-sleep': ['sc-midnight'],
}

export function claimTruth(p: Persona, i: Insight): 'true' | 'linked' | 'false' | null {
  if (!i.itemId || i.direction === undefined) return null
  const effectDir = (item: string) => {
    const e = p.effects.find((x) => x.item === item)
    if (!e) return 0
    const worse = e.setback > 0 || e.urge > 1
    const itemLayer = p.items.find((x) => x.id === item)?.layer
    // A boundary that makes things worse means holding it is better (+1); self care the opposite.
    return itemLayer === 'boundary' ? (worse ? 1 : -1) : worse ? -1 : 1
  }
  const own = effectDir(i.itemId)
  if (own !== 0) return own === i.direction ? 'true' : 'false'
  for (const other of LINKED[i.itemId] ?? []) {
    const d = effectDir(other)
    if (d === 0) continue
    // All links above move in the "same good direction" (sleeping before midnight
    // means fewer short nights), so the expected direction carries over.
    if (d === i.direction) return 'linked'
  }
  return 'false'
}

function baselineInsights(s: Snapshot): Insight[] {
  // What the app showed before: setback factors only, including weak ones as hints.
  return topFactors(s).map((f) => ({
    id: `setback:${f.item.id}`,
    kind: 'setback-factor' as const,
    confidence: (f.best!.strength === 'weak' ? 'early' : f.best!.strength) as Confidence,
    text: '',
    itemId: f.item.id,
    direction: (f.best!.diff! > 0 ? 1 : -1) as 1 | -1,
    score: 1,
  }))
}

export function simulate(p: Persona, engine: Engine, seed = 1, start: LocalDate = '2026-01-05'): { days: SimDay[]; views: DayView[] } {
  const days = generate(p, start, seed)
  const dateOf = (u: { at: string }) => localDateOf(new Date(u.at), 4)
  const reported: DayEntry[] = []
  const urges: Urge[] = []
  const plans: Plan[] = (p.plans ?? []).map((x) => ({ ...x, timesUsed: 0 }))
  let meta: Meta = { ...DEFAULT_META, lessonsRead: {}, lessonsDismissed: {} }
  const shown: Record<string, LocalDate> = {}
  const views: DayView[] = []

  days.forEach((d, i) => {
    if (d.entry) reported.push(d.entry)
    urges.push(...d.urges)
    const s: Snapshot = { items: p.items, days: reported, urges, today: d.date }
    const insights = engine === 'baseline' ? baselineInsights(s) : buildInsights(s, { dateOf })
    const card = engine === 'baseline' ? null : pickInsight(insights, shown, d.date)
    if (card) shown[card.id] = d.date
    const sug = suggestLesson({ s, plans, settings: DEFAULT_SETTINGS, meta, dateOf })
    if (sug) {
      // Half the time the person reads it, otherwise dismisses it.
      meta =
        i % 2
          ? { ...meta, lessonsRead: { ...meta.lessonsRead, [sug.lesson.id]: d.date } }
          : { ...meta, lessonsDismissed: { ...meta.lessonsDismissed, [sug.lesson.id]: d.date } }
    }
    // Today is opened in the morning, before the check-in: the risk flag must not see today's outcome.
    const morning: Snapshot = { ...s, days: reported.filter((e) => e.date < d.date) }
    const st = streaks(s)
    views.push({
      day: i + 1,
      date: d.date,
      insights,
      card,
      lesson: sug?.lesson.id ?? null,
      risk: riskText(riskWindow(morning)) !== null,
      target: forwardTarget(st, reported.length, DEFAULT_SETTINGS, d.date, Boolean(d.entry && d.setback)).headline,
      review: engine !== 'baseline' && isReviewDay(s) && weekReview(s, dateOf) !== null,
      trueSetback: d.setback,
    })
  })
  return { days, views }
}

export interface Summary {
  persona: string
  engine: Engine
  firstFact: number | null
  firstClaim: number | null
  firstTrueClaim: number | null
  insightsAt: Record<number, number>
  claimDays: number
  falseClaimDays: number
  distinctFalse: string[]
  distinctTrue: string[]
  emptyCardDays: number
  cardChanges: number
  distinctCards: number
  riskDays: number
  riskLift: number | null
  lessonsDistinct: number
  lessonDays: number
  targetsDistinct: number
  reviews: number
  rateGap90: number | null
}

const CHECKPOINTS = [7, 14, 30, 60, 90, 180]

export function summarize(p: Persona, engine: Engine, seeds = [1, 2, 3]): Summary[] {
  return seeds.map((seed) => {
    const { days, views } = simulate(p, engine, seed)
    const firstWhere = (f: (v: DayView) => boolean) => views.find(f)?.day ?? null
    const claims = (v: DayView) => v.insights.filter((x) => x.itemId && x.direction !== undefined && x.confidence !== 'fact')
    let claimDays = 0
    let falseClaimDays = 0
    const distinctFalse = new Set<string>()
    const distinctTrue = new Set<string>()
    for (const v of views)
      for (const c of claims(v)) {
        claimDays++
        const t = claimTruth(p, c)
        if (t === 'false') {
          falseClaimDays++
          distinctFalse.add(`${c.id}(${c.confidence})`)
        } else distinctTrue.add(c.id)
      }
    const after3 = views.slice(3)
    let cardChanges = 0
    for (let i = 1; i < views.length; i++) if (views[i]!.card?.id !== views[i - 1]!.card?.id) cardChanges++

    // Risk window lift: setback rate on flagged days vs other days (after enough history).
    const eligible = views.filter((v) => v.day > 30)
    const flagged = eligible.filter((v) => v.risk)
    const unflagged = eligible.filter((v) => !v.risk)
    const rate = (xs: DayView[]) => (xs.length ? xs.filter((v) => v.trueSetback).length / xs.length : 0)
    const riskLift = flagged.length >= 3 && rate(unflagged) > 0 ? rate(flagged) / rate(unflagged) : null

    // Reported 30-day rate vs the true one at day 90.
    let rateGap90: number | null = null
    if (days.length >= 90) {
      const d90 = days[89]!.date
      const s: Snapshot = { items: p.items, days: days.slice(0, 90).flatMap((d) => (d.entry ? [d.entry] : [])), urges: [], today: d90 }
      const reportedRate = abstinenceRate(s).rate
      const window = new Set(lastNDays(d90, 30))
      const truth = days.filter((d) => window.has(d.date))
      const trueRate = truth.filter((d) => !d.setback).length / truth.length
      rateGap90 = reportedRate === null ? null : reportedRate - trueRate
    }

    return {
      persona: p.id,
      engine,
      firstFact: firstWhere((v) => v.insights.length > 0),
      firstClaim: firstWhere((v) => claims(v).length > 0),
      firstTrueClaim: firstWhere((v) => claims(v).some((c) => claimTruth(p, c) !== 'false')),
      insightsAt: Object.fromEntries(CHECKPOINTS.filter((c) => c <= views.length).map((c) => [c, views[c - 1]!.insights.length])),
      claimDays,
      falseClaimDays,
      distinctFalse: [...distinctFalse],
      distinctTrue: [...distinctTrue],
      emptyCardDays: engine === 'baseline' ? after3.length : after3.filter((v) => !v.card).length,
      cardChanges,
      distinctCards: new Set(views.map((v) => v.card?.id).filter(Boolean)).size,
      riskDays: views.filter((v) => v.risk).length,
      riskLift,
      lessonsDistinct: new Set(views.map((v) => v.lesson).filter(Boolean)).size,
      lessonDays: views.filter((v) => v.lesson).length,
      targetsDistinct: new Set(views.map((v) => v.target)).size,
      reviews: views.filter((v) => v.review).length,
      rateGap90,
    }
  })
}

