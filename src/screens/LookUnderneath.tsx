import { useState } from 'react'
import { addStep, updateUrge } from '../app/actions'
import { useData } from '../app/data'
import { NEEDS, PROMISES, needById } from '../content/needs'
import { Chip, Label } from '../ui/kit'

/**
 * After logging an urge: what did it promise, what was actually needed, and
 * one small step toward that need. All optional.
 */
export function LookUnderneath({ urgeId }: { urgeId: string }) {
  const { needMap } = useData()
  const [open, setOpen] = useState(false)
  const [promise, setPromise] = useState<string[]>([])
  const [needs, setNeeds] = useState<string[]>([])
  const [done, setDone] = useState<string | null>(null)

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const need = needs[0] ? needById(needs[0]) : undefined
  const ways = need ? (needMap[need.id]?.length ? needMap[need.id]! : need.ways) : []

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-6 w-full rounded-2xl border border-line bg-surface p-4 text-left">
        <Label>Look underneath</Label>
        <span className="mt-2 block leading-snug">What was the urge promising, and what do you actually need right now?</span>
        <span className="mt-1 block text-[13px] text-muted">Optional, about 15 seconds. Over time it shows what the urges are really about.</span>
      </button>
    )

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <p className="font-medium">What was it promising?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PROMISES.map((p) => (
          <Chip
            key={p.id}
            tone="neutral"
            selected={promise.includes(p.id)}
            onClick={() => {
              const next = toggle(promise, p.id)
              setPromise(next)
              void updateUrge(urgeId, { promise: next })
            }}
          >
            {p.label}
          </Chip>
        ))}
      </div>

      <p className="mt-5 font-medium">What do you actually need right now?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {NEEDS.map((n) => (
          <Chip
            key={n.id}
            tone="neutral"
            selected={needs.includes(n.id)}
            onClick={() => {
              const next = toggle(needs, n.id)
              setNeeds(next)
              setDone(null)
              void updateUrge(urgeId, { needs: next })
            }}
          >
            {n.label}
          </Chip>
        ))}
      </div>

      {need && (
        <div className="mt-5">
          <p className="font-medium">One small step toward {need.label.toLowerCase()}:</p>
          <ul className="mt-2 space-y-2">
            {ways.map((w) => (
              <li key={w}>
                <button
                  type="button"
                  disabled={done !== null}
                  onClick={async () => {
                    await addStep(need.id, w)
                    setDone(w)
                  }}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left ${done === w ? 'bg-good/15' : 'bg-surface-2'} disabled:opacity-100`}
                >
                  <span>{w}</span>
                  <span className="shrink-0 text-[13px] text-muted">{done === w ? 'logged' : "I'll do this"}</span>
                </button>
              </li>
            ))}
          </ul>
          {done && <p className="mt-3 text-[14px] leading-relaxed text-good-ink">That's a step toward what you actually need. It counts, whatever the urge does.</p>}
          <p className="mt-3 text-[13px] text-muted">Your own ways for each need live in Plans.</p>
        </div>
      )}
    </section>
  )
}
