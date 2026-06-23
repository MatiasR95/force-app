// FORCE routine domain model.
// The Apps Script backend returns each routine sheet as a raw 2D array of cell
// strings (Sheet.getDataRange().getValues()). All structuring happens here so the
// parser is fully unit-testable in the repo and the backend stays thin.

export type SectionTag =
  | 'warmup'      // the free-text WARM-UP line
  | 'ramp'        // warm-up ramp sets before THE BIG ONE (ordinal series 1°, 2°)
  | 'big'         // THE BIG ONE — the main lift
  | 'accessory'   // ACCS / ACCESORIOS
  | 'finisher'    // FINISHERS
  | 'core'        // CORE / Zona Media
  | 'hiit'        // HIIT / metabólico
  | 'other'

// Per-week override read from the "Semana N" columns to the right of the base
// (Week 1) block. e.g. "10X3" → reps 10 × sets 3; "2X4 28,75kg x lado" adds load.
export interface WeekCell {
  week: number
  reps: number | null
  sets: number | null
  load: Load | null   // weight override if the cell carried one
  raw: string         // original cell text (always kept; shown when complex)
  complex: boolean    // couldn't be cleanly split into reps×sets (e.g. "3X1+2X3")
}

export type MovementPattern =
  | 'squat' | 'hinge' | 'push' | 'pull' | 'core' | 'carry' | 'other'

export interface Load {
  value: number | null     // numeric kg if present
  perSide: boolean         // "x lado" → loaded per side
  unit: 'kg'
  band?: string            // e.g. "Banda Roja", "Gris"
  raw: string              // original OBSERVACIONES text (always kept)
}

export type Technique =
  | { type: 'tempo'; value: string }       // "3:1:0"
  | { type: 'pause'; seconds: number }      // "+2\""
  | { type: 'myoreps' }
  | { type: 'cluster'; restSeconds: number | null }
  | { type: 'band'; color: string }
  | { type: 'perSide' }
  | { type: 'amrap' }

export interface ExerciseRow {
  id: string                 // stable per day (slug + index)
  name: string               // display name (raw, as the coach wrote it)
  slug: string               // normalized key for media lookup
  pattern: MovementPattern
  section: SectionTag
  isWarmupRamp: boolean
  reps: number | null        // leading numeric reps
  repsRaw: string
  sets: number | null        // numeric work sets (null for ordinal ramp rows)
  setsRaw: string            // "4", "1°", "2°"
  setOrdinal: number | null  // 1, 2 … for ramp sets
  load: Load
  techniques: Technique[]
  notes: string              // OBSERVACIONES minus the parsed load (free coaching note)
  weeks: Record<number, WeekCell> // per-week overrides (week 2+); week 1 = base fields
  raw: { exercise: string; reps: string; series: string; obs: string }
}

export interface Block {
  tag: SectionTag
  title: string              // human label: "The Big One", "Accesorios"…
  circuit: boolean           // exercises performed together as rounds
  rounds: number | null      // number of circuit rounds (= series count)
  exercises: ExerciseRow[]
}

export interface RoutineDay {
  id: string
  label: string              // "DÍA 1"
  index: number
  warmup: string             // free-text warm-up line
  weeks: number[]            // week numbers available for this day (incl. 1)
  blocks: Block[]
}

export interface RoutineMeta {
  sessionsPerWeek: string    // "4 x semana"
  startDate: string          // raw "12 de enero de 2026"
  weeks: string              // "8 semanas"
  goal: string               // "Fuerza+hipertrofia"
}

export interface Routine {
  title: string              // sheet title, e.g. "Enero 2026"
  meta: RoutineMeta
  days: RoutineDay[]
  weeksAvailable: number[]   // union of week numbers across all days (incl. 1)
  totalWeeks: number         // from meta "8 semanas" (fallback: max weeksAvailable)
  parsedWarnings: string[]   // anything the parser couldn't structure (still shown raw)
}
