import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { applyImport, exportAll, ImportError, parseExport, previewImport, type ExportFile, type ImportPreview } from '../db/backup'
import { db, TABLES } from '../db/db'
import { loadFixture } from '../db/fixture'
import { getSettings } from '../db/seed'
import { LAYERS, type Layer } from '../db/types'
import { localDateOf } from '../lib/dates'
import { abstinenceRate, layerRate, riskWindow, streaks, topFactors, totalCleanDays, urgeStats } from '../metrics/metrics'

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`)
const LAYER_LABEL: Record<Layer, string> = { abstinence: 'Abstinence', boundary: 'Boundaries', selfcare: 'Self Care' }
const LAYER_TEXT: Record<Layer, string> = { abstinence: 'text-abstinence', boundary: 'text-boundary', selfcare: 'text-selfcare' }

/**
 * Step 1 screen: shows the stored data and the derived metrics, and holds
 * export / import. It becomes the Settings > Data screen later.
 */
export function DataScreen() {
  const data = useLiveQuery(async () => {
    const settings = await getSettings(db)
    const today = localDateOf(new Date(), settings.dayBoundaryHour)
    const [items, days, urges, plans, journal] = await Promise.all([
      db.items.toArray(),
      db.days.toArray(),
      db.urges.toArray(),
      db.plans.toArray(),
      db.journal.toArray(),
    ])
    return { settings, today, items, days, urges, plans, journal }
  })
  const [pending, setPending] = useState<{ file: ExportFile; preview: ImportPreview } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!data) return null
  const s = { items: data.items, days: data.days, urges: data.urges, today: data.today }
  const dateOf = (u: { at: string }) => localDateOf(new Date(u.at), data.settings.dayBoundaryHour)
  const r30 = abstinenceRate(s)
  const st = streaks(s)
  const urges = urgeStats(s, dateOf)
  const risk = riskWindow(s)
  const top = topFactors(s)

  async function download() {
    const file = await exportAll(db)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ledger-${data!.today}.json`
    a.click()
    URL.revokeObjectURL(a.href)
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

  async function confirmImport(mode: 'replace' | 'merge') {
    if (!pending) return
    await applyImport(db, pending.file, mode)
    setPending(null)
    setMessage(mode === 'replace' ? 'Replaced all data from the file.' : 'Merged the file into your data.')
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <p className="text-sm text-muted">Last 30 days · {data.today}</p>
      <h1 className="mt-1 text-6xl font-semibold tracking-tight tabular-nums">{pct(r30.rate)}</h1>
      <p className="mt-1 text-muted">
        {r30.clean} clean of {r30.reported} reported days · coverage {pct(r30.coverage)}
      </p>
      <p className="mt-3 text-lg">
        <span className="font-semibold tabular-nums">{totalCleanDays(s)}</span> clean days in total
        <span className="ml-3 inline-block whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 text-sm text-muted">streak {st.current}d · best {st.best}d</span>
      </p>

      <section className="mt-8 grid grid-cols-3 gap-2">
        {LAYERS.map((l) => (
          <div key={l} className="rounded-xl bg-surface p-3">
            <div className={`text-xs ${LAYER_TEXT[l]}`}>{LAYER_LABEL[l]}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{pct(layerRate(s, l))}</div>
          </div>
        ))}
      </section>

      <Section title="Urges">
        {urges.resistedTotal} resisted in total · last 30 days {urges.resisted30} resisted, {urges.acted30} acted on
        <br />
        avg intensity {urges.avgIntensity?.toFixed(1) ?? '—'} · avg duration {urges.avgDurationMin?.toFixed(0) ?? '—'} min ({urges.timed} timed)
      </Section>

      <Section title="Risk window">
        {risk
          ? `Day ${risk.day}. ${risk.hits} of your last ${risk.of} setbacks came on days ${risk.from}–${risk.to}. ${risk.inWindow ? 'You are inside that window.' : risk.daysUntil > 0 ? `Window opens in ${risk.daysUntil} days.` : 'You are past it.'}`
          : 'No clear cluster yet (needs at least 4 setbacks).'}
      </Section>

      <Section title="Top factors, last 60 days">
        {top.length === 0 && 'Not enough data yet.'}
        <ul className="space-y-2">
          {top.map(({ item, best }) => (
            <li key={item.id}>
              <span className={LAYER_TEXT[item.layer]}>{item.name}</span>{' '}
              <span className="text-muted">({best!.lag ? 'next day' : 'same day'}, {best!.strength})</span>
              <br />
              held {pct(best!.held.rate)} <span className="text-muted">n={best!.held.n}</span> vs not {pct(best!.notHeld.rate)}{' '}
              <span className="text-muted">n={best!.notHeld.n}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Stored">
        {data.items.length} items · {data.days.length} days · {data.urges.length} urges · {data.plans.length} plans · {data.journal.length}{' '}
        journal
      </Section>

      <section className="mt-8 flex flex-wrap gap-2">
        <Button onClick={download}>Export JSON</Button>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-surface px-4">
          Import JSON
          <input type="file" accept="application/json,.json" className="hidden" onChange={pick} />
        </label>
        <Button
          onClick={async () => {
            if (confirm('Replace all days, urges, plans and journal with 60 days of sample data?')) await loadFixture(db, data.today)
          }}
        >
          Load 60-day fixture
        </Button>
      </section>

      {message && <p className="mt-4 text-muted">{message}</p>}

      {pending && (
        <section className="mt-6 rounded-xl border border-line p-4">
          <p className="font-semibold">Import from {pending.file.exportedAt.slice(0, 10)}</p>
          <ul className="mt-2 text-sm text-muted">
            {TABLES.map((t) => (
              <li key={t}>
                {t}: {pending.preview.counts[t]} rows, {pending.preview.conflicts[t]} already here
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">Replace wipes local data first. Merge keeps local rows and overwrites matching ones.</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => confirmImport('replace')}>Replace</Button>
            <Button onClick={() => confirmImport('merge')}>Merge</Button>
            <Button onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </section>
      )}
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-2 leading-relaxed">{children}</div>
    </section>
  )
}

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="min-h-11 rounded-xl bg-surface px-4 active:opacity-70">
      {children}
    </button>
  )
}
