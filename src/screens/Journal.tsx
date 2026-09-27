import { useState } from 'react'
import { deleteJournal, saveJournal } from '../app/actions'
import { useData } from '../app/data'
import { Button, Empty, Label, Screen, formatTime } from '../ui/kit'

export function JournalScreen({ id: initialId, onClose }: { id?: string; onClose: () => void }) {
  const { journal } = useData()
  const [editing, setEditing] = useState<string | undefined>(initialId)
  const current = editing ? journal.find((j) => j.id === editing) : undefined
  const [text, setText] = useState(current?.text ?? '')

  function startEdit(id?: string) {
    setEditing(id)
    setText(id ? (journal.find((j) => j.id === id)?.text ?? '') : '')
  }

  async function save() {
    if (!text.trim()) return
    await saveJournal({ id: editing, text })
    startEdit(undefined)
  }

  return (
    <Screen title="Journal" onClose={onClose}>
      <section className="pt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="What's going on? Nobody else reads this."
          className="w-full rounded-2xl bg-surface p-4 leading-relaxed placeholder:text-muted"
          autoFocus={!initialId}
        />
        <div className="mt-2 flex gap-2">
          <Button variant="primary" className="flex-1" disabled={!text.trim()} onClick={save}>
            {editing ? 'Save changes' : 'Save entry'}
          </Button>
          {editing && (
            <>
              <Button onClick={() => startEdit(undefined)}>Cancel</Button>
              <Button
                variant="quiet"
                onClick={async () => {
                  if (confirm('Delete this entry?')) {
                    await deleteJournal(editing)
                    startEdit(undefined)
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="mt-8">
        <Label>Earlier</Label>
        {journal.length === 0 && <Empty>No entries yet.</Empty>}
        <ul className="mt-3 space-y-2">
          {journal.map((j) => (
            <li key={j.id}>
              <button type="button" onClick={() => startEdit(j.id)} className={`w-full rounded-2xl p-4 text-left ${editing === j.id ? 'border border-ink/40' : 'bg-surface'}`}>
                <div className="text-[13px] text-muted">
                  {new Date(j.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(j.at)}
                </div>
                <p className="mt-1 line-clamp-4 whitespace-pre-wrap leading-relaxed">{j.text}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  )
}
