import { useState } from 'react'
import { useData } from '../app/data'
import { applyImport, exportAll, ImportError, parseExport, previewImport, type ExportFile, type ImportPreview } from '../db/backup'
import { db, TABLES } from '../db/db'
import { loadFixture } from '../db/fixture'
import { ensureSeeded, saveMeta } from '../db/seed'
import { diffDays } from '../lib/dates'
import { Button, Label, Screen, plural } from '../ui/kit'

const TABLE_LABEL: Record<(typeof TABLES)[number], string> = {
  items: 'tracked items',
  days: 'days',
  urges: 'urges',
  plans: 'plans',
  journal: 'journal entries',
  kv: 'settings rows',
}

export function DataSettings({ onClose }: { onClose: () => void }) {
  const data = useData()
  const [pending, setPending] = useState<{ file: ExportFile; preview: ImportPreview } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const since = data.meta.lastExportAt ? diffDays(data.meta.lastExportAt.slice(0, 10), data.today) : null

  async function doExport() {
    const file = await exportAll(db)
    const name = `ledger-${data.today}.json`
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const f = new File([blob], name, { type: 'application/json' })
    try {
      // On iOS the share sheet is the reliable way to save a file from a home-screen app.
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: name })
      else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      }
      await saveMeta(db, { lastExportAt: new Date().toISOString() })
      setMessage('Exported. Keep the file somewhere other than this phone.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMessage('Export failed.')
    }
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const file = parseExport(await f.text())
      setPending({ file, preview: await previewImport(db, file) })
      setMessage(null)
    } catch (err) {
      setMessage(err instanceof ImportError ? err.message : 'Could not read that file.')
    }
  }

  return (
    <Screen title="Data and backup" onClose={onClose} back>
      <p className="pt-2 leading-relaxed text-muted">
        Your data exists only on this phone. If the app is deleted or the browser clears its storage, the export file is the only copy.
      </p>

      <section className="mt-6 rounded-2xl bg-surface p-4">
        <p className="text-[14px] text-muted">
          {plural(data.days.length, 'day')} · {plural(data.urges.length, 'urge')} · {plural(data.plans.length, 'plan')} ·{' '}
          {plural(data.journal.length, 'journal entry', 'journal entries')}
        </p>
        <p className="mt-1 text-[14px] text-muted">{since === null ? 'Never exported.' : since === 0 ? 'Last exported today.' : `Last exported ${plural(since, 'day')} ago.`}</p>
        <Button variant="primary" className="mt-4 w-full" onClick={doExport}>
          Export everything (JSON)
        </Button>
        <label className="mt-2 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-surface-2">
          Import from a file
          <input type="file" accept="application/json,.json" className="sr-only" onChange={pick} />
        </label>
      </section>

      {message && (
        <p className="mt-4 leading-relaxed" role="status">
          {message}
        </p>
      )}

      {pending && (
        <section className="mt-4 rounded-2xl border border-line p-4">
          <p className="font-semibold">Import file from {pending.file.exportedAt.slice(0, 10)}</p>
          <ul className="mt-2 space-y-0.5 text-[14px] text-muted">
            {TABLES.map((t) => (
              <li key={t}>
                {pending.preview.counts[t]} {TABLE_LABEL[t]}
                {pending.preview.conflicts[t] > 0 && `, ${pending.preview.conflicts[t]} already here`}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[14px] leading-relaxed">
            <strong>Replace</strong> deletes everything here first. <strong>Merge</strong> adds the file's records and overwrites matching ones; your settings on
            this phone are kept.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              onClick={async () => {
                if (!confirm('Replace all data on this phone with the file?')) return
                await applyImport(db, pending.file, 'replace')
                await ensureSeeded(db)
                setPending(null)
                setMessage('Replaced all data from the file.')
              }}
            >
              Replace
            </Button>
            <Button
              onClick={async () => {
                await applyImport(db, pending.file, 'merge')
                setPending(null)
                setMessage('Merged the file into your data.')
              }}
            >
              Merge
            </Button>
            <Button variant="quiet" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="mt-10">
        <Label>Try it out</Label>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">Load 60 days of made-up data to see what the app shows once it has history. This replaces your days, urges, plans and journal.</p>
        <Button
          variant="ghost"
          className="mt-3 w-full"
          onClick={async () => {
            if (!confirm('Replace your days, urges, plans and journal with sample data?')) return
            await loadFixture(db, data.today)
            setMessage('Sample data loaded.')
          }}
        >
          Load sample data
        </Button>
      </section>

      <section className="mt-10 pb-8">
        <Label>Erase</Label>
        <Button
          variant="ghost"
          className="mt-3 w-full"
          onClick={async () => {
            if (!confirm('Erase everything on this phone? This cannot be undone.')) return
            if (!confirm('Really erase? Export first if you want a copy.')) return
            await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
              for (const t of TABLES) await db.table(t).clear()
            })
            await ensureSeeded(db)
            setMessage('Erased. Starting fresh with the default items.')
          }}
        >
          Erase all data
        </Button>
      </section>
    </Screen>
  )
}
