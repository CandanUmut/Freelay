import { db, newId } from '../db/db'
import { saveMeta } from '../db/seed'
import type { DayEntry, JournalEntry, Layer, LocalDate, NeedMap, Plan, Reflection, TrackedItem, Urge } from '../db/types'

/** Write a full check-in for a date. Entries replace whatever was there. */
export async function saveDay(
  date: LocalDate,
  today: LocalDate,
  data: Pick<DayEntry, 'entries' | 'mood' | 'note'>,
): Promise<DayEntry> {
  const existing = await db.days.get(date)
  const row: DayEntry = {
    date,
    entries: data.entries,
    mood: data.mood,
    note: data.note?.trim() || undefined,
    loggedAt: new Date().toISOString(),
    // A day is backfilled if it was first recorded after it ended.
    backfilled: existing ? existing.backfilled : date < today,
  }
  await db.days.put(row)
  return row
}

/**
 * An urge that was acted on is a setback for that day. The day entry is the
 * single source of truth for abstinence, so the urge writes into it.
 */
export async function markSetback(date: LocalDate, today: LocalDate, abstinenceItemId: string): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const existing = await db.days.get(date)
    if (existing) await db.days.update(date, { [`entries.${abstinenceItemId}`]: true })
    else
      await db.days.put({
        date,
        entries: { [abstinenceItemId]: true },
        loggedAt: new Date().toISOString(),
        backfilled: date < today,
      })
  })
}

export async function addUrge(u: Omit<Urge, 'id'>): Promise<string> {
  const id = newId()
  await db.urges.add({ ...u, id })
  return id
}

export const updateUrge = (id: string, patch: Partial<Urge>) => db.urges.update(id, patch)
export const deleteUrge = (id: string) => db.urges.delete(id)

export async function savePlan(p: Omit<Plan, 'id' | 'timesUsed'> & { id?: string; timesUsed?: number }): Promise<void> {
  const existing = p.id ? await db.plans.get(p.id) : undefined
  await db.plans.put({ ...p, id: p.id ?? newId(), timesUsed: p.timesUsed ?? existing?.timesUsed ?? 0 })
}
export const deletePlan = (id: string) => db.plans.delete(id)
export async function recordPlanUse(id: string): Promise<void> {
  const p = await db.plans.get(id)
  if (p) await db.plans.update(id, { timesUsed: p.timesUsed + 1 })
}

export async function saveJournal(j: { id?: string; text: string; at?: string; tags?: string[] }): Promise<void> {
  const existing = j.id ? await db.journal.get(j.id) : undefined
  const row: JournalEntry = { id: j.id ?? newId(), at: existing?.at ?? j.at ?? new Date().toISOString(), text: j.text.trim(), tags: j.tags }
  await db.journal.put(row)
}
export const deleteJournal = (id: string) => db.journal.delete(id)

/** Add items chosen from suggestions (keeping their stable ids) or typed by the person. */
export async function addItems(list: { id?: string; layer: Layer; name: string; target?: TrackedItem['target'] }[]): Promise<void> {
  await db.transaction('rw', db.items, async () => {
    const existing = await db.items.toArray()
    const have = new Set(existing.map((i) => i.id))
    const next = new Map<Layer, number>()
    for (const i of existing) next.set(i.layer, Math.max(next.get(i.layer) ?? 0, i.sortOrder + 1))
    for (const it of list) {
      const id = it.id ?? newId()
      if (have.has(id)) {
        // Previously archived: bring it back rather than duplicating.
        await db.items.update(id, { active: true })
        continue
      }
      const sortOrder = next.get(it.layer) ?? 0
      next.set(it.layer, sortOrder + 1)
      await db.items.add({ id, layer: it.layer, name: it.name.trim(), active: true, sortOrder, target: it.target })
      have.add(id)
    }
  })
}

export async function addItem(layer: Layer, name: string): Promise<void> {
  const same = await db.items.where('layer').equals(layer).toArray()
  const sortOrder = same.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1
  await db.items.add({ id: newId(), layer, name: name.trim(), active: true, sortOrder })
}
export const updateItem = (id: string, patch: Partial<TrackedItem>) => db.items.update(id, patch)

/** Swap sort order with the neighbour in the same layer. */
export async function moveItem(item: TrackedItem, dir: -1 | 1, siblings: TrackedItem[]): Promise<void> {
  const i = siblings.findIndex((s) => s.id === item.id)
  const other = siblings[i + dir]
  if (!other) return
  await db.transaction('rw', db.items, async () => {
    await db.items.update(item.id, { sortOrder: other.sortOrder })
    await db.items.update(other.id, { sortOrder: item.sortOrder })
  })
}

/**
 * Delete only if the item was never recorded; otherwise it must be archived,
 * or history (and the metrics derived from it) would silently change.
 */
export async function itemIsUsed(id: string): Promise<boolean> {
  const inDays = await db.days.filter((d) => id in d.entries).count()
  const inUrges = await db.urges.filter((u) => u.triggerItemIds.includes(id)).count()
  return inDays + inUrges > 0
}
export const deleteItem = (id: string) => db.items.delete(id)

export const markLessonRead = async (id: string, today: LocalDate, read: Record<string, LocalDate>) =>
  saveMeta(db, { lessonsRead: { ...read, [id]: today } })
export const dismissLesson = async (id: string, today: LocalDate, dismissed: Record<string, LocalDate>) =>
  saveMeta(db, { lessonsDismissed: { ...dismissed, [id]: today } })

export async function saveReflection(r: Omit<Reflection, 'id' | 'at'>): Promise<Reflection> {
  const row: Reflection = { ...r, id: newId(), at: new Date().toISOString(), note: r.note?.trim() || undefined }
  await db.reflections.add(row)
  return row
}

export async function addStep(need: string, text: string): Promise<void> {
  await db.steps.add({ id: newId(), at: new Date().toISOString(), need, text })
}
export const deleteStep = (id: string) => db.steps.delete(id)

export async function saveNeedWays(need: string, ways: string[], current: NeedMap): Promise<void> {
  await db.kv.put({ key: 'needs', value: { ...current, [need]: ways.map((w) => w.trim()).filter(Boolean) } })
}
