import type { ExerciseRow, Block, Load, Routine, WeekCell } from './types'
import { getStartWeek, localDate } from './store'
import { isHangingLoad } from './plates'
import { slugify, classifyPattern } from './normalize'

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
  plan: number[] | null     // non-linear per-series reps ("4X1+3X3" → [4,3,3,3])
  timeSec: number | null    // HIIT/timed work-time in seconds for this week ("25¨X4" → 25)
  name: string              // the lift to train THIS week (a variation week swaps it)
  slug: string              // media/animation key for `name`
  substitution: boolean     // true when the coach swapped the lift for this week only
}

/** "+5kg" / "↑2,5kg" in a week cell means "last week's weight PLUS that", not 5 kg. */
function mergeLoad(w: WeekCell, prev: Resolved): Load {
  const l = w.load
  if (!l) return prev.load
  // The cell names no weight and no band — it prescribes reps/series only ("2X4 ↑kg
  // x lado", "6X4"). Keep last week's weight instead of blanking it: showing "—" for
  // a lift the member has been loading all cycle is worse than repeating the weight.
  if (l.value == null && !l.band) return prev.load
  if (!l.delta || l.value == null) return l
  if (prev.load.value == null) return { ...l, delta: false } // nothing to add to
  return { ...l, value: prev.load.value + l.value, perSide: l.perSide || prev.load.perSide, delta: false }
}

// Merge one "Semana N" cell onto the previous week's resolved prescription.
function applyCell(w: WeekCell, prev: Resolved): Resolved {
  if (w.inherit) return prev // "Mismo semana ant."
  if (w.complex) {
    // a non-linear per-series plan ("4X1+3X3"): the series count IS the plan length,
    // and the raw scheme stays as the label. (timeSec carries through via ...prev.)
    if (w.plan && w.plan.length) {
      return { ...prev, sets: w.plan.length, plan: w.plan, load: mergeLoad(w, prev), complexRaw: w.raw }
    }
    return { ...prev, load: mergeLoad(w, prev), complexRaw: w.raw }
  }
  // a partial cell (e.g. "5X4" with no weight) inherits the missing fields from
  // the previous week, per the repeat-previous rule.
  return {
    reps: w.reps ?? prev.reps,
    sets: w.sets ?? prev.sets,
    repsRaw: w.reps != null ? String(w.reps) : prev.repsRaw,
    setsRaw: w.sets != null ? String(w.sets) : prev.setsRaw,
    load: mergeLoad(w, prev),
    complexRaw: null,
    plan: null,
    // a timed HIIT override ("25¨X4") carries new seconds; a plain cell inherits.
    timeSec: w.timeSec ?? prev.timeSec,
    name: prev.name, slug: prev.slug, substitution: prev.substitution,
  }
}

/**
 * The BASE progression at `week` — the chain a blank cell inherits from.
 * Substitution weeks are deliberately skipped: when a coach swaps the lift for one
 * variation week (Matias's plan does it every 4th week) and leaves the following
 * weeks blank, those blanks mean "resume the normal progression", not "keep doing
 * the variation forever". Vetted with the S&C coach.
 */
function carryTo(ex: ExerciseRow, week: number): Resolved {
  const base: Resolved = {
    reps: ex.reps, sets: ex.sets, repsRaw: ex.repsRaw, setsRaw: ex.setsRaw,
    load: ex.load,
    complexRaw: ex.plan && ex.plan.length ? (ex.raw.series || ex.raw.reps) : null,
    plan: ex.plan ?? null,
    timeSec: ex.timeSec,
    name: ex.name, slug: ex.slug, substitution: false,
  }
  if (week <= 1) {
    // some coaches put week 1 in an explicit "Semana 1" column instead of the
    // base cells — honor it so week 1 isn't read from blank base columns.
    const w1 = ex.weeks[1]
    return w1 && !w1.name ? applyCell(w1, base) : base
  }
  const w = ex.weeks[week]
  // GYM RULE: a blank/missing week cell means "repeat the PREVIOUS week" (load,
  // series and reps) — not "fall back to week 1". So weeks past the last defined
  // column (e.g. weeks 4–8 of an 8-week plan that only lists Semana 2/3) inherit
  // the last week that WAS defined, walking back one week at a time.
  if (!w) return carryTo(ex, week - 1)
  // "Mismo semana 4" repeats THAT week, not simply the one before this cell.
  if (w.inherit && w.inheritFrom) return carryTo(ex, w.inheritFrom)
  // A substitution week is skipped so the weeks after it resume the base lift's
  // progression — but only when it carries its OWN weight. If it doesn't (or if the
  // swap was a misread), dropping it would strand later weeks on an older, lighter
  // load, so the prescription still flows through.
  if (w.name && w.load?.value != null) return carryTo(ex, week - 1)
  return applyCell(w, carryTo(ex, week - 1))
}

function resolveRaw(ex: ExerciseRow, week: number): Resolved {
  const w = ex.weeks[week]
  if (w?.name) {
    // this week trains a DIFFERENT lift: its own prescription, on top of the base
    // progression up to the previous week (so a swap cell with no weight still
    // inherits something sane), and the substituted name/animation/cues.
    const own = applyCell(w, carryTo(ex, week - 1))
    return { ...own, name: w.name, slug: slugify(w.name), substitution: true }
  }
  return carryTo(ex, week)
}

export function resolveWeek(ex: ExerciseRow, week: number): Resolved {
  // a non-finite week (a corrupted anchor) would recurse forever — clamp to 1
  const w = Number.isFinite(week) ? Math.max(1, Math.floor(week)) : 1
  const r = resolveRaw(ex, w)
  if (r.load.value == null) return r
  // ---- normalize per-side semantics (display + records + plate calc) --------
  // judged on the lift ACTUALLY trained this week (a swap week may hang the load
  // even when the base lift doesn't, or the other way round).
  const hanging = isHangingLoad(r.name)
  // weighted pull-ups/dips hang a single load — never "per side" (a coach typo or
  // a mid-cycle cable swap must not show an impossible "x lado" / plate calc).
  if (hanging && r.load.perSide) return { ...r, load: { ...r.load, perSide: false } }
  // a week cell that gives a NEW weight but omits "x lado" keeps the exercise's
  // per-side convention — coaches write "70kg" as shorthand for "70 x lado" when
  // the base lift was already per side (e.g. deadlift week 4 "6X4 70kg c/bandas").
  // NOT across a substitution: the swapped lift has its own convention (a cable
  // pulldown is one stack even if the base lift was loaded per side). Inheriting it
  // doubled the weight and pushed a fabricated PR onto the gym-wide records board.
  if (!hanging && !r.substitution && !r.load.perSide && ex.load.perSide)
    return { ...r, load: { ...r.load, perSide: true } }
  return r
}

/**
 * The exercise AS TRAINED in a given week. On a variation week the coach swapped the
 * lift inside the "Semana N" cell, so the name, media/animation, movement pattern,
 * coaching cues and record matching must all follow the substitute — while the id and
 * sheet row stay put, so logging and writeback still land on the right cell.
 * Returns the row untouched when there's no substitution.
 */
export function liftOfWeek(ex: ExerciseRow, week: number): ExerciseRow {
  const r = resolveWeek(ex, week)
  if (!r.substitution || !r.name) return ex
  return { ...ex, name: r.name, slug: r.slug, pattern: classifyPattern(r.name) }
}

/** The base lift this week's substitute replaces, or null when nothing was swapped. */
export function substitutedFrom(ex: ExerciseRow, week: number): string | null {
  return resolveWeek(ex, week).substitution ? ex.name : null
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
  if (a && Number.isFinite(a.week)) {
    const days = Math.floor((Date.parse(localDate() + 'T00:00:00') - Date.parse(a.date + 'T00:00:00')) / 86_400_000)
    // a corrupted/legacy anchor date must not poison the week with NaN
    if (Number.isFinite(days)) return Math.min(total, Math.max(1, a.week + Math.floor(Math.max(0, days) / 7)))
  }
  return currentWeek(routine.meta.startDate, total)
}
