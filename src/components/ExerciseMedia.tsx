import type { MovementPattern } from '../lib/types'
import { mediaFor } from '../lib/media'
import type { LucideIcon } from 'lucide-react'
import { Dumbbell, MoveVertical, ArrowUp, ArrowDown, Hexagon, Footprints, Activity } from 'lucide-react'

const PATTERN_ICON: Record<MovementPattern, LucideIcon> = {
  squat: MoveVertical,
  hinge: ArrowDown,
  push: ArrowUp,
  pull: Dumbbell,
  core: Hexagon,
  carry: Footprints,
  other: Activity,
}

/** Exercise visual: real curated media if present, else a brand-safe placeholder. */
export function ExerciseMedia({ slug, pattern, name }: {
  slug: string; pattern: MovementPattern; name: string
}) {
  const real = mediaFor(slug)
  if (real) {
    return <img src={real} alt={name} className="h-full w-full object-cover" />
  }
  const Icon = PATTERN_ICON[pattern] ?? Activity
  return (
    <div className="relative h-full w-full bg-dark-stage overflow-hidden">
      {/* faint dot-grid texture (brand) */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }} />
      <Icon size={150} className="absolute -right-6 -bottom-6 text-gold/10" />
      <Icon size={56} className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/70" />
    </div>
  )
}
