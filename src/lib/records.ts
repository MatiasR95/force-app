// Gym-wide records (PRs) for a fixed set of headline lifts. Members submit a
// record ONLY after they hit it (it may not have happened yet), split by gender,
// shown as a leaderboard with the current member's mark compared to the top.

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

// ---- demo seed (so the leaderboard looks alive before the backend is wired) --
const N = (s: string) => s
export const SEED_RECORDS: RecordEntry[] = [
  // squat
  { id: 's1', client: N('Sergio Sosa'), gender: 'M', lift: 'sentadilla', kg: 180, reps: 1, ts: '2026-06-01' },
  { id: 's2', client: N('Tomás Vega'), gender: 'M', lift: 'sentadilla', kg: 160, reps: 3, ts: '2026-06-02' },
  { id: 's3', client: N('Alva Cornaggia'), gender: 'F', lift: 'sentadilla', kg: 110, reps: 2, ts: '2026-06-03' },
  { id: 's4', client: N('Cami Von Wernich'), gender: 'F', lift: 'sentadilla', kg: 95, reps: 5, ts: '2026-06-04' },
  // deadlift
  { id: 'd1', client: N('Sergio Sosa'), gender: 'M', lift: 'peso-muerto', kg: 220, reps: 1, ts: '2026-06-01' },
  { id: 'd2', client: N('Santi Maffia'), gender: 'M', lift: 'peso-muerto', kg: 190, reps: 2, ts: '2026-06-05' },
  { id: 'd3', client: N('Alva Cornaggia'), gender: 'F', lift: 'peso-muerto', kg: 140, reps: 1, ts: '2026-06-03' },
  // bench
  { id: 'b1', client: N('Tomás Vega'), gender: 'M', lift: 'press-banca', kg: 130, reps: 1, ts: '2026-06-02' },
  { id: 'b2', client: N('Santi Maffia'), gender: 'M', lift: 'press-banca', kg: 110, reps: 4, ts: '2026-06-05' },
  { id: 'b3', client: N('Cami Von Wernich'), gender: 'F', lift: 'press-banca', kg: 65, reps: 3, ts: '2026-06-04' },
  // pull-ups
  { id: 'p1', client: N('Sergio Sosa'), gender: 'M', lift: 'dominadas', kg: 50, reps: 3, ts: '2026-06-01' },
  { id: 'p2', client: N('Alva Cornaggia'), gender: 'F', lift: 'dominadas', kg: 20, reps: 5, ts: '2026-06-03' },
  // military
  { id: 'm1', client: N('Santi Maffia'), gender: 'M', lift: 'press-militar', kg: 75, reps: 2, ts: '2026-06-05' },
]
