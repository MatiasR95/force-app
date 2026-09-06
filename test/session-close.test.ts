import { describe, it, expect, beforeEach, vi } from 'vitest'

// The squat day Matias had to "re-enter as finished": he trained it, marked his
// sets, and never reached the finish screen — so no session was ever registered
// and the whole day vanished from the racha, the asistencia and the odometer.

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
const mem = new MemStorage()
vi.stubGlobal('localStorage', mem)

const store = await import('../src/lib/store')

beforeEach(() => { mem.clear() })

const DAY = {
  id: 'd1-1',
  label: 'DÍA 1',
  blocks: [
    { tag: 'ramp', exercises: [{ name: 'Sentadillas' }] },
    { tag: 'big', exercises: [{ name: 'Sentadillas' }] },
  ],
}
const started = Date.parse('2026-09-05T09:00:00Z')
const progress = (over: Record<string, unknown> = {}) => ({
  dayId: 'd1-1',
  date: '2026-09-05',
  i: 3,
  done: { 'd1-1-x1': 4, 'd1-1-x2': 3 },
  week: 12,
  ts: new Date(started + 51 * 60_000).toISOString(),
  startedAt: started,
  pulses: [100, 105, 105, 110],
  ...over,
})

// saveSessionProgress re-stamps `ts` with "now" (it is the last-touched clock the
// resume window reads), so pin the record straight into storage instead.
const put = (p: Record<string, unknown>) => mem.setItem('force.progress', JSON.stringify(p))

describe('closeAbandonedSession', () => {
  it('registers the day for the date it was TRAINED, not for today', () => {
    put(progress())
    const entry = store.closeAbandonedSession(DAY)
    expect(entry?.date).toBe('2026-09-05')
    expect(store.getSession('2026-09-05', 'd1-1')).toBeTruthy()
    expect(store.getSessions()).toHaveLength(1)
  })

  it('carries the week, the day label and the Big One so the recap reads right', () => {
    put(progress())
    const entry = store.closeAbandonedSession(DAY)
    expect(entry?.week).toBe(12)
    expect(entry?.dayLabel).toBe('DÍA 1')
    expect(entry?.bigOne).toBe('Sentadillas')
  })

  it('counts only the kilos actually moved, not the whole prescription', () => {
    put(progress())
    expect(store.closeAbandonedSession(DAY)?.kg).toBe(420) // 100+105+105+110
  })

  it('clamps the duration to the real time between the first and last mark', () => {
    put(progress())
    expect(store.closeAbandonedSession(DAY)?.durationMin).toBe(51)
  })

  it('registers attendance for that date, so the racha keeps the week', () => {
    put(progress())
    store.closeAbandonedSession(DAY)
    expect(store.getCheckins()).toContain('2026-09-05')
  })

  it('clears the in-progress session so it is never offered twice', () => {
    put(progress())
    store.closeAbandonedSession(DAY)
    expect(store.getSessionProgress()).toBeNull()
  })

  it('queues the session for the coach exactly once', () => {
    put(progress())
    store.closeAbandonedSession(DAY)
    expect(store.getOutbox().filter((i) => i.kind === 'session')).toHaveLength(1)
  })

  it('never double-registers a day that was already logged', () => {
    store.logSession({ date: '2026-09-05', dayId: 'd1-1', kg: 900 })
    put(progress())
    expect(store.closeAbandonedSession(DAY)).toBeNull()
    expect(store.getSessions()).toHaveLength(1)
    expect(store.getSession('2026-09-05', 'd1-1')?.kg).toBe(900) // the real one stands
    expect(store.getSessionProgress()).toBeNull()
  })

  it('refuses a progress record belonging to another day', () => {
    put(progress({ dayId: 'd4-4' }))
    expect(store.closeAbandonedSession(DAY)).toBeNull()
    expect(store.getSessions()).toHaveLength(0)
    expect(store.getSessionProgress()).not.toBeNull() // left for ITS day to close
  })

  it('omits the tonnage when nothing was recorded rather than logging a zero', () => {
    put(progress({ pulses: [] }))
    expect(store.closeAbandonedSession(DAY)?.kg).toBeUndefined()
  })
})
