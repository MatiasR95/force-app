import { currentEventTheme } from '../lib/eventTheme'

// App-wide patriotic decoration shown during the patria windows (25 de Mayo, Día
// de la Bandera, 9 de Julio, San Martín, Soberanía): a flag guirnalda strung
// across the top and a few escarapelas drifting + rotating down the screen.
// Pointer-events-none and below the nav/modals, so it decorates without blocking.
// Honors prefers-reduced-motion (static, no drift) and stays subtle.

const CELESTE = '#74ACDF'
const GOLD = '#C6AE78'

export function PatriaDecor() {
  const t = currentEventTheme()
  if (!t || t.tone !== 'patria') return null
  return (
    <div className="pointer-events-none fixed inset-0 z-20 max-w-md mx-auto overflow-hidden" aria-hidden="true">
      <Guirnalda />
      {ESCARAPELAS.map((e, i) => (
        <span key={i} className="escarapela absolute -top-12"
          style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, width: e.size, height: e.size }}>
          <Escarapela />
        </span>
      ))}
      <style>{`
        .escarapela { animation-name: escFall; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
        @keyframes escFall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          8%   { opacity: .9; }
          92%  { opacity: .9; }
          100% { transform: translateY(112vh) rotate(540deg); opacity: 0; }
        }
        .guirnalda { animation: guirSway 5s ease-in-out infinite; transform-origin: top center; }
        @keyframes guirSway { 0%,100% { transform: rotate(-0.8deg); } 50% { transform: rotate(0.8deg); } }
        @media (prefers-reduced-motion: reduce) {
          .escarapela { animation: none; opacity: .85; }
          .guirnalda { animation: none; }
        }
      `}</style>
    </div>
  )
}

// deterministic spread (no Math.random — keeps it stable across renders)
const ESCARAPELAS = [
  { left: '6%', delay: '0s', dur: '11s', size: 26 },
  { left: '22%', delay: '4s', dur: '14s', size: 20 },
  { left: '40%', delay: '1.5s', dur: '12s', size: 30 },
  { left: '58%', delay: '6s', dur: '15s', size: 22 },
  { left: '74%', delay: '2.5s', dur: '13s', size: 28 },
  { left: '88%', delay: '8s', dur: '16s', size: 18 },
]

// A small escarapela (cockade): celeste/white concentric rings, gold centre,
// with two short ribbon tails.
function Escarapela() {
  return (
    <svg viewBox="0 0 24 32" className="w-full h-full overflow-visible">
      <rect x="9.5" y="12" width="2.4" height="13" rx="1" fill={CELESTE} transform="rotate(-14 12 12)" />
      <rect x="12.1" y="12" width="2.4" height="13" rx="1" fill="#fff" transform="rotate(14 12 12)" />
      <circle cx="12" cy="11" r="11" fill={CELESTE} />
      <circle cx="12" cy="11" r="7.6" fill="#fff" />
      <circle cx="12" cy="11" r="4.4" fill={CELESTE} />
      <circle cx="12" cy="11" r="1.9" fill={GOLD} />
    </svg>
  )
}

// Flag bunting: triangular pennants alternating celeste / white, hung along a
// gently sagging string at the very top of the screen.
function Guirnalda() {
  const N = 14
  const W = 400, H = 34
  const amp = 9 // string sag in px
  const pts = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1)
    const x = 6 + t * (W - 12)
    const y = 2 + 4 * amp * t * (1 - t) // parabola, peak sag at centre
    return { x, y }
  })
  const string = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg className="guirnalda absolute -top-1 left-0 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 30 }}>
      <path d={string} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      {pts.map((p, i) => (
        <path key={i} d={`M${p.x - 7},${p.y} L${p.x + 7},${p.y} L${p.x},${p.y + 16} Z`}
          fill={i % 2 ? '#ffffff' : CELESTE} stroke="rgba(0,0,0,0.12)" strokeWidth="0.4" />
      ))}
    </svg>
  )
}
