import { describe, it, expect } from 'vitest'
import { planPlates, groupPlates } from '../src/lib/plates'
import { parseRoutine } from '../src/lib/parser'
import { ENERO_2026 } from '../src/data/fixtureEnero2026'
import { bigThreeE1RM, epley1RM, exerciseLoadKg, attendanceThisMonth, currentStreak } from '../src/lib/metrics'

describe('planPlates', () => {
  it('decomposes 27.5/side on a 20kg bar (no 25kg discs by default)', () => {
    const p = planPlates(27.5)
    expect(p.totalKg).toBe(75)
    expect(p.achievable).toBe(true)
    expect(p.plates).toEqual([20, 5, 2.5])
    expect(groupPlates(p.plates)).toEqual([{ kg: 20, count: 1 }, { kg: 5, count: 1 }, { kg: 2.5, count: 1 }])
  })
  it('flags an unachievable load with remainder', () => {
    const p = planPlates(1, 20, [25, 20, 10]) // 1kg can't be made
    expect(p.achievable).toBe(false)
    expect(p.remainder).toBe(1)
  })
})

describe('metrics on real routine', () => {
  const r = parseRoutine(ENERO_2026, 'Enero 2026')

  it('epley 1RM matches formula', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1)
  })

  it('includes the bar in barbell big-lift load', () => {
    const press = r.days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]
    // 27.5 x lado → 20 bar + 55 = 75
    expect(exerciseLoadKg(press)).toBe(75)
  })

  it('ranks the Big Ones by estimated 1RM', () => {
    const e = bigThreeE1RM(r)
    const names = e.map((x) => x.slug)
    expect(names).toContain('peso-muerto')
    expect(names).toContain('press-plano')
    // deadlift (20 + 100 = 120kg x3) should out-rank the bench
    expect(e[0].slug).toBe('peso-muerto')
  })
})

describe('attendance', () => {
  const now = new Date('2026-06-23T12:00:00')
  it('counts unique training days this month', () => {
    const ci = ['2026-06-01', '2026-06-01', '2026-06-10', '2026-05-30']
    expect(attendanceThisMonth(ci, now)).toBe(2)
  })
  it('computes a streak ending today', () => {
    const ci = ['2026-06-23', '2026-06-22', '2026-06-21', '2026-06-19']
    expect(currentStreak(ci, now)).toBe(3)
  })
})
