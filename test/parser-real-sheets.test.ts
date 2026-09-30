import { describe, it, expect } from 'vitest'
import { parseRoutine, parseWeekCell, parseTimeSec, splitWarmup, parseTechniques } from '../src/lib/parser'
import { resolveWeek } from '../src/lib/week'
import { setsReps } from '../src/components/TechniqueChips'

// Regressions from the Sep 2026 audit of every live routine (161 sheets) — each case
// is a cell a coach really wrote.

const day = (rows: string[][], weeks: string[] = []) => parseRoutine([
  ['DÍA 1', '', '', '', '', ...weeks],
  ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
  ...rows,
])
const find = (r: ReturnType<typeof parseRoutine>, name: string) =>
  r.days.flatMap((d) => d.blocks).flatMap((b) => b.exercises).find((e) => e.name === name)!

describe('a pause "+N″" is part of the exercise, never another one', () => {
  it('keeps the warm-up pause on its own movement', () => {
    expect(splitWarmup('Flexiones de brazo + 1" 8 x 2 + Triceps banda Violeta x12 x 2 + Remo Banda Verde 15 x 2'))
      .toEqual(['Flexiones de brazo + 1" 8 x 2', 'Triceps banda Violeta x12 x 2', 'Remo Banda Verde 15 x 2'])
    expect(splitWarmup('Sentadilla al banco 8x2 + Pasos banda (6+6) x2 + Remo Banda Violeta 12x 2'))
      .toEqual(['Sentadilla al banco 8x2', 'Pasos banda (6+6) x2', 'Remo Banda Violeta 12x 2'])
    expect(splitWarmup('Buenos Días banda violeta+1¨ 10 x 2 + Halos Kb 10x2'))
      .toEqual(['Buenos Días banda violeta+1¨ 10 x 2', 'Halos Kb 10x2'])
  })

  it('a pause or hold on the reps is not a work time', () => {
    expect(parseTimeSec('6+1"')).toBeNull()
    expect(parseTimeSec('15+10¨')).toBeNull()
    expect(parseTimeSec('10+10+5"')).toBeNull()
    expect(parseTimeSec('12+2¨ excéntrica')).toBeNull()
    expect(parseTimeSec('10 (2")')).toBeNull()
    // real timed work still reads as time
    expect(parseTimeSec('AMRAP 45¨')).toBe(45)
    expect(parseTimeSec('10"-10"-10"')).toBe(10)
    expect(parseTimeSec('20 Segundos')).toBe(20)
    expect(parseTechniques('Press Plano MC', '6+1"', '')).toContainEqual({ type: 'pause', seconds: 1 })
    expect(parseTechniques('Bicho muerto', '10 (2")', '')).toContainEqual({ type: 'pause', seconds: 2 })
  })

  it('the bench press "6+1″" stays a lift, and the next row is not timed', () => {
    const r = day([
      ['', 'Press Plano MC', '6+1"', '1°', '25kg'],
      ['', 'Peso Muerto', '5', '2°', '50kg x lado'],
    ])
    expect(find(r, 'Press Plano MC').timeSec).toBeNull()
    expect(find(r, 'Peso Muerto').timeSec).toBeNull()
  })

  it('a pause in a week cell keeps reps and series', () => {
    const c = parseWeekCell('10X4 + 5" Finales', 3, 7, 'Hip Thrust')!
    expect(c).toMatchObject({ reps: 10, sets: 4, repsRaw: '10 + 5″', complex: false })
    expect(parseWeekCell('6 + 2"X4', 3, 7, 'Press')).toMatchObject({ sets: 4, repsRaw: '6 + 2″' })
  })
})

describe('one timed exercise closing a series is not a HIIT', () => {
  // real case, Carina Cortinez Día 4
  const r = day([
    ['FINISHERS', 'Bicep barra Suiza', '10', '3', '5kg x lado'],
    ['', 'Sentadilla bombero', 'AMRAP 20"', '3', '5kg'],
    ['', 'Sierras FB', '15', '3', ''],
  ])
  const fin = r.days[0].blocks.find((b) => b.tag === 'finisher')!

  it('the block stays a series (rounds, not a HIIT timer)', () => {
    expect(fin.timed).toBe(false)
    expect(fin.circuit).toBe(true)
    expect(fin.rounds).toBe(3)
  })
  it('the timed one is timed, the reps rows keep their reps', () => {
    expect(find(r, 'Sentadilla bombero').timeSec).toBe(20)
    expect(find(r, 'Sierras FB').timeSec).toBeNull()
    expect(setsReps(find(r, 'Sierras FB'), 1)).toBe('15 × 3')
  })
  it('a real HIIT (every movement by time) is still a HIIT', () => {
    const h = day([
      ['HIIT', 'Wall Ball', '25¨', '5', ''],
      ['', 'Swing Kb', '', '', ''],
    ]).days[0].blocks.find((b) => b.tag === 'hiit')!
    expect(h.timed).toBe(true)
    expect(h.exercises.map((e) => e.timeSec)).toEqual([25, 25])
  })
  it('"HIT" is a HIIT, and "HIIT A" / "HIIT B" are two circuits', () => {
    const r2 = day([
      ['HIT', 'Battle Rope', '20"', '3', ''],
      ['HIIT A', 'Abdominales', '30¨', '3', ''],
      ['', 'Battle Rope', '', '', ''],
      ['HIIT B', 'Abdominales Cruzados', '30¨', '3', ''],
      ['', 'Swing KB', '', '', ''],
    ])
    expect(r2.days[0].blocks.map((b) => b.title)).toEqual(['HIIT', 'HIIT A', 'HIIT B'])
  })
  it('a bare "25X5" inside a timed circuit is 25 seconds', () => {
    const r2 = day([['HIIT', 'Abdominales Bici', '20"', '3', '', '25X5']], ['Semana 2'])
    expect(resolveWeek(find(r2, 'Abdominales Bici'), 2)).toMatchObject({ timeSec: 25, sets: 5 })
  })
})

describe('reps schemes the parser used to cut', () => {
  const cell = (s: string, base = 'Floor Press') => parseWeekCell(s, 3, 7, base)!
  it('numbers in front of the scheme are part of it', () => {
    expect(cell('17+10X3')).toMatchObject({ sets: 3, repsRaw: '17+10' })
    expect(cell('8-8-6-6X4')).toMatchObject({ plan: [8, 8, 6, 6], sets: 4 })
    expect(cell('4-3-2-2-2X5')).toMatchObject({ plan: [4, 3, 2, 2, 2] })
    expect(cell('4X2+3-2-2')).toMatchObject({ plan: [4, 4, 3, 2, 2] })
    expect(cell('7 a 1 X3')).toMatchObject({ sets: 3, repsRaw: '7 a 1' })
    expect(cell('8 x lado x3')).toMatchObject({ reps: 8, sets: 3, repsRaw: '8 x lado' })
  })
  it('"16 pasos X3" is 16 × 3, not 16 kg', () => {
    const c = cell('16 pasos X3 Amarillas Estocadas Caminando', 'Sentadilla Búlgara')
    expect(c.name).toBe('Estocadas Caminando')
    expect(c).toMatchObject({ reps: 16, sets: 3 })
    expect(c.load?.value).toBeNull()
  })
  it('"8+8" behind a swap is reps, not 8 kg', () => {
    expect(cell('16X4 Flexiones de brazo s/KB 8+8', 'Apertura Inclinada').load?.value ?? null).toBeNull()
  })
  it('a swap keeps the coach spelling and drops the pause from the name', () => {
    expect(cell('16X4 Abdominales 1/2 bisagra', 'Batir Olla Fitball').name).toBe('Abdominales 1/2 bisagra')
    expect(cell('15X4 Gemelos KB+2¨ Naranjas', 'Gemelos SSB+2¨').name).toBe('Gemelos KB')
  })
  it('"mismo que semana pasada" and a lone "-" repeat the previous week', () => {
    expect(cell('mismo que semana pasada')).toMatchObject({ inherit: true })
    expect(parseWeekCell('-', 3, 7, 'Remo')).toBeNull()
  })
  it('a red band behind "c/banda KB" is Roja', () => {
    expect(cell('12X3 Swing c/banda KB Roja', 'Hip Thrust').load?.band).toBe('Roja')
  })
})

describe('cells Sheets hands over in another type', () => {
  it('a rep scheme turned into a date is read back', () => {
    const r = day([
      ['FINISHERS', 'Triceps frances y mariposa', '2026-10-10T03:00:00.000Z', '3', '12,5kg'],
      ['', 'Hip Thrust+banda', '2010-12-15T03:00:00.000Z', '3', '25kg x lado'],
    ])
    expect(find(r, 'Triceps frances y mariposa').repsRaw).toBe('10-10')
    expect(find(r, 'Hip Thrust+banda').plan).toEqual([15, 12, 10])
  })
  it('an in-cell image never opens a phantom section', () => {
    const r = parseRoutine([
      ['DÍA 1', '', '', '', ''],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
      ['THE BIG ONE', 'Sentadillas', '5', '4', '40kg x lado'],
      [{ valueType: 'IMAGE' } as unknown as string, '', 'Nombre', 'Yo', ''],
    ])
    expect(r.days[0].blocks.map((b) => b.title)).toEqual(['The Big One'])
  })
})
