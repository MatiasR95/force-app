// Translate a client's edited actual (kg / reps / series) into the exact sheet
// cell overwrites needed in their routine sheet. The user chose to OVERWRITE the
// prescription cell (not append) — so this rebuilds each target cell's text,
// preserving everything we're not changing ("x lado", bands, free notes, the
// reps×sets format). Every edit also flows to the Seguimiento log (see store.ts),
// which keeps the coach's original number recoverable.
//
// Sheet layout (see parser.ts): col C(2)=reps, D(3)=series, E(4)=OBSERVACIONES.
// Week-1 values live in C/D/E; week-N values are a composite cell ("10X3 28,75kg
// x lado") in that week's "Semana N" column (WeekCell.col).

import type { ExerciseRow } from './types'

// `prev` = the cell text this app parsed when the routine loaded. The backend
// refuses the write if the live cell no longer matches — the coach may have
// inserted/edited rows since, which would make our row index point at a
// DIFFERENT cell and silently corrupt the plan.
export interface CellWrite { row: number; col: number; value: string; prev: string }
export interface ActualEdit { kg?: number; reps?: number; series?: number }

const REPS_COL = 2
const SERIES_COL = 3
const OBS_COL = 4

// Values we already wrote back this session, keyed "row:col". A SECOND edit to
// the same cell must fingerprint against what we last wrote (now live in the
// sheet), not the original text — otherwise the backend would reject it.
const lastWritten = new Map<string, string>()

/** Test-only: forget the per-session writeback memory. */
export function _resetWritebackMemory(): void { lastWritten.clear() }

function cellWrite(row: number, col: number, value: string, parsed: string): CellWrite {
  const key = `${row}:${col}`
  const prev = lastWritten.get(key) ?? parsed
  lastWritten.set(key, value)
  return { row, col, value, prev }
}

/** "27.5" → "27,5", "30" → "30" (match the rioplatense comma the sheets use). */
export function fmtKg(n: number): string {
  return (Math.round(n * 100) / 100).toString().replace('.', ',')
}

const KG_RE = /-?\d+(?:[.,]\d+)?\s*kg/i

/** Replace the kg token in `text` with `kg`, or append it if there was none. */
export function replaceKg(text: string, kg: number): string {
  const token = `${fmtKg(kg)}kg`
  if (KG_RE.test(text)) return text.replace(KG_RE, token)
  return text.trim() ? `${text.trim()} ${token}` : token
}

/**
 * Build the cell overwrites for one edit, for the week being trained. Mirrors
 * `resolveWeek` (src/lib/week.ts): each field is written wherever the effective
 * prescription is READ from — the "Semana N" cell when that cell carries the
 * field, otherwise the base reps/series/OBSERVACIONES cell. Inherited ("Mismo
 * semana ant.") or un-splittable week cells are too ambiguous to overwrite, so
 * they're skipped (the edit is still logged to Seguimiento, just not written back).
 */
export function buildCellWrites(ex: ExerciseRow, week: number, edit: ActualEdit): CellWrite[] {
  const w = week > 1 ? ex.weeks[week] : undefined
  // week > 1 with no cell of its own = an inherited ("repeat previous") week —
  // there's no single cell that owns this value, so don't guess; log only.
  if (week > 1 && !w) return []
  if (w && (w.inherit || w.complex)) return [] // ambiguous — skip writeback
  if (!w && ex.plan && ex.plan.length) {
    // base row is a non-linear per-series plan ("3X2+2X2") — overwriting reps/series
    // would destroy the scheme; only kg is safe to rewrite.
    const writes: CellWrite[] = []
    if (edit.kg != null) writes.push(cellWrite(ex.row, OBS_COL, replaceKg(ex.raw.obs, edit.kg), ex.raw.obs))
    return writes
  }
  const writes: CellWrite[] = []
  const hasWeekCol = !!w && w.col >= 0

  // The composite "Semana N" cell only owns a field when that field is present in
  // it; otherwise the value comes from the base row (same rule as resolveWeek).
  let cell = w ? w.raw : ''
  let touched = false
  if (edit.reps != null && w && w.reps != null) { cell = cell.replace(/^(\s*)\d+(\s*[xX])/, `$1${edit.reps}$2`); touched = true }
  if (edit.series != null && w && w.sets != null) { cell = cell.replace(/([xX]\s*)\d+/, `$1${edit.series}`); touched = true }
  if (edit.kg != null && w && w.load != null) { cell = replaceKg(cell, edit.kg); touched = true }
  if (hasWeekCol && touched && cell !== w!.raw) writes.push(cellWrite(ex.row, w!.col, cell, w!.raw))

  // Fields not owned by the week cell fall back to the base reps/series/OBS cells.
  if (edit.reps != null && !(w && w.reps != null)) writes.push(cellWrite(ex.row, REPS_COL, String(edit.reps), ex.raw.reps))
  if (edit.series != null && ex.setOrdinal == null && !(w && w.sets != null)) writes.push(cellWrite(ex.row, SERIES_COL, String(edit.series), ex.raw.series))
  if (edit.kg != null && !(w && w.load != null)) writes.push(cellWrite(ex.row, OBS_COL, replaceKg(ex.raw.obs, edit.kg), ex.raw.obs))
  return writes
}
