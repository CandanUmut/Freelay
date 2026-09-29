import { useState } from 'react'
import { saveDay } from '../app/actions'
import { useData } from '../app/data'
import { useNav } from '../app/nav'
import type { DayEntry, EntryValue, LocalDate, TrackedItem } from '../db/types'
import { addDays } from '../lib/dates'
import { checkInFeedback, withDay, type CheckInFeedback } from '../metrics/feedback'
import { Button, Chip, Label, LayerTag, Screen, formatDate, pct } from '../ui/kit'
import { LapseView } from './Lapse'

const MOODS = ['Low', 'Flat', 'Okay', 'Good', 'Great'] as const

/**
 * One screen, all three layers. The only required answer is abstinence;
 * untapped boundaries and self-care count as "didn't happen".
 */
function AddHint({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 w-full rounded-2xl border border-dashed border-line p-4 text-left text-[14px] text-muted">
      {text} <span className="text-ink underline underline-offset-4">Add some</span>
    </button>
  )
}

export function CheckIn({ date: dateProp, onClose }: { date?: LocalDate; onClose: () => void }) {
  const data = useData()
  const nav = useNav()
  const date = dateProp ?? data.today
  const existing = data.dayByDate.get(date)
  const layer = (l: TrackedItem['layer']) => data.active.filter((i) => i.layer === l)
  const abst = layer('abstinence')
  const bounds = layer('boundary')
  const care = layer('selfcare')

  const initial = existing?.entries ?? {}
  const initialBreach = abst.some((i) => initial[i.id] === true)
  const initialAnswered = abst.some((i) => initial[i.id] !== undefined)

  const [outcome, setOutcome] = useState<'clean' | 'setback' | undefined>(initialAnswered ? (initialBreach ? 'setback' : 'clean') : undefined)
  const [breached, setBreached] = useState<Set<string>>(() => new Set(abst.filter((i) => initial[i.id] === true).map((i) => i.id)))
  const [crossed, setCrossed] = useState<Set<string>>(() => new Set(bounds.filter((i) => initial[i.id] === true).map((i) => i.id)))
  const [done, setDone] = useState<Set<string>>(() => new Set(care.filter((i) => initial[i.id] === true).map((i) => i.id)))
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(care.filter((i) => typeof initial[i.id] === 'number').map((i) => [i.id, initial[i.id] as number])),
  )
  const [mood, setMood] = useState<DayEntry['mood']>(existing?.mood)
  const [note, setNote] = useState(existing?.note ?? '')
  const [showNote, setShowNote] = useState(Boolean(existing?.note))
  const [phase, setPhase] = useState<'form' | 'lapse' | 'result'>('form')
  const [feedback, setFeedback] = useState<CheckInFeedback | null>(null)
  // Freeze the pre-save snapshot so the result can show what changed.
  const [before] = useState(() => data.snapshot)

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const valid = outcome === 'clean' || (outcome === 'setback' && breached.size > 0)

  async function save() {
    const entries: Record<string, EntryValue> = {}
    // Keep answers for archived items so editing a day never erases history.
    for (const [k, v] of Object.entries(initial)) if (!data.active.some((i) => i.id === k)) entries[k] = v
    for (const i of abst) entries[i.id] = outcome === 'setback' && breached.has(i.id)
    for (const i of bounds) entries[i.id] = crossed.has(i.id)
    for (const i of care) {
      if (i.target?.type === 'count') {
        if (counts[i.id] !== undefined) entries[i.id] = counts[i.id]!
      } else entries[i.id] = done.has(i.id)
    }
    const row = await saveDay(date, data.today, { entries, mood, note })
    setFeedback(checkInFeedback(before, withDay(before, row), date, data.dateOf))
    setPhase(outcome === 'setback' ? 'lapse' : 'result')
  }

  const title = date === data.today ? 'Check-in' : date === addDays(data.today, -1) ? 'Yesterday' : formatDate(date)

  if (abst.length === 0)
    return (
      <Screen title={title} onClose={onClose}>
        <div className="pt-6">
          <p className="text-[22px] font-semibold leading-snug">First, add what you're stepping away from.</p>
          <p className="mt-3 leading-relaxed text-muted">
            A check-in asks whether any of those happened today, so it needs at least one. Pick from suggestions or write your own; it takes a minute.
          </p>
          <Button variant="primary" className="mt-6 w-full" onClick={() => nav.replace({ kind: 'items' })}>
            Choose what to track
          </Button>
        </div>
      </Screen>
    )

  if (phase === 'lapse')
    return (
      <Screen title={title} onClose={onClose}>
        <LapseView setbackDate={date} onContinue={() => setPhase('result')} />
      </Screen>
    )
  if (phase === 'result' && feedback)
    return (
      <Screen title={title} onClose={onClose}>
        <Result f={feedback} onDone={onClose} />
      </Screen>
    )

  return (
    <Screen
      title={title}
      onClose={onClose}
      footer={
        <Button variant="primary" className="w-full" disabled={!valid} onClick={save}>
          {existing ? 'Save changes' : 'Save check-in'}
        </Button>
      }
    >
      {date < data.today && <p className="mt-2 text-[14px] text-muted">Filling in {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}.</p>}

      <section className="mt-4">
        <LayerTag layer="abstinence" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <OutcomeButton selected={outcome === 'clean'} onClick={() => setOutcome('clean')}>
            Clean day
          </OutcomeButton>
          <OutcomeButton selected={outcome === 'setback'} onClick={() => setOutcome('setback')}>
            Setback
          </OutcomeButton>
        </div>
        {outcome === 'setback' && (
          <div className="mt-3">
            <p className="text-[14px] text-muted">Which one?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {abst.map((i) => (
                <Chip key={i.id} tone="neutral" selected={breached.has(i.id)} onClick={() => toggle(breached, setBreached, i.id)}>
                  {i.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <LayerTag layer="boundary" />
          <span className="text-[13px] text-muted">tap what happened</span>
        </div>
        {bounds.length === 0 && <AddHint onClick={() => nav.push({ kind: 'items' })} text="No boundaries yet. They show what tends to come before a slip." />}
        <div className="mt-3 flex flex-wrap gap-2">
          {bounds.map((i) => (
            <Chip key={i.id} tone="boundary" selected={crossed.has(i.id)} onClick={() => toggle(crossed, setCrossed, i.id)}>
              {i.name}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <LayerTag layer="selfcare" />
          <span className="text-[13px] text-muted">tap what you did</span>
        </div>
        {care.length === 0 && <AddHint onClick={() => nav.push({ kind: 'items' })} text="No self care yet. Add the things that help you." />}
        <div className="mt-3 flex flex-wrap gap-2">
          {care
            .filter((i) => i.target?.type !== 'count')
            .map((i) => (
              <Chip key={i.id} tone="selfcare" selected={done.has(i.id)} onClick={() => toggle(done, setDone, i.id)}>
                {i.name}
              </Chip>
            ))}
        </div>
        {care
          .filter((i) => i.target?.type === 'count')
          .map((i) => (
            <Counter
              key={i.id}
              item={i}
              value={counts[i.id]}
              onChange={(v) => setCounts((c) => ({ ...c, [i.id]: v }))}
            />
          ))}
      </section>

      <section className="mt-8">
        <Label>Mood (optional)</Label>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {MOODS.map((m, i) => {
            const v = (i + 1) as NonNullable<DayEntry['mood']>
            return (
              <button
                key={m}
                type="button"
                aria-pressed={mood === v}
                onClick={() => setMood(mood === v ? undefined : v)}
                className={`min-h-11 rounded-xl text-[14px] ${mood === v ? 'bg-ink text-bg font-semibold' : 'bg-surface text-ink/80'}`}
              >
                {m}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-6">
        {showNote ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="One line about today"
            className="w-full rounded-2xl bg-surface p-4 placeholder:text-muted"
          />
        ) : (
          <button type="button" className="min-h-11 text-muted underline underline-offset-4" onClick={() => setShowNote(true)}>
            Add a note
          </button>
        )}
      </section>
    </Screen>
  )
}

function OutcomeButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-14 rounded-2xl border text-[17px] transition-colors ${
        selected ? 'border-ink bg-ink text-bg font-semibold' : 'border-line bg-surface text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Counter({ item, value, onChange }: { item: TrackedItem; value: number | undefined; onChange: (v: number) => void }) {
  const target = item.target?.value ?? 1
  const v = value ?? 0
  const met = value !== undefined && v >= target
  return (
    <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface px-4 py-2">
      <div>
        <div className={met ? 'text-good-ink' : ''}>{item.name}</div>
        <div className="text-[13px] text-muted">target {target}{value === undefined ? ' · not entered' : ''}</div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Less ${item.name}`} className="grid size-11 place-items-center rounded-full bg-surface-2 text-xl" onClick={() => onChange(Math.max(0, v - 1))}>
          −
        </button>
        <span className="w-10 text-center text-lg font-semibold tabular-nums">{value === undefined ? '–' : v}</span>
        <button type="button" aria-label={`More ${item.name}`} className="grid size-11 place-items-center rounded-full bg-surface-2 text-xl" onClick={() => onChange(v + 1)}>
          +
        </button>
      </div>
    </div>
  )
}

function Result({ f, onDone }: { f: CheckInFeedback; onDone: () => void }) {
  const delta = f.rateBefore !== null && f.rateAfter !== null ? Math.round(f.rateAfter * 100) - Math.round(f.rateBefore * 100) : null
  const avg = (x: number | null) => (x === null ? null : x.toFixed(1))
  return (
    <div className="pt-4">
      <Label>Saved. Here's what it changed</Label>
      <div className="mt-4 flex items-end gap-3">
        <span className="text-6xl font-semibold tracking-tight tabular-nums">{pct(f.rateAfter)}</span>
        <span className="pb-2 text-muted">
          30-day rate
          {delta !== null && (delta === 0 ? ', unchanged' : `, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} from ${pct(f.rateBefore)}`)}
        </span>
      </div>
      <p className="mt-3 text-lg">
        <span className="font-semibold tabular-nums">{f.totalClean}</span> clean {f.totalClean === 1 ? 'day' : 'days'} in total
        {f.outcome === 'setback' && <span className="text-muted">. None of them were taken away.</span>}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-surface p-4">
          <LayerTag layer="boundary" />
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {f.boundary.held}/{f.boundary.total}
          </div>
          <div className="text-[13px] text-muted">held today{f.boundary.avg !== null && ` · usual ${avg(f.boundary.avg)}`}</div>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <LayerTag layer="selfcare" />
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {f.selfcare.held}/{f.selfcare.total}
          </div>
          <div className="text-[13px] text-muted">done today{f.selfcare.avg !== null && ` · usual ${avg(f.selfcare.avg)}`}</div>
        </div>
      </div>

      {f.insight && (
        <div className="mt-4 rounded-2xl border border-line p-4 leading-relaxed">
          <Label className="mb-2">From your data</Label>
          {f.insight}
        </div>
      )}

      <Button variant="primary" className="mt-8 w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
