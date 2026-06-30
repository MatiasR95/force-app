import { describe, it, expect } from 'vitest'
import { currentEventTheme } from '../src/lib/eventTheme'

const on = (m: number, d: number) => new Date(2026, m - 1, d)

describe('currentEventTheme — date-driven event themes', () => {
  it('shows nothing on an ordinary day', () => {
    expect(currentEventTheme(on(3, 15))).toBeNull()
    expect(currentEventTheme(on(10, 1))).toBeNull()
  })

  it('Malvinas (2 de Abril) is solemn with the map effect', () => {
    const t = currentEventTheme(on(4, 2))!
    expect(t.id).toBe('malvinas')
    expect(t.tone).toBe('solemne')
    expect(t.effect).toBe('map')
  })

  it('lights up patriotic dates as a flags theme', () => {
    expect(currentEventTheme(on(7, 9))!.id).toBe('independencia')
    expect(currentEventTheme(on(7, 9))!.tone).toBe('patria')
    expect(currentEventTheme(on(5, 25))!.id).toBe('revolucion-mayo')
    expect(currentEventTheme(on(6, 20))!.id).toBe('bandera')
    expect(currentEventTheme(on(8, 17))!.id).toBe('san-martin')
    expect(currentEventTheme(on(11, 20))!.id).toBe('soberania')
  })

  it('opens 7 days before the date and closes on the day', () => {
    expect(currentEventTheme(on(7, 1))).toBeNull()       // 8 days before
    expect(currentEventTheme(on(7, 2))!.id).toBe('independencia') // 7 days before
    expect(currentEventTheme(on(7, 9))!.id).toBe('independencia') // the day
    expect(currentEventTheme(on(7, 10))).toBeNull()      // day after
  })

  it('every theme carries a motivational quote', () => {
    expect(currentEventTheme(on(7, 9))!.quote.length).toBeGreaterThan(0)
    expect(currentEventTheme(on(12, 25))!.quote.length).toBeGreaterThan(0)
  })

  it('Navidad and fin de año (wrapping into Jan 1) are festive', () => {
    expect(currentEventTheme(on(12, 25))!.id).toBe('navidad')
    expect(currentEventTheme(on(12, 31))!.id).toBe('fin-de-anio')
    expect(currentEventTheme(on(1, 1))!.id).toBe('fin-de-anio')
    expect(currentEventTheme(on(12, 29))!.effect).toBe('fireworks')
  })
})
