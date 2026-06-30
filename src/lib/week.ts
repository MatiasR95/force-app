import type { ExerciseRow, Block, Load, Routine, WeekCell } from './types'
import { getStartWeek, localDate } from './store'
import { isHangingLoad } from './plates'

// Resolve an exercise's effective prescription for a given week. Week 1 = base
// fields; weeks 2+ use the "Semana N" override, falling back to base where the
// override is blank.

export interface Resolved {
  reps: number | null
  sets: number | null
  repsRaw: string
  setsRaw: string
  load: Load
  complexRaw: string | null // set when the week cell couldn't be split (show as-is)
}

// Merge one "Semana N" cell onto the previous week's resolved prescription.
function applyCell(w: WeekCell, prev: Resolved): Resolved {
  if (w.inherit) return prev // "Mismo semana ant."
  if (w.complex) return { ...prev, load: w.load ?? prev.load, complexRaw: w.raw }
  // a partial cell (e.g. "5X4" with no weight) inherits the missing fields from
  // the previous week, per the repeat-previous rule.
  return {
    reps: w.reps ?? prev.reps,
    sets: w.sets ?? prev.sets,
    repsRaw: w.reps != null ? String(w.reps) : prev.repsRaw,
    setsRaw: w.sets != null ? String(w.sets) : prev.setsRaw,
    load: w.load ?? prev.load,
    complexRaw: null,
  }
}

function resolveRaw(ex: ExerciseRow, week: number): Resolved {
  const base: Resolved = {
    reps: ex.reps, sets: ex.sets, repsRaw: ex.repsRaw, setsRaw: ex.setsRaw,
    load: ex.load, complexRaw: null,
  }
  if (week <= 1) {
    // some coaches put week 1 in an explicit "Semana 1" column instead of the
    // base cells — honor it so week 1 isn't read from blank base columns.
    const w1 = ex.weeks[1]
    return w1 ? applyCell(w1, base) : base
  }
  const w = ex.weeks[week]
  // GYM RULE: a blank/missing week cell means "repeat the PREVIOUS week" (load,
  // series and reps) — not "fall back to week 1". So weeks past the last defined
  // column (e.g. weeks 4–8 of an 8-week plan that only lists Semana 2/3) inherit
  // the last week that WAS defined, walking back one week at a time.
  if (!w) return resolveRaw(ex, week - 1)
  return applyCell(w, resolveRaw(ex, week - 1))
}

export function resolveWeek(ex: ExerciseRow, week: number): Resolved {
  const r = resolveRaw(ex, Math.max(1, Math.floor(week)))
  if (r.load.value == null) return r
  // ---- normalize per-side semantics (display + records + plate calc) --------
  const hanging = isHangingLoad(ex.name)
  // weighted pull-ups/dips hang a single load — never "per side" (a coach typo or
  // a mid-cycle cable swap must not show an impossible "x lado" / plate calc).
  if (hanging && r.load.perSide) return { ...r, load: { ...r.load, perSide: false } }
  // a week cell that gives a NEW weight but omits "x lado" keeps the exercise's
  // per-side convention — coaches write "70kg" as shorthand for "70 x lado" when
  // the base lift was already per side (e.g. deadlift week 4 "6X4 70kg c/bandas").
  if (!hanging && !r.load.perSide && ex.load.perSide) return { ...r, load: { ...r.load, perSide: true } }
  return r
}

/** Circuit rounds for a given week (max resolved set count in the block). */
export function circuitRounds(block: Block, week: number): number | null {
  const counts = block.exercises
    .map((e) => resolveWeek(e, week).sets)
    .filter((n): n is number => n != null)
  return counts.length ? Math.max(...counts) : block.rounds
}

// ---- start date + current week -------------------------------------------

const MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

/** Parse "12 de enero de 2026" (rioplatense) or an ISO date/datetime → Date, or null. */
export function parseStartDate(raw: string): Date | null {
  const t = raw.trim()
  // ISO date or datetime (Sheets often stores "Fecha de Inicio" as a real date →
  // "2026-05-30T03:00:00.000Z"). Use only the calendar day at LOCAL midnight so a
  // UTC offset can't shift the week boundary by a day.
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    if (!Number.isNaN(d.getTime())) return d
  }
  const m = t.toLowerCase().match(/(\d{1,2})\s*de\s*([a-záéíóú]+)\s*de\s*(\d{4})/)
  if (!m) return null
  const month = MONTHS[m[2].normalize('NFD').replace(/[̀-ͯ]/g, '')]
  if (month == null) return null
  return new Date(parseInt(m[3], 10), month, parseInt(m[1], 10))
}

/** Which week of the plan is "today" (1-based, clamped to the plan length). */
export function currentWeek(startRaw: string, totalWeeks: number, now = new Date()): number {
  const start = parseStartDate(startRaw)
  if (!start) return 1
  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  if (days < 0) return 1
  return Math.min(totalWeeks || 1, Math.floor(days / 7) + 1)
}

/**
 * The member's current plan week: anchored to the week they told us they were on
 * (advancing one per real week since), else derived from the plan's start date.
 */
export function memberCurrentWeek(routine: Routine): number {
  const total = Math.max(1, routine.totalWeeks || 1)
  const a = getStartWeek()
  if (a) {
    const days = Math.floor((Date.parse(localDate() + 'T00:00:00') - Date.parse(a.date + 'T00:00:00')) / 86_400_000)
    return Math.min(total, Math.max(1, a.week + Math.floor(Math.max(0, days) / 7)))
  }
  return currentWeek(routine.meta.startDate, total)
}
