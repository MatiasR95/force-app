import { describe, it, expect } from 'vitest'
import { parseRoutine, parseLoad, parseTechniques, parseWeekCell } from '../src/lib/parser'
import { resolveWeek } from '../src/lib/week'
import { ENERO_2026 } from '../src/data/fixtureEnero2026'

describe('parseRoutine — real Enero 2026 sheet', () => {
  const r = parseRoutine(ENERO_2026, 'Enero 2026')

  it('reads the meta block', () => {
    expect(r.meta.sessionsPerWeek).toBe('4 x semana')
    expect(r.meta.startDate).toBe('12 de enero de 2026')
    expect(r.meta.weeks).toBe('8 semanas')
    expect(r.meta.goal).toBe('Fuerza+hipetrofia')
  })

  it('sorts days by number (Día 3 before Día 4)', () => {
    expect(r.days.map((d) => d.label)).toEqual(['DÍA 1', 'DÍA 2', 'DÍA 3', 'DÍA 4'])
  })

  it('captures each day warm-up line', () => {
    expect(r.days[0].warmup).toContain('Flexiones de brazo')
    expect(r.days[1].warmup).toContain('Sentadilla c/barra')
  })

  it('identifies THE BIG ONE per day (after sorting)', () => {
    const bigOf = (label: string) =>
      r.days.find((d) => d.label === label)!.blocks.find((b) => b.tag === 'big')!.exercises
    expect(bigOf('DÍA 1')[0].name).toBe('Press Plano')
    expect(bigOf('DÍA 2')[0].name).toBe('Sentadillas  Low Bar')
    expect(bigOf('DÍA 4')[0].name).toBe('Peso Muerto')
    // DÍA 3 is a superset: Press + Sentadilla both under THE BIG ONE
    expect(bigOf('DÍA 3').map((e) => e.name)).toEqual([
      'Press Plano TEMPO 3:1:0',
      'Sentadilla  High Bar + 2"',
    ])
  })

  it('groups accessory sections into a circuit with rounds', () => {
    const d1 = r.days.find((d) => d.label === 'DÍA 1')!
    const accs = d1.blocks.find((b) => b.tag === 'accessory')!
    expect(accs.circuit).toBe(true)
    expect(accs.rounds).toBe(3)
    expect(accs.exercises.map((e) => e.name)).toEqual(['Remo Helms', 'Press Inclinado', 'Face Pull'])
    // ramp and big are never circuits
    expect(d1.blocks.find((b) => b.tag === 'big')!.circuit).toBe(false)
  })

  it('detects routine style (weekly = powerlifting)', () => {
    expect(r.style).toBe('weekly') // fixture has Semana 2/3 columns
  })

  it('treats a multi-lift Big One as an alternating group', () => {
    const d3 = r.days.find((d) => d.label === 'DÍA 3')!
    const big = d3.blocks.find((b) => b.tag === 'big')!
    expect(big.exercises.length).toBe(2)
    expect(big.circuit).toBe(true) // Press + Sentadilla alternated
  })

  it('parses a HIIT block as timed (seconds)', () => {
    const d4 = r.days.find((d) => d.label === 'DÍA 4')!
    const hiit = d4.blocks.find((b) => b.tag === 'hiit')!
    expect(hiit.timed).toBe(true)
    expect(hiit.circuit).toBe(true)
    expect(hiit.exercises[0].timeSec).toBe(30)
  })

  it('parses per-week (Semana N) columns', () => {
    const d1 = r.days.find((d) => d.label === 'DÍA 1')!
    expect(d1.weeks).toEqual([1, 2, 3])
    const press = d1.blocks.find((b) => b.tag === 'big')!.exercises[0]
    // week 1 = base (5×4 @ 27.5/side)
    expect(resolveWeek(press, 1)).toMatchObject({ reps: 5, sets: 4 })
    // week 2 = "6X4" → 6 reps × 4 sets, weight unchanged
    expect(resolveWeek(press, 2)).toMatchObject({ reps: 6, sets: 4 })
    // week 3 = "4X4 30kg x lado" → new load
    const w3 = resolveWeek(press, 3)
    expect(w3).toMatchObject({ reps: 4, sets: 4 })
    expect(w3.load.value).toBe(30)
  })

  it('classifies warm-up ramp sets by their ordinal series', () => {
    const ramp = r.days[0].blocks.find((b) => b.tag === 'ramp')!.exercises
    expect(ramp).toHaveLength(3)
    expect(ramp.every((e) => e.isWarmupRamp)).toBe(true)
    expect(ramp.map((e) => e.setOrdinal)).toEqual([1, 2, 2])
  })

  it('parses per-side loads with comma decimals', () => {
    const big = r.days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(big.load.value).toBe(27.5)
    expect(big.load.perSide).toBe(true)
    const dl = r.days.find((d) => d.label === 'DÍA 4')!.blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(dl.load.value).toBe(50)
  })

  it('detects techniques: tempo, pause, myoreps, cluster, band, per-side', () => {
    const d3 = r.days.find((d) => d.label === 'DÍA 3')!
    const pressTempo = d3.blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(pressTempo.techniques).toContainEqual({ type: 'tempo', value: '3:1:0' })

    const myo = r.days.find((d) => d.label === 'DÍA 1')!.blocks.find((b) => b.tag === 'finisher')!.exercises[0]
    expect(myo.techniques).toContainEqual({ type: 'myoreps' })

    const cluster = d3.blocks.find((b) => b.tag === 'accessory')!.exercises[0]
    expect(cluster.techniques.some((t) => t.type === 'cluster')).toBe(true)

    const band = d3.blocks.find((b) => b.tag === 'accessory')!.exercises
      .find((e) => e.name.includes('Traccion'))!
    expect(band.techniques.some((t) => t.type === 'band')).toBe(true)
  })

  it('classifies movement patterns for volume metrics', () => {
    const bigOf = (label: string) =>
      r.days.find((d) => d.label === label)!.blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(bigOf('DÍA 1').pattern).toBe('push') // Press Plano
    expect(bigOf('DÍA 4').pattern).toBe('hinge') // Peso Muerto
  })

  it('never throws and keeps raw text as fallback', () => {
    const malformed = [
      ['DÍA 9', '', '', '', ''],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
      ['??!!', '', 'garbage', '', ''], // unstructured
      ['', 'Ejercicio Raro', 'un montón', 'varias', 'a ojo'],
    ]
    const out = parseRoutine(malformed)
    expect(out.days).toHaveLength(1)
    const weird = out.days[0].blocks.flatMap((b) => b.exercises).find((e) => e.name === 'Ejercicio Raro')!
    expect(weird.reps).toBeNull()
    expect(weird.raw.reps).toBe('un montón')
    expect(out.parsedWarnings.length).toBeGreaterThan(0)
  })
})

describe('parseRoutine — plan-shape robustness (never empty when there is work)', () => {
  it('opens an implicit Día 1 when a sheet has exercises but no "DÍA N" marker', () => {
    // e.g. a tab whose day lives in its NAME, or a flat single-day sheet
    const r = parseRoutine([
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
      ['', 'Sentadilla', '5', '4', '60kg'],
      ['ACCESORIOS', 'Curl', '12', '3', '10kg'],
    ])
    expect(r.days).toHaveLength(1)
    expect(r.days[0].label).toBe('DÍA 1')
    const names = r.days[0].blocks.flatMap((b) => b.exercises).map((e) => e.name)
    expect(names).toEqual(['Sentadilla', 'Curl'])
    // the accessory header still files Curl under accessory, not ramp
    expect(r.days[0].blocks.find((b) => b.tag === 'accessory')!.exercises[0].name).toBe('Curl')
  })

  it('returns zero days (no crash) for a truly empty / no-exercise sheet', () => {
    expect(parseRoutine([]).days).toHaveLength(0)
    expect(parseRoutine([['', 'EJERCICIO', 'REPETICIONES', 'SERIES']]).days).toHaveLength(0)
    expect(parseRoutine([['Sin rutina']]).days).toHaveLength(0)
  })

  it('handles a small 2-day daily plan (no week columns → style daily)', () => {
    const r = parseRoutine([
      ['DÍA 1', '', '', '', ''],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
      ['', 'Press', '8', '3', '40kg'],
      ['DÍA 2', '', '', '', ''],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
      ['', 'Remo', '10', '3', '30kg'],
    ])
    expect(r.days.map((d) => d.label)).toEqual(['DÍA 1', 'DÍA 2'])
    expect(r.style).toBe('daily')
    expect(r.days.every((d) => d.weeks.length === 1)).toBe(true)
  })

  it('detects "Semana N" columns when they sit on the header row, not the DÍA row', () => {
    const r = parseRoutine([
      ['DÍA 1', '', '', '', ''], // marker row WITHOUT the week headers
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', 'Semana 2', 'Semana 3'],
      ['THE BIG ONE', 'Sentadilla', '5', '4', '60kg', '6X4', '4X4 65kg'],
    ])
    expect(r.days[0].weeks).toEqual([1, 2, 3])
    expect(r.style).toBe('weekly')
    const sq = r.days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(resolveWeek(sq, 2)).toMatchObject({ reps: 6, sets: 4 })
    expect(resolveWeek(sq, 3).load.value).toBe(65)
  })

  it('implicit Día 1 still picks up week columns from the header row (day-in-tab-name tab)', () => {
    const r = parseRoutine([
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', 'Semana 2'],
      ['THE BIG ONE', 'Press', '5', '3', '40kg', '6X3'],
    ])
    expect(r.days).toHaveLength(1)
    expect(r.days[0].weeks).toEqual([1, 2])
    const press = r.days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(resolveWeek(press, 2)).toMatchObject({ reps: 6, sets: 3 })
  })

  it('handles a 6-day plan and keeps every day even out of order', () => {
    const rows: string[][] = []
    for (const n of [1, 3, 2, 6, 4, 5]) {
      rows.push([`DÍA ${n}`, '', '', '', ''])
      rows.push(['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'])
      rows.push(['', `Ej${n}`, '5', '3', '50kg'])
    }
    const r = parseRoutine(rows)
    expect(r.days.map((d) => d.index)).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('parseLoad', () => {
  it('handles per-side, plain, and band loads', () => {
    expect(parseLoad('27,5kg x lado')).toMatchObject({ value: 27.5, perSide: true })
    expect(parseLoad('15kg')).toMatchObject({ value: 15, perSide: false })
    expect(parseLoad('Gris')).toMatchObject({ value: null, band: expect.any(String) })
    expect(parseLoad('')).toMatchObject({ value: null, perSide: false })
  })
})

describe('parseTechniques', () => {
  it('finds pause from "+2\\""', () => {
    expect(parseTechniques('Sentadilla High Bar + 2"', '5', '')).toContainEqual({ type: 'pause', seconds: 2 })
  })
})

describe('parseWeekCell', () => {
  it('splits "10X3" into reps × sets', () => {
    expect(parseWeekCell('10X3', 2)).toMatchObject({ reps: 10, sets: 3, complex: false })
  })
  it('extracts a weight override', () => {
    const c = parseWeekCell('2X4 28,75kg x lado', 4)!
    expect(c).toMatchObject({ reps: 2, sets: 4 })
    expect(c.load?.value).toBe(28.75)
    expect(c.load?.perSide).toBe(true)
  })
  it('keeps complex schemes raw', () => {
    const c = parseWeekCell('3X1+2X3', 5)!
    expect(c.complex).toBe(true)
    expect(c.raw).toBe('3X1+2X3')
  })
  it('returns null for an empty cell', () => {
    expect(parseWeekCell('', 2)).toBeNull()
  })
  it('flags "Mismo semana ant." as inherit', () => {
    expect(parseWeekCell('Mismo semana ant.', 4)).toMatchObject({ inherit: true })
  })
})

describe('resolveWeek inheritance', () => {
  it('"Mismo semana ant." resolves to the previous concrete week', () => {
    const r = parseRoutine([
      ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3'],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
      ['ACCESORIOS', 'Remo', '10', '3', '20kg', '12X3', 'Mismo semana ant.'],
      ['', 'Curl', '12', '3', '10kg', '', ''],
    ])
    const remo = r.days[0].blocks.find((b) => b.tag === 'accessory')!.exercises[0]
    // week 3 inherits week 2 = 12 reps × 3 sets
    expect(resolveWeek(remo, 3)).toMatchObject({ reps: 12, sets: 3 })
  })
})
