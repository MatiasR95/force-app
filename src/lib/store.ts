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
  kind: 'checkin' | 'set' | 'session' | 'note' | 'record'
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

// ---- identity -------------------------------------------------------------
export const getToken = () => read<string | null>(KEYS.token, null)
export const setToken = (t: string) => write(KEYS.token, t)
export const getClientName = () => read<string | null>(KEYS.client, null)
export const setClientName = (n: string) => write(KEYS.client, n)

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

export const getMyRecords = (): RecordEntry[] => read<RecordEntry[]>(KEYS.myRecords, [])
export function addMyRecord(entry: RecordEntry): RecordEntry[] {
  const all = [...getMyRecords(), entry]
  write(KEYS.myRecords, all)
  enqueue('record', entry)
  return all
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
