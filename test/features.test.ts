import { describe, it, expect } from 'vitest'
import { weightClass, wcLabel } from '../src/lib/records'
import { buildCellWrites, replaceKg, fmtKg } from '../src/lib/sheetWrite'
import { nextFeriado } from '../src/lib/feriados'
import { parseRoutine } from '../src/lib/parser'
import type { ExerciseRow, WeekCell } from '../src/lib/types'

// minimal ExerciseRow factory for writeback tests
function mkEx(p: Partial<ExerciseRow>): ExerciseRow {
  return {
    id: 'x', row: 10, name: 'Sentadilla', slug: 'sentadilla', pattern: 'squat',
    section: 'big', isWarmupRamp: false, reps: 5, repsRaw: '5', timeSec: null,
    sets: 4, setsRaw: '4', setOrdinal: null,
    load: { value: 28.75, perSide: true, unit: 'kg', raw: '28,75kg x lado' },
    techniques: [], notes: '', weeks: {},
    raw: { exercise: 'Sentadilla', reps: '5', series: '4', obs: '28,75kg x lado' },
    ...p,
  }
}
const wk = (p: Partial<WeekCell>): WeekCell =>
  ({ week: 2, reps: 10, sets: 3, load: null, raw: '10X3', complex: false, inherit: false, col: 7, ...p })

describe('weightClass', () => {
  it('classifies men at the 4 bands (≤70 / 71–83 / 84–95 / +95)', () => {
    expect(weightClass('M', 70)?.key).toBe('m-70')
    expect(weightClass('M', 71)?.key).toBe('m71-83')
    expect(weightClass('M', 83)?.key).toBe('m71-83')
    expect(weightClass('M', 90)?.key).toBe('m84-95')
    expect(weightClass('M', 95.5)?.key).toBe('m95+')
  })
  it('classifies women at the 4 bands (≤55 / 56–65 / 66–75 / +75)', () => {
    expect(weightClass('F', 55)?.key).toBe('f-55')
    expect(weightClass('F', 60)?.key).toBe('f56-65')
    expect(weightClass('F', 70)?.key).toBe('f66-75')
    expect(weightClass('F', 80)?.key).toBe('f75+')
  })
  it('returns null for unknown bodyweight and labels categories', () => {
    expect(weightClass('M', null)).toBeNull()
    expect(weightClass('M', 0)).toBeNull()
    expect(wcLabel('m-70')).toBe('Hasta 70 kg')
    expect(wcLabel('???')).toBe('General')
  })
})

describe('sheet writeback cell rebuild', () => {
  it('formats kg with the rioplatense comma', () => {
    expect(fmtKg(27.5)).toBe('27,5')
    expect(fmtKg(30)).toBe('30')
  })
  it('replaces or appends the kg token, preserving the rest', () => {
    expect(replaceKg('28,75kg x lado', 30)).toBe('30kg x lado')
    expect(replaceKg('Banda roja', 25)).toBe('Banda roja 25kg')
  })
  it('week 1: writes separate reps/series/obs cells', () => {
    const ex = mkEx({ row: 12 })
    expect(buildCellWrites(ex, 1, { kg: 30 })).toEqual([{ row: 12, col: 4, value: '30kg x lado' }])
    expect(buildCellWrites(ex, 1, { reps: 8 })).toEqual([{ row: 12, col: 2, value: '8' }])
    expect(buildCellWrites(ex, 1, { series: 5 })).toEqual([{ row: 12, col: 3, value: '5' }])
  })
  it('does not overwrite ramp ordinal series', () => {
    const ex = mkEx({ setOrdinal: 2, setsRaw: '2°' })
    expect(buildCellWrites(ex, 1, { series: 5 })).toEqual([])
  })
  it('week N: rewrites the composite "Semana N" cell for fields it owns', () => {
    const load = { value: 28.75, perSide: true, unit: 'kg' as const, raw: '28,75kg x lado' }
    const ex = mkEx({ row: 12, weeks: { 2: wk({ raw: '2X4 28,75kg x lado', reps: 2, sets: 4, load }) } })
    expect(buildCellWrites(ex, 2, { reps: 12 })).toEqual([{ row: 12, col: 7, value: '12X4 28,75kg x lado' }])
    expect(buildCellWrites(ex, 2, { kg: 30 })).toEqual([{ row: 12, col: 7, value: '2X4 30kg x lado' }])
  })
  it('week N without its own weight: kg falls back to the base OBSERVACIONES cell', () => {
    // "5X4" overrides only reps/sets; weight is inherited from the base row.
    const ex = mkEx({ row: 12, weeks: { 8: wk({ week: 8, raw: '5X4', reps: 5, sets: 4, load: null, col: 9 }) } })
    expect(buildCellWrites(ex, 8, { kg: 30 })).toEqual([{ row: 12, col: 4, value: '30kg x lado' }])
    expect(buildCellWrites(ex, 8, { reps: 6 })).toEqual([{ row: 12, col: 9, value: '6X4' }])
  })
  it('skips inherited / complex week cells', () => {
    const inh = mkEx({ weeks: { 2: wk({ inherit: true, raw: 'Mismo semana ant.' }) } })
    const cx = mkEx({ weeks: { 2: wk({ complex: true, raw: '3X1+2X3' }) } })
    expect(buildCellWrites(inh, 2, { reps: 9 })).toEqual([])
    expect(buildCellWrites(cx, 2, { reps: 9 })).toEqual([])
  })
})

describe('multi-tab routine (tabs stitched by the backend)', () => {
  // One training day per tab (common in powerlifting). The backend concatenates
  // every tab into one array; each tab keeps its own "DÍA N" marker + week cols.
  const tab1 = [
    ['', '', 'Objetivo', 'Fuerza+hipertrofia'],
    ['', '', 'Sesiones', '5 x semana'],
    ['', '', 'Semanas', '8 semanas'],
    ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3'],
    ['', 'EJERCICIO', 'REPS', 'SERIES', 'OBSERVACIONES'],
    ['THE BIG ONE', '', '', '', ''],
    ['', 'Sentadilla', '5', '4', '27,5kg x lado', '5X4', '6X4'],
  ]
  const tab2 = [
    ['', '', 'Objetivo', 'Fuerza+hipertrofia'], // repeated meta header → ignored
    ['DÍA 2', '', '', '', '', 'Semana 2', 'Semana 3'],
    ['', 'EJERCICIO', 'REPS', 'SERIES', 'OBSERVACIONES'],
    ['THE BIG ONE', '', '', '', ''],
    ['', 'Press Plano', '5', '3', '40kg', '5X3', '6X3'],
  ]
  const r = parseRoutine([...tab1, ...tab2], 'Belu')

  it('parses every day across the stitched tabs', () => {
    expect(r.days.map((d) => d.label)).toEqual(['DÍA 1', 'DÍA 2'])
    expect(r.style).toBe('weekly')
  })
  it('keeps absolute row + week-column indices for writeback', () => {
    const press = r.days[1].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(press.name).toBe('Press Plano')
    expect(press.row).toBe(11)              // absolute index in the stitched array
    expect(press.weeks[2].col).toBe(5)      // "Semana 2" column on the DÍA 2 row
    // a kg edit on week 1 targets that exact row's OBSERVACIONES cell (col 4)
    expect(buildCellWrites(press, 1, { kg: 42.5 })).toEqual([{ row: 11, col: 4, value: '42,5kg' }])
  })
})

describe('nextFeriado', () => {
  it('finds the next holiday on or after a date, with days left', () => {
    const n = nextFeriado('2026-06-24')!
    expect(n.date).toBe('2026-07-09')
    expect(n.name).toMatch(/Independencia/)
    expect(n.daysLeft).toBe(15)
  })
  it('counts a holiday today as 0 days left', () => {
    expect(nextFeriado('2026-07-09')!.daysLeft).toBe(0)
  })
  it('rolls into the next year', () => {
    expect(nextFeriado('2026-12-26')!.date).toBe('2027-01-01')
  })
})
