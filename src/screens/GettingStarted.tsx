import { useData } from '../app/data'
import { useNav } from '../app/nav'
import { db } from '../db/db'
import { DEFAULT_LAPSE_PLAN, saveMeta } from '../db/seed'
import { IconChevron } from '../ui/icons'
import { Label } from '../ui/kit'

/**
 * A short setup checklist for the first weeks. Plans work best written on a
 * calm day, before they're needed, so this asks for them early.
 */
export function GettingStarted() {
  const { meta, plans, lapsePlan, settings } = useData()
  const nav = useNav()
  if (meta.setupDismissed) return null

  const steps = [
    { done: Boolean(meta.itemsReviewed), label: 'Make the three lists yours', sub: 'Rename, add or archive what you track', go: () => nav.push({ kind: 'items' }) },
    { done: plans.length > 0, label: 'Write one if-then plan', sub: 'For your most common trigger', go: () => nav.setTab('plans') },
    {
      done: JSON.stringify(lapsePlan.steps) !== JSON.stringify(DEFAULT_LAPSE_PLAN.steps),
      label: 'Write your day-after plan',
      sub: 'In your own words, shown after any setback',
      go: () => nav.setTab('plans'),
    },
    { done: Boolean(settings.replacementHabit), label: 'Name one replacement habit', sub: 'Counted toward 66 days', go: () => nav.setTab('plans') },
  ]
  const left = steps.filter((s) => !s.done).length
  if (left === 0) return null

  return (
    <section className="mt-6 rounded-3xl border border-line p-5">
      <div className="flex items-baseline justify-between">
        <Label>Getting started</Label>
        <span className="text-[13px] text-muted">{4 - left} of 4</span>
      </div>
      <ul className="mt-2">
        {steps.map((s) => (
          <li key={s.label}>
            <button type="button" onClick={s.go} disabled={s.done} className="flex min-h-14 w-full items-center gap-3 text-left disabled:opacity-50">
              <span
                aria-hidden
                className={`grid size-6 shrink-0 place-items-center rounded-full border text-[13px] ${s.done ? 'border-selfcare bg-selfcare text-bg' : 'border-muted'}`}
              >
                {s.done ? '✓' : ''}
              </span>
              <span className="flex-1">
                <span className={`block ${s.done ? 'line-through decoration-muted' : ''}`}>{s.label}</span>
                {!s.done && <span className="block text-[13px] text-muted">{s.sub}</span>}
              </span>
              {!s.done && <IconChevron />}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => saveMeta(db, { setupDismissed: true })} className="mt-1 min-h-11 text-[14px] text-muted">
        Hide this
      </button>
    </section>
  )
}
