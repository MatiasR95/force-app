import { describe, it, expect } from 'vitest'
import { buildItems, keyOf } from '../src/screens/Entrenar'
import type { Block, ExerciseRow, RoutineDay, SectionTag } from '../src/lib/types'

// Two circuits with the SAME tag in one day must not share a progress key —
// they used to collide into `c-<tag>`, so marking a round in one advanced the
// other on the session map and overview sheet.

function mkEx(id: string, name: string): ExerciseRow {
  return {
    id, row: 10, name, slug: name.toLowerCase(), pattern: 'squat',
    section: 'accessory', isWarmupRamp: false, reps: 10, repsRaw: '10', timeSec: null,
    sets: 3, setsRaw: '3', setOrdinal: null, plan: null,
    load: { value: null, perSide: false, unit: 'kg', raw: '' },
    techniques: [], notes: '', weeks: {},
    raw: { exercise: name, reps: '10', series: '3', obs: '' },
  }
}

function mkCircuit(tag: SectionTag, title: string, exs: ExerciseRow[]): Block {
  return { tag, title, circuit: true, rounds: 3, timed: false, exercises: exs }
}

function mkDay(blocks: Block[], warmup = 'Movilidad + banda'): RoutineDay {
  return { id: 'd1', label: 'DÍA 1', index: 0, warmup, weeks: [1], blocks }
}

describe('Entrenar session keys', () => {
  it('gives two same-tag circuits distinct keys (legacy key kept for the first)', () => {
    const day = mkDay([
      mkCircuit('accessory', 'Superserie A', [mkEx('a1', 'Remo'), mkEx('a2', 'Curl')]),
      mkCircuit('accessory', 'Superserie B', [mkEx('b1', 'Vuelos'), mkEx('b2', 'Tríceps')]),
    ])
    const keys = buildItems(day).map(keyOf)
    expect(keys).toEqual(['warmup', 'c-accessory', 'c-accessory-2'])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps the legacy key when a day has one circuit per tag (no mid-session progress loss)', () => {
    const day = mkDay([
      mkCircuit('big', 'The Big One', [mkEx('g1', 'Press Plano'), mkEx('g2', 'Sentadilla')]),
      mkCircuit('accessory', 'Superserie', [mkEx('a1', 'Remo'), mkEx('a2', 'Curl')]),
    ])
    expect(buildItems(day).map(keyOf)).toEqual(['warmup', 'c-big', 'c-accessory'])
  })

  it('every item in a mixed day gets a unique key', () => {
    const solo: Block = { tag: 'accessory', title: 'Accesorios', circuit: false, rounds: null, timed: false, exercises: [mkEx('s1', 'Facepull'), mkEx('s2', 'Plancha')] }
    const day = mkDay([
      mkCircuit('accessory', 'Superserie A', [mkEx('a1', 'Remo')]),
      solo,
      mkCircuit('accessory', 'Superserie B', [mkEx('b1', 'Vuelos')]),
      mkCircuit('core', 'Zona media', [mkEx('c1', 'Rueda')]),
    ])
    const keys = buildItems(day).map(keyOf)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('c-accessory')
    expect(keys).toContain('c-accessory-2')
    expect(keys).toContain('c-core')
  })
})
