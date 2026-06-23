import type { Routine } from './types'
import { parseRoutine } from './parser'
import { ENERO_2026 } from '../data/fixtureEnero2026'
import { getOutbox, clearOutbox } from './store'

// The Apps Script Web App URL (gym account). Empty in demo → use local fixture.
// Set via Vite env: VITE_FORCE_API=https://script.google.com/macros/s/XXXX/exec
const API_BASE = import.meta.env.VITE_FORCE_API ?? ''

interface RawRoutine { title: string; values: string[][] }

export const isDemo = (): boolean => !API_BASE

async function call<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API_BASE)
  url.searchParams.set('action', action)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API ${action} → ${res.status}`)
  return res.json() as Promise<T>
}

/** Current routine for the signed-in client. */
export async function fetchRoutine(token: string | null): Promise<Routine> {
  if (isDemo() || !token) {
    // demo: the real Enero 2026 sheet, surfaced as the current cycle
    return parseRoutine(ENERO_2026, 'Mi Rutina · Demo')
  }
  const raw = await call<RawRoutine>('getRoutine', { token })
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

/** Flush the offline outbox to the Seguimiento log. No-op in demo. */
export async function syncOutbox(token: string | null): Promise<number> {
  const box = getOutbox()
  if (!box.length) return 0
  if (isDemo() || !token) {
    // demo keeps items local so the UI can show "pendiente de sincronizar"
    return 0
  }
  const res = await fetch(new URL(API_BASE).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoid CORS preflight w/ Apps Script
    body: JSON.stringify({ action: 'logInput', token, items: box }),
  })
  if (!res.ok) throw new Error(`sync → ${res.status}`)
  clearOutbox(box.map((i) => i.id))
  return box.length
}
