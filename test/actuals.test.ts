import { describe, it, expect } from 'vitest'
import { actualForSet, topSet, setsDetail, type Actual } from '../src/lib/store'

// Per-series actuals: a big lift on "4X1+3X3" is four different efforts, and the
// record is judged on the heaviest one. These helpers are pure (no storage) and
// decide what reaches the member's records and the coach's Seguimiento row.

describe('actualForSet', () => {
  it('prefers the per-series value over the exercise-level one', () => {
    const a: Actual = { kg: 100, reps: 3, perSet: { '1': { kg: 105, reps: 2 } } }
    expect(actualForSet(a, 1)).toEqual({ kg: 105, reps: 2 })
  })

  it('falls back to the exercise-level value for series with no entry', () => {
    const a: Actual = { kg: 100, reps: 3, perSet: { '1': { kg: 105 } } }
    expect(actualForSet(a, 0)).toEqual({ kg: 100, reps: 3 })
  })

  it('fills only the field the member edited', () => {
    const a: Actual = { kg: 100, reps: 3, perSet: { '2': { reps: 1 } } }
    expect(actualForSet(a, 2)).toEqual({ kg: 100, reps: 1 })
  })

  it('is safe on an exercise with nothing logged', () => {
    expect(actualForSet(undefined, 0)).toEqual({ kg: undefined, reps: undefined })
  })
})

describe('topSet', () => {
  it('picks the heaviest series, not the last edited one', () => {
    const a: Actual = { perSet: { '0': { kg: 100, reps: 4 }, '1': { kg: 107.5, reps: 3 }, '2': { kg: 105, reps: 3 } } }
    expect(topSet(a)).toEqual({ kg: 107.5, reps: 3 })
  })

  it('breaks a tie on kg by the higher reps', () => {
    const a: Actual = { perSet: { '0': { kg: 105, reps: 3 }, '1': { kg: 105, reps: 5 } } }
    expect(topSet(a)).toEqual({ kg: 105, reps: 5 })
  })

  it('considers the exercise-level value alongside the series', () => {
    const a: Actual = { kg: 110, reps: 1, perSet: { '0': { kg: 100, reps: 4 } } }
    expect(topSet(a)).toEqual({ kg: 110, reps: 1 })
  })

  it('still returns reps when no weight was logged (bodyweight work)', () => {
    expect(topSet({ perSet: { '0': { reps: 12 } } })).toEqual({ reps: 12 })
  })

  it('returns null when nothing was logged', () => {
    expect(topSet(undefined)).toBeNull()
    expect(topSet({})).toBeNull()
  })
})

describe('setsDetail', () => {
  it('writes the breakdown the coach reads in the note column', () => {
    const a: Actual = { perSet: { '0': { kg: 100, reps: 4 }, '1': { kg: 105, reps: 3 } } }
    expect(setsDetail(a, 4)).toBe('1ª 100×4 · 2ª 105×3')
  })

  it('uses the rioplatense decimal comma', () => {
    expect(setsDetail({ perSet: { '0': { kg: 27.5, reps: 3 } } }, 1)).toBe('1ª 27,5×3')
  })

  it('is empty when nothing was edited per series', () => {
    expect(setsDetail({ kg: 100 }, 4)).toBe('')
  })
})
