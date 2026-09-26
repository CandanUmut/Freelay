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
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-baseline justify-between">
        <Label>Pattern finder</Label>
        <span className="text-[13px] text-muted tabular-nums">{Math.round(p.progress * 100)}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(p.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-abstinence" style={{ width: `${Math.max(3, p.progress * 100)}%` }} />
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
  if (Math.abs(d) < 1e-9) return <span className="text-muted"> · same as last week</span>
  const good = better === 'up' ? d > 0 : d < 0
  return (
    <span className={good ? 'text-selfcare-ink' : 'text-muted'}>
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
        <li>
          <span className="font-semibold tabular-nums">{r.clean}</span> clean of {plural(r.reported, 'reported day')}
          <Delta now={r.clean} then={p?.clean} />
        </li>
        {r.urges > 0 && (
          <li>
            <span className="font-semibold tabular-nums">{r.resisted}</span> of {plural(r.urges, 'urge')} resisted
            <Delta now={r.resisted} then={p?.resisted} />
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
