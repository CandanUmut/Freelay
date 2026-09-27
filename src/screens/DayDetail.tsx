import { useData } from '../app/data'
import { useNav } from '../app/nav'
import { LAYERS, type LocalDate } from '../db/types'
import { dayOutcome, isHeld } from '../metrics/metrics'
import { Button, Label, LayerTag, Screen, formatDate, formatTime } from '../ui/kit'

const MOODS = ['', 'Low', 'Flat', 'Okay', 'Good', 'Great']

export function DayDetail({ date, onClose }: { date: LocalDate; onClose: () => void }) {
  const data = useData()
  const nav = useNav()
  const day = data.dayByDate.get(date)
  const absIds = data.items.filter((i) => i.layer === 'abstinence').map((i) => i.id)
  const outcome = dayOutcome(day, absIds)
  const urges = data.urges.filter((u) => data.dateOf(u) === date)
  const future = date > data.today

  return (
    <Screen
      title={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
      onClose={onClose}
      back
      footer={
        !future && (
          <Button variant="primary" className="w-full" onClick={() => nav.replace({ kind: 'checkin', date })}>
            {day ? 'Edit this day' : 'Fill in this day'}
          </Button>
        )
      }
    >
      <div className="pt-3">
        {!day && <p className="py-6 leading-relaxed text-muted">{future ? 'This day is still ahead.' : 'Not recorded. Filling it in now is fine; it will be marked as backfilled for your own reference.'}</p>}

        {day && (
          <>
            <p className="text-[22px] font-semibold">
              {outcome === 'clean' ? 'Clean day' : outcome === 'setback' ? 'Setback' : 'Abstinence not answered'}
            </p>
            <p className="mt-1 text-[14px] text-muted">
              {day.mood ? `Mood: ${MOODS[day.mood]} · ` : ''}
              {day.backfilled ? 'backfilled' : `logged ${formatTime(day.loggedAt)}`}
            </p>
            {day.note && <p className="mt-4 rounded-2xl bg-surface p-4 leading-relaxed">{day.note}</p>}

            {LAYERS.map((layer) => {
              const items = data.items.filter((i) => i.layer === layer && (i.active || day.entries[i.id] !== undefined))
              if (!items.length) return null
              return (
                <section key={layer} className="mt-6">
                  <LayerTag layer={layer} />
                  <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface">
                    {items.map((i) => {
                      const v = day.entries[i.id]
                      const held = isHeld(i, v)
                      const text =
                        v === undefined
                          ? 'not answered'
                          : typeof v === 'number'
                            ? `${v} of ${i.target?.value ?? 1}`
                            : layer === 'abstinence'
                              ? v
                                ? 'yes'
                                : 'no'
                              : layer === 'boundary'
                                ? v
                                  ? 'crossed'
                                  : 'held'
                                : v
                                  ? 'done'
                                  : 'not done'
                      return (
                        <li key={i.id} className="flex min-h-12 items-center justify-between px-4 py-2">
                          <span className={i.active ? '' : 'text-muted'}>{i.name}</span>
                          <span className={held === undefined ? 'text-muted' : held ? 'text-ink' : 'text-muted'}>{text}</span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </>
        )}

        {urges.length > 0 && (
          <section className="mt-6">
            <Label>Urges</Label>
            <ul className="mt-2 space-y-2">
              {urges.map((u) => (
                <li key={u.id} className="rounded-2xl bg-surface p-4">
                  <div className="flex justify-between">
                    <span>
                      {formatTime(u.at)} · intensity {u.intensity}
                    </span>
                    <span className="text-muted">{u.outcome === 'resisted' ? 'resisted' : 'acted on'}</span>
                  </div>
                  <div className="mt-1 text-[14px] text-muted">
                    {[...u.triggerItemIds.map((t) => data.itemById.get(t)?.name), u.triggerText, u.context, u.durationMin && `${u.durationMin} min`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {u.note && <p className="mt-2">{u.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Screen>
  )
}
