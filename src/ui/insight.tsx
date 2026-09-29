import type { Confidence, Insight, PatternProgress, WeekReview } from '../metrics/insights'
import { PATTERN_DAYS, PATTERN_URGES } from '../metrics/insights'
import { Label, formatDate, pct, plural } from './kit'

const BADGE: Record<Confidence, { label: string; cls: string }> = {
  strong: { label: 'clear pattern', cls: 'bg-ink text-bg' },
  moderate: { label: 'likely pattern', cls: 'border border-ink/60 text-ink' },
  early: { label: 'early signal', cls: 'border border-line text-muted' },
  fact: { label: 'fact', cls: 'text-muted' },
}

export function ConfidenceBadge({ c }: { c: Confidence }) {
  if (c === 'fact') return null
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] ${BADGE[c].cls}`}>{BADGE[c].label}</span>
}

export function InsightRow({ i }: { i: Insight }) {
  return (
    <div>
      <p className="leading-relaxed">{i.text}</p>
      {(i.detail || i.confidence !== 'fact') && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <ConfidenceBadge c={i.confidence} />
          {i.detail && <span className="text-[13px] leading-snug text-muted">{i.detail}</span>}
        </div>
      )}
    </div>
  )
}

export function PatternFinder({ p }: { p: PatternProgress }) {
  const enough = p.progress >= 0.95
  if (enough)
    return (
      <div className="rounded-2xl border border-line p-4">
        <Label>No clear pattern yet</Label>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/85">
          There's enough data ({plural(p.days, 'day')}, {plural(p.urges, 'urge')} in 60 days), and nothing you track stands out clearly. That's information
          too: your urges may not hang on one trigger, or something you don't track yet matters. Adding a boundary you suspect (a place, a time, a feeling)
          is the quickest way to test it. This updates every day.
        </p>
      </div>
    )
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-baseline justify-between">
        <Label>Pattern finder</Label>
        <span className="text-[13px] text-muted tabular-nums">{Math.round(p.progress * 100)}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(p.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-good" style={{ width: `${Math.max(3, p.progress * 100)}%` }} />
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-ink/85">
        {plural(p.days, 'day')} and {plural(p.urges, 'urge')} logged in the last 60 days. Reliable patterns usually need around {PATTERN_DAYS} days and{' '}
        {PATTERN_URGES} urges. Logging urges, even resisted ones, gets there fastest: they happen far more often than setbacks.
      </p>
    </div>
  )
}

function Delta({ now, then, better = 'up', fmt = (x: number) => String(x) }: { now: number; then: number | null | undefined; better?: 'up' | 'down'; fmt?: (x: number) => string }) {
  if (then === null || then === undefined) return null
  const d = now - then
  if (Math.abs(d) < 0.005) return <span className="text-muted"> · same as last week</span>
  const good = better === 'up' ? d > 0 : d < 0
  return (
    <span className={good ? 'text-good-ink' : 'text-muted'}>
      {' '}
      · {d > 0 ? '+' : '−'}
      {fmt(Math.abs(d))} vs last week
    </span>
  )
}

export function WeekReviewCard({ r, onDismiss }: { r: WeekReview; onDismiss?: () => void }) {
  const p = r.prev
  const pp = (x: number) => `${Math.round(x * 100)} pts`
  return (
    <section className="rounded-3xl bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <Label>Your week</Label>
        <span className="text-[13px] text-muted">
          {formatDate(r.from, { day: 'numeric', month: 'short' })} – {formatDate(r.to, { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <ul className="mt-3 space-y-2 text-[15px]">
        {/* Compare rates, not counts: one fewer reported day or fewer urges isn't a worse week. */}
        <li>
          <span className="font-semibold tabular-nums">{r.clean}</span> of {plural(r.reported, 'reported day')} clean
          {p && p.reported > 0 && r.reported > 0 && <Delta now={r.clean / r.reported} then={p.clean / p.reported} fmt={pp} />}
        </li>
        {(r.urges > 0 || (p && p.urges > 0)) && (
          <li>
            {plural(r.urges, 'urge')} logged, <span className="font-semibold tabular-nums">{r.resisted}</span> resisted
            {p && <span className="text-muted"> · {p.urges} the week before</span>}
          </li>
        )}
        {r.boundaryHeld !== null && (
          <li>
            Boundaries held <span className="font-semibold tabular-nums">{pct(r.boundaryHeld)}</span>
            {p?.boundaryHeld !== null && p?.boundaryHeld !== undefined && <Delta now={r.boundaryHeld} then={p.boundaryHeld} fmt={pp} />}
          </li>
        )}
        {r.selfcareDone !== null && (
          <li>
            Self care done <span className="font-semibold tabular-nums">{pct(r.selfcareDone)}</span>
            {p?.selfcareDone !== null && p?.selfcareDone !== undefined && <Delta now={r.selfcareDone} then={p.selfcareDone} fmt={pp} />}
          </li>
        )}
      </ul>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="mt-3 min-h-11 text-[14px] text-muted">
          Got it
        </button>
      )}
    </section>
  )
}
