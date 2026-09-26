import { useEffect } from 'react'
import { markLessonRead } from '../app/actions'
import { useData } from '../app/data'
import { useNav } from '../app/nav'
import { LESSONS, lessonById, readingMinutes } from '../content/lessons'
import { suggestLesson } from '../content/triggers'
import { IconChevron } from '../ui/icons'
import { Label, Screen } from '../ui/kit'

export function Learn() {
  const data = useData()
  const nav = useNav()
  const suggestion = suggestLesson({ s: data.snapshot, plans: data.plans, settings: data.settings, meta: data.meta, dateOf: data.dateOf })

  return (
    <div className="px-4 pb-6">
      <h1 className="pt-3 text-[28px] font-semibold tracking-tight">Learn</h1>
      <p className="mt-1 leading-relaxed text-muted">Short reads, 2 to 4 minutes. Any order.</p>

      {suggestion && (
        <button
          type="button"
          onClick={() => nav.push({ kind: 'lesson', id: suggestion.lesson.id })}
          className="mt-5 block w-full rounded-3xl border border-ink/30 p-5 text-left"
        >
          <Label>Suggested by your data</Label>
          <p className="mt-2 text-[14px] text-muted">{suggestion.reason}</p>
          <p className="mt-2 text-[19px] font-semibold">{suggestion.lesson.title}</p>
        </button>
      )}

      <ul className="mt-5 divide-y divide-line">
        {LESSONS.map((l) => {
          const read = data.meta.lessonsRead[l.id]
          return (
            <li key={l.id}>
              <button type="button" onClick={() => nav.push({ kind: 'lesson', id: l.id })} className="flex w-full items-center gap-3 py-4 text-left">
                <span className="flex-1">
                  <span className="block text-[17px] font-medium">{l.title}</span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-muted">{l.summary}</span>
                  <span className="mt-1 block text-[12px] text-muted">
                    {readingMinutes(l)} min{read ? ' · read' : ''}
                  </span>
                </span>
                <IconChevron />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function LessonScreen({ id, onClose }: { id: string; onClose: () => void }) {
  const { today, meta } = useData()
  const lesson = lessonById(id)

  useEffect(() => {
    // Mark once on open; later changes to meta shouldn't re-trigger it.
    if (lesson && meta.lessonsRead[id] !== today) void markLessonRead(id, today, meta.lessonsRead)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson) return null
  const blocks = lesson.body.split(/\n\n+/)

  return (
    <Screen title="" onClose={onClose} back>
      <article className="mx-auto max-w-prose pb-10 pt-2">
        <p className="text-[13px] text-muted">{readingMinutes(lesson)} min read</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">{lesson.title}</h1>
        <p className="mt-2 text-[17px] leading-snug text-muted">{lesson.summary}</p>
        <div className="mt-6 space-y-4 text-[17px] leading-[1.65] text-ink/90">
          {blocks.map((b, i) => {
            if (b.startsWith('## ')) return <h2 key={i} className="pt-3 text-[19px] font-semibold text-ink">{b.slice(3)}</h2>
            const lines = b.split('\n')
            if (lines.every((l) => l.startsWith('- ')))
              return (
                <ul key={i} className="space-y-2 pl-1">
                  {lines.map((l, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-muted" />
                      <span>{l.slice(2)}</span>
                    </li>
                  ))}
                </ul>
              )
            return <p key={i}>{b}</p>
          })}
        </div>
      </article>
    </Screen>
  )
}
