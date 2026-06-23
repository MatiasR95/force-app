import type { MovementPattern } from '../lib/types'
import { mediaFor } from '../lib/media'
import { AnimatedExercise } from './AnimatedExercise'

/** Exercise visual: real curated media if present, else an animated SVG demo. */
export function ExerciseMedia({ slug, pattern, name }: {
  slug: string; pattern: MovementPattern; name: string
}) {
  const real = mediaFor(slug)
  if (real) return <img src={real} alt={name} className="h-full w-full object-cover" />
  return <AnimatedExercise pattern={pattern} />
}
