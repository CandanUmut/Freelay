import { useData } from '../../app/data'
import { useNav } from '../../app/nav'
import { buildTimeline, type TimelineKind } from '../../metrics/timeline'
import { Empty, LAYER, formatDate } from '../../ui/kit'

const DOT: Record<TimelineKind, string> = {
  start: '#ecebe8',
  milestone: LAYER.abstinence.hex,
  best: LAYER.abstinence.hex,
  urges: LAYER.selfcare.hex,
  setback: '#74777d',
}

export function Timeline() {
  const data = useData()
  const nav = useNav()
  const events = buildTimeline(data.snapshot, data.settings.dayBoundaryHour)
  if (!events.length) return <Empty>Milestones, personal bests and setbacks will appear here as you check in.</Empty>

  return (
    <ol className="relative ml-2 border-l border-line pl-5">
      {events.map((e, i) => (
        <li key={`${e.date}-${e.kind}-${i}`} className="relative pb-5">
          <span className="absolute -left-[26.5px] top-1.5 size-3 rounded-full ring-4 ring-bg" style={{ background: DOT[e.kind] }} aria-hidden />
          <button type="button" onClick={() => nav.push({ kind: 'day', date: e.date })} className="block w-full text-left">
            <div className="text-[13px] text-muted">{formatDate(e.date, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div className={`mt-0.5 ${e.kind === 'setback' ? '' : 'font-semibold'}`}>{e.title}</div>
            {e.detail && (
              <ul className="mt-1 space-y-0.5 text-[14px] leading-snug text-muted">
                {e.detail.map((d) => (
                  <li key={d}>{d.replace(/\d{4}-\d{2}-\d{2}/, (m) => formatDate(m, { day: 'numeric', month: 'short' }))}</li>
                ))}
              </ul>
            )}
          </button>
        </li>
      ))}
    </ol>
  )
}
