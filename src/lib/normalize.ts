import type { MovementPattern } from './types'

// Strip accents, lowercase, collapse spaces.
export function deburr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// Remove coaching modifiers so variations collapse to one media key.
// e.g. "Sentadilla Low Bar", "Sentadilla High Bar + 2\"" → "sentadilla"
const MODIFIER_PATTERNS: RegExp[] = [
  /tempo\s*\d:\d:\d/gi,
  /\+\s*\d+\s*["¨'']/g,
  /\bcluster\b.*$/gi,
  /\bmyo\s*reps?\b/gi,
  /\blow\s*bar\b/gi,
  /\bhigh\s*bar\b/gi,
  /\bssb\b/gi,
  /\bunipodal\b/gi,
  /\bc\/\s*\w+/gi, // "c/barra Suiza"
  /\bpolea\s+alta\b/gi,
  /\bbanda\s+\w+/gi,
  /\s+\d+(?:[.,]\d+)?\s*kg.*$/gi,
]

export function cleanName(raw: string): string {
  let s = ` ${raw} `
  for (const p of MODIFIER_PATTERNS) s = s.replace(p, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

export function slugify(raw: string): string {
  return deburr(cleanName(raw))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Movement-pattern classification (drives fallback icons + volume-by-pattern metrics).
const PATTERN_RULES: Array<[RegExp, MovementPattern]> = [
  [/sentadilla|squat|bulgara|zancada|step|pistol|prensa/, 'squat'],
  [/peso muerto|deadlift|rdl|hip thrust|buenos dias|good ?morning|ghd|puente|gluteo|bisagra/, 'hinge'],
  [/press|flexion|fondos?|empuje|push|militar|frances|tricep/, 'push'],
  [/remo|dominada|jalon|pull|face ?pull|biceps|curl|traccion|menton/, 'pull'],
  [/abdominal|plancha|core|olla|rueda|ruedita|pallof|hollow/, 'core'],
  [/caminata|carry|farmer|paseo/, 'carry'],
]

export function classifyPattern(raw: string): MovementPattern {
  const s = deburr(raw)
  for (const [re, pat] of PATTERN_RULES) if (re.test(s)) return pat
  return 'other'
}
