// Gym-wide records (PRs) for a fixed set of headline lifts. Records are captured
// AUTOMATICALLY when a member completes a set of a record-eligible lift during a
// session (never entered by hand), split by gender, shown as a leaderboard with
// the current member's mark compared to the top.

import { deburr } from './normalize'

export type Gender = 'M' | 'F'

export interface RecordLift {
  key: string
  label: string
  emoji: string
}

// The only lifts that count for records (per Matias).
export const RECORD_LIFTS: RecordLift[] = [
  { key: 'sentadilla', label: 'Sentadilla', emoji: '🦵' },
  { key: 'peso-muerto', label: 'Peso Muerto', emoji: '🏋️' },
  { key: 'peso-muerto-hex', label: 'Peso Muerto Hexagonal', emoji: '⬡' },
  { key: 'peso-muerto-sumo', label: 'Peso Muerto Sumo', emoji: '🤼' },
  { key: 'press-banca', label: 'Press de Banca', emoji: '💪' },
  { key: 'press-banca-db', label: 'Press Banca Mancuernas', emoji: '🏋️‍♀️' },
  { key: 'dominadas', label: 'Dominadas (con lastre)', emoji: '🧗' },
  { key: 'press-militar', label: 'Press Militar', emoji: '🪖' },
]

export const liftLabel = (key: string): string =>
  RECORD_LIFTS.find((l) => l.key === key)?.label ?? key

export interface RecordEntry {
  id: string
  client: string
  gender: Gender
  lift: string      // RecordLift.key
  kg: number        // total weight lifted
  reps: number
  ts: string        // ISO
  wc?: string       // bodyweight category key at the time (see weightClass)
}

// Bodyweight categories per gender — 4 brackets each, tuned to Argentine averages
// (men ~82 kg, women ~68 kg fall in the middle brackets) so it's fairer.
//   Men:   Hasta 70 · 71–83 · 84–95 · +95
//   Women: Hasta 55 · 56–65 · 66–75 · +75
export interface WeightClass { key: string; label: string }
export const WEIGHT_CLASSES: Record<Gender, WeightClass[]> = {
  M: [
    { key: 'm-70', label: 'Hasta 70 kg' },
    { key: 'm71-83', label: '71–83 kg' },
    { key: 'm84-95', label: '84–95 kg' },
    { key: 'm95+', label: '+95 kg' },
  ],
  F: [
    { key: 'f-55', label: 'Hasta 55 kg' },
    { key: 'f56-65', label: '56–65 kg' },
    { key: 'f66-75', label: '66–75 kg' },
    { key: 'f75+', label: '+75 kg' },
  ],
}

/** The weight category for a bodyweight, or null if bodyweight is unknown. */
export function weightClass(gender: Gender, bw: number | null | undefined): WeightClass | null {
  if (bw == null || bw <= 0) return null
  if (gender === 'M') return bw <= 70 ? WEIGHT_CLASSES.M[0] : bw <= 83 ? WEIGHT_CLASSES.M[1] : bw <= 95 ? WEIGHT_CLASSES.M[2] : WEIGHT_CLASSES.M[3]
  return bw <= 55 ? WEIGHT_CLASSES.F[0] : bw <= 65 ? WEIGHT_CLASSES.F[1] : bw <= 75 ? WEIGHT_CLASSES.F[2] : WEIGHT_CLASSES.F[3]
}

export const wcLabel = (key: string): string => {
  for (const g of ['M', 'F'] as Gender[]) {
    const f = WEIGHT_CLASSES[g].find((w) => w.key === key)
    if (f) return f.label
  }
  return 'General'
}

// Streak leaderboard (gym-wide, weeks). `weeks` = current streak, `max` = personal best.
export interface StreakEntry {
  client: string
  weeks: number
  max: number
}

export const epley1RM = (kg: number, reps: number): number =>
  kg <= 0 || reps <= 0 ? 0 : Math.round(kg * (1 + reps / 30) * 10) / 10

// Rank: heaviest weight first, then more reps (a record is "X kg × Y reps").
export function rank(entries: RecordEntry[]): RecordEntry[] {
  return [...entries].sort((a, b) => (b.kg - a.kg) || (b.reps - a.reps))
}

/**
 * Identity key for a member. Names arrive from the coaches' sheets, so the same
 * person can be written "Juan Pérez", "juan perez" or "JUAN  PEREZ" — without
 * folding accents/case/spacing they'd rank as three different people (and the
 * member's own row would fail to light up as "vos").
 */
export const clientKey = (name: string): string =>
  deburr(name).trim().replace(/\s+/g, ' ')
export const sameClient = (a: string, b: string): boolean => clientKey(a) === clientKey(b)

/**
 * One entry per member — their best. The leaderboard is a hall of fame, not a
 * log: someone who set three PRs on the same lift is ONE person on the board.
 * Run this AFTER filtering by lift/gender/category, so a category board still
 * shows each member's best mark *within that category*.
 */
export function bestPerClient(entries: RecordEntry[]): RecordEntry[] {
  const best = new Map<string, RecordEntry>()
  for (const e of entries) {
    const k = clientKey(e.client)
    const cur = best.get(k)
    // same comparator as rank(): heavier wins, then more reps
    if (!cur || e.kg > cur.kg || (e.kg === cur.kg && e.reps > cur.reps)) best.set(k, e)
  }
  return [...best.values()]
}

/** The leaderboard: one row per member, heaviest first. */
export const rankUnique = (entries: RecordEntry[]): RecordEntry[] => rank(bestPerClient(entries))

/** Best entry for a given client within a list (already lift+gender filtered). */
export function bestOf(entries: RecordEntry[], client: string): RecordEntry | null {
  const mine = rank(entries.filter((e) => sameClient(e.client, client)))
  return mine[0] ?? null
}

/**
 * Map an exercise name to a record lift key, or null if it's not record-eligible.
 *
 * The board is a gym-wide leaderboard split by gender and weight category, so a mark
 * only belongs on it if the number MEANS the same thing for everyone. Three ways a
 * name fails that, all vetted with the S&C coach against the 192 exercise names the
 * coaches actually write in their sheets:
 *
 *  1. It's a different lift (front/Zercher/landmine/Hatfield squat, incline bench,
 *     RDL, box & pin squats, Arnold press...).
 *  2. The kg the app computes isn't the kg that was lifted. `recordKg` doubles a
 *     "x lado" load and adds a 20 kg bar — wrong for a SINGLE-LIMB press, for a
 *     plate-loaded MACHINE (no bar at all), and for a SPECIALTY BAR (an SSB is
 *     25-32 kg, a Swiss bar varies by model).
 *  3. The resistance isn't the bar. Chains and bands change the load through the
 *     range — and a band on a PULL-UP does the opposite of a record: it ASSISTS, so
 *     the member moved LESS than bodyweight, not more.
 *
 * Deliberately NOT excluded: pauses and tempo prescriptions ("+ 1"", "TEMPO 3:2:0").
 * The lift and the kilos are real, only the intent is submaximal — and 18 of the
 * gym's members train their big lifts that way, so dropping them empties the board.
 */

// Single-limb work. `recordKg`'s "x lado" doubling assumes two limbs sharing ONE bar;
// one arm (or one leg) moving its own load is not that, and doubling it invents a mark.
const UNILATERAL = /\b1 ?brazo\b|\b1 ?b\b|\b1 ?pie\b|1 arm|one arm|unilateral|alternad|alternated|alternating|\balt\.? /
// The bar the app assumes isn't the bar that was used: a plate-loaded machine has no
// 20 kg bar, and a specialty bar doesn't weigh 20 kg either.
const WRONG_BAR = /hammer|maquina|machine|barra suiza|swiss|\bssb\b/
// Chains and bands change the resistance through the range, so the logged weight is
// not the mark. On a pull-up a band is ASSISTANCE — the opposite of added load.
const ACCOMMODATING = /cadenas?|\bbandas?\b|c\/banda|con banda/

export function matchRecordLift(name: string): string | null {
  const s = deburr(name)
  if (UNILATERAL.test(s) || WRONG_BAR.test(s) || ACCOMMODATING.test(s)) return null
  // squats: the back squat only — EXCLUDE bulgarian/split/sissy/pistol/hack/leg-press/
  // lunges/Hatfield (both spellings the coaches use)/FRONT squat/goblet, dumbbell, KB
  // and wall variants, plus box & pin squats and deficit/Zercher/landmine work, which
  // move the range of motion or the loading axis somewhere else entirely.
  if (/sentadilla|squat/.test(s)
    && !/bulgara|split|sissy|pistol|hack|prensa|estocada|zancada|hatfield|hadfield|frontal|\bfront\b|goblet|\bdb\b|mancuerna|dumbbell|wall|pared|zecher|zercher|ladmine|landmine|\bkb\b|kettlebell|pesa rusa|al banco|\bbanco\b|cajon|\bpines\b|deficit|abierta/.test(s)) return 'sentadilla'
  // trap-bar deadlift — but not a split stance, a deficit or an altered range
  if (/hex/.test(s) && /peso muerto|deadlift/.test(s))
    return /split|deficit|\brom\b/.test(s) ? null : 'peso-muerto-hex'
  if (/sumo/.test(s) && /peso muerto|deadlift/.test(s))
    return /split|deficit|\brom\b/.test(s) ? null : 'peso-muerto-sumo'
  // conventional deadlift only (exclude romanian/RDL — es AND en — good-morning,
  // unipodal, deficit pulls and rack pulls, which are a different range)
  if (/peso muerto|deadlift/.test(s) && !/rumano|romanian|\brdl\b|buenos dias|good ?morning|unipodal|deficit|rack pull/.test(s)) return 'peso-muerto'
  // bench with dumbbells
  if (/(press (plano|de banca|banca)|banca|bench).*(mancuerna|db)|(mancuerna|db).*(press (plano|banca)|banca|bench)/.test(s)) return 'press-banca-db'
  // flat barbell bench only (exclude incline, reverse/close grip, chaos and floor press)
  if (/press plano|press (de )?banca|press banca|bench press|\bbanca\b/.test(s)
    && !/inclinad|incline|supinad|cerrad|caos|chaos|floor|piso/.test(s)) return 'press-banca'
  // weighted pull-ups — the kg is ADDED load, so an assisted rep never counts
  if (/dominada|pull ?up|chin ?up/.test(s))
    return /asistid|assist|gravitron/.test(s) ? null : 'dominadas'
  // strict barbell military/overhead press — exclude Arnold/seated/push-press and the
  // other accessory overhead variants so they don't fire a false record
  if (/press militar|militar|overhead press|press (de )?hombros?/.test(s)
    && !/arnold|sentad|seated|inclinad|incline|push press|cubano|z press|\bkb\b|kettlebell|mancuerna/.test(s)) return 'press-militar'
  return null
}

/** Total kg lifted for a record from a per-side value + implement (bar = 20kg). */
export function recordKg(value: number, perSide: boolean, isBarbell: boolean, barKg = 20): number {
  if (!perSide) return value
  return value * 2 + (isBarbell ? barKg : 0)
}

/**
 * Read the weight the member actually used from their observación, if they
 * mentioned one (e.g. "bajé a 25kg", "subí a 30kg", "lo hice con 27,5kg").
 * Used to correct the auto-record up OR down to what they really lifted.
 */
export function noteWeight(note: string): number | null {
  if (!note) return null
  const s = deburr(note)
  const m =
    s.match(/(?:baj\w*\s*a|sub\w*\s*a|hice\s*(?:con)?|lo hice con|con|us\w*|qued\w*\s*en|termin\w*\s*con|a)\s*(\d+(?:[.,]\d+)?)\s*kg/) ||
    s.match(/(\d+(?:[.,]\d+)?)\s*kg/)
  return m ? parseFloat(m[1].replace(',', '.')) : null
}
