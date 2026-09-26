import { addDays, lastNDays, weekdayOf } from '../lib/dates'
import { SEED_ITEMS } from '../db/seed'
import type { DayEntry, EntryValue, LocalDate, Plan, TrackedItem, Urge } from '../db/types'

/**
 * Synthetic users for testing what the app shows over months of use. Each
 * persona is a generative model with known ground truth, so the simulator
 * can tell a true insight from a false one.
 */

export interface Effect {
  item: string
  /** 0: affects the same day, 1: affects the next day. */
  lag: 0 | 1
  /** Added to the daily setback probability when the item happens. */
  setback: number
  /** Multiplies the expected number of urges when the item happens. */
  urge: number
}

export interface Persona {
  id: string
  name: string
  about: string
  items: TrackedItem[]
  days: number
  /** Base daily setback probability. */
  base: number
  /** Multiplier on risk over time; t runs 0..1 across the simulation. */
  trend?: (t: number) => number
  /** Extra hazard as a function of days since the last setback. */
  cycle?: (daysSince: number) => number
  weekend?: number
  effects: Effect[]
  /** Probability that an item happens today, given what else happened. */
  itemProb: (id: string, c: { weekend: boolean; happened: Record<string, boolean>; t: number; rnd: () => number }) => number
  urgesPerDay: number
  /** Share of urges the person actually logs. */
  urgeLogRate: number
  /** Share of logged, resisted urges that get timed with Panic. */
  timedRate: number
  /** Probability of checking in on a normal day, and on a setback day. */
  reportRate: number
  reportOnSetback?: number
  /** Late evening hours when most urges happen. */
  urgeHours: [number, number]
  plans?: Omit<Plan, 'timesUsed'>[]
}

const std = SEED_ITEMS

/** Default correlated structure for the seed items. */
function seedProb(id: string, c: { weekend: boolean; happened: Record<string, boolean>; rnd: () => number }): number {
  const h = c.happened
  switch (id) {
    case 'sc-midnight':
      return 0.55
    case 'bnd-sleep':
      return h['sc-midnight'] ? 0.15 : 0.6
    case 'bnd-alone':
      return c.weekend ? 0.55 : 0.15
    case 'bnd-lonely':
      return h['bnd-alone'] ? 0.6 : 0.2
    case 'bnd-phone':
      return h['sc-midnight'] ? 0.25 : 0.6
    case 'bnd-shorts':
      return h['bnd-phone'] ? 0.7 : 0.35
    case 'sc-fast':
      return 0.25
    case 'sc-prayer':
      return 0.75
    case 'sc-steps':
      return 0.5
    case 'sc-family':
      return 0.3
    case 'sc-clean':
      return 0.1
    default:
      return 0.3
  }
}

const OCD_ITEMS: TrackedItem[] = [
  { id: 'ocd-check', layer: 'abstinence', name: 'Checking (locks, stove)', active: true, sortOrder: 0 },
  { id: 'ocd-reassure', layer: 'abstinence', name: 'Asking for reassurance', active: true, sortOrder: 1 },
  { id: 'bnd-stress', layer: 'boundary', name: 'High-stress day', active: true, sortOrder: 0 },
  { id: 'bnd-sleep', layer: 'boundary', name: 'Not enough sleep', active: true, sortOrder: 1 },
  { id: 'bnd-caffeine', layer: 'boundary', name: 'More than 2 coffees', active: true, sortOrder: 2 },
  { id: 'sc-exposure', layer: 'selfcare', name: 'Planned exposure practice', active: true, sortOrder: 0 },
  { id: 'sc-walk', layer: 'selfcare', name: 'Walk outside', active: true, sortOrder: 1 },
  { id: 'sc-midnight', layer: 'selfcare', name: 'Sleep before midnight', active: true, sortOrder: 2 },
]

const linear = (from: number, to: number) => (t: number) => from + (to - from) * t

export const PERSONAS: Persona[] = [
  {
    id: 'improver',
    name: 'Steady improver',
    about: 'Rough first month, then steadily better. A short night raises risk the next day; phone in bed raises it the same day.',
    items: std,
    days: 180,
    base: 0.05,
    trend: linear(1.6, 0.4),
    effects: [
      { item: 'bnd-sleep', lag: 1, setback: 0.15, urge: 1.8 },
      { item: 'bnd-phone', lag: 0, setback: 0.1, urge: 1.6 },
    ],
    itemProb: seedProb,
    urgesPerDay: 0.8,
    urgeLogRate: 0.7,
    timedRate: 0.4,
    reportRate: 0.92,
    urgeHours: [21, 24],
    plans: [{ id: 'p1', triggerItemIds: ['bnd-phone'], ifText: 'it is 23:00 and I am on my phone', thenText: 'charge it in the kitchen', active: true }],
  },
  {
    id: 'null',
    name: 'No real pattern',
    about: 'Setbacks and urges are random and unrelated to anything tracked. Any confident factor claim here is a false positive.',
    items: std,
    days: 180,
    base: 0.12,
    effects: [],
    itemProb: seedProb,
    urgesPerDay: 0.9,
    urgeLogRate: 0.7,
    timedRate: 0.4,
    reportRate: 0.92,
    urgeHours: [20, 24],
  },
  {
    id: 'rare',
    name: 'Rare setbacks',
    about: 'About one setback a month. The phone drives urges strongly, but setbacks are too rare to analyse.',
    items: std,
    days: 180,
    base: 0.025,
    effects: [{ item: 'bnd-phone', lag: 0, setback: 0.04, urge: 2.5 }],
    itemProb: seedProb,
    urgesPerDay: 0.6,
    urgeLogRate: 0.75,
    timedRate: 0.5,
    reportRate: 0.95,
    urgeHours: [22, 25],
  },
  {
    id: 'patchy',
    name: 'Patchy reporter',
    about: 'Same underlying pattern as the improver, but checks in on 60% of days and on only 30% of setback days.',
    items: std,
    days: 180,
    base: 0.05,
    trend: linear(1.6, 0.4),
    effects: [
      { item: 'bnd-sleep', lag: 1, setback: 0.15, urge: 1.8 },
      { item: 'bnd-phone', lag: 0, setback: 0.1, urge: 1.6 },
    ],
    itemProb: seedProb,
    urgesPerDay: 0.8,
    urgeLogRate: 0.4,
    timedRate: 0.2,
    reportRate: 0.6,
    reportOnSetback: 0.3,
    urgeHours: [21, 24],
  },
  {
    id: 'ocd',
    name: 'OCD checking',
    about: 'Several urges to check a day; acting on one is common early and falls with exposure practice. Stress drives urges; exposure practice lowers them.',
    items: OCD_ITEMS,
    days: 180,
    base: 0.35,
    trend: linear(1.3, 0.45),
    effects: [
      { item: 'bnd-stress', lag: 0, setback: 0.2, urge: 1.7 },
      { item: 'bnd-sleep', lag: 1, setback: 0.08, urge: 1.4 },
      { item: 'sc-exposure', lag: 0, setback: -0.12, urge: 0.8 },
    ],
    itemProb: (id, c) =>
      ({
        'bnd-stress': c.weekend ? 0.2 : 0.45,
        'bnd-sleep': c.happened['sc-midnight'] ? 0.2 : 0.55,
        'bnd-caffeine': 0.35,
        'sc-exposure': 0.2 + 0.5 * c.t,
        'sc-walk': 0.5,
        'sc-midnight': 0.5,
      })[id] ?? 0.3,
    urgesPerDay: 5,
    urgeLogRate: 0.45,
    timedRate: 0.3,
    reportRate: 0.9,
    urgeHours: [7, 23],
  },
  {
    id: 'weekend',
    name: 'Weekend pattern',
    about: 'Weekdays are fine. Days alone at home (mostly weekends) carry most of the risk.',
    items: std,
    days: 180,
    base: 0.02,
    effects: [
      { item: 'bnd-alone', lag: 0, setback: 0.25, urge: 2 },
      { item: 'sc-family', lag: 0, setback: -0.08, urge: 0.7 },
    ],
    itemProb: seedProb,
    urgesPerDay: 0.7,
    urgeLogRate: 0.7,
    timedRate: 0.4,
    reportRate: 0.9,
    urgeHours: [14, 24],
  },
  {
    id: 'cycle',
    name: 'Relapse cycle',
    about: 'Setbacks come in a rhythm: risk is low right after one and rises sharply around days 10 to 14.',
    items: std,
    days: 180,
    base: 0.01,
    cycle: (d) => (d >= 10 && d <= 14 ? 0.3 : d > 14 ? 0.08 : 0),
    effects: [{ item: 'bnd-lonely', lag: 0, setback: 0.05, urge: 1.4 }],
    itemProb: seedProb,
    urgesPerDay: 0.7,
    urgeLogRate: 0.7,
    timedRate: 0.4,
    reportRate: 0.93,
    urgeHours: [21, 24],
  },
  {
    id: 'dropout',
    name: 'Early dropout risk',
    about: 'Motivated for a week, then a setback, then checks in less and less. The first two weeks decide whether the app sticks.',
    items: std,
    days: 60,
    base: 0.1,
    effects: [{ item: 'bnd-lonely', lag: 0, setback: 0.12, urge: 1.5 }],
    itemProb: seedProb,
    urgesPerDay: 0.8,
    urgeLogRate: 0.6,
    timedRate: 0.3,
    reportRate: 0.8,
    reportOnSetback: 0.5,
    urgeHours: [21, 24],
  },
]

/** Seeded PRNG so every run is identical. */
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function poisson(lambda: number, rnd: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rnd()
  } while (p > L)
  return k - 1
}

export interface SimDay {
  date: LocalDate
  /** Ground truth, whether or not it was reported. */
  setback: boolean
  happened: Record<string, boolean>
  entry?: DayEntry
  urges: Urge[]
}

/** Generate a persona's whole history. Day 1 is `start`. */
export function generate(p: Persona, start: LocalDate, seed = 1): SimDay[] {
  const rnd = mulberry32(seed)
  const chance = (x: number) => rnd() < x
  const out: SimDay[] = []
  let prevHappened: Record<string, boolean> = {}
  let lastSetback: number | null = null
  let n = 0
  const abst = p.items.filter((i) => i.layer === 'abstinence')

  lastNDays(addDays(start, p.days - 1), p.days).forEach((date, i) => {
    const t = i / Math.max(1, p.days - 1)
    const weekend = [0, 6].includes(weekdayOf(date))
    const happened: Record<string, boolean> = {}
    for (const item of p.items) {
      if (item.layer === 'abstinence') continue
      happened[item.id] = chance(p.itemProb(item.id, { weekend, happened, t, rnd }))
    }

    let hazard = p.base * (p.trend?.(t) ?? 1)
    let urgeMult = 1
    for (const e of p.effects) {
      const on = e.lag === 0 ? happened[e.item] : prevHappened[e.item]
      if (!on) continue
      hazard += e.setback
      urgeMult *= e.urge
    }
    if (weekend && p.weekend) hazard += p.weekend
    if (p.cycle && lastSetback !== null) hazard += p.cycle(i - lastSetback)
    const setback = chance(Math.min(0.95, Math.max(0, hazard)))
    if (setback) lastSetback = i

    // Dropout persona: engagement decays after the first setback.
    const engagement = p.id === 'dropout' && lastSetback !== null ? Math.max(0.15, 1 - (i - lastSetback) * 0.03) : 1
    const reports = chance((setback ? (p.reportOnSetback ?? p.reportRate) : p.reportRate) * engagement)

    let entry: DayEntry | undefined
    if (reports) {
      const entries: Record<string, EntryValue> = {}
      const breached = setback ? abst[Math.floor(rnd() * abst.length)]!.id : null
      for (const a of abst) entries[a.id] = a.id === breached
      for (const item of p.items) {
        if (item.layer === 'abstinence') continue
        if (item.target?.type === 'count') entries[item.id] = happened[item.id] ? item.target.value + Math.floor(rnd() * 4) : Math.floor(rnd() * item.target.value)
        else entries[item.id] = happened[item.id]!
      }
      entry = {
        date,
        entries,
        mood: (setback ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 4)) as DayEntry['mood'],
        loggedAt: `${date}T21:30:00`,
        backfilled: chance(0.1),
      }
    }

    const urges: Urge[] = []
    const count = poisson(p.urgesPerDay * urgeMult * (0.6 + 0.4 * (p.trend?.(t) ?? 1)), rnd) + (setback ? 1 : 0)
    const triggers = p.items.filter((it) => it.layer === 'boundary' && happened[it.id]).map((it) => it.id)
    for (let k = 0; k < count; k++) {
      const acted = setback && k === count - 1
      if (!chance(p.urgeLogRate * engagement)) continue
      const [h0, h1] = p.urgeHours
      const hour = chance(0.7) ? h0 + Math.floor(rnd() * (h1 - h0)) : 8 + Math.floor(rnd() * 12)
      const hh = hour % 24
      // Hours past midnight belong to the next calendar date but the same local day.
      const clockDate = hour >= 24 ? addDays(date, 1) : date
      urges.push({
        id: `u${n++}`,
        at: `${clockDate}T${String(hh).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00`,
        intensity: Math.min(10, Math.max(1, Math.round(3 + rnd() * 4 + (acted ? 2 : 0) + (urgeMult > 1.3 ? 1 : 0)))),
        triggerItemIds: triggers.filter(() => chance(0.6)).slice(0, 2),
        outcome: acted ? 'acted' : 'resisted',
        durationMin: !acted && chance(p.timedRate) ? Math.round(4 + rnd() * 20 * (1.2 - 0.5 * t)) : undefined,
      })
    }

    out.push({ date, setback, happened, entry, urges })
    prevHappened = happened
  })
  return out
}
