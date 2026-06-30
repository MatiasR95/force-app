import { currentEventTheme } from '../lib/eventTheme'
import { ArgentinaFlag } from './ArgentinaFlag'

// A single tasteful banner on Inicio that reflects the day's event (patriotic
// dates, Navidad, fin de año, Malvinas remembrance). Date-driven — appears and
// disappears on its own. Kept to one card so it never overwhelms the screen.
export function EventThemeBanner() {
  const t = currentEventTheme()
  if (!t) return null

  if (t.tone === 'solemne') {
    // Malvinas — solemn, no festivity: a stylized islands map + remembrance.
    return (
      <div className="rounded-card border border-white/15 bg-white/[0.03] p-4 mb-4 flex items-center gap-3.5">
        <MalvinasMap />
        <div className="min-w-0">
          <div className="kicker text-white/70">{t.title}</div>
          <div className="text-white font-bold text-sm leading-snug mt-0.5">{t.greeting}</div>
          <p className="text-white/55 text-xs leading-snug mt-1">{t.blurb}</p>
        </div>
      </div>
    )
  }

  const patria = t.tone === 'patria'
  return (
    <div className={`relative overflow-hidden rounded-card p-4 mb-4 border ${patria ? 'border-[#74ACDF]/40' : 'border-gold/30'}`}
      style={{ background: patria ? 'linear-gradient(100deg, rgba(116,172,223,0.18), rgba(116,172,223,0.04) 60%, transparent)' : 'radial-gradient(120% 100% at 80% 0%, rgba(198,174,120,0.16), transparent 70%)' }}>
      {t.effect === 'fireworks' && <Fireworks />}
      <div className="relative flex items-center gap-3">
        {patria ? <ArgentinaFlag h={30} /> : <span className="text-3xl shrink-0">{t.emoji}</span>}
        <div className="min-w-0">
          <div className={`kicker ${patria ? 'text-[#9bc4ea]' : 'text-gold'}`}>{t.title}</div>
          <div className="text-white font-black text-base leading-tight mt-0.5">{t.greeting}</div>
          <p className="text-white/60 text-xs leading-snug mt-1">{t.blurb}</p>
        </div>
        {patria && <div className="ml-auto shrink-0 opacity-90"><ArgentinaFlag h={22} /></div>}
      </div>
      <style>{`
        @keyframes fw-burst { 0% { transform: scale(.2); opacity: 0 } 30% { opacity: 1 } 100% { transform: scale(1.3); opacity: 0 } }
      `}</style>
    </div>
  )
}

// Stylized Islas Malvinas (Soledad + Gran Malvina) — a respectful gold outline.
function MalvinasMap() {
  return (
    <svg viewBox="0 0 64 48" className="h-12 w-16 shrink-0" aria-label="Islas Malvinas" role="img">
      <path d="M6 18 C9 12 16 11 19 15 C22 12 27 14 26 20 C30 22 29 29 23 30 C20 35 12 34 11 28 C5 27 3 21 6 18 Z"
        fill="rgba(198,174,120,0.14)" stroke="#C6AE78" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M36 14 C40 9 49 10 51 15 C57 16 59 23 54 27 C54 33 46 36 42 31 C36 31 33 25 36 21 C34 18 34 16 36 14 Z"
        fill="rgba(198,174,120,0.14)" stroke="#C6AE78" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

// A few looping bursts for fin de año — light, contained, no full-screen takeover.
function Fireworks() {
  const bursts = [
    { x: '18%', y: '30%', d: '0s', c: '#C6AE78' },
    { x: '78%', y: '24%', d: '.5s', c: '#EADEB4' },
    { x: '52%', y: '64%', d: '1s', c: '#74ACDF' },
  ]
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {bursts.map((b, i) => (
        <span key={i} className="absolute h-8 w-8 rounded-full"
          style={{ left: b.x, top: b.y, background: `radial-gradient(circle, ${b.c} 0%, transparent 60%)`, animation: `fw-burst 1.8s ease-out ${b.d} infinite` }} />
      ))}
    </div>
  )
}
