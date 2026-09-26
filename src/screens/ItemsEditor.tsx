import { useEffect, useState } from 'react'
import { addItem, deleteItem, itemIsUsed, moveItem, updateItem } from '../app/actions'
import { useData } from '../app/data'
import { db } from '../db/db'
import { saveMeta } from '../db/seed'
import { LAYERS, type Layer, type Target, type TrackedItem } from '../db/types'
import { IconDown, IconPlus, IconUp } from '../ui/icons'
import { Button, LayerTag, Screen } from '../ui/kit'

const HINT: Record<Layer, string> = {
  abstinence: 'Things you are not doing at all. Any one of them counts as a setback.',
  boundary: 'Conditions that raise risk. Logged as crossed or held.',
  selfcare: 'Things that protect you. Can carry a target.',
}

export function ItemsEditor({ onClose }: { onClose: () => void }) {
  const { items, meta } = useData()
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!meta.itemsReviewed) void saveMeta(db, { itemsReviewed: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen title="Tracked items" onClose={onClose} back>
      <p className="pt-2 text-[14px] leading-relaxed text-muted">
        Archiving hides an item from the check-in but keeps its history. Items that were never used can be deleted.
      </p>
      {LAYERS.map((layer) => {
        const list = items.filter((i) => i.layer === layer).sort((a, b) => a.sortOrder - b.sortOrder)
        const active = list.filter((i) => i.active)
        const archived = list.filter((i) => !i.active)
        return (
          <section key={layer} className="mt-8">
            <LayerTag layer={layer} />
            <p className="mt-1 text-[13px] text-muted">{HINT[layer]}</p>
            <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface">
              {active.map((i, idx) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  open={open === i.id}
                  onToggle={() => setOpen(open === i.id ? null : i.id)}
                  first={idx === 0}
                  last={idx === active.length - 1}
                  siblings={active}
                />
              ))}
              <AddRow layer={layer} />
            </ul>
            {archived.length > 0 && (
              <ul className="mt-2 space-y-1">
                {archived.map((i) => (
                  <li key={i.id} className="flex min-h-11 items-center justify-between px-4 text-muted">
                    <span className="line-through decoration-muted/50">{i.name}</span>
                    <button type="button" className="min-h-11 px-2 text-[14px] text-ink" onClick={() => updateItem(i.id, { active: true })}>
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      <div className="h-8" />
    </Screen>
  )
}

function ItemRow({
  item,
  open,
  onToggle,
  first,
  last,
  siblings,
}: {
  item: TrackedItem
  open: boolean
  onToggle: () => void
  first: boolean
  last: boolean
  siblings: TrackedItem[]
}) {
  const [name, setName] = useState(item.name)
  const [msg, setMsg] = useState<string | null>(null)
  const target = item.target

  const setTarget = (t: Target | undefined) => updateItem(item.id, { target: t })

  return (
    <li>
      <div className="flex items-center">
        <button type="button" onClick={onToggle} className="min-h-12 flex-1 px-4 text-left">
          {item.name}
          {target && (
            <span className="ml-2 text-[13px] text-muted">
              {target.type === 'count' ? `target ${target.value}` : `${target.value}× a week`}
            </span>
          )}
        </button>
        <button type="button" aria-label={`Move ${item.name} up`} disabled={first} onClick={() => moveItem(item, -1, siblings)} className="grid size-11 place-items-center text-muted disabled:opacity-20">
          <IconUp />
        </button>
        <button type="button" aria-label={`Move ${item.name} down`} disabled={last} onClick={() => moveItem(item, 1, siblings)} className="grid size-11 place-items-center text-muted disabled:opacity-20">
          <IconDown />
        </button>
      </div>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 flex-1 rounded-xl bg-bg px-3" aria-label="Name" />
            <Button disabled={!name.trim() || name.trim() === item.name} onClick={() => updateItem(item.id, { name: name.trim() })}>
              Rename
            </Button>
          </div>
          {item.layer === 'selfcare' && (
            <div>
              <div className="text-[13px] text-muted">Target</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {(['none', 'perWeek', 'count'] as const).map((t) => {
                  const selected = (target?.type ?? 'none') === t
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTarget(t === 'none' ? undefined : { type: t, value: target?.type === t ? target.value : t === 'perWeek' ? 3 : 5 })}
                      className={`min-h-10 rounded-full border px-3 text-[14px] ${selected ? 'border-ink/60 bg-ink/10' : 'border-line text-muted'}`}
                    >
                      {t === 'none' ? 'Done / not done' : t === 'perWeek' ? 'Days per week' : 'Daily number'}
                    </button>
                  )
                })}
              </div>
              {target && (
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" aria-label="Lower target" className="grid size-11 place-items-center rounded-full bg-bg" onClick={() => setTarget({ ...target, value: Math.max(1, target.value - 1) })}>
                    −
                  </button>
                  <span className="w-8 text-center font-semibold tabular-nums">{target.value}</span>
                  <button
                    type="button"
                    aria-label="Raise target"
                    className="grid size-11 place-items-center rounded-full bg-bg"
                    onClick={() => setTarget({ ...target, value: target.type === 'perWeek' ? Math.min(7, target.value + 1) : target.value + 1 })}
                  >
                    +
                  </button>
                  <span className="text-[13px] text-muted">{target.type === 'perWeek' ? 'days a week' : 'or more on the day (e.g. thousands of steps)'}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => updateItem(item.id, { active: false })}>
              Archive
            </Button>
            <Button
              variant="quiet"
              onClick={async () => {
                if (await itemIsUsed(item.id)) return setMsg('Already in your history, so it can only be archived.')
                if (confirm(`Delete "${item.name}"?`)) await deleteItem(item.id)
              }}
            >
              Delete
            </Button>
          </div>
          {msg && <p className="text-[13px] text-muted">{msg}</p>}
        </div>
      )}
    </li>
  )
}

function AddRow({ layer }: { layer: Layer }) {
  const [name, setName] = useState('')
  return (
    <li className="flex items-center gap-2 px-2 py-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add an item"
        className="min-h-11 flex-1 rounded-xl bg-transparent px-2 placeholder:text-muted"
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && name.trim()) {
            await addItem(layer, name)
            setName('')
          }
        }}
      />
      <button
        type="button"
        aria-label="Add"
        disabled={!name.trim()}
        onClick={async () => {
          await addItem(layer, name)
          setName('')
        }}
        className="grid size-11 place-items-center rounded-full bg-surface-2 disabled:opacity-30"
      >
        <IconPlus className="size-5" />
      </button>
    </li>
  )
}
