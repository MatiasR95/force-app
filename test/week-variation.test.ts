import { describe, it, expect } from 'vitest'
import { parseLoad, parseWeekCell, detectSwap, detectVariant, parseRoutine } from '../src/lib/parser'
import { resolveWeek, liftOfWeek } from '../src/lib/week'
import { matchRecordLift } from '../src/lib/records'
import { detectImpl } from '../src/components/AnimatedExercise'
import type { ExerciseRow } from '../src/lib/types'

// Real cells from Matias Rossi's "Junio 2026" / "Agosto 2026" sheets: every 4th week
// (Semana 4, Semana 8) is a whole-plan VARIATION week, and the weeks after it go back
// to the normal lifts and loads. The app kept the variation's kg and band colours.

const W = ['Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6', 'Semana 7', 'Semana 8', 'Semana 9', 'Semana 10']

function day(rows: string[][]) {
  const r = parseRoutine([
    ['DÍA 1', '', '', '', '', ...W],
    ['', 'EJERCICIO', 'REPETICIONES', 'SERIES', 'OBSERVACIONES'],
    ...rows,
  ])
  const all = r.days[0].blocks.flatMap((b) => b.exercises)
  return (name: string): ExerciseRow => all.find((e) => e.name === name)!
}

// the Día 4 of "Agosto 2026" (Big One + accessories), weeks 2..10 in columns F..N
const ex = day([
  ['THE BIG ONE', 'Deadlift', '6', '4', '80kg x lado', '2X5 85kg x lado', '3X3', '6X4 75kg c/bandas', '3X4 85kg x lado', '3X5', '4X1+3X3', '5X4 65kg x lado Hex. c/déficit', '4X2+3X2', '4X3'],
  ['ACCESORIOS', 'Sentadillas Hatfield 1 pie SSB', '6 x side', '4', '25kg per side', '8X3', '8X4', '10X4 Búlgaras Naranjas', '10X4', '', '6X4 30kg x side', '20X4 Naranjas Estocadas Caminando', '8X3', ''],
  ['', 'Isquio Carrito c/kg', '20', '3', 'Violeta', '', '', '22X3 Reverse Hyper 25kg x lado', '15X3 Verde', '', '14X2', '12X3 Sentadilla Abierta s/cajones KB Roja', '14X3', ''],
  ['', 'Apertura Inclinada', '8', '', '25kg', '', '9X4', '16X4 Flexiones de brazo s/KB 8+8', '', '', '10X4', '12X4 10kg x lado Pull Over Polea', '', ''],
  ['', 'Bench Press', '4', '4', '32,5kg x lado', '4X5', '5X2+4X2', '8X4 32,5kg x lado Mancuernas', '4X4', '5X4 32,5kg x lado', '2X5', '5X4 31,25kg x lado Pines', '6X2+5X2', ''],
  ['FINISHERS', 'Tríceps Dorsalera', '12', '3', '10kg x lado', '', '15X3', '8X3 12,5kg x lado', '', '10X3', '', '12X3', '', ''],
  ['', 'Open Squat over Wall with DB', '8', '3', '20kg', '10X3', '', '12X3', '', '8X3 22,5kg', '', '10X3', '', ''],
])

describe('variation weeks — the weeks after them go back to the normal lift', () => {
  it('deadlift: a banded / deficit-hex week does not become the new working weight', () => {
    const dl = ex('Deadlift')
    expect(resolveWeek(dl, 4).load.value).toBe(75)
    expect(resolveWeek(dl, 4).load.perSide).toBe(true) // "75kg c/bandas" is still per side
    expect(resolveWeek(dl, 7).load.value).toBe(85)
    expect(resolveWeek(dl, 8).load.value).toBe(65)
    // the bug: S9/S10 kept the 65 kg of the deficit hex pull
    expect(resolveWeek(dl, 9).load.value).toBe(85)
    expect(resolveWeek(dl, 10).load.value).toBe(85)
  })

  it('a band-only swap does not leave the band on the base lift', () => {
    const h = ex('Sentadillas Hatfield 1 pie SSB')
    expect(resolveWeek(h, 4).name).toBe('Búlgaras')
    expect(resolveWeek(h, 4).load.band).toBe('Naranjas')
    expect(resolveWeek(h, 5).load.value).toBe(25) // was "Naranjas"
    expect(resolveWeek(h, 9).load.value).toBe(30) // back to Semana 7, not "Naranjas"
    const i = ex('Isquio Carrito c/kg')
    expect(resolveWeek(i, 9).load.band).toBe('Verde') // was "Roja" from the S8 swap
  })

  it('a swap that brings its own load or reps stays in its week', () => {
    const a = ex('Apertura Inclinada')
    expect(resolveWeek(a, 5).reps).toBe(9)          // not the 16 push-ups of S4
    expect(resolveWeek(a, 9).load.value).toBe(25)   // not the 10 kg pull-over of S8
    expect(resolveWeek(a, 9).load.perSide).toBe(false)
  })

  it('a lighter same-lift week (pin press) shows on its week, then the load comes back', () => {
    const b = ex('Bench Press')
    expect(resolveWeek(b, 8).load.value).toBe(31.25)
    expect(resolveWeek(b, 9).load.value).toBe(32.5)
    expect(resolveWeek(b, 9).plan).toEqual([6, 6, 5, 5])
  })

  it('normal progression inside the variation week still flows', () => {
    // heavier weight in S4 = real progression, kept by the blank S5
    expect(resolveWeek(ex('Tríceps Dorsalera'), 5).load.value).toBe(12.5)
    // a reps-only cell keeps progressing
    expect(resolveWeek(ex('Open Squat over Wall with DB'), 5).reps).toBe(12)
  })

  it('one-off swaps outside a variation week keep the old behaviour', () => {
    const one = day([
      ['THE BIG ONE', 'Deadlift', '5', '4', '80kg x lado', '', '6X4 70kg c/bandas', '', '', '', '', '', '', ''],
    ])('Deadlift')
    // a lone banded week is not a whole-plan variation week: its 70 flows on
    expect(resolveWeek(one, 4).load.value).toBe(70)
  })
})

describe('same lift, different implement/range (variants)', () => {
  it('names the variant so the animation and records follow it', () => {
    expect(detectVariant('8X4 32,5kg x lado Mancuernas', 'Bench Press')).toBe('Mancuernas')
    expect(detectVariant('6X4 70kg c/bandas', 'Deadlift')).toBe('c/bandas')
    expect(detectVariant('5X4 65kg x lado Hex. c/déficit', 'Deadlift')).toBe('Hex déficit')
    expect(detectVariant('5X4 31,25kg x lado Pines', 'Bench Press')).toBe('Pines')
    // already part of the base name, or only inside a member comment → not a variant
    expect(detectVariant('4X4 40kg', 'Sentadilla al banco')).toBe(null)
    expect(detectVariant('1X3 (COMPLETA DESDE CAJON)', 'Dominadas Supinas')).toBe(null)
    // a band colour on a band exercise is the load, not a variation
    expect(detectVariant('12X3 Verde', 'Isquio Carrito c/kg')).toBe(null)
  })

  it('records: variant weeks never reach the board under the base lift', () => {
    const b = ex('Bench Press'), dl = ex('Deadlift')
    expect(matchRecordLift(liftOfWeek(b, 4).name)).toBe('press-banca-db') // was barbell +20 kg
    expect(detectImpl(liftOfWeek(b, 4).name)).toBe('dumbbell')
    expect(matchRecordLift(liftOfWeek(b, 8).name)).toBe(null)             // pin press
    expect(matchRecordLift(liftOfWeek(dl, 4).name)).toBe(null)            // banded
    expect(matchRecordLift(liftOfWeek(dl, 8).name)).toBe(null)            // deficit hex
    expect(matchRecordLift(liftOfWeek(dl, 9).name)).toBe('peso-muerto')
  })
})

describe('cell parsing fixes found in the gym-wide audit', () => {
  it('a weight range is not a negative weight', () => {
    expect(parseLoad('22,5-20kg').value).toBe(22.5)
    expect(parseLoad('4-5kg mancuerna').value).toBe(4)
    expect(parseLoad('5-7kg x lado').perSide).toBe(true)
    expect(parseLoad('↓2,5kg').value).toBe(-2.5) // a real decrement still works
  })

  it('keeps the band on a timed cell', () => {
    const c = parseWeekCell('12¨X4 Azul', 9, 13, 'Puente Isquios iso')!
    expect(c.timeSec).toBe(12)
    expect(c.sets).toBe(4)
    expect(c.load?.band).toBe('Azul')
  })

  it('two-part rep counts are not part of a swapped name, nor its weight', () => {
    const c = parseWeekCell('10+10 Gemelos Open and closed', 8, 12, 'Gemelos SSB+2¨')!
    expect(c.name).toBe('Gemelos Open and closed')
    expect(c.load?.value ?? null).toBe(null)
    expect(detectSwap('5X1 + 4X3 remopronado 15kg 6reps', 'Dominadas Supinas')).toBe('remopronado')
    expect(detectSwap('COMPLEX KB: Sentadilla Frontal 8+12X3 Peso Muerto Rumano Verdes', 'Front Squats'))
      .toBe('COMPLEX KB Sentadilla Frontal Peso Muerto Rumano')
    expect(detectSwap('10X3 KB Verde Subidas al Banco', 'Front Squats')).toBe('Subidas al Banco')
  })
})
