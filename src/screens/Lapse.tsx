import { useEffect } from 'react'
import { useData } from '../app/data'
import { db } from '../db/db'
import { saveMeta } from '../db/seed'
import type { LocalDate } from '../db/types'
import { Button, Label, Screen } from '../ui/kit'

/**
 * The plan written on a good day for the day after a setback. Shown before
 * anything else once a setback is logged.
 */
export function LapseView({ setbackDate, onContinue }: { setbackDate?: LocalDate; onContinue: () => void }) {
  const { lapsePlan, snapshot } = useData()

  useEffect(() => {
    if (setbackDate) void saveMeta(db, { lapseSeenFor: setbackDate })
  }, [setbackDate])

  const reported = snapshot.days.length
  return (
    <div className="pt-4">
      <Label>Your plan for this</Label>
      <p className="mt-3 text-[22px] font-semibold leading-snug">You wrote this on a good day, for exactly now.</p>
      <ol className="mt-6 space-y-3">
        {lapsePlan.steps.map((step, i) => (
          <li key={i} className="flex gap-4 rounded-2xl bg-surface p-4">
            <span className="text-muted tabular-nums">{i + 1}</span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 leading-relaxed text-muted">
        One day is one data point among {reported}. What happens in the next 48 hours matters more than what happened today.
      </p>
      <Button variant="primary" className="mt-6 w-full" onClick={onContinue}>
        Continue
      </Button>
    </div>
  )
}

export function LapseScreen({ onClose }: { onClose: () => void }) {
  return (
    <Screen title="Day after" onClose={onClose}>
      <LapseView onContinue={onClose} />
    </Screen>
  )
}
