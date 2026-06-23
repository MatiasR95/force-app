import type { ExerciseRow, Block, Load } from './types'

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

export function resolveWeek(ex: ExerciseRow, week: number): Resolved {
  const base: Resolved = {
    reps: ex.reps, sets: ex.sets, repsRaw: ex.repsRaw, setsRaw: ex.setsRaw,
    load: ex.load, complexRaw: null,
  }
  if (week <= 1) return base
  const w = ex.weeks[week]
  if (!w) return base // blank week cell → same as week 1
  if (w.complex) {
    return { ...base, load: w.load ?? ex.load, complexRaw: w.raw }
  }
  return {
    reps: w.reps ?? ex.reps,
    sets: w.sets ?? ex.sets,
    repsRaw: w.reps != null ? String(w.reps) : ex.repsRaw,
    setsRaw: w.sets != null ? String(w.sets) : ex.setsRaw,
    load: w.load ?? ex.load,
    complexRaw: null,
  }
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

/** Parse "12 de enero de 2026" (rioplatense) → Date, or null. */
export function parseStartDate(raw: string): Date | null {
  const m = raw.toLowerCase().match(/(\d{1,2})\s*de\s*([a-záéíóú]+)\s*de\s*(\d{4})/)
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
