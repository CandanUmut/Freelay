import { useMemo, useState } from 'react'
import { deleteUrge } from '../../app/actions'
import { useData } from '../../app/data'
import type { Urge } from '../../db/types'
import { Chip, Empty, LAYER, Label, formatDate, formatTime, plural } from '../../ui/kit'

type Outcome = 'all' | Urge['outcome']
type TimeBucket = 'all' | 'morning' | 'afternoon' | 'evening' | 'night'

const BUCKETS: { id: TimeBucket; label: string; test: (h: number) => boolean }[] = [
  { id: 'all', label: 'Any time', test: () => true },
  { id: 'morning', label: 'Morning', test: (h) => h >= 5 && h < 12 },
  { id: 'afternoon', label: 'Afternoon', test: (h) => h >= 12 && h < 17 },
  { id: 'evening', label: 'Evening', test: (h) => h >= 17 && h < 22 },
  { id: 'night', label: 'Night', test: (h) => h >= 22 || h < 5 },
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Urges() {
  const data = useData()
  const [outcome, setOutcome] = useState<Outcome>('all')
  const [bucket, setBucket] = useState<TimeBucket>('all')
  const [trigger, setTrigger] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [limit, setLimit] = useState(40)

  const usedTriggers = useMemo(() => {
    const ids = new Set(data.urges.flatMap((u) => u.triggerItemIds))
    return data.items.filter((i) => ids.has(i.id))
  }, [data.urges, data.items])

  const filtered = data.urges
    .filter((u) => outcome === 'all' || u.outcome === outcome)
    .filter((u) => BUCKETS.find((b) => b.id === bucket)!.test(new Date(u.at).getHours()))
    .filter((u) => !trigger || u.triggerItemIds.includes(trigger))
    .slice()
    .reverse()

  // Heatmap: weekday x hour, by clock time of the urge.
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const u of filtered) {
    const d = new Date(u.at)
    grid[d.getDay()]![d.getHours()]!++
  }
  const max = Math.max(1, ...grid.flat())
  const hourTotals = Array.from({ length: 24 }, (_, h) => grid.reduce((a, row) => a + row[h]!, 0))
  const peak = hourTotals.indexOf(Math.max(...hourTotals))
  // Densest 3-hour window, the useful "high-risk hours" answer.
  let bestStart = 0
  let bestSum = -1
  for (let h = 0; h < 24; h++) {
    const sum = hourTotals[h]! + hourTotals[(h + 1) % 24]! + hourTotals[(h + 2) % 24]!
    if (sum > bestSum) {
      bestSum = sum
      bestStart = h
    }
  }
  const [cell, setCell] = useState<{ d: number; h: number } | null>(null)

  const groups = new Map<string, Urge[]>()
  for (const u of filtered.slice(0, limit)) {
    const d = data.dateOf(u)
    groups.set(d, [...(groups.get(d) ?? []), u])
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(['all', 'resisted', 'acted'] as Outcome[]).map((o) => (
          <Chip key={o} tone="neutral" selected={outcome === o} onClick={() => setOutcome(o)}>
            {o === 'all' ? 'All' : o === 'resisted' ? 'Resisted' : 'Acted on'}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {BUCKETS.map((b) => (
          <Chip key={b.id} tone="neutral" selected={bucket === b.id} onClick={() => setBucket(b.id)} className="shrink-0">
            {b.label}
          </Chip>
        ))}
      </div>
      {usedTriggers.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {usedTriggers.map((i) => (
            <Chip key={i.id} tone="boundary" selected={trigger === i.id} onClick={() => setTrigger(trigger === i.id ? null : i.id)} className="shrink-0">
              {i.name}
            </Chip>
          ))}
        </div>
      )}

      <section className="mt-4 rounded-3xl bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">When urges happen</h3>
          <span className="text-[13px] text-muted">{plural(filtered.length, 'urge')}</span>
        </div>
        {filtered.length > 0 && (
          <p className="mt-1 text-[13px] text-muted">
            Busiest 3 hours: {String(bestStart).padStart(2, '0')}:00–{String((bestStart + 3) % 24).padStart(2, '0')}:00 ({bestSum} urges). Peak hour {String(peak).padStart(2, '0')}:00.
          </p>
        )}
        <div className="mt-3" role="img" aria-label="Urges by weekday and hour">
          {grid.map((row, d) => (
            <div key={d} className="flex items-center gap-1">
              <span className="w-8 shrink-0 text-[11px] text-muted">{DAY_LABELS[d]}</span>
              <div className="grid flex-1 grid-cols-24 gap-[2px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                {row.map((n, h) => (
                  <button
                    key={h}
                    type="button"
                    aria-label={`${DAY_LABELS[d]} ${h}:00, ${n} urges`}
                    onClick={() => setCell(cell?.d === d && cell.h === h ? null : { d, h })}
                    className={`aspect-square rounded-[3px] ${cell?.d === d && cell.h === h ? 'ring-1 ring-ink' : ''}`}
                    style={{
                      background: n ? `color-mix(in srgb, ${LAYER.abstinence.hex} ${Math.round(25 + (n / max) * 75)}%, #26282b)` : '#232427',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="ml-9 mt-1 flex justify-between text-[10px] text-muted">
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>
        <p className="mt-2 min-h-5 text-[13px] text-ink/80">
          {cell ? `${DAY_LABELS[cell.d]} ${String(cell.h).padStart(2, '0')}:00–${String(cell.h + 1).padStart(2, '0')}:00: ${plural(grid[cell.d]![cell.h]!, 'urge')}` : 'Tap a cell for its count.'}
        </p>
      </section>

      <section className="mt-6">
        <Label>Every urge</Label>
        {filtered.length === 0 && <Empty>No urges match. Logged urges appear here, newest first.</Empty>}
        {[...groups.entries()].map(([date, us]) => (
          <div key={date} className="mt-4">
            <div className="text-[13px] text-muted">{formatDate(date)}</div>
            <ul className="mt-1.5 space-y-1.5">
              {us.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setOpen(open === u.id ? null : u.id)} className="w-full rounded-2xl bg-surface px-4 py-3 text-left">
                    <div className="flex items-center gap-3">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: u.outcome === 'resisted' ? LAYER.selfcare.hex : '#74777d' }}
                        aria-hidden
                      />
                      <span className="tabular-nums">{formatTime(u.at)}</span>
                      <span className="text-muted">intensity {u.intensity}</span>
                      <span className="ml-auto text-[14px] text-muted">{u.outcome === 'resisted' ? 'resisted' : 'acted on'}</span>
                    </div>
                    {(u.triggerItemIds.length > 0 || u.triggerText || u.context || u.durationMin) && (
                      <div className="mt-1 pl-5.5 text-[14px] text-muted">
                        {[...u.triggerItemIds.map((t) => data.itemById.get(t)?.name), u.triggerText, u.context, u.durationMin && `${u.durationMin} min`]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                    {u.note && <p className="mt-1 pl-5.5 text-[14px]">{u.note}</p>}
                  </button>
                  {open === u.id && (
                    <div className="flex justify-end px-2 py-1">
                      <button
                        type="button"
                        className="min-h-11 px-3 text-[14px] text-muted"
                        onClick={async () => {
                          if (confirm('Delete this urge? This does not change the day’s check-in.')) await deleteUrge(u.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {filtered.length > limit && (
          <button type="button" onClick={() => setLimit(limit + 40)} className="mt-4 min-h-12 w-full rounded-2xl bg-surface text-muted">
            Show {Math.min(40, filtered.length - limit)} more of {filtered.length - limit}
          </button>
        )}
      </section>
    </div>
  )
}
