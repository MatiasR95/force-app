// Client-side persistence + offline outbox. All inputs (check-ins, RPE, notes,
// actual loads, set completion) save locally first (optimistic), then flush to
// the backend when online. Coaches read the synced log in the Seguimiento sheet.

import type { RecordEntry, Gender } from './records'
import type { ShareData } from '../components/ShareCard' // type-only: erased at build

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
  kg?: number         // session tonnage (prescription-based) — feeds the lifetime odometer
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
  progress: 'force.progress',
  restEdu: 'force.restEdu',
  installNudge: 'force.installNudge',
  recapSeen: 'force.recapSeen',
  routineId: 'force.routineId',
  awakeIdle: 'force.ui.awakeIdleSec',
  finishDraft: 'force.finishDraft',
  fontScale: 'force.ui.fontScale',
  theme: 'force.ui.theme',
  simple: 'force.ui.simple',
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

// The brand welcome (Intro) plays when the member comes back after a real break —
// 6+ hours since it last played (so: every morning, and again for an evening
// session). Relaunches within the window skip it (iOS kills backgrounded PWAs
// constantly; re-showing it every relaunch would get old fast). Stored as a
// timestamp; legacy values from older builds (boolean/date string) read as
// "stale" so the member simply sees it on their next open.
const INTRO_GAP_MS = 6 * 3_600_000
export const getIntroSeen = (): boolean => {
  const v = read<number | string | boolean>(KEYS.introSeen, 0)
  return typeof v === 'number' && v > 0 && Date.now() - v < INTRO_GAP_MS
}
export const setIntroSeen = (): void => write(KEYS.introSeen, Date.now())

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

// ---- rest-time education preference (null = never asked; the member chooses) --
export const getRestEduPref = (): boolean | null => read<boolean | null>(KEYS.restEdu, null)
export const setRestEduPref = (v: boolean): void => write(KEYS.restEdu, v)

// ---- install nudge (branded "agregar a inicio" sheet, shown once) -----------
export const installNudgeSeen = (): boolean => read<boolean>(KEYS.installNudge, false)
export const markInstallNudgeSeen = (): void => write(KEYS.installNudge, true)

// ---- records (PRs) --------------------------------------------------------
export const getGender = (): Gender | null => read<Gender | null>(KEYS.gender, null)
export const setGender = (g: Gender): void => write(KEYS.gender, g)

// ---- first-run starting day ----------------------------------------------
// On first launch (before any session is logged) the member tells us which day
// of their plan they're starting on, so the app suggests the right one. After
// that, the suggestion follows what they've actually completed. '' = skipped.
// Stored as { dayId, date } so a NEW cycle's choice outranks sessions logged on the
// previous plan; legacy plain-string values still read fine.
export const getStartDay = (): string | null => {
  const v = read<string | { dayId: string } | null>(KEYS.startDay, null)
  return typeof v === 'string' ? v : v?.dayId ?? null
}
/**
 * How many sessions the member had logged when they last told us which day they're
 * starting on. Their choice outranks older sessions (incl. every session from the
 * cycle that just ended) until they train again — a date comparison wasn't enough,
 * since a member who trained this morning gets a new plan at midday.
 * -1 = never asked (legacy value).
 */
export const getStartDayAfter = (): number => {
  const v = read<string | { nSessions?: number } | null>(KEYS.startDay, null)
  return typeof v === 'string' || !v ? -1 : v.nSessions ?? -1
}
export const setStartDay = (dayId: string): void =>
  write(KEYS.startDay, { dayId, date: localDate(), nSessions: getSessions().length })

// Members often join mid-cycle (e.g. "I start on week 5"). We anchor their week to
// the date they told us, so it advances on its own each real week afterwards.
export interface WeekAnchor { week: number; date: string }
export const getStartWeek = (): WeekAnchor | null => read<WeekAnchor | null>(KEYS.startWeek, null)
export const setStartWeek = (week: number): void => write(KEYS.startWeek, { week, date: localDate() })

// ---- routine identity: detecting a NEW cycle ------------------------------
// Everything the app remembers per exercise (completed sets, "última vez", the
// weights the member edited, the in-progress session) is keyed by an id like
// "d1-1-x3" — a POSITION in the plan, not a lift. When the coach loads a new
// routine ("Julio 2026" → "Agosto 2026") those ids point at different exercises,
// and the week anchor ("estoy en la semana 9") belongs to the finished cycle. Both
// made members open the app on a new plan and see the previous plan's numbers.
// So we fingerprint the served plan and reset that state when it changes.
// Deliberately NOT reset: sessions, check-ins, streaks, records, bodyweight,
// birthday, gender, the outbox — that's the member's history, it must survive.
interface FingerprintRoutine {
  title: string
  meta: { startDate: string }
}
/**
 * Stable id for "which plan is this": the sheet's title + its declared start date.
 * Deliberately NOT derived from day/exercise content — a coach mid-edit (a day tab
 * momentarily cleared, a typo fixed in a lift name) would otherwise look like a new
 * cycle to whoever refreshes in that window, and the routine is refetched on every
 * phone unlock.
 */
export function routineFingerprint(r: FingerprintRoutine): string {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  return `${norm(r.title)}#${norm(r.meta.startDate)}`
}
export const getRoutineId = (): string | null => read<string | null>(KEYS.routineId, null)
export const setRoutineId = (id: string): void => write(KEYS.routineId, id)

/**
 * Retire the plan-scoped local state so a new routine starts clean. Values are MOVED
 * to a "<key>.prev" slot rather than deleted: if this ever fires when it shouldn't
 * (a renamed sheet, a corrected start date), nothing the member did is destroyed.
 */
export function resetForNewRoutine(): void {
  for (const k of [KEYS.startWeek, KEYS.startDay, KEYS.progress, KEYS.actuals, KEYS.lastDone, KEYS.sets, KEYS.notes]) {
    try {
      const v = localStorage.getItem(k)
      if (v != null) localStorage.setItem(`${k}.prev`, v)
      localStorage.removeItem(k)
    } catch { /* quota/private mode */ }
  }
}

/** A week anchor set BEFORE the plan even started belongs to the previous cycle —
 *  drop it so the week comes from the new plan's own start date. */
export function dropStaleWeekAnchor(planStartMs: number | null): boolean {
  const a = getStartWeek()
  if (!a || planStartMs == null) return false
  const set = Date.parse(a.date + 'T00:00:00')
  // 2 weeks of slack: a coach correcting the sheet's start date by a few days must not
  // look like an anchor from a previous cycle.
  if (Number.isNaN(set) || set >= planStartMs - 14 * 86_400_000) return false
  try { localStorage.removeItem(KEYS.startWeek) } catch { /* no-op */ }
  return true
}

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
/**
 * Local-only draft save, used while the member is still typing. Keeps the text
 * safe if the phone locks and the OS kills the page mid-sentence, WITHOUT
 * queueing an outbox write per keystroke — the coach-facing sync still happens
 * once, on blur / when the app is backgrounded (`saveNote`).
 */
export function saveNoteDraft(exerciseId: string, text: string): void {
  const map = read<NoteMap>(KEYS.notes, {})
  const t = text.trim()
  if (t) map[exerciseId] = t
  else delete map[exerciseId]
  write(KEYS.notes, map)
}
export function saveNote(exerciseId: string, dayId: string, text: string, meta?: { exName?: string; dayLabel?: string }): void {
  const map = read<NoteMap>(KEYS.notes, {})
  const t = text.trim()
  if (t) map[exerciseId] = t
  else delete map[exerciseId]
  write(KEYS.notes, map)
  // exName/dayLabel ride along so the coach digest reads "Sentadilla · Día 1", not the raw id.
  enqueue('note', { exerciseId, dayId, note: t, date: localDate(), exName: meta?.exName, dayLabel: meta?.dayLabel })
}

// ---- actuals (client-edited weight/reps/series for what they really did) ----
export interface Actual { kg?: number; reps?: number; sets?: number } // kg = per-side as written
type ActualMap = Record<string, Actual>
export const getActual = (exerciseId: string): Actual | undefined =>
  read<ActualMap>(KEYS.actuals, {})[exerciseId]
export function saveActual(exerciseId: string, dayId: string, a: Actual, meta?: { exName?: string; dayLabel?: string }): void {
  const m = read<ActualMap>(KEYS.actuals, {})
  m[exerciseId] = { ...m[exerciseId], ...a }
  write(KEYS.actuals, m)
  // exName/dayLabel let the coach digest show "Sentadilla · Día 1: 45 kg", not a raw id.
  enqueue('set', { exerciseId, dayId, actualKg: m[exerciseId].kg, actualReps: m[exerciseId].reps, actualSets: m[exerciseId].sets, date: localDate(), exName: meta?.exName, dayLabel: meta?.dayLabel })
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

// ---- in-progress session (so leaving Entrenar never wipes your progress) ----
// Everything here must survive a COLD START: iOS discards a backgrounded PWA page
// while the phone is locked, so a relaunch is a fresh boot with empty React state.
// New fields are optional — records written by older builds still read fine.
export interface SessionProgress {
  dayId: string
  date: string
  i: number
  done: Record<string, number>
  week?: number          // so the app can reopen Entrenar on the right week
  ts?: string            // ISO of the last write — drives the 45-min resume window
  prHits?: string[]      // exercise ids that set a PR (drives the finish celebration)
  prCards?: ShareData[]  // shareable "récord" cards earned this session
}
export const getSessionProgress = (): SessionProgress | null => read<SessionProgress | null>(KEYS.progress, null)
export function saveSessionProgress(p: SessionProgress): void {
  // cap the cards: they're the only unbounded part of this record, and localStorage
  // has no room to spare on a phone that's been training for a year.
  write(KEYS.progress, { ...p, ts: new Date().toISOString(), prCards: p.prCards?.slice(-8) })
}
export function clearSessionProgress(): void { write(KEYS.progress, null); clearFinishDraft() }

/** Minutes since the in-progress session was last touched (Infinity if none). */
export function sessionIdleMin(p: SessionProgress | null = getSessionProgress()): number {
  const t = p?.ts ? Date.parse(p.ts) : NaN
  return Number.isFinite(t) ? (Date.now() - t) / 60_000 : Infinity
}

// ---- finish-screen draft (session RPE + note typed before the app was killed) --
export interface FinishDraft { rpe?: number; note?: string }
export const getFinishDraft = (): FinishDraft => read<FinishDraft>(KEYS.finishDraft, {})
export const saveFinishDraft = (d: FinishDraft): void => write(KEYS.finishDraft, d)
export const clearFinishDraft = (): void => write(KEYS.finishDraft, {})

// ---- appearance preferences (font scale, theme, simple mode) ----------------
// Members told us the app is hard to READ and, for some, hard to follow. These
// three are the whole of that answer; everything else is applied from them in
// `uiPrefs.ts`. A corrupted value must never brick the layout — hence the clamps.
export const FONT_SCALES = [0.9, 1, 1.15, 1.3, 1.45] as const
export type ThemePref = 'auto' | 'dark' | 'light'

export const getFontScale = (): number => {
  const n = read<number>(KEYS.fontScale, 1)
  return (FONT_SCALES as readonly number[]).includes(n) ? n : 1
}
export const setFontScale = (s: number): void =>
  write(KEYS.fontScale, (FONT_SCALES as readonly number[]).includes(s) ? s : 1)

export const getThemePref = (): ThemePref => {
  const v = read<ThemePref>(KEYS.theme, 'auto')
  return v === 'dark' || v === 'light' || v === 'auto' ? v : 'auto'
}
export const setThemePref = (t: ThemePref): void =>
  write(KEYS.theme, t === 'dark' || t === 'light' ? t : 'auto')

// Simple mode is STRICTLY opt-in: default false, never inferred from anything.
export const getSimpleMode = (): boolean => read<boolean>(KEYS.simple, false) === true
export const setSimpleMode = (v: boolean): void => write(KEYS.simple, v === true)

// ---- screen-awake preference (seconds of inactivity before we let the phone sleep)
// 0 = never release (the old always-on behaviour). Default 30 s.
const AWAKE_IDLE_OPTIONS = [30, 120, 0]
export const getAwakeIdleSec = (): number => {
  const n = read<number>(KEYS.awakeIdle, 30)
  return AWAKE_IDLE_OPTIONS.includes(n) ? n : 30
}
export const setAwakeIdleSec = (sec: number): void =>
  write(KEYS.awakeIdle, AWAKE_IDLE_OPTIONS.includes(sec) ? sec : 30)

// ---- monthly recap (the "tu mes en FORCE" story, shown once per month) ----
export const getRecapSeen = (): string => read<string>(KEYS.recapSeen, '')
export const setRecapSeen = (ym: string): void => write(KEYS.recapSeen, ym)

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
