import { describe, it, expect, beforeEach, vi } from 'vitest'

// Two regressions a member reported together, both about "I saved it and nothing
// happened": the monthly bodyweight nudge that never cleared, and a captured PR
// that never reached the gym board because an unrelated log write kept failing.

// store.ts / api.ts talk to localStorage — give the node test env a real one.
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
const mem = new MemStorage()
vi.stubGlobal('localStorage', mem)
vi.stubEnv('VITE_FORCE_API', 'https://script.google.com/macros/s/test/exec')

const store = await import('../src/lib/store')
const { syncOutbox } = await import('../src/lib/api')

beforeEach(() => { mem.clear() })

// Assign fetch directly (not vi.stubGlobal): the stub must survive for the whole
// test, and each test installs its own server behaviour.
type Body = { action: string; entry?: { id: string } }
function mockFetch(handler: (body: Body) => Promise<unknown>): void {
  globalThis.fetch = (async (_url: string, init: { body: string }) =>
    handler(JSON.parse(init.body) as Body)) as unknown as typeof fetch
}

describe('bodyweight nudge', () => {
  it('re-saving the SAME weight still re-dates the entry (the nudge must clear)', () => {
    const old = '2026-07-01'
    store.addBodyweight(80, old)
    expect(store.bodyweightAgeDays()).toBeGreaterThan(30)

    store.addBodyweight(80) // member types the same number and taps Guardar today
    expect(store.getBodyweight()).toBe(80)
    expect(store.bodyweightAgeDays()).toBe(0)
  })

  it('keeps one entry per day instead of stacking every tap', () => {
    store.addBodyweight(80)
    store.addBodyweight(80)
    store.addBodyweight(80.4)
    expect(store.getBodyweights()).toHaveLength(1)
    expect(store.getBodyweight()).toBe(80.4)
  })
})

describe('outbox ids', () => {
  it('are unique for marks queued in the same tick', () => {
    // A finish-of-session sweep captures several lifts inside one tick. Both the
    // outbox and the backend dedupe by id, so a collision silently deletes a PR.
    for (let n = 0; n < 50; n++) store.enqueue('record', { n })
    const ids = store.getOutbox().map((i) => i.id)
    expect(new Set(ids).size).toBe(50)
  })
})

describe('syncOutbox', () => {
  const record = { id: 'r-1', client: 'Vos', gender: 'M' as const, lift: 'press-militar', kg: 50, reps: 7, ts: '2026-08-13T12:00:00.000Z' }

  it('sends the queued record even when the Seguimiento log write fails', async () => {
    store.addMyRecord(record)
    store.enqueue('set', { exerciseId: 'e1', dayId: 'd1', done: true })

    const seen: string[] = []
    mockFetch(async (body) => {
      seen.push(body.action)
      if (body.action === 'logInput') return { ok: false, status: 500 }
      return { ok: true, json: async () => ({ ok: true }) }
    })

    await expect(syncOutbox('tok')).rejects.toThrow()
    expect(seen).toContain('postRecord')                                  // not blocked by the failed log
    expect(store.getOutbox().filter((i) => i.kind === 'record')).toHaveLength(0) // and cleared
    expect(store.getOutbox().filter((i) => i.kind === 'set')).toHaveLength(1)    // the log stays queued
  })

  it('a record the server refuses does not block the other queued marks', async () => {
    store.addMyRecord({ ...record, id: 'r-bad', kg: 9999 })
    store.addMyRecord({ ...record, id: 'r-good' })

    mockFetch(async (body) => ({
      ok: true,
      json: async () => (body.entry?.id === 'r-bad' ? { error: 'invalid entry' } : { ok: true }),
    }))

    await expect(syncOutbox('tok')).rejects.toThrow()
    const left = store.getOutbox()
    expect(left).toHaveLength(1)
    expect((left[0].payload as { id: string }).id).toBe('r-bad')
  })
})
