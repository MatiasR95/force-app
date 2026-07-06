import { describe, it, expect } from 'vitest'
import { parseRoutine } from '../src/lib/parser'
import { resolveWeek } from '../src/lib/week'
import { setsReps, repsText } from '../src/components/TechniqueChips'

// A HIIT circuit like the real sheets: the per-week work-time ("25¨X4") is written
// ONCE on the first row; the rows below share it. Week 1 = base seconds; Semana N
// columns override BOTH the seconds and the round count. Regression for the bug
// where every week showed the base 20″ (the week override was ignored).
const SHEET: string[][] = [
  ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3'],
  ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', '', ''],
  ['HIIT', 'Curl+Arnold', '20¨¨', '5', '', '', '25¨X4'],
  ['', 'Battle Rope', '', '', '', '', ''],
  ['', 'Abdominales', '', '', '', '', ''],
]

describe('HIIT — per-week work-time resolution', () => {
  const r = parseRoutine(SHEET, 'Test')
  const hiit = r.days[0].blocks.find((b) => b.tag === 'hiit')!
  const find = (name: string) => hiit.exercises.find((e) => e.name === name)!

  it('week 1 uses the base seconds', () => {
    expect(resolveWeek(find('Curl+Arnold'), 1).timeSec).toBe(20)
    expect(repsText(find('Curl+Arnold'), 1)).toBe('20 s')
  })

  it('Semana 3 override changes the seconds AND rounds (25¨X4 → 25 s × 4)', () => {
    const w3 = resolveWeek(find('Curl+Arnold'), 3)
    expect(w3.timeSec).toBe(25)
    expect(w3.sets).toBe(4)
    expect(setsReps(find('Curl+Arnold'), 3)).toBe('25 s × 4')
  })

  it('week 2 (blank) repeats the previous week — the base 20 s, not week-3', () => {
    expect(resolveWeek(find('Curl+Arnold'), 2).timeSec).toBe(20)
  })

  it('blank circuit rows share the leading row scheme every week', () => {
    // Battle Rope / Abdominales have no cells of their own — they must resolve to
    // the same 25 s at Semana 3 as the row that defined the scheme.
    expect(resolveWeek(find('Battle Rope'), 3).timeSec).toBe(25)
    expect(resolveWeek(find('Abdominales'), 3).timeSec).toBe(25)
    expect(repsText(find('Abdominales'), 3)).toBe('25 s')
  })
})
