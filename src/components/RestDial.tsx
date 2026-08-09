// The pause dial — one component, two sizes, used by the full timer inside
// Entrenar and by the floating Live-Activity pill.
//
// Two things drove the rewrite:
//
// 1. IT LEAKED. The old dial was a fixed 132px box with HTML text centred on top
//    of it. The accessibility font scale (up to 1.45×) grows rem text but not a
//    px box, so "¡Metele!" and "próxima serie" spilled straight out of the ring
//    for anyone on Texto grande. Here the readout is SVG <text> inside the same
//    viewBox as the ring: it is drawn in ring units, so it cannot outgrow the
//    circle at any font scale, on any screen. The wrapper is sized in `rem`, so
//    the whole dial still grows with the member's text setting — proportionally.
//
// 2. IT WAS A PROGRESS BAR BENT INTO A CIRCLE. Now it reads like an instrument:
//    a brushed bezel of ticks that burn down as the pause runs, a gold arc with a
//    comet head that carries its own glow around the rim, and a last-five-seconds
//    state where the whole dial tightens before the flame lands. All transform /
//    opacity / dashoffset — GPU-only, iOS-safe, and fully stilled under
//    prefers-reduced-motion.

import { Flame } from 'lucide-react'

const R = 47                       // arc radius, in viewBox units
const CIRC = 2 * Math.PI * R
const TICKS = 48                   // bezel divisions
const TICK_IN = 55
const TICK_OUT = 59

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function RestDial({ remaining, total, done, size = 'full', paused = false }: {
  remaining: number
  total: number
  done: boolean
  /** `full` = the dial inside Entrenar; `pill` = the compact floating one. */
  size?: 'full' | 'pill'
  paused?: boolean
}) {
  const p = done ? 1 : total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const urgent = !done && remaining > 0 && remaining <= 5
  // comet head: the live end of the arc, in unrotated coordinates
  const a = -Math.PI / 2 + 2 * Math.PI * p
  const hx = 60 + R * Math.cos(a)
  const hy = 60 + R * Math.sin(a)

  const box = size === 'full' ? 'w-[8.25rem] h-[8.25rem]' : 'w-[6.5rem] h-[6.5rem]'
  const label = size === 'full' ? 'próxima serie' : 'pausa'

  return (
    <div className={`relative mx-auto ${box} ${urgent ? 'dial-urgent' : ''}`}
      role="timer" aria-live="off"
      aria-label={done ? 'Descanso terminado' : `Faltan ${remaining} segundos de descanso`}>
      <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
        <defs>
          {/* the arc is not one flat gold: it warms toward the head, so the moving
              end always looks like the lit one */}
          <linearGradient id="rd-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--gold-deep-rgb))" />
            <stop offset="60%" stopColor="rgb(var(--gold-rgb))" />
            <stop offset="100%" stopColor="rgb(var(--gold-pale-rgb))" />
          </linearGradient>
          <radialGradient id="rd-core">
            <stop offset="0%" stopColor="rgb(var(--gold-rgb) / 0.16)" />
            <stop offset="70%" stopColor="rgb(var(--gold-rgb) / 0.03)" />
            <stop offset="100%" stopColor="rgb(var(--gold-rgb) / 0)" />
          </radialGradient>
          <filter id="rd-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* the dial's own atmosphere — a soft gold core so the middle isn't a hole */}
        <circle cx="60" cy="60" r="46" fill="url(#rd-core)" />

        {/* bezel: ticks ahead of the head are still "fuel", the ones behind burn out */}
        <g className="dial-bezel">
          {Array.from({ length: TICKS }).map((_, i) => {
            const spent = i / TICKS < p
            const major = i % 4 === 0
            return (
              <line key={i} x1="60" y1={TICK_IN + (major ? -1.5 : 0)} x2="60" y2={TICK_OUT}
                transform={`rotate(${(i * 360) / TICKS} 60 60)`}
                strokeLinecap="round" strokeWidth={major ? 1.6 : 1}
                className={spent ? 'stroke-white/8' : done ? 'stroke-gold-pale/70' : 'stroke-gold/45'} />
            )
          })}
        </g>

        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={R} fill="none" className="stroke-white/10" strokeWidth="7" />
          {done && (
            <>
              <circle className="ring-echo stroke-gold-pale/70" cx="60" cy="60" r={R} fill="none" strokeWidth="7" />
              <circle className="ring-echo stroke-gold/40" cx="60" cy="60" r={R} fill="none" strokeWidth="3"
                style={{ animationDelay: '.35s' }} />
            </>
          )}
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
            stroke="url(#rd-arc)" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - p)}
            style={{ transition: 'stroke-dashoffset .95s linear' }} />
        </g>

        {/* Comet head — the arc's live end, carrying its own light around the rim.
            The translate lives on the outer <g> and the breathing on the inner
            circle: one element can't both be positioned by style and animated on
            transform — the animation would win and park the comet at 12 o'clock. */}
        {!done && p > 0.002 && (
          <g filter="url(#rd-glow)"
            style={{ transform: `translate(${hx - 60}px, ${hy - 60}px)`, transition: 'transform .95s linear' }}>
            <circle cx="60" cy="60" r="3.4" className={`fill-gold-pale ${paused ? 'opacity-40' : 'dial-comet'}`} />
          </g>
        )}

        {/* readout — drawn in ring units, so it can never outgrow the ring */}
        {done ? (
          <g className="ring-pop" style={{ transformOrigin: '60px 60px' }}>
            <text x="60" y="72" textAnchor="middle" className="fill-gold-pale"
              style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.02em' }}>¡Metele!</text>
          </g>
        ) : (
          <>
            <text x="60" y={size === 'full' ? 66 : 67} textAnchor="middle" className="fill-white"
              style={{ fontSize: 25, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {fmt(remaining)}
            </text>
            <text x="60" y={size === 'full' ? 79 : 80} textAnchor="middle"
              className={paused ? 'fill-white/45' : 'fill-gold-deep'}
              style={{ fontSize: 6.2, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {paused ? 'EN PAUSA' : label.toUpperCase()}
            </text>
          </>
        )}
      </svg>

      {/* the flame sits above the word, outside the text flow, so neither can push
          the other out of the circle */}
      {done && (
        <div className="absolute inset-x-0 top-[26%] flex justify-center pointer-events-none">
          <Flame className="text-gold w-[1.4rem] h-[1.4rem] dial-flame" />
        </div>
      )}
    </div>
  )
}
