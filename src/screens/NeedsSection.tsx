import { useState } from 'react'
import { addStep, saveNeedWays } from '../app/actions'
import { useData } from '../app/data'
import { NEEDS } from '../content/needs'
import { needSummary, stepSummary } from '../metrics/wellbeing'
import { IconPlus } from '../ui/icons'
import { Button, Label, plural } from '../ui/kit'

/**
 * What the urges are really about, and the person's own ways of meeting
 * those needs. Tapping a way logs a step.
 */
export function NeedsSection() {
  const { urges, reflections, steps, needMap, dateOf, today } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [justLogged, setJustLogged] = useState<string | null>(null)

  const summary = needSummary(urges, reflections, dateOf, today)
  const counts = new Map(summary.needs.map((n) => [n.id, n.n]))
  const ordered = [...NEEDS].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
  const week = stepSummary(steps, today)

  return (
    <section className="mt-10">
      <Label>What you really need</Label>
      <p className="mt-1 text-[14px] leading-relaxed text-muted">
        An urge promises something: relief, escape, closeness. Usually there's a real need underneath that it meets badly. Name it when you log an urge; meet it
        here in ways that actually work.
      </p>
      <p className="mt-3 text-[15px]">
        <span className="font-semibold tabular-nums">{week.total}</span> {week.total === 1 ? 'step' : 'steps'} toward your needs this week
        {summary.promises[0] && <span className="text-muted"> · urges mostly promised {summary.promises[0].label.toLowerCase()}</span>}
      </p>

      <ul className="mt-3 space-y-2">
        {ordered.map((n) => {
          const ways = needMap[n.id]?.length ? needMap[n.id]! : n.ways
          const count = counts.get(n.id) ?? 0
          const isOpen = open === n.id
          return (
            <li key={n.id} className="rounded-2xl bg-surface">
              <button type="button" onClick={() => setOpen(isOpen ? null : n.id)} className="flex min-h-14 w-full items-center justify-between px-4 text-left">
                <span className="font-medium">{n.label}</span>
                <span className="text-[13px] text-muted">{count ? `came up ${plural(count, 'time')}` : ''}</span>
              </button>
              {isOpen && editing !== n.id && (
                <div className="px-4 pb-4">
                  <ul className="space-y-2">
                    {ways.map((w) => (
                      <li key={w}>
                        <button
                          type="button"
                          onClick={async () => {
                            await addStep(n.id, w)
                            setJustLogged(`${n.id}:${w}`)
                          }}
                          className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left ${justLogged === `${n.id}:${w}` ? 'bg-good/15' : 'bg-surface-2'}`}
                        >
                          <span>{w}</span>
                          <span className="shrink-0 text-[13px] text-muted">{justLogged === `${n.id}:${w}` ? 'logged' : 'did this'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-2 min-h-11 text-[14px] text-muted underline underline-offset-4"
                    onClick={() => {
                      setEditing(n.id)
                      setDraft(ways)
                    }}
                  >
                    Edit my ways
                  </button>
                </div>
              )}
              {isOpen && editing === n.id && (
                <div className="px-4 pb-4">
                  <ul className="space-y-2">
                    {draft.map((w, i) => (
                      <li key={i}>
                        <input
                          value={w}
                          onChange={(e) => setDraft(draft.map((x, j) => (j === i ? e.target.value : x)))}
                          className="min-h-11 w-full rounded-xl border border-line bg-bg px-3"
                          aria-label={`Way ${i + 1}`}
                        />
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1 text-[14px]" onClick={() => setDraft([...draft, ''])}>
                    <IconPlus className="size-4" /> Add a way
                  </button>
                  <p className="text-[12px] text-muted">Clear a line to remove it.</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={async () => {
                        await saveNeedWays(n.id, draft, needMap)
                        setEditing(null)
                      }}
                    >
                      Save
                    </Button>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
