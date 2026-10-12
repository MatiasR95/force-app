import { describe, it, expect, beforeEach, vi } from 'vitest'

// Oct 2026: a 320 kg deadlift landed on the board. Matias wrote in the observación
// "Peso Muerto Hex con déficit. 6X4 150kg" (the TOTAL) on a deadlift prescribed at
// 65 kg/lado; the note was read as 150 PER SIDE → 150×2+20 = 320.

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
const { noteLoad, recordTotal, plausibleMax } = await import('../src/lib/records')

beforeEach(() => { mem.clear() })

describe('noteLoad', () => {
  it('reads a total written in the note as a total, not per side', () => {
    // 150 is the total of 65/lado + bar → back to 65 per side, a 150 kg pull
    const v = noteLoad('Peso Muerto Hex con déficit.\n6X4 150kg', 65, true, true)
    expect(v).toBe(65)
    expect(recordTotal('peso-muerto', v!, true, true)).toBe(150)
  })
  it('keeps a per-side number near the prescription', () => {
    expect(noteLoad('hice el 3x3 con 55kg', 52.5, true, true)).toBe(55)
    expect(noteLoad('Es 70kg por lado en la convencional', 72.5, true, true)).toBe(70)
  })
  it('ignores a number nowhere near the prescription', () => {
    expect(noteLoad('remo con 150kg', 30, true, true)).toBeNull()
    expect(noteLoad('bajé a 5kg', 40, false, false)).toBeNull()
  })
  it('takes the note as written when there is no prescription to check it against', () => {
    expect(noteLoad('lo hice con 27,5kg', null, false, false)).toBe(27.5)
  })
})

describe('recordTotal', () => {
  it('always counts the PAIR of dumbbells, with or without "x lado"', () => {
    expect(recordTotal('press-banca-db', 15, true, false)).toBe(30)
    expect(recordTotal('press-banca-db', 7, false, false)).toBe(14)
  })
  it('reads a barbell load lighter than the bar as per side', () => {
    expect(recordTotal('sentadilla', 13.75, false, true)).toBe(47.5)
    expect(recordTotal('sentadilla', 60, false, true)).toBe(60)
    expect(recordTotal('sentadilla', 20, true, true)).toBe(60)
  })
  it('caps a mark far above the prescription', () => {
    expect(320 > plausibleMax(recordTotal('peso-muerto', 65, true, true))).toBe(true)
    expect(170 > plausibleMax(recordTotal('peso-muerto', 65, true, true))).toBe(false)
  })
})

describe('reconcileMyRecords', () => {
  const rec = (id: string, ts: string) => ({ id, client: 'Matias Rossi', gender: 'M' as const, lift: 'peso-muerto', kg: 190, reps: 4, ts })
  const now = Date.parse('2026-10-12T12:00:00Z')

  it('drops a synced mark the board no longer has', () => {
    mem.setItem('force.myRecords', JSON.stringify([rec('keep', '2026-09-08T09:12:35Z'), rec('gone', '2026-10-08T09:18:24Z')]))
    expect(store.reconcileMyRecords(new Set(['keep']), now)).toBe(1)
    expect(store.getMyRecords().map((e) => e.id)).toEqual(['keep'])
  })
  it('keeps marks still waiting in the outbox, and fresh ones the cached board may not list yet', () => {
    store.addMyRecord(rec('queued', '2026-10-01T09:00:00Z'))
    mem.setItem('force.myRecords', JSON.stringify([...store.getMyRecords(), rec('fresh', '2026-10-12T11:30:00Z')]))
    expect(store.reconcileMyRecords(new Set(), now)).toBe(0)
    expect(store.getMyRecords().map((e) => e.id)).toEqual(['queued', 'fresh'])
  })
})
