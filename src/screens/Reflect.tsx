import { useState } from 'react'
import { saveReflection } from '../app/actions'
import { useData } from '../app/data'
import { useNav } from '../app/nav'
import { NEEDS, REFLECTION } from '../content/needs'
import type { Reflection, ReflectionKey } from '../db/types'
import { reflectionTrends } from '../metrics/wellbeing'
import { Button, Chip, Label, Screen } from '../ui/kit'

/**
 * A short reflection every few days: confidence, self-forgiveness, motivation,
 * connection, stress, and what there's been a need for. Every question is
 * optional; one answer is enough to save.
 */
export function Reflect({ onClose }: { onClose: () => void }) {
  const data = useData()
  const nav = useNav()
  const [scores, setScores] = useState<Partial<Record<ReflectionKey, number>>>({})
  const [needs, setNeeds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState<Reflection | null>(null)
  const answered = Object.keys(scores).length > 0 || needs.length > 0 || note.trim().length > 0

  if (saved) {
    const trends = reflectionTrends([...data.reflections, saved])
    const lowCompassion = (saved.compassion ?? 5) <= 2
    const lowMotivation = (saved.motivation ?? 5) <= 2
    const lowConfidence = (saved.confidence ?? 5) <= 2
    return (
      <Screen title="Reflection" onClose={onClose}>
        <div className="pt-4">
          <Label>Saved</Label>
          <p className="mt-3 text-[22px] font-semibold leading-snug">Thanks. Knowing how you are is as useful as knowing what happened.</p>
          {trends.some((t) => t.earlier !== null) && (
            <ul className="mt-5 space-y-2">
              {trends
                .filter((t) => t.earlier !== null)
                .map((t) => (
                  <li key={t.key} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
                    <span>{t.label}</span>
                    <span className={`tabular-nums ${t.better === true ? 'text-good-ink' : 'text-muted'}`}>
                      {t.earlier!.toFixed(1)} → {t.recent.toFixed(1)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          {lowCompassion && (
            <p className="mt-5 rounded-2xl border border-line p-4 leading-relaxed">
              You're being hard on yourself. That's common, and it tends to make the next slip more likely, not less. Try talking to yourself the way you'd talk
              to a friend in the same spot.
            </p>
          )}
          {lowMotivation && !lowCompassion && (
            <p className="mt-5 rounded-2xl border border-line p-4 leading-relaxed">
              Motivation rises and falls; that's normal and doesn't decide the outcome. On low days, lean on the plans you wrote when it was high.
            </p>
          )}
          {lowConfidence && !lowCompassion && !lowMotivation && (
            <p className="mt-5 rounded-2xl border border-line p-4 leading-relaxed">
              Confidence grows from evidence. Every urge you ride out is some. Your count is on Today.
            </p>
          )}
          {needs.length > 0 && (
            <Button className="mt-5 w-full" onClick={() => nav.setTab('plans')}>
              See ways to meet what you need
            </Button>
          )}
          <Button variant="primary" className="mt-3 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      title="How are things?"
      onClose={onClose}
      footer={
        <Button
          variant="primary"
          className="w-full"
          disabled={!answered}
          onClick={async () => setSaved(await saveReflection({ date: data.today, ...scores, needs: needs.length ? needs : undefined, note }))}
        >
          Save
        </Button>
      }
    >
      <p className="pt-2 text-[14px] leading-relaxed text-muted">About 30 seconds, every few days. Answer what you like; skip the rest.</p>
      {REFLECTION.map((q) => (
        <section key={q.key} className="mt-6">
          <p className="font-medium leading-snug">{q.question}</p>
          <div className="mt-2.5 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={q.label}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={scores[q.key] === v}
                onClick={() => setScores((s) => ({ ...s, [q.key]: s[q.key] === v ? undefined : v }))}
                className={`min-h-11 rounded-xl text-[16px] tabular-nums ${scores[q.key] === v ? 'bg-ink font-semibold text-bg' : 'border border-line bg-surface'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[12px] text-muted">
            <span>{q.low}</span>
            <span>{q.high}</span>
          </div>
        </section>
      ))}

      <section className="mt-7">
        <p className="font-medium leading-snug">What have you needed more of lately?</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <Chip key={n.id} tone="neutral" selected={needs.includes(n.id)} onClick={() => setNeeds((x) => (x.includes(n.id) ? x.filter((y) => y !== n.id) : [...x, n.id]))}>
              {n.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-7 pb-4">
        <p className="font-medium leading-snug">What's going on? (optional)</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="A line or two"
          className="mt-2.5 w-full rounded-2xl border border-line bg-surface p-4 placeholder:text-muted"
        />
      </section>
    </Screen>
  )
}
