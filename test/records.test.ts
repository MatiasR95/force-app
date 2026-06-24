import { describe, it, expect } from 'vitest'
import { matchRecordLift, recordKg, noteWeight } from '../src/lib/records'
import { planPlates, groupPlates, DEFAULT_PLATES_KG, DEADLIFT_PLATES_KG, isDeadliftName } from '../src/lib/plates'

describe('matchRecordLift', () => {
  it('matches headline lifts', () => {
    expect(matchRecordLift('Press Plano')).toBe('press-banca')
    expect(matchRecordLift('Sentadillas Low Bar')).toBe('sentadilla')
    expect(matchRecordLift('Peso Muerto')).toBe('peso-muerto')
    expect(matchRecordLift('Peso Muerto Hexagonal')).toBe('peso-muerto-hex')
    expect(matchRecordLift('Peso Muerto Sumo')).toBe('peso-muerto-sumo')
    expect(matchRecordLift('Press Banca con Mancuernas')).toBe('press-banca-db')
    expect(matchRecordLift('Dominadas Pronadas')).toBe('dominadas')
    expect(matchRecordLift('Press Militar')).toBe('press-militar')
  })
  it('excludes non-record variations', () => {
    expect(matchRecordLift('Sentadilla Bulgara')).toBeNull()
    expect(matchRecordLift('Press Inclinado')).toBeNull()
    expect(matchRecordLift('Peso Muerto Rumano')).toBeNull()
    expect(matchRecordLift('Face Pull')).toBeNull()
  })
})

describe('recordKg', () => {
  it('adds the bar for per-side barbell lifts', () => {
    expect(recordKg(27.5, true, true)).toBe(75)   // 27.5×2 + 20
    expect(recordKg(30, true, false)).toBe(60)     // dumbbells: 30×2, no bar
    expect(recordKg(100, false, false)).toBe(100)  // single total
  })
})

describe('noteWeight', () => {
  it('reads the actual weight from an observación', () => {
    expect(noteWeight('bajé a 25kg')).toBe(25)
    expect(noteWeight('subí a 30 kg')).toBe(30)
    expect(noteWeight('lo hice con 27,5kg')).toBe(27.5)
    expect(noteWeight('me molestó el hombro')).toBeNull()
    expect(noteWeight('')).toBeNull()
  })
})

describe('plate inventory', () => {
  it('does not use 25kg discs by default', () => {
    expect(DEFAULT_PLATES_KG).not.toContain(25)
    const p = planPlates(27.5, 20, DEFAULT_PLATES_KG)
    expect(p.plates).toEqual([20, 5, 2.5]) // not 25 + 2.5
    expect(p.achievable).toBe(true)
  })
  it('uses 25kg only for deadlifts', () => {
    expect(DEADLIFT_PLATES_KG).toContain(25)
    const p = planPlates(50, 20, DEADLIFT_PLATES_KG)
    expect(groupPlates(p.plates)).toEqual([{ kg: 25, count: 2 }])
  })
  it('supports micro plates for fine jumps', () => {
    const p = planPlates(0.5, 20, DEFAULT_PLATES_KG)
    expect(p.plates).toEqual([0.5])
  })
  it('detects deadlift names', () => {
    expect(isDeadliftName('Peso Muerto + 1"')).toBe(true)
    expect(isDeadliftName('Press Plano')).toBe(false)
  })
})
