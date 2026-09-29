import { useState } from 'react'
import { deletePlan, savePlan } from '../app/actions'
import { useData } from '../app/data'
import { db } from '../db/db'
import { saveLapsePlan, saveSettings } from '../db/seed'
import type { Plan } from '../db/types'
import { HABIT_DAYS, habitProgress } from '../metrics/targets'
import { IconDown, IconPlus, IconUp } from '../ui/icons'
import { Button, Chip, Empty, Label, plural } from '../ui/kit'
import { NeedsSection } from './NeedsSection'

export function Plans() {
  const data = useData()
  const [editing, setEditing] = useState<Plan | 'new' | null>(null)
  const plans = [...data.plans].sort((a, b) => Number(b.active) - Number(a.active) || b.timesUsed - a.timesUsed)

  return (
    <div className="px-4 pb-6">
      <h1 className="pt-3 text-[28px] font-semibold tracking-tight">Plans</h1>
      <p className="mt-1 leading-relaxed text-muted">Decide now, while calm. Log Urge shows the matching plan the moment you need it.</p>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <Label>If-then plans</Label>
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')} className="-mr-2 inline-flex min-h-11 items-center gap-1 px-2 text-[15px]">
              <IconPlus className="size-5" /> New
            </button>
          )}
        </div>
        {editing === 'new' && <PlanEditor onDone={() => setEditing(null)} />}
        {plans.length === 0 && editing === null && <Empty>No plans yet. Start with your most common trigger.</Empty>}
        <ul className="mt-3 space-y-2">
          {plans.map((p) =>
            editing !== 'new' && editing?.id === p.id ? (
              <li key={p.id}>
                <PlanEditor plan={p} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={p.id}>
                <button type="button" onClick={() => setEditing(p)} className={`w-full rounded-2xl bg-surface p-4 text-left ${p.active ? '' : 'opacity-50'}`}>
                  <p className="leading-relaxed">
                    <span className="text-muted">If</span> {p.ifText}, <span className="text-muted">then</span> <span className="font-semibold">{p.thenText}</span>.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
                    {p.triggerItemIds.map((t) => data.itemById.get(t)?.name).filter(Boolean).join(', ') || 'no trigger linked'}
                    <span>· used {plural(p.timesUsed, 'time')}</span>
                    {!p.active && <span>· paused</span>}
                  </div>
                </button>
              </li>
            ),
          )}
        </ul>
      </section>

      <NeedsSection />
      <LapseEditor />
      <HabitEditor />
    </div>
  )
}

function PlanEditor({ plan, onDone }: { plan?: Plan; onDone: () => void }) {
  const data = useData()
  const bounds = data.items.filter((i) => i.layer === 'boundary' && (i.active || plan?.triggerItemIds.includes(i.id)))
  const [triggers, setTriggers] = useState<Set<string>>(new Set(plan?.triggerItemIds ?? []))
  const [ifText, setIf] = useState(plan?.ifText ?? '')
  const [thenText, setThen] = useState(plan?.thenText ?? '')
  const [active, setActive] = useState(plan?.active ?? true)
  const valid = ifText.trim() && thenText.trim()

  const pickTrigger = (id: string) => {
    const next = new Set(triggers)
    if (next.has(id)) next.delete(id)
    else {
      next.add(id)
      // Pre-fill the "if" from the first trigger picked, if empty.
      if (!ifText.trim()) setIf(`I notice ${data.itemById.get(id)?.name.toLowerCase()}`)
    }
    setTriggers(next)
  }

  return (
    <div className="mt-3 rounded-2xl border border-line p-4">
      <p className="text-[14px] text-muted">Linked triggers</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {bounds.map((i) => (
          <Chip key={i.id} tone="boundary" selected={triggers.has(i.id)} onClick={() => pickTrigger(i.id)}>
            {i.name}
          </Chip>
        ))}
      </div>
      <label className="mt-4 block text-[14px] text-muted" htmlFor="plan-if">
        If…
      </label>
      <input
        id="plan-if"
        value={ifText}
        onChange={(e) => setIf(e.target.value)}
        placeholder="it's 23:00 and the phone is still in my hand"
        className="mt-1 min-h-12 w-full rounded-xl bg-surface px-3 placeholder:text-muted/60"
      />
      <label className="mt-3 block text-[14px] text-muted" htmlFor="plan-then">
        then I will…
      </label>
      <input
        id="plan-then"
        value={thenText}
        onChange={(e) => setThen(e.target.value)}
        placeholder="put it on the kitchen charger and read"
        className="mt-1 min-h-12 w-full rounded-xl bg-surface px-3 placeholder:text-muted/60"
      />
      <p className="mt-2 text-[13px] leading-snug text-muted">Make the "then" one action you can start in under a minute.</p>
      {plan && (
        <label className="mt-3 flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-[var(--color-ink)]" />
          Active
        </label>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={!valid}
          onClick={async () => {
            await savePlan({ id: plan?.id, triggerItemIds: [...triggers], ifText: ifText.trim(), thenText: thenText.trim(), active })
            onDone()
          }}
        >
          Save
        </Button>
        <Button onClick={onDone}>Cancel</Button>
        {plan && (
          <Button
            variant="quiet"
            onClick={async () => {
              if (confirm('Delete this plan?')) {
                await deletePlan(plan.id)
                onDone()
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

function LapseEditor() {
  const { lapsePlan } = useData()
  const [editing, setEditing] = useState(false)
  const [steps, setSteps] = useState<string[]>(lapsePlan.steps)

  if (!editing)
    return (
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <Label>After a setback</Label>
          <button
            type="button"
            className="-mr-2 min-h-11 px-2 text-[15px]"
            onClick={() => {
              setSteps(lapsePlan.steps)
              setEditing(true)
            }}
          >
            Edit
          </button>
        </div>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">Shown automatically, before anything else, whenever a setback is logged. Write it on a good day.</p>
        <ol className="mt-3 space-y-2">
          {lapsePlan.steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-surface p-4">
              <span className="text-muted tabular-nums">{i + 1}</span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    )

  const move = (i: number, d: -1 | 1) => {
    const next = [...steps]
    const [x] = next.splice(i, 1)
    next.splice(i + d, 0, x!)
    setSteps(next)
  }

  return (
    <section className="mt-10">
      <Label>After a setback</Label>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-1">
            <textarea
              value={s}
              rows={2}
              onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
              className="min-h-12 flex-1 rounded-xl bg-surface p-3 leading-snug"
              aria-label={`Step ${i + 1}`}
            />
            <div className="flex flex-col">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-11 place-items-center text-muted disabled:opacity-25">
                <IconUp />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === steps.length - 1}
                onClick={() => move(i, 1)}
                className="grid size-11 place-items-center text-muted disabled:opacity-25"
              >
                <IconDown />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1 text-[15px]" onClick={() => setSteps([...steps, ''])}>
        <IconPlus className="size-5" /> Add a step
      </button>
      <p className="mt-1 text-[13px] text-muted">Clear a step's text to remove it.</p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={async () => {
            await saveLapsePlan(db, { steps: steps.map((s) => s.trim()).filter(Boolean) })
            setEditing(false)
          }}
        >
          Save
        </Button>
        <Button onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </section>
  )
}

function HabitEditor() {
  const { settings, today } = useData()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(settings.replacementHabit ?? '')
  const [start, setStart] = useState(settings.habitStartDate ?? today)
  const progress = habitProgress(settings, today)

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <Label>Replacement habit</Label>
        {!editing && (
          <button type="button" className="-mr-2 min-h-11 px-2 text-[15px]" onClick={() => setEditing(true)}>
            {settings.replacementHabit ? 'Change' : 'Set one'}
          </button>
        )}
      </div>
      {!editing &&
        (progress ? (
          <div className="mt-3 rounded-2xl bg-surface p-4">
            <p className="text-[19px] font-semibold">{progress.name}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-good" style={{ width: `${Math.min(100, (progress.day / HABIT_DAYS) * 100)}%` }} />
            </div>
            <p className="mt-2 text-[14px] text-muted">
              Day {progress.day} of {HABIT_DAYS}. Sixty-six days is the median for a daily habit to become automatic; anywhere from 18 to 254 is normal.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            One thing you do instead, tied to your most common cue. The app counts toward {HABIT_DAYS} days and makes it a target on Today.
          </p>
        ))}
      {editing && (
        <div className="mt-3 rounded-2xl border border-line p-4">
          <label className="block text-[14px] text-muted" htmlFor="habit-name">
            Habit
          </label>
          <input
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Evening walk instead of the phone"
            className="mt-1 min-h-12 w-full rounded-xl bg-surface px-3 placeholder:text-muted/60"
          />
          <label className="mt-3 block text-[14px] text-muted" htmlFor="habit-start">
            Started
          </label>
          <input
            id="habit-start"
            type="date"
            value={start}
            max={today}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-xl bg-surface px-3"
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              disabled={!name.trim()}
              onClick={async () => {
                await saveSettings(db, { replacementHabit: name.trim(), habitStartDate: start })
                setEditing(false)
              }}
            >
              Save
            </Button>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            {settings.replacementHabit && (
              <Button
                variant="quiet"
                onClick={async () => {
                  await saveSettings(db, { replacementHabit: undefined, habitStartDate: undefined })
                  setName('')
                  setEditing(false)
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
