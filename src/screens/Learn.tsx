import { useEffect, useState } from 'react'
import { markLessonRead } from '../app/actions'
import { useData } from '../app/data'
import { useNav } from '../app/nav'
import { LESSONS, lessonById, readingMinutes } from '../content/lessons'
import { LIBRARY, sourceById, type Source } from '../content/sources'
import { suggestLesson } from '../content/triggers'
import { IconChevron } from '../ui/icons'
import { Label, Screen, Segmented } from '../ui/kit'

const GROUPS: { title: string; ids: string[] }[] = [
  { title: 'Your brain', ids: ['dopamine', 'wanting-liking', 'extinction'] },
  { title: 'What you really need', ids: ['needs', 'confidence'] },
  { title: 'Urges', ids: ['urge-surfing', 'urge-anatomy', 'if-then'] },
  { title: 'Habits and environment', ids: ['habits', 'replacement', 'environment', 'phone-in-bed'] },
  { title: 'Upstream conditions', ids: ['sleep', 'halt', 'loneliness'] },
  { title: 'Setbacks', ids: ['ave', 'day-after', 'relapse-data', 'rates', 'shame'] },
  { title: 'Understanding it', ids: ['csbd', 'compulsions', 'reading-data'] },
]

export function Learn() {
  const data = useData()
  const nav = useNav()
  const [tab, setTab] = useState<'lessons' | 'reading'>('lessons')
  const suggestion = suggestLesson({ s: data.snapshot, plans: data.plans, settings: data.settings, meta: data.meta, dateOf: data.dateOf, reflections: data.reflections })
  const grouped = new Set(GROUPS.flatMap((g) => g.ids))
  const groups = [...GROUPS, { title: 'More', ids: LESSONS.filter((l) => !grouped.has(l.id)).map((l) => l.id) }].filter((g) => g.ids.length)

  return (
    <div className="px-4 pb-6">
      <h1 className="pt-3 text-[28px] font-semibold tracking-tight">Learn</h1>
      <Segmented
        className="mt-3"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'lessons', label: `Lessons (${LESSONS.length})` },
          { value: 'reading', label: 'Further reading' },
        ]}
      />

      {tab === 'lessons' && (
        <>
          <p className="mt-4 leading-relaxed text-muted">Short reads, 2 to 4 minutes. Any order. Each ends with the research behind it.</p>
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
          {groups.map((g) => (
            <section key={g.title} className="mt-7">
              <Label>{g.title}</Label>
              <ul className="mt-1 divide-y divide-line">
                {g.ids.map((id) => {
                  const l = lessonById(id)
                  if (!l) return null
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
            </section>
          ))}
        </>
      )}

      {tab === 'reading' && (
        <>
          <p className="mt-4 leading-relaxed text-muted">
            Papers, books and talks behind the lessons. Every link was checked when added. Links open in your browser; papers marked "free" have a free full
            text.
          </p>
          {LIBRARY.map((g) => (
            <section key={g.title} className="mt-7">
              <Label>{g.title}</Label>
              <ul className="mt-3 space-y-2">
                {g.ids.map((id) => {
                  const src = sourceById(id)
                  return src ? (
                    <li key={id}>
                      <SourceCard s={src} />
                    </li>
                  ) : null
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}

const KIND_LABEL: Record<Source['kind'], string> = { paper: 'study', review: 'review', book: 'book', talk: 'talk', podcast: 'podcast', guide: 'guide' }

export function SourceCard({ s }: { s: Source }) {
  const free = Boolean(s.freeUrl) || s.kind === 'guide' || s.kind === 'talk' || s.kind === 'podcast'
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <span className="rounded-full border border-line px-2 py-0.5">{KIND_LABEL[s.kind]}</span>
        {free && <span className="rounded-full border border-good/60 px-2 py-0.5 text-ink/90">free</span>}
      </div>
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-[16px] font-medium leading-snug underline decoration-line underline-offset-4">
        {s.title}
      </a>
      <p className="mt-1 text-[13px] text-muted">
        {[s.authors, s.year, s.venue].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-2 text-[14px] leading-snug text-ink/85">{s.note}</p>
      {s.freeUrl && (
        <a href={s.freeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-[14px] underline underline-offset-4">
          Read the free full text
        </a>
      )}
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
        {lesson.sources && lesson.sources.length > 0 && (
          <section className="mt-10 border-t border-line pt-6">
            <Label>Go deeper</Label>
            <ul className="mt-3 space-y-2">
              {lesson.sources.map((id) => {
                const src = sourceById(id)
                return src ? (
                  <li key={id}>
                    <SourceCard s={src} />
                  </li>
                ) : null
              })}
            </ul>
          </section>
        )}
      </article>
    </Screen>
  )
}
