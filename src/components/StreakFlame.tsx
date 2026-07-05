import { Flame } from 'lucide-react'

// A flame whose life scales with the streak: the longer the member's run, the
// warmer the glow and the more embers rise off it. Zero streak = a calm, unlit
// icon (nothing to brag about yet); a long streak = a living little fire.
// Motion is transform/opacity only (iOS-safe) and fully reduced-motion gated
// (see .flame-* in index.css). `tier` 0–3 drives intensity.

function tierOf(streak: number): 0 | 1 | 2 | 3 {
  if (streak >= 12) return 3
  if (streak >= 6) return 2
  if (streak >= 1) return 1
  return 0
}

export function StreakFlame({ streak, size = 26 }: { streak: number; size?: number }) {
  const tier = tierOf(streak)
  const lit = tier > 0
  // more embers the hotter it burns
  const embers = tier === 3 ? 3 : tier === 2 ? 2 : tier === 1 ? 1 : 0
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      {/* soft radial glow behind the icon, brighter with tier */}
      {lit && (
        <span className={`flame-glow flame-glow-${tier}`} />
      )}
      {/* rising embers */}
      {Array.from({ length: embers }).map((_, i) => (
        <span key={i} className={`flame-ember flame-ember-${i + 1}`} />
      ))}
      <Flame
        size={size}
        className={`relative ${lit ? 'text-gold flame-flicker' : 'text-white/30'}`}
        style={lit ? { animationDuration: `${1.9 - tier * 0.35}s` } : undefined}
        fill={tier >= 2 ? 'currentColor' : 'none'}
        fillOpacity={tier === 3 ? 0.22 : tier === 2 ? 0.12 : 0}
      />
    </span>
  )
}
