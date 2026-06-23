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

export const fmtKg = (n: number): string =>
  (Math.round(n * 10) / 10).toLocaleString('es-AR', { maximumFractionDigits: 1 })

export const fmtTonnage = (kg: number): string =>
  kg >= 1000 ? `${(kg / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} t` : `${Math.round(kg)} kg`
