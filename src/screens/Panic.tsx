import { useEffect, useState } from 'react'
import { addUrge, updateUrge } from '../app/actions'
import { useData } from '../app/data'
import { IconClose } from '../ui/icons'
import { Button, Label } from '../ui/kit'

const CYCLE = 10 // seconds per breath, matching the .breathe animation
const GROUNDING = [
  'Stand up and leave the room you are in.',
  'Cold water on your face or wrists.',
  'Name five things you can see, out loud.',
  'Text or call someone. Anything, about anything.',
  'Put the phone in another room for ten minutes.',
]

/**
 * Urge surfing. A running timer, a breathing guide, and at the end the
 * duration set against the personal average: evidence that urges end.
 */
export function Panic({ urgeId, onClose }: { urgeId?: string; onClose: () => void }) {
  const data = useData()
  // Wall-clock start so the timer is right after the phone locks or the app is backgrounded.
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [struggling, setStruggling] = useState(false)
  const [phase, setPhase] = useState<'surf' | 'rate' | 'done'>('surf')
  const [result, setResult] = useState<{ minutes: number; avg: number | null; ridden: number } | null>(null)

  useEffect(() => {
    if (phase !== 'surf') return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [phase])

  const elapsed = Math.max(0, Math.floor((now - start) / 1000))
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const inCycle = elapsed % CYCLE
  const breath = inCycle < 4 ? 'Breathe in' : inCycle < 4.5 ? 'Hold' : 'Breathe out'
  const minutes = Math.max(1, Math.round((Date.now() - start) / 60000))

  async function finish(intensity?: number) {
    const timed = data.urges.filter((u) => u.durationMin !== undefined && u.id !== urgeId)
    const avg = timed.length ? timed.reduce((a, u) => a + u.durationMin!, 0) / timed.length : null
    if (urgeId) await updateUrge(urgeId, { durationMin: minutes })
    else
      await addUrge({
        at: new Date(start).toISOString(),
        intensity: intensity ?? 5,
        triggerItemIds: [],
        outcome: 'resisted',
        durationMin: minutes,
        context: undefined,
      })
    const ridden = data.urges.filter((u) => u.outcome === 'resisted').length + (urgeId ? 0 : 1)
    setResult({ minutes, avg, ridden })
    setPhase('done')
  }

  const plans = data.plans.filter((p) => p.active)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg" role="dialog" aria-label="Ride it out">
      <header className="pt-safe flex justify-end px-2">
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-12 place-items-center text-muted">
          <IconClose />
        </button>
      </header>

      <div className="scroll-area flex-1 overflow-y-auto px-6 pb-8">
        {phase === 'surf' && (
          <>
            <div className="mt-2 text-center text-[56px] font-light tabular-nums tracking-tight">
              {mm}:{ss}
            </div>
            <div className="relative mx-auto mt-6 grid size-56 place-items-center">
              <div className="breathe absolute inset-0 rounded-full bg-good/25" />
              <div className="breathe absolute inset-8 rounded-full bg-good/30" />
              <span className="relative text-[17px]" aria-live="polite">
                {breath}
              </span>
            </div>
            <p className="mx-auto mt-8 max-w-sm text-center leading-relaxed text-ink/85">
              This is a wave. It rises, peaks and passes, usually within 10 to 30 minutes, whether or not you act on it. Notice where you feel it in your body.
              You don't have to do anything except wait.
            </p>

            {struggling && (
              <section className="mt-8">
                <Label>Right now, one of these</Label>
                <ul className="mt-3 space-y-2">
                  {GROUNDING.map((g) => (
                    <li key={g} className="rounded-2xl bg-surface p-4 leading-snug">
                      {g}
                    </li>
                  ))}
                </ul>
                {plans.length > 0 && (
                  <>
                    <Label className="mt-6">Your plans</Label>
                    <ul className="mt-3 space-y-2">
                      {plans.map((p) => (
                        <li key={p.id} className="rounded-2xl border border-line p-4 leading-relaxed">
                          <span className="text-muted">If</span> {p.ifText}, <span className="text-muted">then</span> <span className="font-semibold">{p.thenText}</span>.
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-6 text-center text-muted">The timer keeps running. Stay with it.</p>
              </section>
            )}
          </>
        )}

        {phase === 'rate' && (
          <section className="mt-8">
            <p className="text-[22px] font-semibold">It passed after {minutes} {minutes === 1 ? 'minute' : 'minutes'}.</p>
            <p className="mt-2 text-muted">How strong was it at its peak?</p>
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => finish(n)} className="min-h-12 rounded-xl bg-surface text-lg tabular-nums">
                  {n}
                </button>
              ))}
            </div>
          </section>
        )}

        {phase === 'done' && result && (
          <section className="mt-10">
            <Label className="text-good-ink">It passed</Label>
            <p className="mt-4 text-[30px] font-semibold leading-tight">
              That one lasted {result.minutes} {result.minutes === 1 ? 'minute' : 'minutes'}.
            </p>
            <p className="mt-3 text-xl leading-snug">
              {result.avg !== null ? `Your average is ${Math.round(result.avg)}. ` : 'That is your first timed urge. '}
              You have ridden out {result.ridden} {result.ridden === 1 ? 'urge' : 'urges'}.
            </p>
            <p className="mt-6 leading-relaxed text-muted">Every one of these is evidence, from your own life, that urges end.</p>
            <Button variant="primary" className="mt-8 w-full" onClick={onClose}>
              Done
            </Button>
          </section>
        )}
      </div>

      {phase === 'surf' && (
        <footer className="pb-safe grid grid-cols-2 gap-2 border-t border-line px-4 pt-3">
          <Button variant="primary" onClick={() => (urgeId ? finish() : setPhase('rate'))}>
            It passed
          </Button>
          <Button variant="ghost" onClick={() => setStruggling(true)}>
            I'm struggling
          </Button>
        </footer>
      )}
    </div>
  )
}
