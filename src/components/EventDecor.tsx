import { currentEventTheme } from '../lib/eventTheme'
import { ArgentinaFlag } from './ArgentinaFlag'

// App-wide event decoration, shown on every tab during an event window. Subtle,
// pointer-events-none, below the nav/modals. Honors prefers-reduced-motion.
//   patria   → flag guirnalda + drifting escarapelas
//   navidad  → pine garland + falling snow
//   fin-de-año → looping fireworks
//   malvinas → a few flags drifting slowly, low-key (solemn, no festivity)

const CELESTE = '#74ACDF'
const GOLD = '#C6AE78'

export function EventDecor() {
  const t = currentEventTheme()
  if (!t) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-20 max-w-md mx-auto overflow-hidden" aria-hidden="true">
      {t.effect === 'flags' && <PatriaLayer />}
      {t.effect === 'snow' && <NavidadLayer />}
      {t.effect === 'fireworks' && <FireworksLayer />}
      {t.effect === 'map' && <SolemnLayer />}
      <style>{`
        .ev-esc { animation: evEsc linear infinite; will-change: transform; }
        @keyframes evEsc { 0%{transform:translateY(-10vh) rotate(0)} 8%{opacity:.9} 92%{opacity:.9} 100%{transform:translateY(112vh) rotate(540deg);opacity:0} }
        .ev-guir { animation: evSway 5s ease-in-out infinite; transform-origin: top center; }
        @keyframes evSway { 0%,100%{transform:rotate(-.8deg)} 50%{transform:rotate(.8deg)} }
        .ev-snow { animation: evSnow linear infinite; will-change: transform; }
        @keyframes evSnow { 0%{transform:translateY(-6vh) translateX(0);opacity:0} 10%{opacity:.85} 90%{opacity:.85} 100%{transform:translateY(110vh) translateX(14px);opacity:0} }
        .ev-fw { animation: evFw 2.2s ease-out infinite; will-change: transform, opacity; }
        @keyframes evFw { 0%{transform:scale(.2);opacity:0} 25%{opacity:1} 100%{transform:scale(1.4);opacity:0} }
        .ev-drift { animation: evDrift linear infinite; will-change: transform; }
        @keyframes evDrift { 0%{transform:translateY(-8vh) rotate(-3deg);opacity:0} 12%{opacity:.5} 88%{opacity:.5} 100%{transform:translateY(112vh) rotate(3deg);opacity:0} }
        @media (prefers-reduced-motion: reduce) {
          .ev-esc,.ev-snow,.ev-fw,.ev-drift,.ev-guir { animation: none; }
          .ev-esc,.ev-snow,.ev-drift { opacity: .6; }
        }
      `}</style>
    </div>
  )
}

// ---- patria ---------------------------------------------------------------
const ESC = [
  { left: '6%', delay: '0s', dur: '11s', size: 26 }, { left: '22%', delay: '4s', dur: '14s', size: 20 },
  { left: '40%', delay: '1.5s', dur: '12s', size: 30 }, { left: '58%', delay: '6s', dur: '15s', size: 22 },
  { left: '74%', delay: '2.5s', dur: '13s', size: 28 }, { left: '88%', delay: '8s', dur: '16s', size: 18 },
]
function PatriaLayer() {
  return (
    <>
      <Guirnalda />
      {ESC.map((e, i) => (
        <span key={i} className="ev-esc absolute -top-12" style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, width: e.size, height: e.size }}>
          <Escarapela />
        </span>
      ))}
    </>
  )
}
function Escarapela() {
  return (
    <svg viewBox="0 0 24 32" className="w-full h-full overflow-visible">
      <rect x="9.5" y="12" width="2.4" height="13" rx="1" fill={CELESTE} transform="rotate(-14 12 12)" />
      <rect x="12.1" y="12" width="2.4" height="13" rx="1" fill="#fff" transform="rotate(14 12 12)" />
      <circle cx="12" cy="11" r="11" fill={CELESTE} /><circle cx="12" cy="11" r="7.6" fill="#fff" />
      <circle cx="12" cy="11" r="4.4" fill={CELESTE} /><circle cx="12" cy="11" r="1.9" fill={GOLD} />
    </svg>
  )
}
function Guirnalda() {
  const N = 15, W = 400, H = 54, amp = 12
  const pts = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1)
    return { x: 6 + t * (W - 12), y: 4 + 4 * amp * t * (1 - t) }
  })
  const string = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  // Hang just below the status bar (env safe-area) so it isn't hidden behind the
  // clock, and give it size + a gold string + drop-shadow so it reads on dark.
  return (
    <svg className="ev-guir absolute left-0 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ top: 'env(safe-area-inset-top, 0px)', height: 46, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.55))' }}>
      <path d={string} fill="none" stroke={GOLD} strokeWidth="1.6" opacity="0.85" />
      {pts.map((p, i) => (
        <path key={i} d={`M${p.x - 9},${p.y} L${p.x + 9},${p.y} L${p.x},${p.y + 22} Z`}
          fill={i % 4 === 3 ? GOLD : i % 2 ? '#ffffff' : CELESTE} stroke="rgba(0,0,0,0.22)" strokeWidth="0.5" />
      ))}
    </svg>
  )
}

// ---- navidad --------------------------------------------------------------
const FLAKES = ['4%', '13%', '21%', '30%', '38%', '47%', '55%', '64%', '72%', '81%', '90%', '96%']
function NavidadLayer() {
  return (
    <>
      <PineGarland />
      {FLAKES.map((left, i) => {
        const size = 4 + (i % 4) * 2
        return <span key={i} className="ev-snow absolute rounded-full bg-white"
          style={{ left, top: 0, width: size, height: size, opacity: 0.85, animationDelay: `${(i * 1.3) % 9}s`, animationDuration: `${8 + (i % 5) * 1.6}s` }} />
      })}
    </>
  )
}
function PineGarland() {
  const N = 12, W = 400, amp = 8
  const pts = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1)
    return { x: 6 + t * (W - 12), y: 3 + 4 * amp * t * (1 - t) }
  })
  const string = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const bauble = ['#C6AE78', '#9A3B2B', '#EADEB4']
  return (
    <svg className="ev-guir absolute -top-1 left-0 w-full" viewBox="0 0 400 34" preserveAspectRatio="none" style={{ height: 28 }}>
      <path d={string} fill="none" stroke="#2f5d3a" strokeWidth="5" strokeLinecap="round" />
      <path d={string} fill="none" stroke="#3c7a4a" strokeWidth="2.2" strokeLinecap="round" />
      {pts.map((p, i) => i % 2 === 0 ? <circle key={i} cx={p.x} cy={p.y + 6} r="3" fill={bauble[i % 3]} /> : null)}
    </svg>
  )
}

// ---- fin de año -----------------------------------------------------------
const BURSTS = [
  { x: '16%', y: '18%', d: '0s', c: GOLD }, { x: '80%', y: '14%', d: '.6s', c: '#EADEB4' },
  { x: '50%', y: '30%', d: '1.1s', c: CELESTE }, { x: '30%', y: '42%', d: '1.7s', c: GOLD },
  { x: '70%', y: '46%', d: '2.3s', c: '#fff' },
]
function FireworksLayer() {
  return (
    <>
      {BURSTS.map((b, i) => (
        <span key={i} className="ev-fw absolute rounded-full"
          style={{ left: b.x, top: b.y, width: 70, height: 70, background: `radial-gradient(circle, ${b.c} 0%, transparent 62%)`, animationDelay: b.d }} />
      ))}
    </>
  )
}

// ---- malvinas (solemn) ----------------------------------------------------
const DRIFT = [
  { left: '12%', delay: '0s', dur: '20s' }, { left: '34%', delay: '7s', dur: '24s' },
  { left: '56%', delay: '3s', dur: '22s' }, { left: '78%', delay: '11s', dur: '26s' },
]
function SolemnLayer() {
  return (
    <>
      {DRIFT.map((f, i) => (
        <span key={i} className="ev-drift absolute -top-10" style={{ left: f.left, animationDelay: f.delay, animationDuration: f.dur }}>
          <ArgentinaFlag h={18} />
        </span>
      ))}
    </>
  )
}
