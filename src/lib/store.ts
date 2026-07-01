// Client-side persistence + offline outbox. All inputs (check-ins, RPE, notes,
// actual loads, set completion) save locally first (optimistic), then flush to
// the backend when online. Coaches read the synced log in the Seguimiento sheet.

import type { RecordEntry, Gender } from './records'

export interface SetLog {
  exerciseId: string
  dayId: string
  done: boolean
  actualKg?: number
  actualReps?: number
  ts: string // local ISO
}

export interface SessionLog {
  date: string        // local YYYY-MM-DD
  dayId: string
  rpe?: number        // session RPE 1–10
  note?: string
  durationMin?: number
  week?: number       // plan week trained
  dayLabel?: string   // e.g. "DÍA 1"
  bigOne?: string     // the Big One performed (for the "last time" recap)
}

export interface OutboxItem {
  id: string
  kind: 'checkin' | 'set' | 'session' | 'note' | 'record' | 'cell'
  payload: unknown
  ts: string
}

const KEYS = {
  token: 'force.token',
  client: 'force.client',
  checkins: 'force.checkins',
  sets: 'force.sets',
  sessions: 'force.sessions',
  outbox: 'force.outbox',
  restPref: 'force.restPref',
  gender: 'force.gender',
  myRecords: 'force.myRecords',
  notes: 'force.notes',
  actuals: 'force.actuals',
  maxStreak: 'force.maxStreak',
  bodyweights: 'force.bodyweights',
  birthday: 'force.birthday',
  startDay: 'force.startDay',
  startWeek: 'force.startWeek',
  introSeen: 'force.introSeen',
  lastDone: 'force.lastDone',
  seenMedals: 'force.seenMedals',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, val: T): void {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* quota */ }
}

const pad = (n: number) => String(n).padStart(2, '0')
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const rid = (): string =>
  `${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`

/** "hoy" / "ayer" / "hace N días" / "hace N semanas" for a YYYY-MM-DD date. */
export function relDay(date: string): string {
  const days = Math.round((Date.parse(localDate() + 'T00:00:00') - Date.parse(date + 'T00:00:00')) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  if (days < 14) return 'hace 1 semana'
  return `hace ${Math.floor(days / 7)} semanas`
}

// ---- identity -------------------------------------------------------------
export const getToken = () => read<string | null>(KEYS.token, null)
export const setToken = (t: string) => write(KEYS.token, t)
export const getClientName = () => read<string | null>(KEYS.client, null)
export const setClientName = (n: string) => write(KEYS.client, n)

// The brand welcome (Intro) plays once, then we remember it — so an iOS PWA that
// gets killed in the background and relaunched doesn't dump the member back on the
// welcome screen every time (they just land on their routine).
export const getIntroSeen = (): boolean => read<boolean>(KEYS.introSeen, false)
export const setIntroSeen = (): void => write(KEYS.introSeen, true)

/** Pull the access token out of a pasted access link (or a bare token). */
export function extractToken(input: string): string | null {
  const v = input.trim()
  if (!v) return null
  const m = v.match(/[?&]t=([^&\s]+)/) // a full link / query string
  if (m) { try { return decodeURIComponent(m[1]) } catch { return m[1] } }
  if (/^[A-Za-z0-9_-]{6,}$/.test(v)) return v // a bare token
  return null
}

// ---- check-ins ------------------------------------------------------------
export const getCheckins = (): string[] => read<string[]>(KEYS.checkins, [])
export function addCheckin(date = localDate()): string[] {
  const all = new Set(getCheckins())
  all.add(date)
  const arr = [...all].sort()
  write(KEYS.checkins, arr)
  enqueue('checkin', { date })
  return arr
}
export const hasCheckedInToday = (): boolean => getCheckins().includes(localDate())

/** Most recent training day (from check-ins or completed sessions), or null. */
export function lastTrainingDay(): string | null {
  const dates = [...getCheckins(), ...getSessions().map((s) => s.date)].filter(Boolean).sort()
  return dates.length ? dates[dates.length - 1] : null
}

// ---- set logs -------------------------------------------------------------
export const getSets = (): SetLog[] => read<SetLog[]>(KEYS.sets, [])
export function logSet(entry: Omit<SetLog, 'ts'>): SetLog[] {
  const all = getSets().filter((s) => s.exerciseId !== entry.exerciseId)
  const item: SetLog = { ...entry, ts: new Date().toISOString() }
  all.push(item)
  write(KEYS.sets, all)
  enqueue('set', item)
  return all
}
export const getSetLog = (exerciseId: string): SetLog | undefined =>
  getSets().find((s) => s.exerciseId === exerciseId)

// ---- session logs (RPE / notes) ------------------------------------------
export const getSessions = (): SessionLog[] => read<SessionLog[]>(KEYS.sessions, [])
export function logSession(entry: SessionLog): SessionLog[] {
  const all = getSessions().filter((s) => !(s.date === entry.date && s.dayId === entry.dayId))
  all.push(entry)
  write(KEYS.sessions, all)
  enqueue('session', entry)
  return all
}
export const getSession = (date: string, dayId: string): SessionLog | undefined =>
  getSessions().find((s) => s.date === date && s.dayId === dayId)

/** Most recent session (by date then insertion), for the "última vez" recap. */
export function lastSession(): SessionLog | null {
  const all = getSessions()
  if (!all.length) return null
  return [...all].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(-1)[0]
}

// ---- streak history (personal best racha, in weeks) -----------------------
export const getMaxStreak = (): number => read<number>(KEYS.maxStreak, 0)
export function bumpMaxStreak(current: number): number {
  const max = Math.max(getMaxStreak(), current)
  write(KEYS.maxStreak, max)
  return max
}

// ---- rest-timer preference (client-controlled pause length) ---------------
const DEFAULT_REST = 120
export const getRestPref = (): number => {
  const n = read<number>(KEYS.restPref, DEFAULT_REST)
  return typeof n === 'number' && n > 0 ? n : DEFAULT_REST
}
export const setRestPref = (sec: number): void =>
  write(KEYS.restPref, Math.max(15, Math.min(600, Math.round(sec))))

// ---- records (PRs) --------------------------------------------------------
export const getGender = (): Gender | null => read<Gender | null>(KEYS.gender, null)
export const setGender = (g: Gender): void => write(KEYS.gender, g)

// ---- first-run starting day ----------------------------------------------
// On first launch (before any session is logged) the member tells us which day
// of their plan they're starting on, so the app suggests the right one. After
// that, the suggestion follows what they've actually completed. '' = skipped.
export const getStartDay = (): string | null => read<string | null>(KEYS.startDay, null)
export const setStartDay = (dayId: string): void => write(KEYS.startDay, dayId)

// Members often join mid-cycle (e.g. "I start on week 5"). We anchor their week to
// the date they told us, so it advances on its own each real week afterwards.
export interface WeekAnchor { week: number; date: string }
export const getStartWeek = (): WeekAnchor | null => read<WeekAnchor | null>(KEYS.startWeek, null)
export const setStartWeek = (week: number): void => write(KEYS.startWeek, { week, date: localDate() })

export const getMyRecords = (): RecordEntry[] => read<RecordEntry[]>(KEYS.myRecords, [])
export function addMyRecord(entry: RecordEntry): RecordEntry[] {
  const all = [...getMyRecords(), entry]
  write(KEYS.myRecords, all)
  enqueue('record', entry)
  return all
}

// ---- bodyweight (for record categories) + birthday ------------------------
// Bodyweight is kept as a dated history so we can nudge for a monthly update and
// classify records by the weight at the time. Birthday drives the cumpleaños board.
export interface BodyweightEntry { date: string; kg: number }
export const getBodyweights = (): BodyweightEntry[] => read<BodyweightEntry[]>(KEYS.bodyweights, [])
export function addBodyweight(kg: number, date = localDate()): BodyweightEntry[] {
  const all = getBodyweights().filter((b) => b.date !== date) // one entry per day
  all.push({ date, kg: Math.round(kg * 10) / 10 })
  all.sort((a, b) => (a.date < b.date ? -1 : 1))
  write(KEYS.bodyweights, all)
  enqueue('note', { kind: 'bodyweight', kg, date })
  return all
}
export function getBodyweight(): number | null {
  const all = getBodyweights()
  return all.length ? all[all.length - 1].kg : null
}
/** Days since the last bodyweight entry, or null if none. */
export function bodyweightAgeDays(): number | null {
  const all = getBodyweights()
  if (!all.length) return null
  const last = new Date(all[all.length - 1].date + 'T00:00:00').getTime()
  return Math.floor((new Date(localDate() + 'T00:00:00').getTime() - last) / 86_400_000)
}

export const getBirthday = (): string | null => read<string | null>(KEYS.birthday, null) // 'MM-DD'
export function setBirthday(mmdd: string): void {
  write(KEYS.birthday, mmdd)
  enqueue('note', { kind: 'birthday', birthday: mmdd })
}
/** True if today (local) matches the stored birthday. */
export function isBirthdayToday(): boolean {
  const b = getBirthday()
  return !!b && localDate().slice(5) === b
}

// ---- per-exercise observaciones (client notes during a session) -----------
type NoteMap = Record<string, string>
export const getNote = (exerciseId: string): string => read<NoteMap>(KEYS.notes, {})[exerciseId] ?? ''
export function saveNote(exerciseId: string, dayId: string, text: string): void {
  const map = read<NoteMap>(KEYS.notes, {})
  const t = text.trim()
  if (t) map[exerciseId] = t
  else delete map[exerciseId]
  write(KEYS.notes, map)
  enqueue('note', { exerciseId, dayId, note: t, date: localDate() })
}

// ---- actuals (client-edited weight/reps/series for what they really did) ----
export interface Actual { kg?: number; reps?: number; sets?: number } // kg = per-side as written
type ActualMap = Record<string, Actual>
export const getActual = (exerciseId: string): Actual | undefined =>
  read<ActualMap>(KEYS.actuals, {})[exerciseId]
export function saveActual(exerciseId: string, dayId: string, a: Actual): void {
  const m = read<ActualMap>(KEYS.actuals, {})
  m[exerciseId] = { ...m[exerciseId], ...a }
  write(KEYS.actuals, m)
  enqueue('set', { exerciseId, dayId, actualKg: m[exerciseId].kg, actualReps: m[exerciseId].reps, actualSets: m[exerciseId].sets, date: localDate() })
}

// ---- "última vez" per exercise (a light memory aid for progressive overload) ----
// Snapshotted when a working set is completed, read next session to show what the
// member did last time for this exact exercise slot. Purely local (display only).
export interface LastDone { kg: number | null; reps: number | null; perSide: boolean; date: string }
type LastDoneMap = Record<string, LastDone>
export const getLastDone = (exerciseId: string): LastDone | undefined =>
  read<LastDoneMap>(KEYS.lastDone, {})[exerciseId]
export function setLastDone(exerciseId: string, v: LastDone): void {
  const m = read<LastDoneMap>(KEYS.lastDone, {})
  m[exerciseId] = v
  write(KEYS.lastDone, m)
}

// ---- medals already celebrated (so a new one triggers the unlock card once) ----
export const getSeenMedals = (): string[] => read<string[]>(KEYS.seenMedals, [])
export function markMedalsSeen(ids: string[]): void {
  if (!ids.length) return
  write(KEYS.seenMedals, [...new Set([...getSeenMedals(), ...ids])])
}

// ---- routine sheet writeback (overwrite prescription cells) ---------------
// The client's edits overwrite the matching cell in their routine sheet. Each
// write is queued in the outbox (offline-safe) and flushed to the `updateCells`
// backend endpoint. No-op in demo (no token) — items just stay queued.
export interface CellWrite { row: number; col: number; value: string }
export function queueCellWrites(writes: CellWrite[]): void {
  for (const w of writes) enqueue('cell', w)
}

// ---- offline outbox -------------------------------------------------------
export const getOutbox = (): OutboxItem[] => read<OutboxItem[]>(KEYS.outbox, [])
export function enqueue(kind: OutboxItem['kind'], payload: unknown): void {
  const box = getOutbox()
  box.push({ id: rid(), kind, payload, ts: new Date().toISOString() })
  write(KEYS.outbox, box)
}
export function clearOutbox(ids: string[]): void {
  write(KEYS.outbox, getOutbox().filter((i) => !ids.includes(i.id)))
}
