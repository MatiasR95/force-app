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
  if (!ex.techniques.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {ex.techniques.map((t, i) => (
        <span key={i} className="chip">{label(t)}</span>
      ))}
    </div>
  )
}

/** "4 × 6" style sets×reps for a given week; tolerant of ramp/complex rows. */
export function setsReps(ex: ExerciseRow, week = 1): string {
  if (ex.isWarmupRamp) {
    const ord = ex.setOrdinal ? `${ex.setOrdinal}ª` : 'aprox'
    return `${ord} · ${ex.repsRaw || (ex.reps != null ? String(ex.reps) : '—')}`
  }
  const r = resolveWeek(ex, week)
  if (r.complexRaw) return r.complexRaw
  const reps = r.repsRaw || (r.reps != null ? String(r.reps) : '')
  const sets = r.sets != null ? `${r.sets}` : r.setsRaw
  if (sets && reps) return `${sets} × ${reps}`
  return reps || sets || '—'
}

export function loadText(ex: ExerciseRow, week = 1): string {
  const load = resolveWeek(ex, week).load
  if (load.value != null) return `${load.value.toLocaleString('es-AR')} kg${load.perSide ? ' /lado' : ''}`
  if (load.band) return load.band.replace(/^\w/, (c) => c.toUpperCase())
  return ex.notes || '—'
}
