import { describe, it, expect } from 'vitest'
import { parseRoutine, parseSeriesPlan } from '../src/lib/parser'
import { resolveWeek, parseStartDate } from '../src/lib/week'

// A compact weekly sheet exercising the per-side normalization rules. Week 1 is in
// the base columns; "Semana 2/3" are per-week override columns.
const SHEET: string[][] = [
  ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3'],
  ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'CARGA', '', ''],
  // base is per-side; week-2 cell gives a new weight but OMITS "x lado"
  ['THE BIG ONE', 'Deadlift', '3', '4', '80kg x lado', '6X4 70kg c/bandas', ''],
  // weighted pull-ups: a stray "x lado" must be ignored (single hanging load)
  ['ACCESORIOS', 'Dominadas', '6', '4', '5kg x lado', '3X5 10kg x lado', ''],
  // base is a single/total load (no "x lado"): a bare week weight must stay total
  ['', 'Apertura Plana', '10', '3', '25kg', '11X3 30kg', ''],
]

describe('resolveWeek — per-side normalization', () => {
  const r = parseRoutine(SHEET, 'Test')
  const find = (name: string) =>
    r.days[0].blocks.flatMap((b) => b.exercises).find((e) => e.name === name)!

  it('a bare week weight inherits the base per-side convention (deadlift)', () => {
    const dl = find('Deadlift')
    const w2 = resolveWeek(dl, 2)
    expect(w2.load.value).toBe(70)
    expect(w2.load.perSide).toBe(true) // "70kg" is shorthand for "70 x lado"
    // and a blank later week repeats it (per the repeat-previous rule)
    const w3 = resolveWeek(dl, 3)
    expect(w3.load.value).toBe(70)
    expect(w3.load.perSide).toBe(true)
  })

  it('weighted pull-ups are never per-side, even if the sheet says "x lado"', () => {
    const dom = find('Dominadas')
    expect(resolveWeek(dom, 1).load.perSide).toBe(false)
    const w2 = resolveWeek(dom, 2)
    expect(w2.load.value).toBe(10)
    expect(w2.load.perSide).toBe(false)
  })

  it('a bare week weight stays total when the base lift was not per-side', () => {
    const fly = find('Apertura Plana')
    const w2 = resolveWeek(fly, 2)
    expect(w2.load.value).toBe(30)
    expect(w2.load.perSide).toBe(false)
  })
})

describe('parseSeriesPlan — non-linear progression', () => {
  it('expands the plus/X form to per-series reps', () => {
    expect(parseSeriesPlan('4X1+3X3')!.plan).toEqual([4, 3, 3, 3])
    expect(parseSeriesPlan('6X1+5X4')!.plan).toEqual([6, 5, 5, 5, 5])
    expect(parseSeriesPlan('4X2+3X2')!.plan).toEqual([4, 4, 3, 3])
  })
  it('expands the dash form (≥3 numbers)', () => {
    expect(parseSeriesPlan('10-10-8-8')!.plan).toEqual([10, 10, 8, 8])
  })
  it('keeps a trailing load as rest', () => {
    const p = parseSeriesPlan('10-10-8-8 70kg x lado')!
    expect(p.plan).toEqual([10, 10, 8, 8])
    expect(p.rest).toBe('70kg x lado')
  })
  it('does NOT treat a 2-number rep range as a plan', () => {
    expect(parseSeriesPlan('8-12')).toBeNull()
  })
  it('ignores plain reps×sets and text cells', () => {
    expect(parseSeriesPlan('4X4')).toBeNull()
    expect(parseSeriesPlan('Mismo semana ant.')).toBeNull()
  })
})

describe('resolveWeek — non-linear plan drives the series count', () => {
  const SHEET: string[][] = [
    ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3'],
    ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'CARGA', '', ''],
    ['THE BIG ONE', 'Dominadas', '4', '3', '', '4X1+3X3', '10-10-8-8'],
  ]
  const r = parseRoutine(SHEET, 'Test')
  const ex = r.days[0].blocks.flatMap((b) => b.exercises).find((e) => e.name === 'Dominadas')!

  it('reports the right series count and plan for the plus form', () => {
    const w2 = resolveWeek(ex, 2)
    expect(w2.sets).toBe(4)
    expect(w2.plan).toEqual([4, 3, 3, 3])
    expect(w2.complexRaw).toBe('4X1+3X3')
  })
  it('handles the dash form too', () => {
    const w3 = resolveWeek(ex, 3)
    expect(w3.sets).toBe(4)
    expect(w3.plan).toEqual([10, 10, 8, 8])
  })
})

describe('parseStartDate — ISO + rioplatense', () => {
  it('parses an ISO datetime from Sheets at local midnight', () => {
    const d = parseStartDate('2026-05-30T03:00:00.000Z')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4) // May (0-based)
    expect(d.getDate()).toBe(30)
  })
  it('still parses the rioplatense text form', () => {
    const d = parseStartDate('12 de enero de 2026')!
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(12)
  })
})
