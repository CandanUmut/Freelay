import { addDays, diffDays, localDateOf } from '../lib/dates'
import type { LocalDate } from '../db/types'
import { dayOutcome, isHeld, type Snapshot } from './metrics'

export type TimelineKind = 'start' | 'milestone' | 'best' | 'setback' | 'urges'

export interface TimelineEvent {
  date: LocalDate
  kind: TimelineKind
  title: string
  /** For setbacks: what preceded it. */
  detail?: string[]
}

const CLEAN_MILESTONES = [7, 14, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 750, 1000]
const RESISTED_MILESTONES = [1, 10, 25, 50, 100, 200, 500]

/**
 * Milestones, personal bests and setbacks as a neutral event list, newest
 * first. Setbacks carry what preceded them (that day and the day before)
 * so they read as information, not verdicts.
 */
export function buildTimeline(s: Snapshot, dayBoundaryHour: number): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const map = new Map(s.days.map((d) => [d.date, d]))
  const absIds = s.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  const itemById = new Map(s.items.map((i) => [i.id, i]))
  const dates = s.days.map((d) => d.date).filter((d) => d <= s.today).sort()
  const urgeDate = (at: string) => localDateOf(new Date(at), dayBoundaryHour)

  if (dates[0]) events.push({ date: dates[0], kind: 'start', title: 'First check-in' })

  let totalClean = 0
  let run = 0
  let runStart: LocalDate | null = null
  let prev: LocalDate | null = null
  let best = 0
  let bestAnnounced = 0

  const closeRun = (end: LocalDate) => {
    // A run that set a new best (and is long enough to mean something) is an event.
    if (run > bestAnnounced && run >= 3 && run === best) {
      events.push({ date: end, kind: 'best', title: `Personal best: ${run} clean days in a row`, detail: runStart ? [`starting ${runStart}`] : undefined })
      bestAnnounced = run
    }
  }

  for (const d of dates) {
    const o = dayOutcome(map.get(d), absIds)
    if (o === undefined) continue
    const contiguous = prev !== null && diffDays(prev, d) === 1
    if (o === 'clean') {
      if (!contiguous || run === 0) {
        if (prev && run > 0) closeRun(prev)
        run = 0
        runStart = d
      }
      run++
      best = Math.max(best, run)
      totalClean++
      if (CLEAN_MILESTONES.includes(totalClean)) events.push({ date: d, kind: 'milestone', title: `${totalClean} clean days in total` })
    } else {
      if (prev && run > 0) closeRun(prev)
      run = 0
      events.push({ date: d, kind: 'setback', title: 'Setback', detail: precededBy(d) })
    }
    prev = d
  }
  if (prev && run > 0) closeRun(prev)

  const resisted = s.urges.filter((u) => u.outcome === 'resisted').sort((a, b) => a.at.localeCompare(b.at))
  resisted.forEach((u, i) => {
    const n = i + 1
    if (RESISTED_MILESTONES.includes(n))
      events.push({ date: urgeDate(u.at), kind: 'urges', title: n === 1 ? 'First urge logged and resisted' : `${n} urges resisted` })
  })

  // Early firsts: small, real wins that exist long before any long streak does.
  const firstTimed = s.urges.filter((u) => typeof u.durationMin === 'number').sort((a, b) => a.at.localeCompare(b.at))[0]
  if (firstTimed)
    events.push({ date: urgeDate(firstTimed.at), kind: 'urges', title: `First urge you timed: it passed in ${firstTimed.durationMin} minutes` })
  let run7 = 0
  let prevReported: LocalDate | null = null
  for (const d of dates) {
    run7 = prevReported && diffDays(prevReported, d) === 1 ? run7 + 1 : 1
    prevReported = d
    if (run7 === 7) {
      events.push({ date: d, kind: 'milestone', title: 'First full week of check-ins' })
      break
    }
  }

  function precededBy(d: LocalDate): string[] {
    const out: string[] = []
    const crossed = (date: LocalDate) =>
      s.items
        .filter((i) => i.layer === 'boundary' && isHeld(i, map.get(date)?.entries[i.id]) === false)
        .map((i) => i.name.toLowerCase())
    const today = crossed(d)
    const before = crossed(addDays(d, -1))
    if (before.length) out.push(`Day before: ${before.join(', ')}`)
    if (today.length) out.push(`That day: ${today.join(', ')}`)
    const acted = s.urges.filter((u) => u.outcome === 'acted' && urgeDate(u.at) === d)
    for (const u of acted) {
      const hour = new Date(u.at).getHours()
      const triggers = u.triggerItemIds.map((id) => itemById.get(id)?.name.toLowerCase()).filter(Boolean)
      if (u.triggerText) triggers.push(u.triggerText)
      out.push(`Urge around ${String(hour).padStart(2, '0')}:00, intensity ${u.intensity}${triggers.length ? `, ${triggers.join(', ')}` : ''}`)
    }
    if (!out.length) out.push('Nothing recorded beforehand')
    return out
  }

  // Newest first; within a day, keep a stable order.
  const order: Record<TimelineKind, number> = { setback: 0, best: 1, milestone: 2, urges: 3, start: 4 }
  return events.sort((a, b) => b.date.localeCompare(a.date) || order[a.kind] - order[b.kind])
}
