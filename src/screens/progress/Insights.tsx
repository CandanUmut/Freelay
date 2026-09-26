import { useData } from '../../app/data'
import type { Layer } from '../../db/types'
import { factorNeeds } from '../../metrics/feedback'
import { buildInsights, patternProgress, weekReview } from '../../metrics/insights'
import { factorImpact, rateSeries, urgeStats, urgeTrend, type LagResult } from '../../metrics/metrics'
import { InsightRow, PatternFinder, WeekReviewCard } from '../../ui/insight'
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

export function Insights() {
  const { snapshot: s, dateOf } = useData()
  const insights = buildInsights(s, { dateOf })
  const patterns = insights.filter((i) => i.kind === 'urge-factor' || i.kind === 'setback-factor')
  const facts = insights.filter((i) => i.kind === 'fact' || i.kind === 'trend')
  const progress = patternProgress(s, dateOf, insights)
  const review = weekReview(s, dateOf)
  const all = factorImpact(s)
  const series = rateSeries(s)
  const weekly = urgeTrend(s, dateOf, 12).map((w) => ({ ...w, date: w.weekEnding }))
  const stats = urgeStats(s, dateOf)

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
      {review && <WeekReviewCard r={review} />}

      <section className="mt-4 rounded-3xl bg-surface p-5">
        <Label>Patterns in your data</Label>
        <p className="mt-1 text-[13px] text-muted">Last 60 days. Observed together, not proof of cause. Each one must hold in both halves of the window.</p>
        {patterns.length === 0 ? (
          <div className="mt-4">
            <PatternFinder p={progress} />
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {patterns.map((i) => (
              <li key={i.id}>
                <InsightRow i={i} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {facts.length > 0 && (
        <section className="mt-4 rounded-3xl bg-surface p-5">
          <Label>What's true so far</Label>
          <ul className="mt-4 space-y-4">
            {facts.map((i) => (
              <li key={i.id}>
                <InsightRow i={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

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

      <details className="mt-4 rounded-3xl bg-surface p-5">
        <summary className="min-h-11 cursor-pointer list-none">
          <Label className="inline">Raw comparisons</Label>
          <p className="mt-1 text-[13px] text-muted">Clean rate split by every item, same day and next day, before any filtering. Most of these are noise.</p>
        </summary>
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
      </details>
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
