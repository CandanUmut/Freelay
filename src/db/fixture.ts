import { addDays, lastNDays, weekdayOf } from '../lib/dates'
import type { LedgerDB } from './db'
import { ensureSeeded } from './seed'
import type { DayEntry, JournalEntry, LocalDate, Plan, Urge } from './types'

/** Small seeded PRNG so the fixture is identical on every run. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Fixture {
  days: DayEntry[]
  urges: Urge[]
  plans: Plan[]
  journal: JournalEntry[]
}

/**
 * 60 days of plausible data ending yesterday, with relationships baked in so
 * the insight engine has something real to find:
 *  - a short night (not enough sleep) raises the setback risk the NEXT day
 *  - phone in bed and loneliness raise same-day risk
 *  - sleep before midnight makes a short night much less likely
 *  - weekends are more often spent alone
 * About 7% of days are left unreported to exercise coverage and backfill.
 * `riskScale` multiplies setback risk; tests use it to get enough setbacks
 * for the factor engine to have something to measure.
 */
export function buildFixture(today: LocalDate, days = 60, seed = 42, riskScale = 1): Fixture {
  const rnd = mulberry32(seed)
  const chance = (p: number) => rnd() < p
  const out: Fixture = { days: [], urges: [], plans: [], journal: [] }
  let shortNightYesterday = false
  let n = 0

  for (const date of lastNDays(addDays(today, -1), days)) {
    const weekend = [0, 6].includes(weekdayOf(date))
    const midnight = chance(0.55)
    const shortNight = midnight ? chance(0.15) : chance(0.6)
    const alone = weekend ? chance(0.6) : chance(0.15)
    const lonely = alone ? chance(0.6) : chance(0.2)
    const phone = midnight ? chance(0.25) : chance(0.65)
    const shorts = chance(phone ? 0.7 : 0.35)

    let risk = 0.03
    if (shortNightYesterday) risk += 0.22
    if (phone) risk += 0.1
    if (lonely) risk += 0.1
    if (alone) risk += 0.05
    const setback = chance(risk * riskScale)
    shortNightYesterday = shortNight

    const unreported = chance(0.07)
    if (!unreported) {
      out.days.push({
        date,
        entries: {
          'abs-sites': setback && chance(0.7),
          'abs-social': setback && chance(0.4),
          // Guarantee the setback is recorded on at least one item.
          'abs-other': setback ? true : false,
          'bnd-alone': alone,
          'bnd-lonely': lonely,
          'bnd-sleep': shortNight,
          'bnd-phone': phone,
          'bnd-shorts': shorts,
          'sc-fast': [1, 4].includes(weekdayOf(date)) ? chance(0.75) : false,
          'sc-prayer': chance(0.8),
          'sc-midnight': midnight,
          'sc-steps': Math.round((2 + rnd() * 7) * 10) / 10,
          'sc-family': chance(0.3),
          'sc-clean': chance(0.12),
        },
        mood: (setback ? 2 : 3 + Math.floor(rnd() * 3)) as DayEntry['mood'],
        loggedAt: `${date}T21:30:00.000Z`,
        backfilled: chance(0.1),
      })
    }

    // Urges cluster late in the evening. On a setback day the last urge was acted on.
    const urgeCount = Math.floor(rnd() * (1 + risk * 8))
    for (let k = 0; k < urgeCount || (setback && k === 0); k++) {
      const hour = chance(0.6) ? 20 + Math.floor(rnd() * 4) : 8 + Math.floor(rnd() * 13)
      const acted = setback && k === Math.max(0, urgeCount - 1)
      const triggers = [lonely && 'bnd-lonely', phone && 'bnd-phone', shortNight && 'bnd-sleep', alone && 'bnd-alone'].filter(
        Boolean,
      ) as string[]
      out.urges.push({
        id: `fx-urge-${n++}`,
        at: `${date}T${String(hour).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00`,
        intensity: Math.min(10, Math.max(1, Math.round(4 + rnd() * 4 + (acted ? 2 : 0)))),
        triggerItemIds: triggers.slice(0, 2),
        outcome: acted ? 'acted' : 'resisted',
        durationMin: acted || chance(0.4) ? undefined : Math.round(5 + rnd() * 20),
        context: chance(0.5) ? 'bedroom' : undefined,
      })
    }
  }

  out.plans.push(
    { id: 'fx-plan-phone', triggerItemIds: ['bnd-phone'], ifText: "it's 23:00 and the phone is still in my hand", thenText: 'put it on the charger in the kitchen and read a book', timesUsed: 3, active: true },
    { id: 'fx-plan-lonely', triggerItemIds: ['bnd-lonely', 'bnd-alone'], ifText: 'I notice I feel lonely', thenText: 'text one person or go for a 15 minute walk', timesUsed: 1, active: true },
  )
  out.journal.push({ id: 'fx-journal-1', at: `${addDays(today, -3)}T22:10:00`, text: 'Long day alone. Walked instead of scrolling.' })
  return out
}

/** Replace all user data with the fixture (items and settings are kept or seeded). */
export async function loadFixture(db: LedgerDB, today: LocalDate): Promise<Fixture> {
  const fx = buildFixture(today)
  await ensureSeeded(db)
  await db.transaction('rw', [db.days, db.urges, db.plans, db.journal], async () => {
    await Promise.all([db.days.clear(), db.urges.clear(), db.plans.clear(), db.journal.clear()])
    await db.days.bulkAdd(fx.days)
    await db.urges.bulkAdd(fx.urges)
    await db.plans.bulkAdd(fx.plans)
    await db.journal.bulkAdd(fx.journal)
  })
  return fx
}
