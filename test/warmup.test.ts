import { describe, it, expect } from 'vitest'
import { parseRoutine } from '../src/lib/parser'

// Reproduces how the backend stitches per-day TABS into one sheet: each day repeats
// the meta header (Nombre/Sesiones/…), then a "DÍA N" marker, then its own WARM-UP
// row. Regression guard for "day 2 showed day 1's warm-up" — each warm-up must stay
// attached to its own day and never repeat onto the next.
function dayTab(n: number, warmup: string, bigName: string): string[][] {
  return [
    ['', '', 'Nombre', 'Princesa', '', ''],
    ['', '', 'Sesiones semanales', '5 x semana', '', ''],
    ['', '', 'Fecha de Inicio', '2026-05-30T03:00:00.000Z', '', ''],
    [`DÍA ${n}`, '', '', '', '', 'SEMANA 2'],
    ['WARM-UP', warmup, '', '', '', ''],
    ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'CARGA', ''],
    ['THE BIG ONE', bigName, '5', '4', '40kg x lado', '6X4'],
  ]
}

describe('per-day warm-up stays with its own day', () => {
  const sheet = [
    ...dayTab(1, 'Sentadilla al banco + Hip Thrust banda + Buenos Días', 'Sentadillas'),
    ...dayTab(2, 'Remo Banda + Curl Zottman + Movilidad Hombros', 'Dominadas'),
    ...dayTab(3, 'Buenos Días Banda + Sentadillas al banco + Remo Banda', 'Peso Muerto Hex.'),
    ...dayTab(4, 'Flexiones de brazo + Tríceps Banda + Halos KB', 'Press Plano'),
  ]
  const r = parseRoutine(sheet, 'Junio 2026')

  it('parses one day per tab, in order', () => {
    expect(r.days.map((d) => d.label)).toEqual(['DÍA 1', 'DÍA 2', 'DÍA 3', 'DÍA 4'])
  })

  it('assigns each warm-up to the matching day (no repeat/shift)', () => {
    expect(r.days[0].warmup).toContain('Sentadilla al banco')
    expect(r.days[1].warmup).toContain('Remo Banda')
    expect(r.days[2].warmup).toContain('Buenos Días Banda')
    expect(r.days[3].warmup).toContain('Flexiones de brazo')
  })

  it('every day warm-up is distinct', () => {
    const ws = r.days.map((d) => d.warmup)
    expect(new Set(ws).size).toBe(ws.length)
  })
})
