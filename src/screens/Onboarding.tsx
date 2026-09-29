import { useState } from 'react'
import { addItems } from '../app/actions'
import { suggestionsFor, TOPICS } from '../content/suggestions'
import { db } from '../db/db'
import { saveMeta } from '../db/seed'
import type { Layer } from '../db/types'
import { Button, Chip, LayerTag } from '../ui/kit'

interface Picked {
  id?: string
  layer: Layer
  name: string
  target?: { type: 'count' | 'perWeek'; value: number }
}

const STEPS: { layer: Layer; title: string; body: string; min: number }[] = [
  {
    layer: 'abstinence',
    title: 'What are you stepping away from?',
    body: 'The behaviours you want to stop. Each check-in asks whether any of them happened. Pick at least one.',
    min: 1,
  },
  {
    layer: 'boundary',
    title: 'What makes it harder?',
    body: 'Conditions that tend to come before a slip. The app learns which ones matter for you. Pick a few; you can change them any time.',
    min: 0,
  },
  {
    layer: 'selfcare',
    title: 'What helps you?',
    body: 'Things that protect you when you do them. They’re part of the daily check-in too.',
    min: 0,
  },
]

/**
 * First run. Nothing is tracked by default: people pick from suggestions or
 * write their own, so the app fits what they're actually working on.
 */
export function Onboarding() {
  const [step, setStep] = useState(-1)
  const [topics, setTopics] = useState<string[]>([])
  const [picked, setPicked] = useState<Picked[]>([])
  const [custom, setCustom] = useState('')

  const finish = async (save: boolean) => {
    if (save && picked.length) await addItems(picked)
    await saveMeta(db, { onboarded: true, itemsReviewed: save && picked.length > 0 })
  }

  if (step === -1)
    return (
      <Shell>
        <p className="text-[15px] text-muted">Welcome</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight">A private place to track what you're changing.</h1>
        <p className="mt-4 leading-relaxed text-ink/85">
          Everything stays on this phone. No account, no server, nothing sent anywhere. Setup takes about a minute, and you can change everything later.
        </p>
        <p className="mt-8 font-medium">What are you working on?</p>
        <p className="mt-1 text-[14px] text-muted">Optional. Only used to put the most relevant suggestions first.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <Chip
              key={t.id}
              tone="neutral"
              selected={topics.includes(t.id)}
              onClick={() => setTopics((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))}
            >
              {t.label}
            </Chip>
          ))}
        </div>
        <Footer>
          <Button variant="primary" className="flex-1" onClick={() => setStep(0)}>
            Start
          </Button>
        </Footer>
      </Shell>
    )

  if (step >= STEPS.length)
    return (
      <Shell>
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight">You're set.</h1>
        <p className="mt-4 leading-relaxed text-ink/85">
          Check in once a day; it takes about 20 seconds. When an urge shows up, log it, even if you resist it. Resisted urges are the most useful thing you can
          record.
        </p>
        <p className="mt-4 leading-relaxed text-muted">Your lists live in Settings → Tracked items. Add, rename or archive anything, whenever you like.</p>
        <Footer>
          <Button variant="primary" className="flex-1" onClick={() => finish(true)}>
            Open the app
          </Button>
        </Footer>
      </Shell>
    )

  const s = STEPS[step]!
  const mine = picked.filter((p) => p.layer === s.layer)
  const exclude = new Set(picked.map((p) => p.id).filter((x): x is string => Boolean(x)))
  const suggestions = suggestionsFor(s.layer, topics, new Set())
  const toggle = (sug: { id: string; name: string; target?: Picked['target'] }) =>
    setPicked((list) => (exclude.has(sug.id) ? list.filter((p) => p.id !== sug.id) : [...list, { id: sug.id, layer: s.layer, name: sug.name, target: sug.target }]))
  const addCustom = () => {
    const name = custom.trim()
    if (!name) return
    setPicked((list) => [...list, { layer: s.layer, name }])
    setCustom('')
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <LayerTag layer={s.layer} />
        <span className="text-[13px] text-muted">
          {step + 1} of {STEPS.length}
        </span>
      </div>
      <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight">{s.title}</h1>
      <p className="mt-2 leading-relaxed text-muted">{s.body}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestions.map((sug) => (
          <Chip key={sug.id} tone={s.layer} selected={exclude.has(sug.id)} onClick={() => toggle(sug)}>
            {sug.name}
          </Chip>
        ))}
        {mine
          .filter((p) => !p.id)
          .map((p, i) => (
            <Chip key={`c${i}`} tone={s.layer} selected onClick={() => setPicked((list) => list.filter((x) => x !== p))}>
              {p.name}
            </Chip>
          ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Add your own"
          className="min-h-12 flex-1 rounded-2xl border border-line bg-surface px-4 placeholder:text-muted"
        />
        <Button onClick={addCustom} disabled={!custom.trim()}>
          Add
        </Button>
      </div>

      <Footer>
        <Button variant="ghost" onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <Button variant="primary" className="flex-1" disabled={mine.length < s.min} onClick={() => setStep(step + 1)}>
          {mine.length ? `Continue with ${mine.length}` : s.min ? 'Pick at least one' : 'Skip for now'}
        </Button>
      </Footer>
      {step === 0 && (
        <button type="button" onClick={() => finish(false)} className="mt-2 min-h-11 w-full text-[14px] text-muted">
          Set up later
        </button>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-safe px-safe mx-auto flex min-h-dvh max-w-lg flex-col bg-bg pb-6">
      <div className="flex flex-1 flex-col px-5 pt-8">{children}</div>
    </div>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="pb-safe mt-auto flex gap-2 pt-8">{children}</div>
}
