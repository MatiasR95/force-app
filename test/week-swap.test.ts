import { describe, it, expect } from 'vitest'
import { parseLoad, parseWeekCell, detectSwap, parseRoutine } from '../src/lib/parser'
import { resolveWeek } from '../src/lib/week'

// Real formats taken from live FORCE sheets (Matias Rossi "Agosto 2026" and 60
// client routines audited Jul 2026).

describe('parseLoad — a set×rep scheme is not a weight', () => {
  it('reads the kg-tagged number, not the first number in the cell', () => {
    // the bug a member hit: OBSERVACIONES = the whole prescription → 5 kg squat
    expect(parseLoad('5X4 43,75kg x lado').value).toBe(43.75)
    expect(parseLoad('5X4 43,75kg x lado').perSide).toBe(true)
    expect(parseLoad('Sentadillas al banco 6X4 40kg x lado').value).toBe(40)
    expect(parseLoad('8X4 35kg Remo Landmine 1 brazo').value).toBe(35)
  })
  it('keeps plain weights, per-side shorthand and bands working', () => {
    expect(parseLoad('20kg x lado').value).toBe(20)
    expect(parseLoad('10x lado').value).toBe(10)     // no "kg" written
    expect(parseLoad('25 X4 20 x lado').value).toBe(20) // scheme first, bare weight after
    expect(parseLoad('Naranjas').value).toBe(null)
    expect(parseLoad('Naranjas').band).toBeTruthy()
  })
})

describe('detectSwap — a week cell that prescribes a DIFFERENT lift', () => {
  const swap = (cell: string, base: string) => detectSwap(cell, base)

  it('detects real substitutions', () => {
    expect(swap('Sentadillas al banco 6X4 40kg x lado', 'Sentadillas')).toBe('Sentadillas al banco')
    expect(swap('8X5 Polea Pronado 27,5kg x lado', 'Dominadas Anillas')).toBe('Polea Pronado')
    expect(swap('20X4 Tracciones a la frente', 'Remo Erguido Barra')).toBe('Tracciones a la frente')
    expect(swap('12X4 10kg x lado Vuelo Posterior Pronado', 'Remo Erguido Barra')).toBe('Vuelo Posterior Pronado')
    expect(swap('8X4 Remo Gorila Naranjas', '1 Arm KB+band Row')).toBe('Remo Gorila')
    expect(swap('17+10X3 Valijero', 'Inf. Colgado+Farmer Walk')).toBe('Valijero')
    expect(swap('10X4 Good Mornings 25kg per side', 'Romanian Deadlift')).toBe('Good Mornings')
  })

  it('does NOT fire on band colours, technique notes or member comments', () => {
    expect(swap('6x3 Violeta', 'Bicep KB+banda azul')).toBe(null)
    expect(swap('8X3 Violetas/Verdes', 'Estocada Caminando')).toBe(null)
    expect(swap('6X4 (GRISES)', 'Sentadillas Bulgaras')).toBe(null)
    expect(swap('2X4 Tempo 2:2:0', 'Dominadas Supinas')).toBe(null)
    expect(swap('1X5 NORMAL', 'Dominadas Supinas')).toBe(null)
    expect(swap('6X3 mas peso', 'Pres plano Mancuernas')).toBe(null)
    expect(swap('2X4 28,75 Normal', 'Press Plano + 2"')).toBe(null)
    expect(swap('7X3 con 12,5', 'Press Inclinado')).toBe(null)
    expect(swap('6X4 70kg c/bandas', 'Deadlift')).toBe(null)
    expect(swap('3X4 50kg x lad o', 'Sentadillas SSB al banco (30cm)')).toBe(null)
    expect(swap('4X3 (35kg dolor muñeca)', 'Press Plano')).toBe(null)
    expect(swap('4X5 (hice dos vueltas con 5kg x lado y 2 con 6,25kg x lado)', 'Press Plano + 1"')).toBe(null)
    expect(swap('1X3 (COMPLETA DESDE CAJON)', 'Dominadas Supinas')).toBe(null)
  })

  it('does not treat the coach restating the same lift as a swap', () => {
    expect(swap('Sentadilla 4x4 20kg x lado', 'Sentadillas+1"')).toBe(null)
    // plural/singular drift is still the same lift
    expect(swap('Sentadillas Búlgaras 6X4 45kg', 'Sentadilla Búlgara')).toBe(null)
    // …but a phrase that adds a real word is a genuine variation
    expect(swap('Sentadillas al banco 6X4 40kg x lado', 'Sentadillas')).toBe('Sentadillas al banco')
  })

  it('ignores coach prose that merely mentions a lift', () => {
    // a wrongly detected swap would drop the week out of the progression chain
    expect(swap('8X4 trabajar el remo mas lento', 'Remo')).toBe(null)
  })

  it('keeps a bracketed comment from being read as the weight', () => {
    expect(parseLoad('60 x lado (la próxima subí 2,5kg)').value).toBe(60)
    // coaches forget the closing bracket (real case: Macarena Martínez)
    expect(parseLoad('(pasé a barra con 7,5kg x lado e hice 8 repeticiones').value).toBe(null)
  })

  it('never blanks the weight for a cell that only changes reps/series', () => {
    // real case (Rodri Leuzzi): Semana 8 "2X4 ↑kg x lado" — an arrow, no number. The
    // week used to resolve to NO weight at all; it must keep last week's.
    const rows: string[][] = [
      ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3'],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', '', ''],
      ['THE BIG ONE', 'Sentadillas', '4', '4', '45kg x lado', '4X4 47,5kg x lado', '2X4 ↑kg x lado'],
    ]
    const ex = parseRoutine(rows, 'x').days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]
    expect(resolveWeek(ex, 2).load.value).toBe(47.5)
    expect(resolveWeek(ex, 3).load.value).toBe(47.5)
    expect(resolveWeek(ex, 3).reps).toBe(2)
  })

  it('honours "Mismo semana N" as an absolute reference', () => {
    const rows: string[][] = [
      ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3', 'Semana 4'],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', '', '', ''],
      ['ACCESORIOS', 'Buenos Días', '10', '3', '20kg', '12X2', '14X3', 'Mismo semana 2'],
    ]
    const ex = parseRoutine(rows, 'x').days[0].blocks[0].exercises[0]
    expect(resolveWeek(ex, 3).reps).toBe(14)
    // week 4 points back at week 2 (12X2), NOT at week 3
    expect(resolveWeek(ex, 4).reps).toBe(12)
    expect(resolveWeek(ex, 4).sets).toBe(2)
  })

  it('reads "+5kg" as an increment over last week, not as 5 kg', () => {
    // real case: Santiago Marelli, Serrucho 1 brazo — base 22,5, Semana 5 "8X4 +5kg"
    const rows: string[][] = [
      ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3'],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', '', ''],
      ['ACCESORIOS', 'Serrucho 1 brazo', '8', '4', '22,5kg', '', '8X4 +5kg'],
    ]
    const ex = parseRoutine(rows, 'x').days[0].blocks[0].exercises[0]
    expect(parseLoad('+5kg').delta).toBe(true)
    expect(resolveWeek(ex, 2).load.value).toBe(22.5)
    expect(resolveWeek(ex, 3).load.value).toBe(27.5)
    expect(resolveWeek(ex, 5).load.value).toBe(27.5) // and it doesn't compound
  })

  it('does not inherit "x lado" onto a substituted lift', () => {
    // Dominadas per-side base → a cable pulldown week: one stack, not per side.
    // Inheriting it doubled the weight and wrote a fake PR to the gym board.
    const rows: string[][] = [
      ['DÍA 3', '', '', '', '', 'Semana 2', 'Semana 3', 'Semana 4'],
      ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', '', '', ''],
      ['THE BIG ONE', 'Dominadas Anillas', '6', '5', '15kg x lado', '', '', '8X5 Polea Pronado 27,5kg'],
    ]
    const ex = parseRoutine(rows, 'x').days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]
    const w4 = resolveWeek(ex, 4)
    expect(w4.substitution).toBe(true)
    expect(w4.load.value).toBe(27.5)
    expect(w4.load.perSide).toBe(false)
  })

  it('keeps the prescription readable when the name comes first', () => {
    const c = parseWeekCell('Sentadillas al banco 6X4 40kg x lado', 4, 9, 'Sentadillas')!
    expect(c.name).toBe('Sentadillas al banco')
    expect(c.reps).toBe(6)
    expect(c.sets).toBe(4)
    expect(c.load?.value).toBe(40)
    expect(c.complex).toBe(false)
  })
})

describe('resolveWeek — a substitution lasts ONE week', () => {
  // Día 1 of Matias's Agosto 2026: base = week 1, Semana 3 progresses, Semana 4 is a
  // variation week, Semanas 5+ are blank.
  const rows: string[][] = [
    ['DÍA 1', '', '', '', '', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6'],
    ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES', '', '', '', '', ''],
    ['THE BIG ONE', 'Sentadillas', '5', '4', '5X4 43,75kg x lado',
      '6X1+4X3', '2X4 47,5 kg x lado', 'Sentadillas al banco 6X4 40kg x lado', '', ''],
  ]
  const ex = parseRoutine(rows, 'Agosto 2026').days[0].blocks.find((b) => b.tag === 'big')!.exercises[0]

  it('reads week 1 from a prescription written into OBSERVACIONES', () => {
    const w1 = resolveWeek(ex, 1)
    expect(w1.load.value).toBe(43.75)
    expect(w1.load.perSide).toBe(true)
    expect(w1.name).toBe('Sentadillas')
    expect(w1.substitution).toBe(false)
  })

  it('swaps the lift, reps, series and weight on the variation week', () => {
    const w4 = resolveWeek(ex, 4)
    expect(w4.substitution).toBe(true)
    expect(w4.name).toBe('Sentadillas al banco')
    expect(w4.slug).toContain('sentadilla')
    expect(w4.reps).toBe(6)
    expect(w4.sets).toBe(4)
    expect(w4.load.value).toBe(40)
  })

  it('resumes the normal progression on the blank weeks after it', () => {
    for (const w of [5, 6, 9]) {
      const r = resolveWeek(ex, w)
      expect(r.substitution).toBe(false)
      expect(r.name).toBe('Sentadillas')
      expect(r.load.value).toBe(47.5) // Semana 3, the last non-substituted week
    }
  })
})
