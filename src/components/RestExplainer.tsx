import { REST_EDUCATION } from '../lib/restEducation'
import { BookOpen } from 'lucide-react'

// Animated gold line-art scenes for each rest-time explainer. Same rules as
// AnimatedExercise: translate/opacity only (iOS-safe, no SMIL), no faces, no
// baked-in text, all motion prefers-reduced-motion-gated (see index.css .rex-*).

const GOLD = '#C6AE78'
const PALE = '#EADEB4'
const DEEP = '#8A6A38'
const TRACK = '#3A3832'

function Scene({ id }: { id: string }) {
  switch (id) {
    case 'contraccion-muscular': // sliding filaments: thick row pulls thin row inward
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <line x1="18" y1="12" x2="18" y2="68" stroke={DEEP} strokeWidth="2" />
          <line x1="102" y1="12" x2="102" y2="68" stroke={DEEP} strokeWidth="2" />
          <g className="rex-fil-a">
            <rect x="20" y="30" width="42" height="5" rx="2.5" fill={GOLD} />
            <path d="M62 32 h8 M66 28 v8 M74 32 h8 M78 28 v8" stroke={GOLD} strokeWidth="1.6" />
          </g>
          <g className="rex-fil-b">
            <rect x="58" y="45" width="42" height="4" rx="2" fill={PALE} />
          </g>
        </svg>
      )
    case 'unidades-motoras': // a nerve trunk lighting up more branches each cycle
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <path d="M10 40 H50" stroke={GOLD} strokeWidth="2.4" />
          <path d="M50 40 L78 18 M50 40 L82 40 M50 40 L78 62" stroke={DEEP} strokeWidth="1.6" fill="none" />
          <g className="rex-mu rex-mu1"><circle cx="88" cy="16" r="6" fill="none" stroke={GOLD} strokeWidth="2" /></g>
          <g className="rex-mu rex-mu2"><circle cx="92" cy="40" r="6" fill="none" stroke={GOLD} strokeWidth="2" /></g>
          <g className="rex-mu rex-mu3"><circle cx="88" cy="64" r="6" fill="none" stroke={GOLD} strokeWidth="2" /></g>
        </svg>
      )
    case 'atp-pc-descanso': // reservoir empties fast, refills slowly
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <rect x="44" y="14" width="32" height="52" rx="9" fill="none" stroke={DEEP} strokeWidth="2" />
          <clipPath id="tank"><rect x="46" y="16" width="28" height="48" rx="7" /></clipPath>
          <g clipPath="url(#tank)"><rect className="rex-fill" x="46" y="16" width="28" height="48" fill={GOLD} /></g>
          <path d="M40 40 A20 20 0 1 1 44 54" fill="none" stroke={PALE} strokeWidth="1.4" opacity=".5" strokeDasharray="3 3" />
        </svg>
      )
    case 'microdano-reparacion': // fiber gaps heal, fiber thickens
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <g className="rex-fiber">
            <rect x="24" y="32" width="72" height="16" rx="8" fill="none" stroke={GOLD} strokeWidth="2" />
            <line x1="30" y1="40" x2="90" y2="40" stroke={GOLD} strokeWidth="1" opacity=".6" />
          </g>
          <g className="rex-gap">
            <line x1="48" y1="34" x2="48" y2="46" stroke="#0E0E0F" strokeWidth="3" />
            <line x1="70" y1="34" x2="70" y2="46" stroke="#0E0E0F" strokeWidth="3" />
          </g>
        </svg>
      )
    case 'respiracion-bracing': // torso cylinder braces, spine straightens
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <g className="rex-brace">
            <rect x="42" y="12" width="36" height="56" rx="14" fill="none" stroke={GOLD} strokeWidth="2" />
          </g>
          <line className="rex-spine" x1="60" y1="16" x2="60" y2="64" stroke={PALE} strokeWidth="3" strokeDasharray="4 4" />
        </svg>
      )
    case 'sobrecarga-progresiva': // marker climbing a loaded staircase
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          {[0, 1, 2, 3].map((s) => (
            <g key={s}>
              <rect x={20 + s * 22} y={60 - s * 12} width="20" height={4 + s * 12} fill="none" stroke={TRACK} strokeWidth="1.4" />
              <rect x={22 + s * 22} y={56 - s * 12} width="16" height="3" rx="1.5" fill={DEEP} />
            </g>
          ))}
          <circle className="rex-climb" cx="30" cy="52" r="5" fill={GOLD} />
        </svg>
      )
    case 'riego-sanguineo': // blood cells flowing through a widening vessel
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <path d="M8 40 H112" stroke={DEEP} strokeWidth="14" strokeLinecap="round" opacity=".35" />
          <path d="M8 40 H112" stroke={TRACK} strokeWidth="10" strokeLinecap="round" />
          <g className="rex-flow">
            {[0, 22, 44, 66, 88].map((x) => <circle key={x} cx={x} cy="40" r="3.4" fill={GOLD} />)}
          </g>
          <g className="rex-flow rex-flow2">
            {[11, 33, 55, 77, 99].map((x) => <circle key={x} cx={x} cy="40" r="2.6" fill={PALE} />)}
          </g>
        </svg>
      )
    case 'frecuencia-cardiaca': // an ECG trace with a beating pulse
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <path d="M8 40 H40 l6 -18 l7 34 l6 -16 H112" fill="none" stroke={TRACK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <g className="rex-beat" style={{ transformOrigin: '59px 40px' }}>
            <path d="M59 30 c-6 -8 -18 -1 0 12 c18 -13 6 -20 0 -12 z" fill={GOLD} />
          </g>
        </svg>
      )
    case 'sueno-recuperacion': // a moon with particles rising as the body repairs
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <path d="M74 24 a16 16 0 1 0 14 26 a13 13 0 1 1 -14 -26 z" fill="none" stroke={GOLD} strokeWidth="2" />
          <g className="rex-rise rex-rise1"><circle cx="34" cy="58" r="2.6" fill={PALE} /></g>
          <g className="rex-rise rex-rise2"><circle cx="46" cy="58" r="2" fill={GOLD} /></g>
          <g className="rex-rise rex-rise3"><circle cx="24" cy="58" r="2" fill={GOLD} /></g>
        </svg>
      )
    case 'hidratacion': // a droplet dripping into a filling glass
      return (
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <path d="M48 18 L72 18 L68 66 L52 66 Z" fill="none" stroke={DEEP} strokeWidth="2" />
          <clipPath id="glass"><path d="M49 19 L71 19 L67 65 L53 65 Z" /></clipPath>
          <g clipPath="url(#glass)"><rect className="rex-fill" x="49" y="19" width="22" height="46" fill={GOLD} opacity=".8" /></g>
          <g className="rex-drip"><path d="M60 6 c-4 5 -4 9 0 9 c4 0 4 -4 0 -9 z" fill={PALE} /></g>
        </svg>
      )
    default:
      return null
  }
}

export function RestExplainer({ id }: { id: string }) {
  const entry = REST_EDUCATION.find((e) => e.id === id) ?? REST_EDUCATION[0]
  return (
    <div className="rounded-card glass p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={15} className="text-gold" />
        <span className="kicker">Descubrí tu cuerpo</span>
      </div>
      <div className="flex gap-3 items-start">
        <div className="shrink-0 w-24 h-16 rounded-lg bg-black/30 border border-white/5 grid place-items-center">
          <Scene id={entry.scene ?? entry.id} />
        </div>
        <div className="min-w-0">
          <p className="text-gold-pale font-bold text-sm leading-tight mb-1">{entry.title}</p>
          <p className="text-white/75 text-[0.8rem] leading-snug">{entry.text}</p>
        </div>
      </div>
    </div>
  )
}
