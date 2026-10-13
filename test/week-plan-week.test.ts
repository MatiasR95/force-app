import { describe, it, expect } from 'vitest'
import { parseRoutine } from '../src/lib/parser'
import { ENERO_2026 } from '../src/data/fixtureEnero2026'
import { planWeek, resolveWeek } from '../src/lib/week'
import { buildCellWrites } from '../src/lib/sheetWrite'

// Regression: Hoy/Plan clamped the member's week to the LAST "Semana N" column a
// day listed. The demo plan runs 8 weeks but its days list Semana 1–3, so a member
// on week 8 saw "Sem 3" on Hoy (Inicio said "Sem 8"), trained and logged week 3,
// and their weight/rep corrections were written into the coach's SEMANA 3 cells.
describe('planWeek', () => {
  const routine = parseRoutine(ENERO_2026, 'demo')
  const day = routine.days.find((d) => Math.max(...d.weeks) < routine.totalWeeks)!

  it('keeps the member week even when the day lists fewer week columns', () => {
    expect(day).toBeTruthy()
    expect(planWeek(routine, routine.totalWeeks)).toBe(routine.totalWeeks)
  })

  it('stays inside the plan and survives junk input', () => {
    expect(planWeek(routine, 0)).toBe(1)
    expect(planWeek(routine, 99)).toBe(routine.totalWeeks)
    expect(planWeek(routine, Number.NaN)).toBe(1)
  })

  it('a week past the last column shows the last defined prescription', () => {
    const last = Math.max(...day.weeks)
    for (const ex of day.blocks.flatMap((b) => b.exercises)) {
      const a = resolveWeek(ex, planWeek(routine, routine.totalWeeks))
      const b = resolveWeek(ex, last)
      expect([a.sets, a.reps, a.load.value]).toEqual([b.sets, b.reps, b.load.value])
    }
  })

  it('edits on an inherited week never overwrite an earlier week cell', () => {
    const ex = day.blocks.flatMap((b) => b.exercises).find((e) => Object.keys(e.weeks).length > 0)!
    expect(buildCellWrites(ex, planWeek(routine, routine.totalWeeks), { kg: 999 })).toEqual([])
  })
})
