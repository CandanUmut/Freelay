import { useEffect, useMemo } from 'react'
import { dismissLesson } from '../app/actions'
import { useData } from '../app/data'
import { useNav } from '../app/nav'
import { suggestLesson } from '../content/triggers'
import { db } from '../db/db'
import { saveMeta } from '../db/seed'
import { LAYERS } from '../db/types'
import { addDays, diffDays } from '../lib/dates'
import { abstinenceRate, dayOutcome, layerRate, riskWindow, setbackDates, streaks, totalCleanDays } from '../metrics/metrics'
import { buildInsights, isReviewDay, patternProgress, pickInsight, weekReview } from '../metrics/insights'
import { forwardTarget, riskText } from '../metrics/targets'
import { InsightRow, WeekReviewCard } from '../ui/insight'
import { IconChevron, IconLog, IconPen, IconSettings, IconWave } from '../ui/icons'
import { Card, Label, LAYER, formatDate, pct, plural } from '../ui/kit'

export function Today() {
  const data = useData()
  const nav = useNav()
  const { snapshot: s, today, settings, meta } = data

  const r30 = abstinenceRate(s)
  const st = streaks(s)
  const total = totalCleanDays(s)
  const target = forwardTarget(st, s.days.length, settings, today)
  const risk = riskText(riskWindow(s))
  const absIds = s.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  const checkedIn = dayOutcome(data.dayByDate.get(today), absIds) !== undefined
  const yesterday = addDays(today, -1)
  const yesterdayMissing = s.days.length > 0 && dayOutcome(data.dayByDate.get(yesterday), absIds) === undefined
  const lastSetback = setbackDates(s).at(-1)
  const showLapse = lastSetback !== undefined && diffDays(lastSetback, today) <= 1 && meta.lapseSeenFor !== lastSetback
  const lesson = suggestLesson({ s, plans: data.plans, settings, meta, dateOf: data.dateOf })
  const insights = useMemo(() => buildInsights(s, { dateOf: data.dateOf }), [s, data.dateOf])
  const card = pickInsight(insights, meta.insightsShown ?? {}, today)
  const review = isReviewDay(s) && meta.reviewSeen !== today ? weekReview(s, data.dateOf) : null
  const progress = patternProgress(s, data.dateOf, insights)

  // Remember which insight Today showed, so tomorrow's card is a different one.
  useEffect(() => {
    if (card && meta.insightsShown?.[card.id] !== today) void saveMeta(db, { insightsShown: { ...meta.insightsShown, [card.id]: today } })
  }, [card?.id, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const daysSinceExport = meta.lastExportAt ? diffDays(meta.lastExportAt.slice(0, 10), today) : null
  const exportDue = s.days.length >= 14 && (daysSinceExport === null || daysSinceExport >= 21)

  return (
    <div className="px-4 pb-6">
      <header className="flex items-center justify-between pt-2">
        <span className="text-[15px] text-muted">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <button type="button" aria-label="Settings" onClick={() => nav.push({ kind: 'settings' })} className="-mr-2 grid size-12 place-items-center text-muted">
          <IconSettings />
        </button>
      </header>

      <section className="mt-2">
        <div className="flex items-end gap-3">
          <span className={`text-[76px] font-semibold leading-none tracking-tight tabular-nums ${r30.rate === null ? 'text-muted/50' : ''}`}>{pct(r30.rate)}</span>
          <span className="mb-2 rounded-full border border-line px-3 py-1 text-[14px] text-muted tabular-nums">
            {st.current}d streak
          </span>
        </div>
        <p className="mt-2 text-muted">
          {r30.reported > 0 ? (
            <>
              clean over the last 30 days · {r30.clean} of {plural(r30.reported, 'reported day')}
              {r30.coverage < 0.9 && <>, {pct(r30.coverage)} reported</>}
            </>
          ) : (
            'clean over the last 30 days · nothing reported yet'
          )}
        </p>
        <p className="mt-3 text-lg">
          <span className="font-semibold tabular-nums">{total}</span> clean {total === 1 ? 'day' : 'days'} in total
        </p>
      </section>

      <Card className="mt-6">
        <Label>Next</Label>
        <p className="mt-2 text-[19px] font-medium leading-snug">{target.headline}</p>
        {target.sub && <p className="mt-1.5 text-muted">{target.sub}</p>}
      </Card>

      {risk && (
        <div className="mt-3 rounded-3xl border border-abstinence/40 p-5">
          <Label className="text-abstinence-ink">Risk window</Label>
          <p className="mt-2 leading-relaxed">{risk}</p>
        </div>
      )}

      {showLapse && (
        <button type="button" onClick={() => nav.push({ kind: 'lapse' })} className="mt-3 flex w-full items-center justify-between rounded-3xl bg-surface p-5 text-left">
          <span>
            <Label>After a setback</Label>
            <span className="mt-2 block text-[17px]">Your plan for today</span>
          </span>
          <IconChevron />
        </button>
      )}

      {!checkedIn ? (
        <button
          type="button"
          onClick={() => nav.push({ kind: 'checkin' })}
          className="mt-3 flex min-h-20 w-full items-center justify-between rounded-3xl bg-ink px-5 text-left text-bg active:opacity-80"
        >
          <span>
            <span className="block text-[19px] font-semibold">Check in</span>
            <span className="text-[14px] opacity-70">All three layers, about 20 seconds</span>
          </span>
          <IconChevron />
        </button>
      ) : (
        <button type="button" onClick={() => nav.push({ kind: 'checkin' })} className="mt-3 flex min-h-14 w-full items-center justify-between rounded-2xl px-1 text-left text-muted">
          <span>Checked in today · edit</span>
          <IconChevron />
        </button>
      )}

      {yesterdayMissing && (
        <button type="button" onClick={() => nav.push({ kind: 'checkin', date: yesterday })} className="flex min-h-12 w-full items-center justify-between px-1 text-left text-muted">
          <span>Yesterday isn't recorded. Fill it in</span>
          <IconChevron />
        </button>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Action label="Log urge" onClick={() => nav.setTab('log')} icon={<IconLog className="size-7" />} />
        <Action label="Journal" onClick={() => nav.push({ kind: 'journal' })} icon={<IconPen className="size-7" />} />
        <Action label="Panic" onClick={() => nav.push({ kind: 'panic' })} icon={<IconWave className="size-7" />} />
      </div>

      {review && (
        <div className="mt-6">
          <WeekReviewCard r={review} onDismiss={() => saveMeta(db, { reviewSeen: today })} />
        </div>
      )}

      {card && (
        <button type="button" onClick={() => nav.setTab('progress')} className="mt-6 block w-full rounded-3xl bg-surface p-5 text-left">
          <Label>From your data</Label>
          <div className="mt-2 text-[17px]">
            <InsightRow i={card} />
          </div>
          {!progress.ready && s.days.length >= 3 && (
            <div className="mt-4 flex items-center gap-3 text-[13px] text-muted">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-abstinence" style={{ width: `${Math.max(3, progress.progress * 100)}%` }} />
              </span>
              pattern finder {Math.round(progress.progress * 100)}%
            </div>
          )}
        </button>
      )}

      {lesson && (
        <Card className="mt-6">
          <Label>Worth reading now</Label>
          <p className="mt-2 text-[14px] text-muted">{lesson.reason}</p>
          <button type="button" onClick={() => nav.push({ kind: 'lesson', id: lesson.lesson.id })} className="mt-3 block w-full text-left">
            <span className="block text-[19px] font-semibold">{lesson.lesson.title}</span>
            <span className="mt-1 block leading-snug text-muted">{lesson.lesson.summary}</span>
          </button>
          <div className="mt-4 flex gap-2">
            <button type="button" className="min-h-11 rounded-xl bg-surface-2 px-4" onClick={() => nav.push({ kind: 'lesson', id: lesson.lesson.id })}>
              Read
            </button>
            <button type="button" className="min-h-11 px-3 text-muted" onClick={() => dismissLesson(lesson.lesson.id, today, meta.lessonsDismissed)}>
              Not now
            </button>
          </div>
        </Card>
      )}

      <section className="mt-6 grid grid-cols-3 gap-2">
        {LAYERS.map((l) => (
          <div key={l} className="rounded-2xl bg-surface p-3.5">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink/90">
              <span className={`size-2 rounded-full ${LAYER[l].bg}`} />
              {LAYER[l].label}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{pct(layerRate(s, l))}</div>
            <div className="text-[11px] text-muted">30 days</div>
          </div>
        ))}
      </section>

      {exportDue && (
        <button type="button" onClick={() => nav.push({ kind: 'data' })} className="mt-6 min-h-11 w-full text-left text-[14px] text-muted underline underline-offset-4">
          {daysSinceExport === null ? 'No backup yet.' : `Last backup ${daysSinceExport} days ago.`} Your data lives only on this phone. Export a copy
        </button>
      )}
    </div>
  )
}

function Action({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex aspect-[1/0.9] flex-col items-center justify-center gap-2 rounded-3xl bg-surface active:opacity-70">
      {icon}
      <span className="text-[15px]">{label}</span>
    </button>
  )
}
