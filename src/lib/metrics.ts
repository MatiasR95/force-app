import type { Routine, RoutineDay, ExerciseRow, MovementPattern } from './types'
import { DEFAULT_BAR_KG } from './plates'

// ---------------------------------------------------------------------------
// S&C metrics. All computed from the routine + the client's own logs — no
// external data. Assumptions are explicit and surfaced in the UI ("cómo se
// calcula"): bar = 20 kg; "x lado" = value loaded on each side.
// ---------------------------------------------------------------------------

const isBarbell = (e: ExerciseRow): boolean =>
  (e.section === 'big' || e.section === 'ramp') &&
  (e.pattern === 'squat' || e.pattern === 'hinge' || e.pattern === 'push' || e.pattern === 'pull')

/** Total external load moved per rep, in kg. */
export function exerciseLoadKg(e: ExerciseRow, barKg = DEFAULT_BAR_KG): number {
  const v = e.load.value
  if (v == null) return 0
  const external = e.load.perSide ? v * 2 : v
  return external + (isBarbell(e) && e.load.perSide ? barKg : 0)
}

/** Epley estimated 1RM from a single set. */
export function epley1RM(totalKg: number, reps: number): number {
  if (totalKg <= 0 || reps <= 0) return 0
  return totalKg * (1 + reps / 30)
}

const setsOf = (e: ExerciseRow): number => e.sets ?? 1
const repsOf = (e: ExerciseRow): number => e.reps ?? 0

/** Volume load (tonnage) for one exercise = load × reps × sets. */
export function exerciseTonnage(e: ExerciseRow, barKg = DEFAULT_BAR_KG): number {
  return exerciseLoadKg(e, barKg) * repsOf(e) * setsOf(e)
}

export function dayTonnage(day: RoutineDay, barKg = DEFAULT_BAR_KG): number {
  return day.blocks
    .flatMap((b) => b.exercises)
    .reduce((sum, e) => sum + exerciseTonnage(e, barKg), 0)
}

export function routineTonnage(r: Routine, barKg = DEFAULT_BAR_KG): number {
  return r.days.reduce((s, d) => s + dayTonnage(d, barKg), 0)
}

// ---- lifetime tonnage (the Panel odometer) ---------------------------------
// Sessions logged since Jul 2026 carry their own kg; older ones are estimated
// from the known average (or, with no known kg at all, from the plan's average
// day) so long-time members still see a lifetime figure, flagged "aprox".
export function lifetimeKg(
  routine: Routine,
  sessions: ReadonlyArray<{ kg?: number }>,
): { kg: number; approx: boolean } {
  const known = sessions.filter((s) => s.kg != null && s.kg > 0)
  const knownKg = known.reduce((a, s) => a + (s.kg ?? 0), 0)
  const missing = sessions.length - known.length
  if (missing === 0) return { kg: Math.round(knownKg), approx: false }
  const perSession = known.length > 0
    ? knownKg / known.length
    : routineTonnage(routine) / Math.max(1, routine.days.length)
  return { kg: Math.round(knownKg + missing * perSession), approx: true }
}

// Rioplatense size comparisons for the odometer — largest one you've passed.
const TON_MILESTONES: Array<{ t: number; text: string }> = [
  { t: 1, text: 'un auto chico 🚗' },
  { t: 3, text: 'una camioneta 4x4 🛻' },
  { t: 6, text: 'un elefante africano 🐘' },
  { t: 12, text: 'un colectivo de línea 🚌' },
  { t: 25, text: 'un camión de bomberos 🚒' },
  { t: 41, text: 'un Boeing 737 vacío ✈️' },
  { t: 80, text: 'una locomotora 🚂' },
  { t: 130, text: 'una ballena azul 🐋' },
  { t: 200, text: 'la Estatua de la Libertad 🗽' },
  { t: 640, text: 'un Antonov cargado ✈️' },
]
export function tonnageComparison(kg: number): { passed: string | null; next: { t: number; text: string } | null } {
  const t = kg / 1000
  let passed: string | null = null
  for (const m of TON_MILESTONES) { if (t >= m.t) passed = m.text; else break }
  const next = TON_MILESTONES.find((m) => m.t > t) ?? null
  return { passed, next }
}

export interface BigLiftE1RM {
  name: string
  slug: string
  topSetKg: number
  reps: number
  e1rm: number
}

/** Best estimated 1RM per "Big One" lift across the routine. */
export function bigThreeE1RM(r: Routine, barKg = DEFAULT_BAR_KG): BigLiftE1RM[] {
  const best = new Map<string, BigLiftE1RM>()
  for (const day of r.days) {
    for (const e of day.blocks.find((b) => b.tag === 'big')?.exercises ?? []) {
      const kg = exerciseLoadKg(e, barKg)
      const e1 = epley1RM(kg, repsOf(e))
      const prev = best.get(e.slug)
      if (!prev || e1 > prev.e1rm) {
        best.set(e.slug, { name: e.name, slug: e.slug, topSetKg: kg, reps: repsOf(e), e1rm: e1 })
      }
    }
  }
  return [...best.values()].sort((a, b) => b.e1rm - a.e1rm)
}

/** Working sets per movement pattern (excludes warm-up ramp). */
export function weeklySetVolume(r: Routine): Record<MovementPattern, number> {
  const acc: Record<MovementPattern, number> = {
    squat: 0, hinge: 0, push: 0, pull: 0, core: 0, carry: 0, other: 0,
  }
  for (const day of r.days)
    for (const b of day.blocks)
      if (b.tag !== 'ramp' && b.tag !== 'warmup')
        for (const e of b.exercises) acc[e.pattern] += setsOf(e)
  return acc
}

// ---- attendance (from in-app check-ins) -----------------------------------
// Check-ins are stored as LOCAL date strings ("YYYY-MM-DD"). We deliberately
// avoid Date math on them: in Argentina (UTC-3) `new Date('2026-06-01')` lands
// on May 31 local, which would mis-bucket the month.

const pad = (n: number): string => String(n).padStart(2, '0')
const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function attendanceThisMonth(checkins: string[], now = new Date()): number {
  const prefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  const uniq = new Set(
    checkins.map((c) => c.slice(0, 10)).filter((d) => d.startsWith(prefix)),
  )
  return uniq.size
}

/** Consecutive-day-or-session streak ending today/yesterday. */
export function currentStreak(checkins: string[], now = new Date()): number {
  const days = new Set(checkins.map((c) => c.slice(0, 10)))
  let streak = 0
  const cursor = new Date(now)
  // allow today not yet trained: start from today, stop at first gap > 1
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Monday (local) of the week containing d → a stable week key.
function mondayKey(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return dayKey(x)
}

/** Monday-of-week key for a local "YYYY-MM-DD" string (no timezone drift). */
export function weekStartOf(dateStr: string): string {
  return mondayKey(new Date(dateStr.slice(0, 10) + 'T00:00:00'))
}

/**
 * How many of the plan's days were trained during the given Monday-week — the
 * weekly progress ring. A session counts for a day if it matches by id OR label,
 * so a coach re-saving the sheet (which can regenerate day ids) never drops a day
 * the member really did, and stale sessions from an old layout can't push the
 * count past the real number of plan days.
 */
export function daysTrainedInWeek(
  days: ReadonlyArray<{ id: string; label: string }>,
  sessions: ReadonlyArray<{ date: string; dayId: string; dayLabel?: string }>,
  weekKey: string,
): number {
  const wk = sessions.filter((s) => weekStartOf(s.date) === weekKey)
  return days.filter((d) =>
    wk.some((s) => s.dayId === d.id || (!!s.dayLabel && s.dayLabel === d.label)),
  ).length
}

/**
 * Schedule-aware streak: consecutive WEEKS with at least one training day.
 * Members train on appointments (e.g. Mon/Wed/Fri), so skipping a non-training
 * day must NOT break the streak — only skipping a whole week does. The current
 * week not being trained yet doesn't break it either.
 */
export function currentStreakWeeks(checkins: string[], now = new Date()): number {
  const weeks = new Set(checkins.map((c) => mondayKey(new Date(c.slice(0, 10) + 'T00:00:00'))))
  const cursor = new Date(now)
  if (!weeks.has(mondayKey(cursor))) cursor.setDate(cursor.getDate() - 7) // current week pending → look back
  let streak = 0
  while (weeks.has(mondayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

export const fmtKg = (n: number): string =>
  (Math.round(n * 10) / 10).toLocaleString('es-AR', { maximumFractionDigits: 1 })

export const fmtTonnage = (kg: number): string =>
  kg >= 1000 ? `${(kg / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} t` : `${Math.round(kg)} kg`
