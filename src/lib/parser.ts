import type {
  Routine, RoutineDay, RoutineMeta, ExerciseRow, Load, Technique, SectionTag,
} from './types'
import { slugify, classifyPattern, deburr } from './normalize'

// ---- cell helpers -------------------------------------------------------

const norm = (v: unknown): string => (v == null ? '' : String(v)).trim()

const SECTION_TITLES: Record<SectionTag, string> = {
  warmup: 'Entrada en calor',
  ramp: 'Series de aproximación',
  big: 'The Big One',
  accessory: 'Accesorios',
  finisher: 'Finishers',
  core: 'Core',
  other: 'Trabajo',
}

function tagFromCell(a: string): SectionTag | null {
  const s = deburr(a)
  if (!s) return null
  if (/^dia\s*\d+/.test(s)) return null // day marker handled separately
  if (s.includes('warm')) return 'warmup'
  if (s.includes('big one')) return 'big'
  if (s.startsWith('acc')) return 'accessory'
  if (s.startsWith('fini')) return 'finisher' // FINISHERS / FINIISHERS (typo-tolerant)
  if (s.startsWith('core')) return 'core'
  return null
}

const isDayMarker = (a: string): RegExpMatchArray | null =>
  deburr(a).match(/^dia\s*(\d+)/)

// ---- value parsers ------------------------------------------------------

const toNum = (s: string): number | null => {
  const m = s.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export function parseLoad(obs: string): Load {
  const raw = obs.trim()
  const perSide = /x\s*lado/i.test(raw)
  // band-only loads (no kg)
  const bandMatch = raw.match(/\b(banda\s+\w+|gris|verde|roja|negra|azul|amarilla)\b/i)
  const hasKg = /kg/i.test(raw) || /^\s*-?\d/.test(raw)
  const value = hasKg ? toNum(raw) : null
  const load: Load = { value, perSide, unit: 'kg', raw }
  if (bandMatch && value == null) load.band = bandMatch[0]
  return load
}

export function parseTechniques(name: string, reps: string, obs: string): Technique[] {
  const hay = `${name} ${reps} ${obs}`
  const t: Technique[] = []
  const tempo = hay.match(/(\d:\d:\d)/)
  if (tempo) t.push({ type: 'tempo', value: tempo[1] })
  const pause = hay.match(/\+\s*(\d+)\s*["¨'']/)
  if (pause) t.push({ type: 'pause', seconds: parseInt(pause[1], 10) })
  if (/myo\s*reps?/i.test(hay)) t.push({ type: 'myoreps' })
  const cluster = hay.match(/cluster\s*(\d+)?\s*["¨'']?/i)
  if (cluster) t.push({ type: 'cluster', restSeconds: cluster[1] ? parseInt(cluster[1], 10) : null })
  const band = obs.match(/\b(banda\s+\w+|gris|verde|roja|negra|azul|amarilla)\b/i)
  if (band) t.push({ type: 'band', color: band[1] })
  if (/x\s*lado/i.test(hay)) t.push({ type: 'perSide' })
  if (/amrap|al\s*fallo|max/i.test(hay)) t.push({ type: 'amrap' })
  return t
}

// OBSERVACIONES minus the numeric load = the free coaching note.
function extractNote(obs: string, load: Load): string {
  if (load.value == null) return load.band ? '' : obs.trim()
  return obs.replace(/-?\d+(?:[.,]\d+)?\s*kg/i, '').replace(/x\s*lado/i, '').replace(/\s+/g, ' ').trim()
}

// ---- main ---------------------------------------------------------------

/**
 * Parse a routine sheet (2D cell array) into a structured Routine.
 * Tolerant by design: anything it can't classify is preserved in `raw` and
 * surfaced in `parsedWarnings`, never dropped or thrown.
 */
export function parseRoutine(rows: string[][], title = 'Rutina'): Routine {
  const meta: RoutineMeta = { sessionsPerWeek: '', startDate: '', weeks: '', goal: '' }
  const days: RoutineDay[] = []
  const warnings: string[] = []

  let day: RoutineDay | null = null
  let section: SectionTag = 'ramp'   // rows before THE BIG ONE are aproximación
  let seenBig = false
  let exIdx = 0

  const pushExercise = (cells: string[]) => {
    if (!day) return
    const [a, b, c, d, e] = [0, 1, 2, 3, 4].map((i) => norm(cells[i]))
    const name = b
    if (!name) return
    const load = parseLoad(e)
    const setOrdinalMatch = d.match(/(\d+)\s*°/)
    const isRamp = !!setOrdinalMatch || (!seenBig && section === 'ramp')
    const techniques = parseTechniques(name, c, e)
    const row: ExerciseRow = {
      id: `${day.id}-x${exIdx++}`,
      name,
      slug: slugify(name),
      pattern: classifyPattern(name),
      section: isRamp ? 'ramp' : section,
      isWarmupRamp: isRamp,
      reps: toNum(c),
      repsRaw: c,
      sets: setOrdinalMatch ? null : toNum(d),
      setsRaw: d,
      setOrdinal: setOrdinalMatch ? parseInt(setOrdinalMatch[1], 10) : null,
      load,
      techniques,
      notes: extractNote(e, load),
      raw: { exercise: b, reps: c, series: d, obs: e },
    }
    const tag = row.section
    let block = day.blocks.find((bl) => bl.tag === tag)
    if (!block) {
      block = { tag, title: SECTION_TITLES[tag], exercises: [] }
      day.blocks.push(block)
    }
    block.exercises.push(row)
    void a // col A only carried the section tag (already consumed)
  }

  for (const cells of rows) {
    const a = norm(cells[0])
    const b = norm(cells[1])
    const c = norm(cells[2])
    const dCol = norm(cells[3])

    // meta header rows: label in col C, value in col D
    if (!a && c) {
      const key = deburr(c)
      if (key.includes('sesiones')) meta.sessionsPerWeek ||= dCol
      else if (key.includes('inicio')) meta.startDate ||= dCol
      else if (key.includes('semanas')) meta.weeks ||= dCol
      else if (key.includes('objetivo')) meta.goal ||= dCol
    }

    // new day
    const dm = isDayMarker(a)
    if (dm) {
      const idx = parseInt(dm[1], 10)
      day = { id: `d${days.length + 1}-${idx}`, label: a.toUpperCase(), index: idx, warmup: '', blocks: [] }
      days.push(day)
      section = 'ramp'
      seenBig = false
      exIdx = 0
      continue
    }

    if (!day) continue

    // warm-up free text line
    if (tagFromCell(a) === 'warmup') {
      day.warmup = b || c
      continue
    }

    // column header row ("EJERCICIO | REPETICIONES | SERIES | OBSERVACIONES")
    if (deburr(b) === 'ejercicio') continue

    // section tag in col A switches the current section
    const tag = tagFromCell(a)
    if (tag && tag !== 'warmup') {
      section = tag
      if (tag === 'big') seenBig = true
    }

    // exercise row?
    if (b) {
      pushExercise(cells)
    } else if (a && !tag) {
      warnings.push(`Fila sin estructura clara: "${[a, b, c].filter(Boolean).join(' | ')}"`)
    }
  }

  if (!days.length) warnings.push('No se detectaron días (DÍA N) en la planilla.')
  return { title, meta, days, parsedWarnings: warnings }
}
