import type {
  Routine, RoutineDay, RoutineMeta, ExerciseRow, Load, Technique, SectionTag, WeekCell,
} from './types'
import { slugify, classifyPattern, deburr } from './normalize'

// ---- cell helpers -------------------------------------------------------

// Cells can hold hard line breaks (coaches type "Sentadilla ⏎ 4x4 20kg x lado" in a
// single week cell). Flatten them to spaces so one cell = one parseable string.
const norm = (v: unknown): string =>
  (v == null ? '' : String(v)).replace(/[\r\n]+/g, ' ').replace(/[ \t]+/g, ' ').trim()

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
  if (/^(?:dia|day)\s*\d+/.test(s)) return null
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

// A numbered day marker in column A: "DÍA 1", "DIA 1", or English "DAY 1".
const isDayMarker = (a: string): RegExpMatchArray | null => deburr(a).match(/^(?:dia|day)\s*(\d+)/)

// A weekday-name day marker — some coaches label a day "SÁBADOS"/"LUNES" instead
// of "DÍA N" (e.g. a Saturday session). These get a sequential day number.
const isWeekdayMarker = (a: string): boolean =>
  /^(lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)\b/.test(deburr(a))

// Canonical "DÍA N" label, preserving any trailing descriptor ("DÍA 1 - Tren sup").
const dayLabel = (a: string): string => a.toUpperCase().replace(/^(?:DAY|DIA)(?=\s*\d)/, 'DÍA')

// Scan a row (from col F onward) for "Semana N" per-week column headers. These
// can sit on the "DÍA N" marker row OR on the "EJERCICIO ..." header row,
// depending on how the coach laid out the sheet — so we look on both.
function scanWeekCols(cells: string[]): Array<{ week: number; col: number }> {
  const out: Array<{ week: number; col: number }> = []
  for (let i = 5; i < cells.length; i++) {
    const cell = norm(cells[i])
    // accept "Semana 9" and the reversed "9 semana" / "9na semana" coaches also write
    const wm = cell.match(/semana\s*(\d+)/i) || cell.match(/(\d+)\s*(?:ª|°|na|da|er|ra)?\s*semana/i)
    if (wm) out.push({ week: parseInt(wm[1], 10), col: i })
  }
  return out
}

// "per side" loads — coaches write it many ways (es/en): "x lado", "/lado",
// "por lado", "x side", "per side", "e/side" (each side), "p/side".
const PER_SIDE = /x\s*lado|\/\s*lado|por\s*lado|p\/\s*lado|x\s*side|per\s*side|e\/?\s*side|p\/\s*side/i

// ---- value parsers ------------------------------------------------------

const toNum = (s: string): number | null => {
  const m = s.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

// A set/rep scheme ("5X4", "6 x 4") — never a weight, even though it leads with a
// number. Coaches write whole prescriptions into OBSERVACIONES and into week cells.
const SCHEME = /\d+\s*[xX]\s*\d+/g

// Resistance-band colours as coaches actually write them — any gender, singular or
// plural ("Naranjas", "Violetas", "GRISES"): the load IS the band.
const BAND = /\b(banda[s]?\s+\w+|gris(?:es)?|verdes?|roj[ao]s?|negr[ao]s?|azul(?:es)?|amarill[ao]s?|violetas?|naranjas?|celestes?|marron(?:es)?)\b/i

export function parseLoad(obs: string): Load {
  const raw = obs.trim()
  const perSide = PER_SIDE.test(raw)
  const bandMatch = raw.match(BAND)
  // The weight is the number tagged "kg" — NOT simply the first number in the cell.
  // Real case (Matias, Agosto 2026): OBSERVACIONES = "5X4 43,75kg x lado" is a full
  // prescription; reading the first number showed the member a 5 kg squat instead of
  // 43,75. Only when no "kg" tag exists do we fall back to a bare number, and then
  // only after dropping any set×rep scheme ("25 X4 20 x lado" → 20). A bracketed
  // coach comment is never the prescription either ("60 x lado (la próxima subí
  // 2,5kg)" is 60), so brackets are ignored while hunting for the weight.
  // (an UNCLOSED bracket is a comment too — coaches forget the closing one)
  const scan = raw.replace(/\([^)]*\)/g, ' ').replace(/\([^)]*$/, ' ')
  const kg = scan.match(/([+↑↓]?)\s*(-?\d+(?:[.,]\d+)?)\s*kg/i)
  let value: number | null = null
  let delta = false
  if (kg) {
    value = toNum(kg[2])
    // "+5kg" / "↑2,5kg" is an INCREMENT on last week's weight, not the weight itself
    delta = kg[1] === '+' || kg[1] === '↑' || kg[1] === '↓'
    if (kg[1] === '↓' && value != null) value = -value
  } else {
    const bare = scan.replace(SCHEME, ' ').trim()
    if (/^-?\d/.test(bare)) value = toNum(bare)
  }
  const load: Load = { value, perSide, unit: 'kg', raw }
  if (delta) load.delta = true
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
  const band = obs.match(BAND)
  if (band) t.push({ type: 'band', color: band[1] })
  if (PER_SIDE.test(hay)) t.push({ type: 'perSide' })
  if (/amrap|al\s*fallo|max/i.test(hay)) t.push({ type: 'amrap' })
  return t
}

function extractNote(obs: string, load: Load): string {
  if (load.value == null) return load.band ? '' : obs.trim()
  return obs.replace(/-?\d+(?:[.,]\d+)?\s*kg/i, '').replace(PER_SIDE, '').replace(/\s+/g, ' ').trim()
}

// Non-linear per-series rep plans some athletes use instead of a flat reps×sets
// (controlled wave/volume loading). Two notations:
//   "4X1+3X3"    → one set of 4 + three sets of 3  → [4,3,3,3]
//   "10-10-8-8"  → reps per set, listed            → [10,10,8,8]
// Returns the expanded per-series reps + any trailing text (a weight/band).
export function parseSeriesPlan(raw: string): { plan: number[]; rest: string } | null {
  const s = raw.trim()
  // plus/X form (≥2 segments joined by "+")
  const plus = s.match(/^(\d+\s*[xX]\s*\d+(?:\s*\+\s*\d+\s*[xX]\s*\d+)+)(.*)$/)
  if (plus) {
    const plan: number[] = []
    for (const seg of plus[1].split('+')) {
      const m = seg.match(/(\d+)\s*[xX]\s*(\d+)/)
      if (!m) return null
      const reps = parseInt(m[1], 10), sets = parseInt(m[2], 10)
      for (let k = 0; k < sets; k++) plan.push(reps)
    }
    return plan.length ? { plan, rest: plus[2].trim() } : null
  }
  // dash form — require ≥3 numbers so a 2-number rep range ("8-12") isn't mistaken
  // for a 2-set plan.
  const dash = s.match(/^(\d+(?:\s*-\s*\d+){2,})(.*)$/)
  if (dash) {
    const plan = dash[1].split('-').map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n))
    if (plan.length >= 3) return { plan, rest: dash[2].trim() }
  }
  return null
}

// ---- per-week exercise substitutions ------------------------------------
// On a variation/deload week many coaches replace the LIFT inside the "Semana N"
// cell instead of adding a row: "Semana 4: 8X5 Polea Pronado 27,5kg x lado" for a
// base row of Dominadas. Until now the member trained that week seeing the base
// lift's name, animation and cues. Detection has to be conservative: most cells
// with letters are NOT swaps — they're band colours ("Naranjas"), technique notes
// ("NORMAL", "mas peso", "Tempo 2:2:0") or the member's own comments in brackets.
// So we strip everything that is known noise and only call it a swap when what's
// left actually NAMES an exercise (vocabulary vetted by the S&C coach).

// Head nouns that make a leftover phrase an exercise name.
const EXERCISE_NOUN = new RegExp([
  'sentadilla', 'squat', 'bulgara', 'zancada', 'estocada', 'desplante', 'lunge', 'split',
  'step ?up', 'incorporacion', 'pistol', 'prensa', 'hack', 'sissy', 'hatfield',
  'peso muerto', 'deadlift', 'rdl', 'hip thrust', 'buenos dias', 'good ?morning', 'ghd',
  'puente', 'gluteo', 'bisagra', 'hyper', 'nordic', 'isquio', 'swing', 'back extension',
  'remo', 'dominada', 'jalon', 'polea', 'face ?pull', 'pull ?apart', 'band ?pull', 'traccion', 'menton',
  'encogimiento', 'shrug', 'pajaro', 'biceps', 'curl',
  'press', 'flexion', 'fondos?', 'empuje', 'push ?up', 'militar', 'frances', 'tricep',
  'apertura', 'vuelo', 'elevacion', 'patada', 'gemelos', 'calf',
  'caminata', 'carry', 'farmer', 'valijero', 'paseo', 'traslado',
  'abdominal', 'plancha', 'pallof', 'hollow', 'bird ?dog', 'dead ?bug', 'oblicuo',
  'rueda', 'ruedita', 'sierra',
].join('|'), 'i')

// Words that must NEVER, on their own, be read as an exercise: band colours (in
// every gender/plural, incl. ALL CAPS), technique/effort notes, filler.
const NOISE_WORD = new RegExp('^(?:' + [
  'naranjas?', 'verdes?', 'violetas?', 'amarill[ao]s?', 'gris(?:es)?', 'roj[ao]s?',
  'negr[ao]s?', 'celestes?', 'azul(?:es)?', 'blanc[ao]s?', 'marr(?:o|ó)n(?:es)?',
  'orange', 'green', 'purple', 'yellow', 'gr[ae]y', 'red', 'black', 'blue', 'white', 'brown',
  'banda', 'bandas', 'goma', 'gomas',
  // NB: "peso" alone is NOT noise — it heads "Peso Muerto". The "mas peso" /
  // "menos peso" phrasings are stripped as phrases before tokenizing.
  'normal', 'mas', 'm(?:a|á)s', 'menos', 'tempo', 'pausa', 'pausado', 'sin', 'con',
  'explosivo', 'lento', 'myo', 'reps?', 'rep', 'cluster', 'dropset', 'serie', 'series',
  'x', 'lado', 'lad', 'side', 'per',
  'kg', 'kgs', 'idem', 'igual',
  '\\d+\\s*reps?', '\\d+\\s*seg(?:s|undos)?', // "6reps", "20seg"
].join('|') + ')$', 'i')

// Tokens that neither name an exercise nor end a phrase: bare numbers, connectors
// and stray signs. They must not SPLIT a name ("Tracciones a la frente",
// "Remo Landmine 1 brazo") but never start or end one either.
const SOFT_WORD = /^(?:a|al|de|del|la|el|los|las|y|o|e|con|sin|en|para|the)$/i
const isSoftToken = (t: string): boolean =>
  /^[+\-–]?\d+(?:[.,]\d+)?[+\-–]?$/.test(t) || /^[+\-–]+$/.test(t) || SOFT_WORD.test(deburr(t))

/**
 * The exercise a "Semana N" cell prescribes INSTEAD of the base one, or null when
 * the cell only tweaks the base lift. `base` is the base row's name, so a coach
 * simply restating it ("Sentadilla 4x4 20kg x lado") isn't read as a swap.
 */
export function detectSwap(raw: string, base: string): string | null {
  const s = raw
    .replace(/\([^)]*\)/g, ' ')          // member/coach comments: "(hice con amarillas)"
    .replace(/\b(?:m[aá]s|menos|mismo|igual)\s+(?:peso|carga)\b/gi, ' ') // "mas peso"
    .replace(/\d+\s*[xX]\s*\d+/g, ' ')   // set×rep schemes
    .replace(/\d+(?:[.,]\d+)?\s*kg\b/gi, ' ')
    .replace(/\bc\/\s*\w+/gi, ' ')       // "c/bandas", "c/barra"
    .replace(/\d+\s*:\s*\d+\s*:\s*\d+/g, ' ') // tempo
    .replace(/x\s*lad\s*o|x\s*lado|\/\s*lado|por\s*lado|x\s*side|per\s*side|e\/?\s*side/gi, ' ')
    .replace(/[."¨'´`;:!¿?/|]+/g, ' ')
  const tokens = s.split(/[\s,]+/).filter(Boolean)
  // longest run of consecutive real words
  let best: string[] = []
  let run: string[] = []
  const flush = () => {
    while (run.length && isSoftToken(run[run.length - 1])) run.pop()
    if (run.length > best.length) best = run
    run = []
  }
  for (const t of tokens) {
    if (isSoftToken(t)) { if (run.length) run = [...run, t]; continue }
    if (NOISE_WORD.test(deburr(t))) { flush(); continue }
    run = [...run, t]
  }
  flush()
  if (!best.length) return null
  const name = best.join(' ').trim()
  // the exercise has to be what the phrase is ABOUT: the head noun sits in the first
  // couple of words. Otherwise coach prose that merely mentions a lift ("trabajar el
  // remo mas lento") would be read as a substitution — and a wrongly detected swap
  // week drops out of the progression chain, silently under-loading later weeks.
  if (!EXERCISE_NOUN.test(deburr(best.slice(0, 2).join(' ')))) return null
  // A restatement of the base lift adds nothing — not a swap. Compared as sets of
  // singular word stems, so "Sentadillas Búlgaras" restates "Sentadilla Búlgara",
  // while a phrase that brings a NEW word is a real swap ("Sentadillas" →
  // "Sentadillas al banco" = box squat).
  const stems = (v: string) => new Set(deburr(v).split(/[^a-z0-9]+/)
    .filter((t) => t && !SOFT_WORD.test(t)).map((t) => t.replace(/(?:es|s)$/, '')))
  const baseStems = stems(base)
  const novel = [...stems(name)].filter((t) => !baseStems.has(t))
  if (!novel.length) return null
  return name
}

/**
 * Drop a leading restatement of the base lift so the prescription behind it parses:
 * "Sentadilla +1\" 5x4 21,25kg x lado" → "5x4 21,25kg x lado". Only strips text BEFORE
 * the first set×rep scheme, and only when every word in it belongs to the base name
 * (technique/pause marks aside) — so a real swap name is never silently discarded.
 */
function stripLeadingName(s: string, base: string): string {
  if (!base) return s
  const at = s.search(/\d+\s*[xX]\s*\d+/)
  if (at <= 0) return s
  const prefix = s.slice(0, at)
  if (/\d+(?:[.,]\d+)?\s*kg/i.test(prefix)) return s // a weight can't be part of a name
  const stem = (t: string) => deburr(t).replace(/(?:es|s)$/, '')
  const baseStems = new Set(deburr(base).split(/[^a-z0-9]+/).filter(Boolean).map(stem))
  const words = prefix.split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/).filter(Boolean)
  if (!words.length) return s
  const known = words.every((w) => /^\d+$/.test(w) || SOFT_WORD.test(deburr(w)) || baseStems.has(stem(w)))
  return known ? s.slice(at) : s
}

// A "Semana N" cell, e.g. "10X3", "2X4 28,75kg x lado", "3X1+2X3" (complex),
// "Mismo semana ant." (inherit previous week).
export function parseWeekCell(raw: string, week: number, col = -1, base = ''): WeekCell | null {
  const s = raw.trim()
  if (!s) return null
  if (/mism[oa]s?\s+sem|sem(ana)?\s*ant|^=$|^idem$|^igual/i.test(deburr(s))) {
    // "Mismo semana 4" points at a SPECIFIC week, not simply the previous one — real
    // case (Rodri Leuzzi): S5 "Mismo semana 4", S8 "Mismo semana 7".
    const from = deburr(s).match(/sem(?:ana)?\s*(\d+)/)
    const cell: WeekCell = { week, reps: null, sets: null, load: null, raw: s, complex: false, inherit: true, col }
    if (from) {
      const n = parseInt(from[1], 10)
      if (n >= 1 && n < week) cell.inheritFrom = n
    }
    return cell
  }
  const swap = base ? detectSwap(s, base) : null
  const withSwap = (c: WeekCell): WeekCell => (swap ? { ...c, name: swap } : c)
  // With the lift's NAME lifted out, what's left is an ordinary prescription — so
  // "Sentadillas al banco 6X4 40kg x lado" reads as 6×4 @ 40 kg per side instead of
  // falling into the unparseable "complex" bucket. Same when the coach merely RESTATES
  // the base lift ("Sentadilla +1\" 5x4 21,25kg x lado" — real case, Marisol).
  const body = (swap ? s.replace(swap, ' ') : stripLeadingName(s, base)).replace(/\s+/g, ' ').trim()
  const m = body.match(/^(\d+)\s*[xX]\s*(\d+)\s*(.*)$/)
  if (m && !/[x+]/i.test(m[3].replace(/x\s*lado/i, ''))) {
    const rest = m[3].trim()
    return withSwap({
      week,
      reps: parseInt(m[1], 10),
      sets: parseInt(m[2], 10),
      load: rest ? parseLoad(rest) : null,
      raw: s,
      complex: false,
      inherit: false,
      col,
    })
  }
  // Bilateral / two-part reps × sets: "4+4x4", "10+8x3", "6+6x3 Gris" — "4+4" is ONE
  // set (4 per side, or 4+4 of two movements), done N times. Without this the set
  // count silently stayed on the previous week's (real case: Marisol's Skater squats
  // showed 3 series for the whole cycle while the coach wrote 4).
  const pair = body.match(/^(\d+)\s*\+\s*(\d+)\s*[xX]\s*(\d+)\s*(.*)$/)
  if (pair) {
    const rest = pair[4].trim()
    return withSwap({
      week,
      reps: null,
      sets: parseInt(pair[3], 10),
      load: rest ? parseLoad(rest) : null,
      raw: s,
      complex: true, // the "4+4" label is shown as written
      inherit: false,
      col,
    })
  }
  // a non-linear per-series plan ("4X1+3X3", "10-10-8-8") → expand to per-set reps
  const sp = parseSeriesPlan(body)
  if (sp) {
    const load = /kg|banda|gris|verde|roja|negra|azul|amarill|violet|naranj/i.test(sp.rest) ? parseLoad(sp.rest) : null
    return withSwap({ week, reps: null, sets: sp.plan.length, load, raw: s, complex: true, inherit: false, col, plan: sp.plan })
  }
  // a timed HIIT/isometric override — "25¨X4", "30\"x3", "20 s" → work-time in
  // seconds (+ an optional trailing "×N" round count). Without this these fall to
  // the "complex" bucket and the per-week work-time is lost (the base 20″ shows on
  // every week even when Semana 6 says 25″).
  // …but a PAUSE mark ('+1"') is not work time, and neither is a stray second count in
  // a cell that already carries a reps×sets scheme.
  const secs = /\+\s*\d+\s*["¨'']/.test(body) || /\d+\s*[xX]\s*\d+/.test(body)
    ? null : parseTimeSec(body)
  if (secs != null) {
    const rounds = body.match(/[x×]\s*(\d+)\s*$/i)
    return withSwap({ week, reps: null, sets: rounds ? parseInt(rounds[1], 10) : null, load: null, raw: s, complex: false, inherit: false, col, timeSec: secs })
  }
  // couldn't cleanly split → keep raw, surface any weight. With the substituted lift's
  // name removed, a bare number left behind IS its weight ("remo pronado 12.5 6reps").
  const load = /kg/i.test(body) || (swap && /^\d/.test(body)) ? parseLoad(body) : null
  return withSwap({ week, reps: null, sets: null, load, raw: s, complex: true, inherit: false, col })
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
  let lastDayIndex = 0 // for weekday-named days, which carry no number
  const explicitDayIdx = new Set<number>() // numbers claimed by real "DÍA N" markers

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
    // a non-linear per-series scheme ("3X2+2X2") sometimes IS the base prescription
    // (no separate "Semana N" columns for it) — advanced coaches (Rodri Leuzzi, Alva
    // Cornaggia, Sergio Sosa…) write it straight into REPETICIONES or SERIES. Check
    // both since either column may carry it.
    const basePlan = setOrdinalMatch ? null : (parseSeriesPlan(d)?.plan ?? parseSeriesPlan(c)?.plan ?? null)
    const weeks: Record<number, WeekCell> = {}
    for (const wc of weekCols) {
      const cell = parseWeekCell(norm(cells[wc.col]), wc.week, wc.col, b)
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
      reps: basePlan ? null : toNum(c),
      repsRaw: c,
      timeSec: parseTimeSec(c),
      sets: setOrdinalMatch ? null : (basePlan ? basePlan.length : toNum(d)),
      setsRaw: d,
      setOrdinal: setOrdinalMatch ? parseInt(setOrdinalMatch[1], 10) : null,
      plan: basePlan,
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

    // new day — numbered ("DÍA 3"/"DAY 3") or weekday-named ("SÁBADOS"/"LUNES").
    // The marker is usually in col A, but some coaches indent it into col B/C, so
    // scan the first three columns. Also scan this row for "Semana N" week columns.
    const markerCell = [a, norm(cells[1]), norm(cells[2])].find((v) => v && (isDayMarker(v) || isWeekdayMarker(v)))
    if (markerCell) {
      const dm = isDayMarker(markerCell)
      let idx = dm ? parseInt(dm[1], 10) : lastDayIndex + 1
      // Coaches copy a day's tab and forget to update the in-cell marker (the tab
      // name says "Día 3" but the cell still says "DÍA 1" — real case: Beatriz,
      // Jun 2026). A duplicate number would collide in the by-index dedup below
      // and silently DROP a whole day, so a number already claimed by an EXPLICIT
      // marker on a day with content opens the next free day instead. (Implicit
      // pre-marker days don't claim the number — the dedup merges those as before.)
      const hasContent = (d: RoutineDay) => !!d.warmup || d.blocks.some((b) => b.exercises.length > 0)
      if (explicitDayIdx.has(idx) && days.some((d) => d.index === idx && hasContent(d))) {
        idx = Math.max(...days.map((d) => d.index)) + 1
      }
      explicitDayIdx.add(idx)
      lastDayIndex = idx
      const label = dm ? dayLabel(markerCell).replace(/\d+/, String(idx)) : markerCell.toUpperCase()
      day = { id: `d${days.length + 1}-${idx}`, label, index: idx, warmup: '', weeks: [1], blocks: [] }
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
        let lastWeeks: Record<number, WeekCell> = {}
        for (const ex of bl.exercises) {
          if (ex.timeSec != null) { lastTime = ex.timeSec; lastTimeRaw = ex.repsRaw; lastWeeks = ex.weeks }
          else if (lastTime != null) {
            ex.timeSec = lastTime
            if (!ex.repsRaw) ex.repsRaw = lastTimeRaw
            // the coach writes the per-week work-time ("25¨X4") once, on the first
            // circuit row — the blanks below share it. Carry the week overrides too
            // so every row resolves the same seconds/rounds per week (not just wk1).
            if (Object.keys(ex.weeks).length === 0) ex.weeks = lastWeeks
          }
          if (ex.sets != null) lastSets = ex.sets
          else if (lastSets != null) ex.sets = lastSets
        }
      }
    }
  }

  // Drop empty day shells: a "DÍA N" marker with no warm-up and no exercises. These
  // appear when the backend prepends a synthetic marker AND the tab also carries an
  // in-cell marker (version skew) — leaving a phantom day that scrambles day/warm-up
  // alignment. Keep only days that actually have content.
  const live = days.filter((d) => d.warmup || d.blocks.some((b) => b.exercises.length))
  // de-dup by index, preferring the richer day (more exercises) if two share a number
  const byIndex = new Map<number, RoutineDay>()
  for (const d of live) {
    const prev = byIndex.get(d.index)
    const count = (x: RoutineDay) => x.blocks.reduce((n, b) => n + b.exercises.length, 0)
    if (!prev || count(d) > count(prev)) byIndex.set(d.index, d)
  }
  const dedup = [...byIndex.values()]

  // sort days by number (Día 3 before Día 4)
  dedup.sort((x, y) => x.index - y.index)

  const weeksAvailable = [...new Set(dedup.flatMap((d) => d.weeks))].sort((x, y) => x - y)
  const totalWeeks = toNum(meta.weeks) ?? (weeksAvailable.length ? Math.max(...weeksAvailable) : 1)
  // weekly (powerlifting: same lifts, per-week columns) vs daily (changes day by day)
  const style: 'weekly' | 'daily' = weeksAvailable.length > 1 ? 'weekly' : 'daily'

  if (!dedup.length) warnings.push('No se detectaron días (DÍA N) en la planilla.')
  return { title, meta, days: dedup, weeksAvailable, totalWeeks, style, parsedWarnings: warnings }
}
