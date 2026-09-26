import { diffDays } from '../lib/dates'
import type { LocalDate, Settings } from '../db/types'
import type { RiskWindow, Streaks } from './metrics'

export const HABIT_DAYS = 66
const MILESTONES = [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 500, 730, 1000]

export interface ForwardTarget {
  headline: string
  /** Secondary line, e.g. replacement-habit progress when the headline is about the streak. */
  sub?: string
}

export function habitProgress(settings: Settings, today: LocalDate): { day: number; name: string } | null {
  if (!settings.replacementHabit || !settings.habitStartDate) return null
  const day = diffDays(settings.habitStartDate, today) + 1
  return day >= 1 ? { day, name: settings.replacementHabit } : null
}

function habitLine(h: { day: number; name: string }): string {
  return h.day <= HABIT_DAYS ? `Day ${h.day} of ${HABIT_DAYS}: ${h.name}` : `${h.name}: past ${HABIT_DAYS} days, now it's yours to keep`
}

/**
 * Always one concrete thing ahead. Prefers beating the personal best when it
 * is within two weeks, otherwise the next round-number run.
 */
export function forwardTarget(
  st: Streaks,
  reportedDays: number,
  settings: Settings,
  today: LocalDate,
  todaySetback = false,
): ForwardTarget {
  const habit = habitProgress(settings, today)
  const sub = habit ? habitLine(habit) : undefined
  if (reportedDays === 0) return { headline: 'Check in today to start your record.', sub }

  const { current, best } = st
  const nextMilestone = MILESTONES.find((m) => m > current) ?? current + 100
  const gapToBest = best - current + 1
  let headline: string
  if (current === 0)
    headline = todaySetback
      ? `${nextMilestone} clean days in a row, starting tomorrow. One day doesn't undo the rest.`
      : `${nextMilestone} clean days in a row. It starts with today.`
  // "Longest run" only means something once a run is a week or more.
  else if (current === best && best >= 7) headline = `Day ${current}, your longest run. Tomorrow sets a new best.`
  else if (best >= 7 && current < best && gapToBest <= 14) headline = `${gapToBest} ${gapToBest === 1 ? 'day' : 'days'} to beat your best (${best}).`
  else {
    const left = nextMilestone - current
    headline = `Day ${current}. ${left} more ${left === 1 ? 'day' : 'days'} to ${nextMilestone} in a row.`
  }

  // When there is no streak to speak of yet, the habit is the better target.
  if (habit && habit.day <= HABIT_DAYS && current < 3) return { headline: habitLine(habit), sub: headline }
  return { headline, sub }
}

/** Plain-language risk signal, or null when today is not near a known window. */
export function riskText(r: RiskWindow | null): string | null {
  // On the day of a setback itself, the lapse protocol is what matters, not the next window.
  if (!r || r.day === 0) return null
  const x = r.ratio >= 2.5 ? `about ${Math.round(r.ratio)}×` : 'about twice'
  const cluster = `Setbacks have been ${x} as likely on days ${r.from}–${r.to} after the last one (${r.hits} of ${r.of}).`
  if (r.inWindow) return `Day ${r.day}. ${cluster} Today is inside that range.`
  if (r.daysUntil > 0 && r.daysUntil <= 2)
    return `Day ${r.day}. ${cluster} That range starts in ${r.daysUntil} ${r.daysUntil === 1 ? 'day' : 'days'}.`
  return null
}
