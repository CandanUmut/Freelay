import type { LocalDate } from '../db/types'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The local date a moment belongs to. With a boundary of 4, anything before
 * 04:00 counts as the previous day.
 */
export function localDateOf(at: Date, dayBoundaryHour: number): LocalDate {
  const shifted = new Date(
    at.getFullYear(),
    at.getMonth(),
    at.getDate(),
    at.getHours() - dayBoundaryHour,
    at.getMinutes(),
  )
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`
}

// Date arithmetic on YYYY-MM-DD strings goes through UTC so DST never shifts a day.
function toUtcMs(d: LocalDate): number {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, day)
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(d: LocalDate, n: number): LocalDate {
  return fromUtcMs(toUtcMs(d) + n * 86_400_000)
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000)
}

/** Inclusive list of dates ending at `end`, oldest first. */
export function lastNDays(end: LocalDate, n: number): LocalDate[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1))
}

/** 0 = Sunday. */
export function weekdayOf(d: LocalDate): number {
  return new Date(toUtcMs(d)).getUTCDay()
}

export function isValidLocalDate(s: unknown): s is LocalDate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUtcMs(toUtcMs(s)) === s
}
