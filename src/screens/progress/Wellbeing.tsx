import { useData } from '../../app/data'
import { REFLECTION } from '../../content/needs'
import { needSummary, stepSummary } from '../../metrics/wellbeing'
import { Label, plural } from '../../ui/kit'
import { MARKS } from '../../ui/theme'

/** One tiny line per question, last 12 reflections, on a fixed 1-5 scale. */
function Spark({ values, better }: { values: number[]; better: boolean }) {
  const w = 96
  const h = 28
  if (values.length < 2) return <span className="text-[13px] text-muted">—</span>
  const x = (i: number) => (i / (values.length - 1)) * (w - 6) + 3
  const y = (v: number) => h - 3 - ((v - 1) / 4) * (h - 6)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.at(-1)!
  return (
    <svg width={w} height={h} role="img" aria-label={`last ${values.length} ratings, latest ${last}`}>
      <path d={d} fill="none" stroke="var(--color-muted)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r={3.5} fill={better ? MARKS.good : 'var(--color-ink)'} stroke="var(--color-surface)" strokeWidth={1.5} />
    </svg>
  )
}

export function Wellbeing() {
  const { reflections, urges, steps, dateOf, today } = useData()
  const needs = needSummary(urges, reflections, dateOf, today)
  const week = stepSummary(steps, today)
  if (!reflections.length && !needs.needs.length && !steps.length) return null

  return (
    <section className="mt-4 rounded-3xl bg-surface p-5">
      <Label>How you've been</Label>
      {reflections.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {REFLECTION.map((q) => {
            const vals = reflections.map((r) => r[q.key]).filter((v): v is number => typeof v === 'number').slice(-12)
            if (!vals.length) return null
            const first = vals[0]!
            const last = vals.at(-1)!
            const better = q.higherIsBetter ? last > first : last < first
            return (
              <li key={q.key} className="flex min-h-12 items-center justify-between gap-3 py-2">
                <span>
                  <span className="block">{q.label}</span>
                  <span className="text-[12px] text-muted">
                    latest {last} of 5 · {plural(vals.length, 'reflection')}
                  </span>
                </span>
                <Spark values={vals} better={vals.length >= 3 && better} />
              </li>
            )
          })}
        </ul>
      )}
      {(needs.needs.length > 0 || needs.promises.length > 0) && (
        <div className="mt-4 space-y-2 text-[15px] leading-relaxed">
          {needs.promises[0] && (
            <p>
              Urges mostly promised: <span className="font-semibold">{needs.promises.slice(0, 3).map((p) => p.label.toLowerCase()).join(', ')}</span>
            </p>
          )}
          {needs.needs[0] && (
            <p>
              What you actually needed: <span className="font-semibold">{needs.needs.slice(0, 3).map((n) => `${n.label.toLowerCase()} (${n.n})`).join(', ')}</span>
            </p>
          )}
        </div>
      )}
      <p className="mt-3 text-[14px] text-muted">{plural(week.total, 'step')} toward those needs in the last 7 days.</p>
    </section>
  )
}
