import type {
  Routine, RoutineDay, RoutineMeta, ExerciseRow, Load, Technique, SectionTag, WeekCell,
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
  core: 'Zona media',
  hiit: 'HIIT',
  other: 'Trabajo',
}

// Sections performed as a circuit (all exercises together, N rounds) by default.
const CIRCUIT_TAGS = new Set<SectionTag>(['accessory', 'finisher', 'core', 'hiit', 'other'])

// Map a column-A label to a canonical section { tag, title }.
function tagInfo(a: string): { tag: SectionTag; title: string } | null {
  const s = deburr(a)
  if (!s) return null
  if (!/[a-z]/.test(s)) return null // not a real label (e.g. "??!!") → let it warn
  if (/^dia\s*\d+/.test(s)) return null
  if (s.includes('warm') || s.includes('entrada en calor')) return { tag: 'warmup', title: SECTION_TITLES.warmup }
  if (s.includes('big one')) return { tag: 'big', title: SECTION_TITLES.big }
  if (s.startsWith('acc')) return { tag: 'accessory', title: SECTION_TITLES.accessory }
  if (s.startsWith('fini')) return { tag: 'finisher', title: SECTION_TITLES.finisher } // FINISHERS / FINIISHERS
  if (s.includes('hiit') || s.includes('metabol')) return { tag: 'hiit', title: SECTION_TITLES.hiit }
  if (s.includes('core') || s.includes('zona media') || s.includes('abdomin')) return { tag: 'core', title: SECTION_TITLES.core }
  // unknown label → its own circuit-capable section, titled as written
  return { tag: 'other', title: titleCase(a) }
}

const titleCase = (s: string): string =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim()

const isDayMarker = (a: string): RegExpMatchArray | null => deburr(a).match(/^dia\s*(\d+)/)

// Scan a row (from col F onward) for "Semana N" per-week column headers. These
// can sit on the "DÍA N" marker row OR on the "EJERCICIO ..." header row,
// depending on how the coach laid out the sheet — so we look on both.
function scanWeekCols(cells: string[]): Array<{ week: number; col: number }> {
  const out: Array<{ week: number; col: number }> = []
  for (let i = 5; i < cells.length; i++) {
    const wm = norm(cells[i]).match(/semana\s*(\d+)/i)
    if (wm) out.push({ week: parseInt(wm[1], 10), col: i })
  }
  return out
}

// ---- value parsers ------------------------------------------------------

const toNum = (s: string): number | null => {
  const m = s.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export function parseLoad(obs: string): Load {
  const raw = obs.trim()
  const perSide = /x\s*lado/i.test(raw)
  const bandMatch = raw.match(/\b(banda\s+\w+|gris|verde|roja|negra|azul|amarilla|violeta)\b/i)
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
  const band = obs.match(/\b(banda\s+\w+|gris|verde|roja|negra|azul|amarilla|violeta)\b/i)
  if (band) t.push({ type: 'band', color: band[1] })
  if (/x\s*lado/i.test(hay)) t.push({ type: 'perSide' })
  if (/amrap|al\s*fallo|max/i.test(hay)) t.push({ type: 'amrap' })
  return t
}

function extractNote(obs: string, load: Load): string {
  if (load.value == null) return load.band ? '' : obs.trim()
  return obs.replace(/-?\d+(?:[.,]\d+)?\s*kg/i, '').replace(/x\s*lado/i, '').replace(/\s+/g, ' ').trim()
}

// A "Semana N" cell, e.g. "10X3", "2X4 28,75kg x lado", "3X1+2X3" (complex),
// "Mismo semana ant." (inherit previous week).
export function parseWeekCell(raw: string, week: number, col = -1): WeekCell | null {
  const s = raw.trim()
  if (!s) return null
  if (/mism[oa]\s+sem|sem(ana)?\s*ant|^=$|^idem$|^igual/i.test(deburr(s))) {
    return { week, reps: null, sets: null, load: null, raw: s, complex: false, inherit: true, col }
  }
  const m = s.match(/^(\d+)\s*[xX]\s*(\d+)\s*(.*)$/)
  if (m && !/[x+]/i.test(m[3].replace(/x\s*lado/i, ''))) {
    const rest = m[3].trim()
    return {
      week,
      reps: parseInt(m[1], 10),
      sets: parseInt(m[2], 10),
      load: rest ? parseLoad(rest) : null,
      raw: s,
      complex: false,
      inherit: false,
      col,
    }
  }
  // couldn't cleanly split → keep raw, surface any weight
  const load = /kg/i.test(s) ? parseLoad(s) : null
  return { week, reps: null, sets: null, load, raw: s, complex: true, inherit: false, col }
}

// Work time in seconds from a reps cell: "30''", "30s", "40 seg", "30\"".
export function parseTimeSec(reps: string): number | null {
  const m = reps.match(/(\d+)\s*(?:''|"|seg|segs|s\b|´´|¨)/i)
  return m ? parseInt(m[1], 10) : null
}

// The per-client "Seguimiento" LOG sheet (timestamp | tipo | dia | ejercicio |
// kg_real | reps_real | rpe | nota) can be accidentally served as the routine if
// the backend picks the most-recently-modified sheet in the folder. Its header is
// an unmistakable signature — never render a log as a plan (would show rows like
// "set · d1-1 reps"). Defends the client even if the backend serves the wrong file.
function looksLikeLogSheet(rows: string[][]): boolean {
  // 1) the exact Seguimiento header signature
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const cells = (Array.isArray(rows[r]) ? rows[r] : []).map((c) => deburr(norm(c)))
    if (cells.includes('timestamp') && (cells.includes('kg_real') || cells.includes('reps_real') || cells.includes('tipo')))
      return true
  }
  // 2) generic fallback: a log/export has an ISO datetime in column A on most rows
  //    (catches it even if the header row is renamed, missing, or a marker is prepended)
  const ISO = /^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}/
  const dataRows = (Array.isArray(rows) ? rows : []).filter((row) => norm(row?.[0]))
  if (dataRows.length >= 5) {
    const iso = dataRows.filter((row) => ISO.test(deburr(norm(row[0])))).length
    if (iso / dataRows.length > 0.6) return true
  }
  return false
}

// ---- main ---------------------------------------------------------------

/**
 * Parse a routine sheet (2D cell array) into a structured Routine.
 * Tolerant: anything it can't classify is preserved in `raw` and surfaced in
 * `parsedWarnings`, never dropped or thrown.
 */
export function parseRoutine(rows: string[][], title = 'Rutina'): Routine {
  const meta: RoutineMeta = { sessionsPerWeek: '', startDate: '', weeks: '', goal: '' }
  const days: RoutineDay[] = []
  const warnings: string[] = []

  // a misrouted log/non-routine sheet must not be rendered as a plan
  if (looksLikeLogSheet(Array.isArray(rows) ? rows : [])) {
    return {
      title, meta, days: [], weeksAvailable: [], totalWeeks: 1, style: 'daily',
      parsedWarnings: ['La planilla recibida no parece una rutina (se ignoró).'],
    }
  }

  let day: RoutineDay | null = null
  let section: SectionTag = 'ramp'
  let seenBig = false
  let exIdx = 0
  let weekCols: Array<{ week: number; col: number }> = []

  const pushExercise = (cells: string[], rowIdx: number) => {
    if (!day) return
    const b = norm(cells[1])
    if (!b) return
    const c = norm(cells[2])
    const d = norm(cells[3])
    const e = norm(cells[4])
    const load = parseLoad(e)
    const setOrdinalMatch = d.match(/(\d+)\s*°/)
    const isRamp = !!setOrdinalMatch || (!seenBig && section === 'ramp')
    const weeks: Record<number, WeekCell> = {}
    for (const wc of weekCols) {
      const cell = parseWeekCell(norm(cells[wc.col]), wc.week, wc.col)
      if (cell) weeks[wc.week] = cell
    }
    const row: ExerciseRow = {
      id: `${day.id}-x${exIdx++}`,
      row: rowIdx,
      name: b,
      slug: slugify(b),
      pattern: classifyPattern(b),
      section: isRamp ? 'ramp' : section,
      isWarmupRamp: isRamp,
      reps: toNum(c),
      repsRaw: c,
      timeSec: parseTimeSec(c),
      sets: setOrdinalMatch ? null : toNum(d),
      setsRaw: d,
      setOrdinal: setOrdinalMatch ? parseInt(setOrdinalMatch[1], 10) : null,
      load,
      techniques: parseTechniques(b, c, e),
      notes: extractNote(e, load),
      weeks,
      raw: { exercise: b, reps: c, series: d, obs: e },
    }
    const tag = row.section
    let block = day.blocks.find((bl) => bl.tag === tag)
    if (!block) {
      block = { tag, title: SECTION_TITLES[tag], circuit: false, rounds: null, timed: false, exercises: [] }
      day.blocks.push(block)
    }
    block.exercises.push(row)
  }

  const safeRows: string[][] = Array.isArray(rows) ? rows : []
  for (let r = 0; r < safeRows.length; r++) {
   try {
    const cells = Array.isArray(safeRows[r]) ? safeRows[r] : []
    const a = norm(cells[0])
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

    // new day — also scan this row for "Semana N" week columns
    const dm = isDayMarker(a)
    if (dm) {
      const idx = parseInt(dm[1], 10)
      day = { id: `d${days.length + 1}-${idx}`, label: a.toUpperCase(), index: idx, warmup: '', weeks: [1], blocks: [] }
      days.push(day)
      section = 'ramp'
      seenBig = false
      exIdx = 0
      weekCols = scanWeekCols(cells)
      continue
    }

    const info = tagInfo(a)

    // No "DÍA N" marker has appeared yet. A sheet (or a tab whose day lives in
    // its name, not a cell) can still carry real work — open an implicit Día 1
    // so it renders instead of being dropped (which would leave days empty and
    // crash the screens). Section headers seen here keep the running section.
    if (!day) {
      if (info && info.tag !== 'warmup') {
        section = info.tag
        if (info.tag === 'big') seenBig = true
      }
      const exCell = norm(cells[1])
      if (deburr(exCell) === 'ejercicio') {
        // header row before any day → remember its week columns for the implicit day
        for (const wc of scanWeekCols(cells)) if (!weekCols.some((w) => w.col === wc.col)) weekCols.push(wc)
        continue
      }
      if (!exCell) continue
      day = { id: `d${days.length + 1}-1`, label: 'DÍA 1', index: 1, warmup: '', weeks: [1], blocks: [] }
      days.push(day)
      // keep the current `section`/`seenBig`/`weekCols`; no real day boundary
    }

    if (info && info.tag === 'warmup') {
      day.warmup = norm(cells[1]) || c
      continue
    }
    if (deburr(norm(cells[1])) === 'ejercicio') {
      // column-header row may carry the "Semana N" headers — merge them in
      for (const wc of scanWeekCols(cells)) if (!weekCols.some((w) => w.col === wc.col)) weekCols.push(wc)
      continue
    }

    if (info) {
      section = info.tag
      if (info.tag === 'big') seenBig = true
      // remember custom titles for "other"/unknown sections
      if (info.tag === 'other' || info.tag === 'hiit') {
        const exists = day.blocks.find((bl) => bl.tag === info.tag)
        if (!exists) day.blocks.push({ tag: info.tag, title: info.title, circuit: false, rounds: null, timed: false, exercises: [] })
      }
    }

    if (norm(cells[1])) pushExercise(cells, r)
    else if (a && !info) warnings.push(`Fila sin estructura clara: "${a}"`)
   } catch {
    // a single malformed row must never abort the whole parse
    warnings.push(`No se pudo leer la fila ${r + 1}.`)
   }
  }

  // finalize blocks: circuits (done in rounds), the alternating Big One pair, HIIT timing
  for (const dd of days) {
    // derive the day's available weeks from the week cells actually parsed, so it's
    // correct no matter which row the "Semana N" headers sat on (or none → just [1]).
    const wset = new Set<number>([1])
    for (const bl of dd.blocks) for (const ex of bl.exercises) for (const k of Object.keys(ex.weeks)) wset.add(Number(k))
    dd.weeks = [...wset].sort((a, b) => a - b)
    for (const bl of dd.blocks) {
      // a multi-exercise THE BIG ONE is a superset done set-by-set (alternated)
      const groupable = CIRCUIT_TAGS.has(bl.tag) || bl.tag === 'big'
      if (groupable && bl.exercises.length > 1) {
        bl.circuit = true
        const setCounts = bl.exercises.map((x) => x.sets).filter((n): n is number => n != null)
        bl.rounds = setCounts.length ? Math.max(...setCounts) : null
      }
      bl.timed = bl.tag === 'hiit' || bl.exercises.some((x) => x.timeSec != null)

      // HIIT/timed circuit: the coach usually writes the "30″ × 4" scheme once on
      // the first row and leaves the rest blank (they share it). Carry the work
      // time + round count forward so every row shows it instead of a "—".
      if (bl.timed && bl.exercises.length > 1) {
        let lastTime: number | null = null, lastSets: number | null = null, lastTimeRaw = ''
        for (const ex of bl.exercises) {
          if (ex.timeSec != null) { lastTime = ex.timeSec; lastTimeRaw = ex.repsRaw }
          else if (lastTime != null) { ex.timeSec = lastTime; if (!ex.repsRaw) ex.repsRaw = lastTimeRaw }
          if (ex.sets != null) lastSets = ex.sets
          else if (lastSets != null) ex.sets = lastSets
        }
      }
    }
  }

  // sort days by number (Día 3 before Día 4), stable for duplicates
  days.sort((x, y) => x.index - y.index)

  const weeksAvailable = [...new Set(days.flatMap((d) => d.weeks))].sort((x, y) => x - y)
  const totalWeeks = toNum(meta.weeks) ?? (weeksAvailable.length ? Math.max(...weeksAvailable) : 1)
  // weekly (powerlifting: same lifts, per-week columns) vs daily (changes day by day)
  const style: 'weekly' | 'daily' = weeksAvailable.length > 1 ? 'weekly' : 'daily'

  if (!days.length) warnings.push('No se detectaron días (DÍA N) en la planilla.')
  return { title, meta, days, weeksAvailable, totalWeeks, style, parsedWarnings: warnings }
}
