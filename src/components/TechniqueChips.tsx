import type { ExerciseRow, Technique } from '../lib/types'

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

/** "4 × 6" style sets×reps, tolerant of ramp/odd rows (falls back to raw). */
export function setsReps(ex: ExerciseRow): string {
  const reps = ex.repsRaw || (ex.reps != null ? String(ex.reps) : '')
  if (ex.isWarmupRamp) {
    const ord = ex.setOrdinal ? `${ex.setOrdinal}ª` : 'aprox'
    return `${ord} · ${reps || '—'}`
  }
  const sets = ex.sets != null ? `${ex.sets}` : ex.setsRaw
  if (sets && reps) return `${sets} × ${reps}`
  return reps || sets || '—'
}

export function loadText(ex: ExerciseRow): string {
  if (ex.load.value != null) return `${ex.load.value.toLocaleString('es-AR')} kg${ex.load.perSide ? ' /lado' : ''}`
  if (ex.load.band) return ex.load.band.replace(/^\w/, (c) => c.toUpperCase())
  return ex.notes || '—'
}
