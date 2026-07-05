import { describe, it, expect } from 'vitest'
import { weekStartOf, daysTrainedInWeek } from '../src/lib/metrics'

// The Home "Tu semana" ring: how many of the plan's days were trained THIS
// calendar week. Regression for the "shows 4/6 when I did 2" report — stale
// day ids from a re-saved sheet and last-week sessions must not inflate it.

const days = [
  { id: 'd1-1', label: 'DÍA 1' },
  { id: 'd2-2', label: 'DÍA 2' },
  { id: 'd3-3', label: 'DÍA 3' },
  { id: 'd4-4', label: 'DÍA 4' },
  { id: 'd5-5', label: 'DÍA 5' },
  { id: 'd6-6', label: 'DÍA 6' },
]

describe('weekStartOf', () => {
  it('maps every day of a week to the same Monday key', () => {
    // 2026-06-29 is a Monday; the week runs Mon 29 Jun → Sun 5 Jul
    const mon = weekStartOf('2026-06-29')
    expect(mon).toBe('2026-06-29')
    for (const d of ['2026-06-29', '2026-07-01', '2026-07-04', '2026-07-05']) {
      expect(weekStartOf(d)).toBe(mon)
    }
    // Sunday belongs to the week that started the previous Monday
    expect(weekStartOf('2026-06-28')).toBe('2026-06-22')
  })
})

describe('daysTrainedInWeek', () => {
  const wk = weekStartOf('2026-07-05') // this week = 2026-06-29

  it('counts only distinct plan days trained in the current week (2 of 6)', () => {
    const sessions = [
      { date: '2026-06-30', dayId: 'd1-1', dayLabel: 'DÍA 1' },
      { date: '2026-07-01', dayId: 'd2-2', dayLabel: 'DÍA 2' },
    ]
    expect(daysTrainedInWeek(days, sessions, wk)).toBe(2)
  })

  it('ignores sessions from previous weeks (the old rolling-window over-count)', () => {
    const sessions = [
      { date: '2026-06-25', dayId: 'd3-3', dayLabel: 'DÍA 3' }, // last week
      { date: '2026-06-26', dayId: 'd4-4', dayLabel: 'DÍA 4' }, // last week
      { date: '2026-06-30', dayId: 'd1-1', dayLabel: 'DÍA 1' }, // this week
      { date: '2026-07-01', dayId: 'd2-2', dayLabel: 'DÍA 2' }, // this week
    ]
    expect(daysTrainedInWeek(days, sessions, wk)).toBe(2)
  })

  it('matches a re-parsed day by label when the id changed (no drop)', () => {
    // coach re-saved the sheet; the session was logged under the OLD id but the
    // label is unchanged, so it still counts for the current DÍA 1.
    const sessions = [
      { date: '2026-06-30', dayId: 'OLD-STALE-ID', dayLabel: 'DÍA 1' },
    ]
    expect(daysTrainedInWeek(days, sessions, wk)).toBe(1)
  })

  it('never counts a stale session that matches no current day', () => {
    const sessions = [
      { date: '2026-06-30', dayId: 'ghost', dayLabel: 'DÍA VIEJA' },
    ]
    expect(daysTrainedInWeek(days, sessions, wk)).toBe(0)
  })

  it('never exceeds the number of plan days', () => {
    const sessions = days.map((d) => ({ date: '2026-07-02', dayId: d.id, dayLabel: d.label }))
    // plus a duplicate of one day → still capped at the plan size
    sessions.push({ date: '2026-07-03', dayId: 'd1-1', dayLabel: 'DÍA 1' })
    expect(daysTrainedInWeek(days, sessions, wk)).toBe(6)
  })
})
