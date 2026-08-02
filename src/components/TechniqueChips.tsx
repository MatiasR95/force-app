import type { ExerciseRow, Technique } from '../lib/types'
import { resolveWeek } from '../lib/week'

function label(t: Technique): string {
  switch (t.type) {
    case 'tempo': return `Tempo ${t.value}`
    case 'pause': return `Pausa ${t.seconds}″`
    case 'myoreps': return 'Myo-reps'
    case 'cluster': return t.restSeconds ? `Cluster ${t.restSeconds}″` : 'Cluster'
    case 'band': return t.color.replace(/^\w/, (c) => c.toUpperCase())
    case 'perSide': return 'Por lado'
    case 'amrap': return 'Al fallo'
  }
}

/** The lift's name as a member should READ it.
 *
 *  Coaches write the tempo inside the exercise cell ("Press Plano TEMPO 3:1:0"),
 *  which the parser also lifts out as a technique — so the screen ended up saying
 *  the same thing three times: in the title, in the chip and on the pacer. The
 *  parsed value is the one that's actionable, so the raw token comes out of the
 *  title. Only the display changes: ids, record matching and the sheet write-back
 *  all still use `ex.name`.
 */
export function liftName(ex: ExerciseRow): string {
  if (!ex.techniques.some((t) => t.type === 'tempo')) return ex.name
  return ex.name.replace(/\s*TEMPO\s*\d\s*:\s*\d\s*:\s*\d\s*/i, ' ').replace(/\s{2,}/g, ' ').trim() || ex.name
}

export function TechniqueChips({ ex, hideTempo = false }: { ex: ExerciseRow; hideTempo?: boolean }) {
  // Drop the "Por lado" chip when the load already shows "/lado" (avoid the duplicate),
  // and the "Tempo" chip when the pacer below is already showing the same numbers.
  const techs = ex.techniques
    .filter((t) => !(t.type === 'perSide' && ex.load.value != null))
    .filter((t) => !(hideTempo && t.type === 'tempo'))
  if (!techs.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {techs.map((t, i) => (
        <span key={i} className="chip">{label(t)}</span>
      ))}
    </div>
  )
}

/** "REPS × SERIES" for a given week (reps first, series second); tolerant of
 *  ramp/complex rows. e.g. "5 × 4" = 5 reps in 4 series. */
export function setsReps(ex: ExerciseRow, week = 1): string {
  if (ex.isWarmupRamp) {
    const ord = ex.setOrdinal ? `${ex.setOrdinal}ª` : 'aprox'
    return `${ord} · ${ex.repsRaw || (ex.reps != null ? String(ex.reps) : '—')}`
  }
  const r = resolveWeek(ex, week)
  // timed HIIT/isometrics: show the WEEK's work-time (Semana 6 = 25″, not the base 20″)
  if (r.timeSec != null) {
    const sets = r.sets != null ? `${r.sets}` : r.setsRaw
    return sets ? `${r.timeSec} s × ${sets}` : `${r.timeSec} s`
  }
  if (r.complexRaw) return r.complexRaw
  const reps = r.repsRaw || (r.reps != null ? String(r.reps) : '')
  const sets = r.sets != null ? `${r.sets}` : r.setsRaw
  if (sets && reps) return `${reps} × ${sets}`
  return reps || sets || '—'
}

/** Just the reps portion (for circuit rows where series is on the header). */
export function repsText(ex: ExerciseRow, week = 1): string {
  const r = resolveWeek(ex, week)
  if (r.timeSec != null) return `${r.timeSec} s` // week-resolved work-time (25″ at Semana 6)
  if (r.complexRaw) return r.complexRaw
  return r.repsRaw || (r.reps != null ? String(r.reps) : '—')
}

export function loadText(ex: ExerciseRow, week = 1): string {
  const load = resolveWeek(ex, week).load
  if (load.value != null) return `${load.value.toLocaleString('es-AR')} kg${load.perSide ? ' /lado' : ''}`
  if (load.band) return load.band.replace(/^\w/, (c) => c.toUpperCase())
  return ex.notes || '—'
}
