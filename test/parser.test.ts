import { describe, it, expect } from 'vitest'
import { parseRoutine, parseLoad, parseTechniques } from '../src/lib/parser'
import { ENERO_2026 } from '../src/data/fixtureEnero2026'

describe('parseRoutine — real Enero 2026 sheet', () => {
  const r = parseRoutine(ENERO_2026, 'Enero 2026')

  it('reads the meta block', () => {
    expect(r.meta.sessionsPerWeek).toBe('4 x semana')
    expect(r.meta.startDate).toBe('12 de enero de 2026')
    expect(r.meta.weeks).toBe('8 semanas')
    expect(r.meta.goal).toBe('Fuerza+hipetrofia')
  })

  it('detects all four days in sheet order', () => {
    expect(r.days.map((d) => d.label)).toEqual(['DÍA 1', 'DÍA 2', 'DÍA 4', 'DÍA 3'])
  })

  it('captures each day warm-up line', () => {
    expect(r.days[0].warmup).toContain('Flexiones de brazo')
    expect(r.days[1].warmup).toContain('Sentadilla c/barra')
  })

  it('identifies THE BIG ONE per day', () => {
    const big = (i: number) => r.days[i].blocks.find((b) => b.tag === 'big')?.exercises ?? []
    expect(big(0)[0].name).toBe('Press Plano')
    expect(big(1)[0].name).toBe('Sentadillas  Low Bar')
    expect(big(2)[0].name).toBe('Peso Muerto')
    // Day 3 (DÍA 3) is a superset: Press + Sentadilla both under THE BIG ONE
    expect(big(3).map((e) => e.name)).toEqual([
      'Press Plano TEMPO 3:1:0',
      'Sentadilla  High Bar + 2"',
    ])
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
    const dl = r.days[2].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(dl.load.value).toBe(50)
  })

  it('detects techniques: tempo, pause, myoreps, cluster, band, per-side', () => {
    const d3 = r.days[3]
    const pressTempo = d3.blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(pressTempo.techniques).toContainEqual({ type: 'tempo', value: '3:1:0' })

    const myo = r.days[0].blocks.find((b) => b.tag === 'finisher')!.exercises[0]
    expect(myo.techniques).toContainEqual({ type: 'myoreps' })

    const cluster = d3.blocks.find((b) => b.tag === 'accessory')!.exercises[0]
    expect(cluster.techniques.some((t) => t.type === 'cluster')).toBe(true)

    const band = d3.blocks.find((b) => b.tag === 'accessory')!.exercises
      .find((e) => e.name.includes('Traccion'))!
    expect(band.techniques.some((t) => t.type === 'band')).toBe(true)
  })

  it('classifies movement patterns for volume metrics', () => {
    const big0 = r.days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(big0.pattern).toBe('push') // Press Plano
    const big2 = r.days[2].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(big2.pattern).toBe('hinge') // Peso Muerto
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
