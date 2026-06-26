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

// Bodyweight categories per gender (confirmed with Matias).
//   Men:   Hasta 65 · 66–80 · +80
//   Women: Hasta 50 · 51–65 · +65
export interface WeightClass { key: string; label: string }
export const WEIGHT_CLASSES: Record<Gender, WeightClass[]> = {
  M: [
    { key: 'm-65', label: 'Hasta 65 kg' },
    { key: 'm66-80', label: '66–80 kg' },
    { key: 'm80+', label: '+80 kg' },
  ],
  F: [
    { key: 'f-50', label: 'Hasta 50 kg' },
    { key: 'f51-65', label: '51–65 kg' },
    { key: 'f65+', label: '+65 kg' },
  ],
}

/** The weight category for a bodyweight, or null if bodyweight is unknown. */
export function weightClass(gender: Gender, bw: number | null | undefined): WeightClass | null {
  if (bw == null || bw <= 0) return null
  if (gender === 'M') return bw <= 65 ? WEIGHT_CLASSES.M[0] : bw <= 80 ? WEIGHT_CLASSES.M[1] : WEIGHT_CLASSES.M[2]
  return bw <= 50 ? WEIGHT_CLASSES.F[0] : bw <= 65 ? WEIGHT_CLASSES.F[1] : WEIGHT_CLASSES.F[2]
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

/** Best entry for a given client within a list (already lift+gender filtered). */
export function bestOf(entries: RecordEntry[], client: string): RecordEntry | null {
  const mine = rank(entries.filter((e) => e.client === client))
  return mine[0] ?? null
}

/**
 * Map an exercise name to a record lift key, or null if it's not record-eligible.
 * Only the headline lifts count; variations that aren't records are excluded
 * (bulgarian/split squats, incline bench, romanian/RDL, etc.).
 */
export function matchRecordLift(name: string): string | null {
  const s = deburr(name)
  // squats: the back squat only — EXCLUDE bulgarian/split/sissy/pistol/hack/leg-press/
  // lunges/hatfield/FRONT squat/goblet (front squat is a different lift, not the record)
  if (/sentadilla|squat/.test(s) && !/bulgara|split|sissy|pistol|hack|prensa|estocada|zancada|hatfield|frontal|\bfront\b|goblet/.test(s)) return 'sentadilla'
  if (/hex/.test(s) && /peso muerto|deadlift/.test(s)) return 'peso-muerto-hex'
  if (/sumo/.test(s) && /peso muerto|deadlift/.test(s)) return 'peso-muerto-sumo'
  // conventional deadlift only (exclude romanian / RDL / good-morning)
  if (/peso muerto|deadlift/.test(s) && !/rumano|\brdl\b|buenos dias|good ?morning|unipodal|1 ?pie/.test(s)) return 'peso-muerto'
  // bench with dumbbells
  if (/(press (plano|de banca|banca)|banca|bench).*(mancuerna|db)|(mancuerna|db).*(press (plano|banca)|banca|bench)/.test(s)) return 'press-banca-db'
  // flat barbell bench only (exclude incline)
  if (/press plano|press (de )?banca|press banca|bench press|\bbanca\b/.test(s) && !/inclinad|incline/.test(s)) return 'press-banca'
  if (/dominada|pull ?up|chin ?up/.test(s)) return 'dominadas'
  // strict barbell military/overhead press — exclude alternated/Arnold/seated/push-press
  // and other accessory overhead variants so they don't fire a false record
  if (/press militar|militar|overhead press|press (de )?hombros?/.test(s)
    && !/alternad|alternated|arnold|sentad|seated|inclinad|incline|push press|cubano|landmine|z press|kb|mancuerna|unilateral/.test(s)) return 'press-militar'
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
