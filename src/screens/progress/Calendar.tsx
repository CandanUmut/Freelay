import { useState } from 'react'
import { useData } from '../../app/data'
import { useNav } from '../../app/nav'
import { LAYERS, type Layer, type LocalDate } from '../../db/types'
import { weekdayOf } from '../../lib/dates'
import { dayOutcome, isHeld } from '../../metrics/metrics'
import { IconBack, IconChevron } from '../../ui/icons'
import { LAYER, Segmented, formatDate, pct } from '../../ui/kit'
import { MARKS } from '../../ui/theme'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const pad = (n: number) => String(n).padStart(2, '0')

export function Calendar() {
  const data = useData()
  const nav = useNav()
  const [layer, setLayer] = useState<Layer>('abstinence')
  const [ym, setYm] = useState(() => data.today.slice(0, 7))
  const [y, m] = ym.split('-').map(Number) as [number, number]
  const first: LocalDate = `${ym}-01`
  const daysInMonth = new Date(y, m, 0).getDate()
  const lead = weekdayOf(first)
  const absIds = data.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  const layerItems = data.items.filter((i) => i.layer === layer)

  /** Share of the layer's answered items that were held, or null if nothing answered. */
  function share(date: LocalDate): number | null {
    const d = data.dayByDate.get(date)
    if (!d) return null
    let held = 0
    let total = 0
    for (const i of layerItems) {
      const h = isHeld(i, d.entries[i.id])
      if (h === undefined) continue
      total++
      if (h) held++
    }
    return total ? held / total : null
  }

  const dates = Array.from({ length: daysInMonth }, (_, i) => `${ym}-${pad(i + 1)}`)
  const monthOutcomes = dates.map((d) => dayOutcome(data.dayByDate.get(d), absIds))
  const reported = monthOutcomes.filter(Boolean).length
  const clean = monthOutcomes.filter((o) => o === 'clean').length
  const shiftMonth = (n: number) => {
    const d = new Date(y, m - 1 + n, 1)
    setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }
  const monthName = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const isCurrentMonth = ym === data.today.slice(0, 7)

  return (
    <div>
      <Segmented value={layer} onChange={setLayer} options={LAYERS.map((l) => ({ value: l, label: LAYER[l].label }))} />

      <div className="mt-5">
        <div className="text-[44px] font-semibold leading-none tracking-tight tabular-nums">{reported ? pct(clean / reported) : '—'}</div>
        <p className="mt-2 text-muted">
          clean in {monthName.split(' ')[0]} · {clean} of {reported} reported days
        </p>
      </div>

      <div className="mt-5 rounded-3xl bg-surface p-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="grid size-11 place-items-center text-muted">
            <IconBack className="size-5" />
          </button>
          <span className="font-semibold">{monthName}</span>
          <button
            type="button"
            aria-label="Next month"
            disabled={isCurrentMonth}
            onClick={() => shiftMonth(1)}
            className="grid size-11 place-items-center text-muted disabled:opacity-25"
          >
            <IconChevron />
          </button>
        </div>
        <div className="mt-1 grid grid-cols-7 text-center text-[12px] text-muted">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: lead }, (_, i) => (
            <div key={`lead-${i}`} />
          ))}
          {dates.map((d) => {
            const future = d > data.today
            const n = Number(d.slice(8))
            let style: React.CSSProperties = {}
            let cls = 'border border-line text-muted'
            let label = 'not reported'
            if (!future) {
              if (layer === 'abstinence') {
                const o = dayOutcome(data.dayByDate.get(d), absIds)
                if (o === 'clean') {
                  cls = 'bg-good text-white font-semibold'
                  label = 'clean'
                } else if (o === 'setback') {
                  cls = 'bg-bad hatch text-white font-semibold'
                  label = 'setback'
                }
              } else {
                const sh = share(d)
                if (sh !== null) {
                  // Diverging: red (little held) -> neutral -> green (all held).
                  const toward = sh >= 0.5 ? MARKS.good : MARKS.bad
                  const amount = Math.round(Math.abs(sh - 0.5) * 2 * 100)
                  style = { background: `color-mix(in srgb, ${toward} ${Math.max(12, amount)}%, var(--color-empty))` }
                  cls = amount >= 55 ? 'text-white font-semibold' : 'text-ink font-semibold'
                  if (sh < 0.5) cls += ' hatch'
                  label = `${pct(sh)} held`
                }
              }
            }
            const isToday = d === data.today
            return (
              <button
                key={d}
                type="button"
                disabled={future}
                onClick={() => nav.push({ kind: 'day', date: d })}
                aria-label={`${d}: ${future ? 'ahead' : label}`}
                className="grid h-12 place-items-center disabled:opacity-30"
              >
                <span
                  className={`grid size-10 place-items-center rounded-full text-[15px] tabular-nums ${cls} ${isToday ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
                  style={style}
                >
                  {n}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted">
        {layer === 'abstinence' ? (
          <>
            <Legend swatch={<span className="size-3 rounded-full bg-good" />} label="clean" />
            <Legend swatch={<span className="hatch size-3 rounded-full bg-bad" />} label="setback" />
          </>
        ) : (
          <Legend
            swatch={<span className="h-3 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${MARKS.bad}, var(--color-empty), ${MARKS.good})` }} />}
            label={layer === 'boundary' ? 'fewer to more held' : 'fewer to more done'}
          />
        )}
        <Legend swatch={<span className="size-3 rounded-full border border-line" />} label="not reported" />
      </div>
      <p className="mt-4 text-center text-[14px] text-muted">Tap any day to see it or fill it in.</p>
      {!isCurrentMonth && (
        <button type="button" className="mx-auto mt-2 block min-h-11 text-muted underline underline-offset-4" onClick={() => setYm(data.today.slice(0, 7))}>
          Back to {formatDate(data.today, { month: 'long' })}
        </button>
      )}
    </div>
  )
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {swatch}
      {label}
    </span>
  )
}
