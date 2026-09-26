import { useData } from '../../app/data'
import type { Layer } from '../../db/types'
import { diffDays } from '../../lib/dates'
import { factorNeeds, factorSentence, strengthNote } from '../../metrics/feedback'
import { factorImpact, MIN_SETBACKS, rateSeries, setbackDates, topFactors, urgeStats, urgeTrend, type LagResult } from '../../metrics/metrics'
import { LAYER, Label, pct, plural, SETBACK_HEX } from '../../ui/kit'
import { ChartCard, ChartLegend, StackedColumns, TrendLines, type Series } from './charts'

const RATE_SERIES: Series[] = [
  { key: 'abstinence', label: 'Abstinence', color: LAYER.abstinence.hex },
  { key: 'boundary', label: 'Boundaries', color: LAYER.boundary.hex },
  { key: 'selfcare', label: 'Self Care', color: LAYER.selfcare.hex },
]
const URGE_SERIES: Series[] = [
  { key: 'resisted', label: 'Resisted', color: LAYER.selfcare.hex },
  { key: 'acted', label: 'Acted on', color: SETBACK_HEX },
]

const STRENGTH_STYLE = { strong: 'bg-ink text-bg', moderate: 'border border-ink/60 text-ink', weak: 'border border-line text-muted' }

export function Insights() {
  const { snapshot: s, dateOf } = useData()
  const top = topFactors(s)
  const clear = top.filter((f) => f.best!.strength !== 'weak')
  const all = factorImpact(s)
  const series = rateSeries(s)
  const weekly = urgeTrend(s, dateOf, 12).map((w) => ({ ...w, date: w.weekEnding }))
  const stats = urgeStats(s, dateOf)
  const setbacks60 = setbackDates(s).filter((d) => diffDays(d, s.today) < 60).length

  const half = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const firstHalf = weekly.slice(0, 6)
  const secondHalf = weekly.slice(6)
  const intensityThen = half(firstHalf.map((w) => w.avgIntensity))
  const intensityNow = half(secondHalf.map((w) => w.avgIntensity))
  const countThen = firstHalf.reduce((a, w) => a + w.count, 0)
  const countNow = secondHalf.reduce((a, w) => a + w.count, 0)

  return (
    <div>
      <section className="rounded-3xl bg-surface p-5">
        <Label>What matters most in your data</Label>
        <p className="mt-1 text-[13px] text-muted">Last 60 days. Observed differences, not proof of cause.</p>
        {top.length === 0 ? (
          <p className="mt-4 leading-relaxed">
            Not enough to compare yet. Each comparison needs at least 8 days on each side and {MIN_SETBACKS} setbacks in the window
            {setbacks60 < MIN_SETBACKS ? `, and you have fewer than that. That's the better problem to have.` : '.'} Keep checking in; this fills in on its own.
          </p>
        ) : (
          <>
            {clear.length === 0 && (
              <p className="mt-4 leading-relaxed">
                No clear pattern yet. The biggest differences so far are weak, so treat them as hints, not findings.
              </p>
            )}
            <ol className="mt-4 space-y-4">
              {(clear.length ? clear : top).map((f, i) => (
                <li key={f.item.id} className={`flex gap-3 ${clear.length ? '' : 'text-ink/75'}`}>
                  <span className="pt-0.5 text-muted tabular-nums">{i + 1}</span>
                  <div>
                    <p className="leading-relaxed">{factorSentence(f, f.best!)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${STRENGTH_STYLE[f.best!.strength!]}`}>{f.best!.strength}</span>
                      <span className="text-[13px] text-muted">{strengthNote(f.best!)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <ChartCard title="30-day rate, by layer" sub="Boundaries and self care lead; abstinence follows.">
        {series.length < 2 ? (
          <p className="py-6 text-center text-muted">Needs about two weeks of check-ins.</p>
        ) : (
          <>
            <TrendLines data={series} series={RATE_SERIES} format={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
            <ChartLegend series={RATE_SERIES} />
          </>
        )}
      </ChartCard>

      <ChartCard
        title="Urges per week"
        sub={
          countThen + countNow > 0
            ? `${countNow} in the last 6 weeks vs ${countThen} in the 6 before. ${stats.resisted30} resisted and ${stats.acted30} acted on in the last 30 days.`
            : 'Nothing logged yet.'
        }
      >
        <StackedColumns data={weekly} series={URGE_SERIES} />
        <ChartLegend series={URGE_SERIES} />
      </ChartCard>

      <ChartCard
        title="Average intensity"
        sub={
          intensityThen !== null && intensityNow !== null
            ? `${intensityNow.toFixed(1)} in the last 6 weeks, ${intensityThen.toFixed(1)} before. Smaller waves count as progress even while setbacks still happen.`
            : 'Needs a few weeks of logged urges.'
        }
      >
        <TrendLines data={weekly} series={[{ key: 'avgIntensity', label: 'Intensity', color: LAYER.abstinence.hex }]} format={(v) => v.toFixed(1)} domain={[0, 10]} height={150} />
      </ChartCard>

      <ChartCard
        title="How long urges last"
        sub={
          stats.avgDurationMin !== null
            ? `Average ${Math.round(stats.avgDurationMin)} minutes over ${plural(stats.timed, 'timed urge')}.`
            : 'Use Panic to time an urge; its length shows up here.'
        }
      >
        {stats.timed > 0 && (
          <TrendLines data={weekly} series={[{ key: 'avgDurationMin', label: 'Minutes', color: LAYER.selfcare.hex }]} format={(v) => `${Math.round(v)}m`} height={150} />
        )}
      </ChartCard>

      <section className="mt-4 rounded-3xl bg-surface p-5">
        <Label>Every factor</Label>
        <p className="mt-1 text-[13px] text-muted">Abstinence clean rate split by each item, on the same day and the day after.</p>
        <ul className="mt-3 divide-y divide-line">
          {all.map((f) => (
            <li key={f.item.id} className="py-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: LAYER[f.item.layer].hex }} />
                <span className="font-medium">{f.item.name}</span>
              </div>
              {f.best ? (
                <>
                  <p className="mt-0.5 text-[12px] text-muted">clean rate {f.item.layer === 'boundary' ? 'with vs without it' : 'done vs not done'}</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 text-[14px]">
                    <LagCell label="Same day" r={f.sameDay} layer={f.item.layer} />
                    <LagCell label="Next day" r={f.nextDay} layer={f.item.layer} />
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[14px] text-muted">{factorNeeds(f)}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function LagCell({ label, r, layer }: { label: string; r: LagResult; layer: Layer }) {
  // Same orientation as the sentences: boundaries read "with vs without", self care "done vs not".
  const [a, b] = layer === 'boundary' ? [r.notHeld, r.held] : [r.held, r.notHeld]
  return (
    <div className="rounded-xl bg-bg/50 px-3 py-2">
      <div className="text-[12px] text-muted">{label}</div>
      {r.diff === null ? (
        <div className="text-muted">too little data</div>
      ) : (
        <>
          <div className="tabular-nums">
            {pct(a.rate)} <span className="text-muted">vs</span> {pct(b.rate)}
          </div>
          <div className="text-[12px] text-muted">{r.strength}</div>
        </>
      )}
    </div>
  )
}
