import type { Routine } from './types'
import type { RecordEntry, StreakEntry } from './records'
import { parseRoutine } from './parser'
import { ENERO_2026 } from '../data/fixtureEnero2026'
import { getOutbox, clearOutbox, getMyRecords } from './store'

// The Apps Script Web App URL (gym account). Empty in demo → use local fixture.
// Set via Vite env: VITE_FORCE_API=https://script.google.com/macros/s/XXXX/exec
const API_BASE = import.meta.env.VITE_FORCE_API ?? ''

interface RawRoutine { title: string; values: string[][] }

export const isDemo = (): boolean => !API_BASE

async function call<T>(action: string, params: Record<string, string> = {}, timeoutMs = 25_000): Promise<T> {
  const url = new URL(API_BASE)
  url.searchParams.set('action', action)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  // never hang forever: a slow/unreachable Apps Script must fail into the
  // recovery UI (with Reintentar), not leave the app stuck on "Cargando…".
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal })
    if (!res.ok) throw new Error(`API ${action} → ${res.status}`)
    return await (res.json() as Promise<T>)
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error(`La conexión con el servidor tardó demasiado (${action}). Revisá tu conexión y probá de nuevo.`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/** Current routine for the signed-in client. */
export async function fetchRoutine(token: string | null): Promise<Routine> {
  if (isDemo() || !token) {
    // demo: the real Enero 2026 sheet, surfaced as the current cycle
    return parseRoutine(ENERO_2026, 'Mi Rutina · Demo')
  }
  const raw = await call<RawRoutine & { error?: string }>('getRoutine', { token })
  if (raw?.error) throw new Error(raw.error)
  if (!raw || !Array.isArray(raw.values)) throw new Error('La rutina llegó vacía o con un formato inesperado.')
  return parseRoutine(raw.values, raw.title)
}

/** History list (past cycles in Historial/). */
export async function fetchHistory(token: string | null): Promise<Array<{ id: string; title: string }>> {
  if (isDemo() || !token) {
    return [
      { id: 'demo-dic', title: 'Diciembre 2025' },
      { id: 'demo-nov', title: 'Noviembre 2025' },
    ]
  }
  return call('getHistory', { token })
}

/** Gym-wide records. Demo = the member's own auto-captured marks (no seed). */
export async function fetchRecords(token: string | null): Promise<RecordEntry[]> {
  if (isDemo() || !token) {
    return [...getMyRecords()]
  }
  return call<RecordEntry[]>('getRecords', { token })
}

/** Submit a record the member just hit. Demo persists locally only. */
export async function submitRecord(token: string | null, entry: RecordEntry): Promise<void> {
  if (isDemo() || !token) return
  await fetch(new URL(API_BASE).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'postRecord', token, entry }),
  })
}

/** Gym-wide streak board. Submits the member's own streak and returns everyone's
 *  (so it stays "live"). Demo = just the member's own entry. */
export async function syncStreak(token: string | null, mine: StreakEntry): Promise<StreakEntry[]> {
  if (isDemo() || !token) return mine.weeks > 0 || mine.max > 0 ? [mine] : []
  await fetch(new URL(API_BASE).toString(), {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'postStreak', token, entry: mine }),
  }).catch(() => {})
  return call<StreakEntry[]>('getStreaks', { token })
}

/** Flush the offline outbox. Log items → Seguimiento; `cell` items → overwrite
 *  the matching cell in the routine sheet. No-op in demo. */
export async function syncOutbox(token: string | null): Promise<number> {
  const box = getOutbox()
  if (!box.length) return 0
  if (isDemo() || !token) {
    // demo keeps items local so the UI can show "pendiente de sincronizar"
    return 0
  }
  const url = new URL(API_BASE).toString()
  const post = (body: object) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoid CORS preflight w/ Apps Script
    body: JSON.stringify(body),
  })

  const cells = box.filter((i) => i.kind === 'cell')
  const logs = box.filter((i) => i.kind !== 'cell')

  if (logs.length) {
    const res = await post({ action: 'logInput', token, items: logs })
    if (!res.ok) throw new Error(`sync → ${res.status}`)
  }
  if (cells.length) {
    const res = await post({ action: 'updateCells', token, cells: cells.map((i) => i.payload) })
    if (!res.ok) throw new Error(`updateCells → ${res.status}`)
  }
  clearOutbox(box.map((i) => i.id))
  return box.length
}
