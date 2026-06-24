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

export function TechniqueChips({ ex }: { ex: ExerciseRow }) {
  // Drop the "Por lado" chip when the load already shows "/lado" (avoid the duplicate).
  const techs = ex.techniques.filter((t) => !(t.type === 'perSide' && ex.load.value != null))
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
  if (r.complexRaw) return r.complexRaw
  const reps = ex.timeSec != null ? `${ex.timeSec} s` : (r.repsRaw || (r.reps != null ? String(r.reps) : ''))
  const sets = r.sets != null ? `${r.sets}` : r.setsRaw
  if (sets && reps) return `${reps} × ${sets}`
  return reps || sets || '—'
}

/** Just the reps portion (for circuit rows where series is on the header). */
export function repsText(ex: ExerciseRow, week = 1): string {
  if (ex.timeSec != null) return `${ex.timeSec} s`
  const r = resolveWeek(ex, week)
  if (r.complexRaw) return r.complexRaw
  return r.repsRaw || (r.reps != null ? String(r.reps) : '—')
}

export function loadText(ex: ExerciseRow, week = 1): string {
  const load = resolveWeek(ex, week).load
  if (load.value != null) return `${load.value.toLocaleString('es-AR')} kg${load.perSide ? ' /lado' : ''}`
  if (load.band) return load.band.replace(/^\w/, (c) => c.toUpperCase())
  return ex.notes || '—'
}
