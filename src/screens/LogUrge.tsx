import { useState } from 'react'
import { addUrge, markSetback, recordPlanUse, updateUrge } from '../app/actions'
import { useData } from '../app/data'
import { useNav } from '../app/nav'
import type { Plan, Urge } from '../db/types'
import { localDateOf } from '../lib/dates'
import { Button, Chip, Label, plural } from '../ui/kit'
import { LapseView } from './Lapse'
import { LookUnderneath } from './LookUnderneath'

const PLACES = ['Bed', 'Home', 'Work', 'Out', 'Commute'] as const

interface Saved {
  urge: Urge
  resistedTotal: number
  avgIntensity: number | null
  plans: Plan[]
}

/**
 * Built to be used while the urge is active: three taps minimum
 * (intensity, outcome, save), everything else optional.
 */
export function LogUrge() {
  const data = useData()
  const nav = useNav()
  const bounds = data.active.filter((i) => i.layer === 'boundary')
  const abst = data.active.filter((i) => i.layer === 'abstinence')

  const [intensity, setIntensity] = useState<number | null>(null)
  const [triggers, setTriggers] = useState<Set<string>>(new Set())
  const [otherOpen, setOtherOpen] = useState(false)
  const [triggerText, setTriggerText] = useState('')
  const [place, setPlace] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Urge['outcome'] | null>(null)
  const [actedOn, setActedOn] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState<Saved | null>(null)
  const [phase, setPhase] = useState<'form' | 'lapse' | 'result'>('form')

  const valid = intensity !== null && outcome !== null && (outcome === 'resisted' || actedOn !== null || abst.length === 0)

  function reset() {
    setIntensity(null)
    setTriggers(new Set())
    setOtherOpen(false)
    setTriggerText('')
    setPlace(null)
    setOutcome(null)
    setActedOn(null)
    setNote('')
    setSaved(null)
    setPhase('form')
    window.scrollTo(0, 0)
  }

  async function save() {
    if (!valid) return
    const at = new Date().toISOString()
    const u: Omit<Urge, 'id'> = {
      at,
      intensity: intensity!,
      triggerItemIds: [...triggers],
      triggerText: triggerText.trim() || undefined,
      context: place ?? undefined,
      outcome: outcome!,
      note: note.trim() || undefined,
    }
    // Stats are computed against history before this urge, then include it.
    const prior = data.urges
    const id = await addUrge(u)
    const date = localDateOf(new Date(at), data.settings.dayBoundaryHour)
    if (outcome === 'acted' && actedOn) await markSetback(date, data.today, actedOn)
    const matching = data.plans.filter((p) => p.active && p.triggerItemIds.some((t) => triggers.has(t)))
    setSaved({
      urge: { ...u, id },
      resistedTotal: prior.filter((x) => x.outcome === 'resisted').length + (outcome === 'resisted' ? 1 : 0),
      avgIntensity: prior.length ? prior.reduce((a, x) => a + x.intensity, 0) / prior.length : null,
      plans: matching.length ? matching : [],
    })
    setPhase(outcome === 'acted' ? 'lapse' : 'result')
    window.scrollTo(0, 0)
  }

  if (phase === 'lapse' && saved)
    return (
      <div className="px-4 pb-6">
        <LapseView setbackDate={localDateOf(new Date(saved.urge.at), data.settings.dayBoundaryHour)} onContinue={() => setPhase('result')} />
      </div>
    )

  if (phase === 'result' && saved) return <UrgeResult saved={saved} onPanic={() => nav.push({ kind: 'panic', urgeId: saved.urge.id })} onDone={reset} />

  const toggleTrigger = (id: string) =>
    setTriggers((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="px-4 pb-6">
      <header className="flex items-baseline justify-between pt-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Log an urge</h1>
        <span className="text-muted tabular-nums">{new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
      </header>

      <section className="mt-5">
        <Label>How strong, right now?</Label>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={intensity === n}
              onClick={() => setIntensity(n)}
              className={`min-h-12 rounded-xl text-lg tabular-nums ${intensity === n ? 'bg-ink font-semibold text-bg' : 'bg-surface'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Label>What set it off?</Label>
        {bounds.length === 0 && (
          <p className="mt-2 text-[14px] text-muted">
            Add boundaries in Settings → Tracked items to tag triggers with one tap. For now, describe it under "Something else".
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {bounds.map((i) => (
            <Chip key={i.id} tone="boundary" selected={triggers.has(i.id)} onClick={() => toggleTrigger(i.id)}>
              {i.name}
            </Chip>
          ))}
          <Chip tone="neutral" selected={otherOpen} onClick={() => setOtherOpen((v) => !v)}>
            Something else
          </Chip>
        </div>
        {otherOpen && (
          <input
            value={triggerText}
            onChange={(e) => setTriggerText(e.target.value)}
            placeholder="What was it?"
            className="mt-3 min-h-12 w-full rounded-2xl bg-surface px-4 placeholder:text-muted"
          />
        )}
      </section>

      <section className="mt-6">
        <Label>Where</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLACES.map((p) => (
            <Chip key={p} tone="neutral" selected={place === p} onClick={() => setPlace(place === p ? null : p)}>
              {p}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Label>Outcome</Label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={outcome === 'resisted'}
            onClick={() => setOutcome('resisted')}
            className={`min-h-16 rounded-2xl border text-[17px] ${outcome === 'resisted' ? 'border-good bg-good font-semibold text-white' : 'border-line bg-surface'}`}
          >
            Resisted
          </button>
          <button
            type="button"
            aria-pressed={outcome === 'acted'}
            onClick={() => setOutcome('acted')}
            className={`min-h-16 rounded-2xl border text-[17px] ${outcome === 'acted' ? 'border-ink bg-ink font-semibold text-bg' : 'border-line bg-surface'}`}
          >
            Acted on it
          </button>
        </div>
        {outcome === 'acted' && abst.length > 0 && (
          <div className="mt-3">
            <p className="text-[14px] text-muted">Which one? This records today as a setback.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {abst.map((i) => (
                <Chip key={i.id} tone="neutral" selected={actedOn === i.id} onClick={() => setActedOn(i.id)}>
                  {i.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </section>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="One line, if you want"
        className="mt-6 min-h-12 w-full rounded-2xl bg-surface px-4 placeholder:text-muted"
      />

      <Button variant="primary" className="mt-6 w-full" disabled={!valid} onClick={save}>
        Save
      </Button>
      <button type="button" onClick={() => nav.push({ kind: 'panic' })} className="mt-2 min-h-12 w-full text-muted">
        Skip logging, just ride it out
      </button>
    </div>
  )
}

function UrgeResult({ saved, onPanic, onDone }: { saved: Saved; onPanic: () => void; onDone: () => void }) {
  const { itemById } = useData()
  const [used, setUsed] = useState<Set<string>>(new Set())
  const { urge } = saved
  const resisted = urge.outcome === 'resisted'
  const cmp =
    saved.avgIntensity === null
      ? null
      : urge.intensity > saved.avgIntensity + 0.5
        ? 'stronger than your average'
        : urge.intensity < saved.avgIntensity - 0.5
          ? 'weaker than your average'
          : 'about your average'

  return (
    <div className="px-4 pb-6 pt-4">
      {resisted ? (
        <>
          <Label className="text-good-ink">Resisted</Label>
          <p className="mt-3 text-[28px] font-semibold leading-tight">That counts. It's the most useful thing you can record.</p>
          <p className="mt-4 text-lg">
            <span className="font-semibold tabular-nums">{saved.resistedTotal}</span> {saved.resistedTotal === 1 ? 'urge' : 'urges'} resisted in total.
          </p>
        </>
      ) : (
        <>
          <Label>Logged</Label>
          <p className="mt-3 text-[26px] font-semibold leading-tight">Recorded honestly. That's what makes the rest of the data worth anything.</p>
          <p className="mt-4 text-muted">You've resisted {plural(saved.resistedTotal, 'urge')} so far. Those still count.</p>
        </>
      )}
      {!resisted && <EnjoyedRating urgeId={urge.id} wanted={urge.intensity} />}
      <p className="mt-2 text-muted">
        Intensity {urge.intensity}
        {cmp && saved.avgIntensity !== null && `, ${cmp} (${saved.avgIntensity.toFixed(1)})`}.
      </p>

      <LookUnderneath urgeId={urge.id} />

      {saved.plans.length > 0 && (
        <section className="mt-6">
          <Label>Your plan for this</Label>
          <div className="mt-3 space-y-2">
            {saved.plans.map((p) => (
              <div key={p.id} className="rounded-2xl bg-surface p-4">
                <p className="leading-relaxed">
                  <span className="text-muted">If</span> {p.ifText}, <span className="text-muted">then</span> <span className="font-semibold">{p.thenText}</span>.
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[13px] text-muted">
                    {p.triggerItemIds.map((t) => itemById.get(t)?.name).filter(Boolean).join(', ')}
                  </span>
                  <button
                    type="button"
                    disabled={used.has(p.id)}
                    onClick={() => {
                      void recordPlanUse(p.id)
                      setUsed((s) => new Set(s).add(p.id))
                    }}
                    className="min-h-11 rounded-xl bg-surface-2 px-4 text-[14px] disabled:opacity-50"
                  >
                    {used.has(p.id) ? 'Noted' : 'Using it'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {saved.plans.length === 0 && urge.triggerItemIds.length > 0 && (
        <p className="mt-6 rounded-2xl border border-line p-4 leading-relaxed text-muted">
          No if-then plan for {urge.triggerItemIds.map((t) => itemById.get(t)?.name.toLowerCase()).join(' or ')} yet. You can write one in Plans when things are calm.
        </p>
      )}

      {resisted && (
        <div className="mt-6 rounded-2xl bg-surface p-4">
          <p className="leading-relaxed">Still feeling it? Time the wave and watch it pass.</p>
          <Button className="mt-3 w-full" onClick={onPanic}>
            Ride it out
          </Button>
        </div>
      )}

      <Button variant="primary" className="mt-6 w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

/** Optional, after acting on an urge: how much was it actually enjoyed? Feeds the wanting-vs-liking fact. */
function EnjoyedRating({ urgeId, wanted }: { urgeId: string; wanted: number }) {
  const [value, setValue] = useState<number | null>(null)
  return (
    <section className="mt-6 rounded-2xl bg-surface p-4">
      <p className="leading-snug">It felt like {wanted === 8 ? "an" : "a"} {wanted} beforehand. How much did you actually enjoy it?</p>
      <p className="mt-1 text-[13px] text-muted">Optional. Over time this shows the gap between wanting and liking.</p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => {
              setValue(n)
              void updateUrge(urgeId, { enjoyed: n })
            }}
            className={`min-h-11 rounded-xl tabular-nums ${value === n ? 'bg-ink font-semibold text-bg' : 'bg-surface-2'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </section>
  )
}
