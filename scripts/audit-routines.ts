/**
 * Gym-wide routine audit. Fetches every client's LIVE routine from the backend
 * (the exact data the app receives) and runs the real parser + record matcher,
 * reporting any formatting issue per client. Read-only — never writes anything.
 *
 * Run (portable Node on PATH):
 *   npx vite-node scripts/audit-routines.ts
 *
 * Config — create scripts/audit-tokens.local.json (GITIGNORED, never commit):
 *   {
 *     "api": "https://script.google.com/macros/s/XXXX/exec",
 *     "clients": [ { "nombre": "Rodri Leuzzi", "token": "abc123" }, ... ]
 *   }
 * Copy the `token | nombre` columns from the config `clientes` tab into `clients`.
 * (Or set the API via the FORCE_API env var instead of the json "api" field.)
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRoutine } from '../src/lib/parser'
import { matchRecordLift } from '../src/lib/records'
import type { Routine } from '../src/lib/types'

const HERE = dirname(fileURLToPath(import.meta.url))
const CFG = resolve(HERE, 'audit-tokens.local.json')

interface Client { nombre: string; token: string }
interface Cfg { api?: string; clients: Client[] }

function loadCfg(): Cfg {
  try {
    return JSON.parse(readFileSync(CFG, 'utf8')) as Cfg
  } catch {
    console.error(`\nMissing/invalid ${CFG}\nCreate it as:\n` +
      `{ "api": "https://script.google.com/macros/s/XXXX/exec",\n  "clients": [ { "nombre": "Rodri Leuzzi", "token": "..." } ] }\n`)
    process.exit(1)
  }
}

// strip accents + lowercase for loose name comparison
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

interface Issue { level: 'ERROR' | 'WARN' | 'INFO'; msg: string }

function auditRoutine(client: Client, title: string, routine: Routine): Issue[] {
  const out: Issue[] = []
  const w = routine.parsedWarnings ?? []

  if (routine.days.length === 0) {
    out.push({ level: 'ERROR', msg: 'cero días — la app mostraría "no tiene días" o el screen de error' })
    return out
  }

  // misrouted token: the served sheet/title doesn't mention the client's name.
  // Sheets are usually titled by month, so we can't always tell — only flag a
  // strong mismatch (title clearly names a DIFFERENT person isn't detectable;
  // instead we surface the title so a human can eyeball it).
  out.push({ level: 'INFO', msg: `sheet servido: "${title}" · ${routine.days.length} días · ${routine.style} · ${routine.totalWeeks} sem` })

  // duplicate day numbers
  const idxs = routine.days.map((d) => d.index)
  const dupes = idxs.filter((n, i) => idxs.indexOf(n) !== i)
  if (dupes.length) out.push({ level: 'WARN', msg: `días con número repetido: ${[...new Set(dupes)].join(', ')}` })

  for (const d of routine.days) {
    const big = d.blocks.find((b) => b.tag === 'big')
    const exCount = d.blocks.reduce((n, b) => n + b.exercises.length, 0)
    if (exCount === 0) out.push({ level: 'WARN', msg: `${d.label}: sin ejercicios` })
    if (!d.warmup) out.push({ level: 'INFO', msg: `${d.label}: sin entrada en calor` })
    if (big && big.exercises.length > 3) out.push({ level: 'WARN', msg: `${d.label}: "The Big One" tiene ${big.exercises.length} ejercicios (¿día absorbido?)` })
    // which lifts will auto-capture records (so the coach can sanity-check)
    const recs = [...new Set(d.blocks.filter((b) => b.tag !== 'ramp')
      .flatMap((b) => b.exercises).map((ex) => matchRecordLift(ex.name)).filter(Boolean))]
    if (recs.length) out.push({ level: 'INFO', msg: `${d.label}: récords → ${recs.join(', ')}` })
  }

  // surface the parser's own warnings
  for (const warn of w) out.push({ level: 'WARN', msg: `parser: ${warn}` })
  return out
}

async function fetchRoutine(api: string, token: string): Promise<{ title: string; routine: Routine }> {
  const url = new URL(api)
  url.searchParams.set('action', 'getRoutine')
  url.searchParams.set('token', token)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = (await res.json()) as { title?: string; values?: string[][]; error?: string }
    if (raw.error) throw new Error(raw.error)
    const title = raw.title ?? '(sin título)'
    return { title, routine: parseRoutine(Array.isArray(raw.values) ? raw.values : [], title) }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const cfg = loadCfg()
  const api = process.env.FORCE_API || cfg.api
  if (!api) { console.error('Falta la URL del backend (api en el json o FORCE_API).'); process.exit(1) }

  console.log(`\nFORCE — auditoría de rutinas · ${cfg.clients.length} clientes\n${'='.repeat(60)}`)
  const summary = { ok: 0, warn: 0, error: 0, failed: 0 }

  for (const c of cfg.clients) {
    if (!c.token) { console.log(`\n• ${c.nombre}: SIN TOKEN — saltado`); summary.failed++; continue }
    try {
      const { title, routine } = await fetchRoutine(api, c.token)
      const issues = auditRoutine(c, title, routine)
      const hasErr = issues.some((i) => i.level === 'ERROR')
      const hasWarn = issues.some((i) => i.level === 'WARN')
      const mark = hasErr ? '❌' : hasWarn ? '⚠️ ' : '✅'
      console.log(`\n${mark} ${c.nombre}`)
      for (const i of issues) console.log(`    [${i.level}] ${i.msg}`)
      if (hasErr) summary.error++; else if (hasWarn) summary.warn++; else summary.ok++
    } catch (e) {
      console.log(`\n❌ ${c.nombre}: FALLÓ getRoutine — ${(e as Error).message}`)
      summary.failed++
    }
  }

  console.log(`\n${'='.repeat(60)}\nResumen: ✅ ${summary.ok} ok · ⚠️ ${summary.warn} con avisos · ❌ ${summary.error} con errores · ${summary.failed} fallaron\n`)
}

main()
