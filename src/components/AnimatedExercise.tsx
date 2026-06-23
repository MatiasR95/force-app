import type { MovementPattern } from '../lib/types'

// Looping, brand-on-dark animated demos of each movement pattern. Pure SVG
// (SMIL), no assets, tiny. A minimalist athlete + barbell performs the rep so a
// member who forgets a movement gets the idea at a glance. Per-slug curated gifs
// can still override these via media.ts when produced.

const GOLD = '#C6AE78'
const DUR = '2.4s'
const SPLINE = '0.45 0 0.55 1'

// shared barbell plates as two small rects centered on (x1,y) and (x2,y)
function Plates({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <>
      <rect x={x1 - 2} y={y - 7} width="4" height="14" rx="1" fill={GOLD} />
      <rect x={x2 - 2} y={y - 7} width="4" height="14" rx="1" fill={GOLD} />
    </>
  )
}

const stroke = { stroke: GOLD, strokeWidth: 3.4, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Squat() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {/* legs morph: stand → deep squat (knees out) */}
      <path {...stroke}>
        <animate attributeName="d" dur={DUR} repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1"
          keySplines={`${SPLINE};${SPLINE}`}
          values="M38,86 L40,66 L50,50 M62,86 L60,66 L50,50;
                  M38,86 L33,70 L50,64 M62,86 L67,70 L50,64;
                  M38,86 L40,66 L50,50 M62,86 L60,66 L50,50" />
      </path>
      {/* upper body + bar drops with the hips */}
      <g>
        <animateTransform attributeName="transform" type="translate" dur={DUR} repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines={`${SPLINE};${SPLINE}`} values="0 0;0 14;0 0" />
        <line x1="50" y1="50" x2="50" y2="38" {...stroke} />
        <circle cx="50" cy="31" r="6" {...stroke} />
        <line x1="30" y1="40" x2="70" y2="40" {...stroke} />
        <Plates x1={30} x2={70} y={40} />
      </g>
    </svg>
  )
}

function Hinge() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {/* legs (near-static) */}
      <path d="M40,86 L42,64 M60,86 L58,64" {...stroke} />
      {/* torso + head + hanging bar rotate at the hip (deadlift hinge) */}
      <g>
        <animateTransform attributeName="transform" type="rotate" dur={DUR} repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines={`${SPLINE};${SPLINE}`}
          values="65 50 64;5 50 64;65 50 64" />
        <line x1="50" y1="64" x2="50" y2="40" {...stroke} />
        <circle cx="50" cy="33" r="6" {...stroke} />
        {/* arms hang to the bar */}
        <line x1="50" y1="44" x2="50" y2="60" {...stroke} />
        <line x1="40" y1="60" x2="60" y2="60" {...stroke} />
        <Plates x1={40} x2={60} y={60} />
      </g>
    </svg>
  )
}

function Press() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {/* static figure */}
      <path d="M40,86 L44,64 L50,52 M60,86 L56,64 L50,52" {...stroke} />
      <line x1="50" y1="52" x2="50" y2="40" {...stroke} />
      <circle cx="50" cy="33" r="6" {...stroke} />
      {/* arms morph: shoulders fixed, bar presses overhead */}
      <path {...stroke}>
        <animate attributeName="d" dur={DUR} repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1"
          keySplines={`${SPLINE};${SPLINE}`}
          values="M44,41 L40,40 L50,40 L60,40 L56,41;
                  M44,41 L46,26 L50,24 L54,24 L56,41;
                  M44,41 L40,40 L50,40 L60,40 L56,41" />
      </path>
      <g>
        <animateTransform attributeName="transform" type="translate" dur={DUR} repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines={`${SPLINE};${SPLINE}`} values="0 0;0 -16;0 0" />
        <line x1="32" y1="40" x2="68" y2="40" {...stroke} />
        <Plates x1={32} x2={68} y={40} />
      </g>
    </svg>
  )
}

function Pull() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {/* hinged torso (bent-over row stance) */}
      <path d="M40,86 L44,66 M60,86 L56,66" {...stroke} />
      <line x1="50" y1="66" x2="72" y2="44" {...stroke} />
      <circle cx="76" cy="40" r="6" {...stroke} />
      {/* bar rows up toward the torso (vertical pull under the chest) */}
      <g>
        <animateTransform attributeName="transform" type="translate" dur={DUR} repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines={`${SPLINE};${SPLINE}`} values="0 0;0 -16;0 0" />
        <line x1="50" y1="60" x2="58" y2="72" {...stroke} />
        <line x1="44" y1="74" x2="64" y2="74" {...stroke} />
        <Plates x1={44} x2={64} y={74} />
      </g>
    </svg>
  )
}

function Core() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {/* plank with a small up/down hold cue */}
      <g>
        <animateTransform attributeName="transform" type="translate" dur="2.8s" repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines={`${SPLINE};${SPLINE}`} values="0 0;0 -3;0 0" />
        <line x1="22" y1="70" x2="78" y2="60" {...stroke} />
        <circle cx="82" cy="58" r="6" {...stroke} />
        <line x1="34" y1="70" x2="34" y2="84" {...stroke} />
        <line x1="60" y1="66" x2="64" y2="84" {...stroke} />
      </g>
      <line x1="18" y1="86" x2="82" y2="86" stroke={GOLD} strokeWidth="2" opacity="0.35" />
    </svg>
  )
}

function BarbellBob() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <g>
        <animateTransform attributeName="transform" type="translate" dur="2.6s" repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines={`${SPLINE};${SPLINE}`} values="0 -3;0 3;0 -3" />
        <line x1="22" y1="50" x2="78" y2="50" {...stroke} />
        <Plates x1={24} x2={76} y={50} />
        <rect x="30" y="46" width="40" height="8" rx="2" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.4" />
      </g>
    </svg>
  )
}

const BY_PATTERN: Record<MovementPattern, () => JSX.Element> = {
  squat: Squat, hinge: Hinge, push: Press, pull: Pull, core: Core, carry: BarbellBob, other: BarbellBob,
}

export function AnimatedExercise({ pattern }: { pattern: MovementPattern }) {
  const Anim = BY_PATTERN[pattern] ?? BarbellBob
  return (
    <div className="relative h-full w-full bg-dark-stage overflow-hidden grid place-items-center">
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px',
      }} />
      <div className="h-44 w-44"><Anim /></div>
    </div>
  )
}
