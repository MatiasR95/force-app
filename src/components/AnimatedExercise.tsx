import type { MovementPattern } from '../lib/types'
import { deburr } from '../lib/normalize'

// Looping, brand-on-dark animated demos of common lifts. Pure SVG (SMIL), no
// assets, tiny. A minimalist athlete performs the rep with the CORRECT implement
// (barbell / dumbbell / kettlebell / cable / band / bodyweight), mapped by the
// exercise name → movement, then by movement pattern. Per-slug curated gifs can
// still override these via media.ts when produced.

const GOLD = '#C6AE78'
const DUR = '2.4s'
const SP = '0.45 0 0.55 1'
const ss = `${SP};${SP}`
const stroke = { stroke: GOLD, strokeWidth: 3.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const thin = { stroke: GOLD, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const }

type Impl = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'band' | 'bodyweight'

const Head = ({ cx, cy }: { cx: number; cy: number }) => <circle cx={cx} cy={cy} r="6.5" {...stroke} />
const Ground = () => <line x1="14" y1="90" x2="86" y2="90" stroke={GOLD} strokeWidth="2" opacity="0.3" />

// A single dumbbell centered at (cx,y)
const Bell = ({ cx, y }: { cx: number; y: number }) => (
  <g>
    <rect x={cx - 7} y={y - 5} width="3.5" height="10" rx="1" fill={GOLD} />
    <rect x={cx + 3.5} y={y - 5} width="3.5" height="10" rx="1" fill={GOLD} />
    <line x1={cx - 4} y1={y} x2={cx + 4} y2={y} {...stroke} />
  </g>
)
const Kettlebell = ({ cx, y }: { cx: number; y: number }) => (
  <g>
    <path d={`M${cx - 3},${y - 2} q3,-6 6,0`} {...thin} />
    <circle cx={cx} cy={y + 4} r="5.5" fill={GOLD} />
  </g>
)

// The load element at the hands (x1,x2) and height y — drawn per implement.
function Load({ impl, x1, x2, y }: { impl: Impl; x1: number; x2: number; y: number }) {
  const mid = (x1 + x2) / 2
  switch (impl) {
    case 'dumbbell':
      return <><Bell cx={x1} y={y} /><Bell cx={x2} y={y} /></>
    case 'kettlebell':
      return <Kettlebell cx={mid} y={y} />
    case 'band':
      return <line x1={x1 - 4} y1={y} x2={x2 + 4} y2={y} stroke={GOLD} strokeWidth="2.4" strokeDasharray="3 3" />
    case 'cable':
      return <><line x1={x1} y1={y} x2={x2} y2={y} {...stroke} /></>
    case 'bodyweight':
      return null
    default: // barbell
      return <>
        <line x1={x1 - 9} y1={y} x2={x2 + 9} y2={y} {...stroke} />
        <rect x={x1 - 11} y={y - 7} width="4" height="14" rx="1" fill={GOLD} />
        <rect x={x2 + 7} y={y - 7} width="4" height="14" rx="1" fill={GOLD} />
      </>
  }
}

const wrap = (children: React.ReactNode) => (
  <svg viewBox="0 0 100 100" className="h-full w-full">{children}</svg>
)
const tr = (values: string, dur = DUR) => (
  <animateTransform attributeName="transform" type="translate" dur={dur} repeatCount="indefinite"
    calcMode="spline" keyTimes="0;0.5;1" keySplines={ss} values={values} />
)
const rot = (values: string, dur = DUR) => (
  <animateTransform attributeName="transform" type="rotate" dur={dur} repeatCount="indefinite"
    calcMode="spline" keyTimes="0;0.5;1" keySplines={ss} values={values} />
)
const morph = (values: string, dur = DUR) => (
  <animate attributeName="d" dur={dur} repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1"
    keySplines={ss} values={values} />
)

// ---- movements (each takes the resolved implement) -----------------------

const Squat = (impl: Impl) => wrap(<>
  <Ground />
  <path {...stroke}>{morph(
    'M38,88 L40,66 L50,50 M62,88 L60,66 L50,50;M38,88 L33,70 L50,64 M62,88 L67,70 L50,64;M38,88 L40,66 L50,50 M62,88 L60,66 L50,50')}</path>
  <g>{tr('0 0;0 14;0 0')}
    <line x1="50" y1="50" x2="50" y2="38" {...stroke} /><Head cx={50} cy={31} />
    {impl === 'kettlebell'
      ? <Kettlebell cx={50} y={46} /> /* goblet */
      : <Load impl={impl} x1={38} x2={62} y={impl === 'barbell' ? 40 : 44} />}
  </g>
</>)

const Deadlift = (impl: Impl) => wrap(<>
  <Ground />
  <path d="M40,90 L42,66 M60,90 L58,66" {...stroke} />
  <g>{rot('70 50 66;3 50 66;70 50 66')}
    <line x1="50" y1="66" x2="50" y2="42" {...stroke} /><Head cx={50} cy={35} />
    <line x1="50" y1="46" x2="50" y2="60" {...stroke} />
    <Load impl={impl} x1={42} x2={58} y={60} />
  </g>
</>)

const HipThrust = (impl: Impl) => wrap(<>
  <Ground />
  <line x1="20" y1="58" x2="30" y2="58" {...thin} />
  <line x1="74" y1="90" x2="74" y2="74" {...stroke} />
  <g>{rot('22 26 60;-2 26 60;22 26 60')}
    <Head cx={24} cy={56} />
    <line x1="28" y1="60" x2="64" y2="74" {...stroke} />
    <line x1="58" y1="72" x2="74" y2="74" {...stroke} />
    <Load impl={impl} x1={48} x2={62} y={62} />
  </g>
</>)

const Bench = (impl: Impl) => wrap(<>
  <line x1="26" y1="68" x2="70" y2="68" {...thin} />
  <line x1="30" y1="68" x2="30" y2="78" {...thin} /><line x1="66" y1="68" x2="66" y2="78" {...thin} />
  <Head cx={34} cy={60} />
  <line x1="40" y1="63" x2="68" y2="63" {...stroke} />
  <line x1="68" y1="63" x2="76" y2="56" {...stroke} /><line x1="76" y1="56" x2="78" y2="68" {...stroke} />
  <path {...stroke}>{morph('M52,62 L52,52 L60,52 M58,62 L58,52;M52,62 L52,40 L60,40 M58,62 L58,40;M52,62 L52,52 L60,52 M58,62 L58,52')}</path>
  <g>{tr('0 0;0 -12;0 0')}<Load impl={impl} x1={46} x2={64} y={52} /></g>
</>)

const Overhead = (impl: Impl) => wrap(<>
  <path d="M40,88 L44,64 L50,52 M60,88 L56,64 L50,52" {...stroke} />
  <line x1="50" y1="52" x2="50" y2="40" {...stroke} /><Head cx={50} cy={33} />
  <path {...stroke}>{morph('M44,41 L40,40 L60,40 L56,41;M44,41 L47,26 L53,26 L56,41;M44,41 L40,40 L60,40 L56,41')}</path>
  <g>{tr('0 0;0 -16;0 0')}<Load impl={impl} x1={40} x2={60} y={40} /></g>
</>)

const Row = (impl: Impl) => wrap(<>
  <Ground />
  <path d="M40,90 L44,66 M60,90 L56,66" {...stroke} />
  <line x1="50" y1="66" x2="72" y2="46" {...stroke} /><Head cx={76} cy={41} />
  <g>{tr('0 0;0 -15;0 0')}
    <line x1="52" y1="60" x2="55" y2="72" {...stroke} />
    <Load impl={impl} x1={46} x2={62} y={74} />
  </g>
</>)

const Pulldown = (impl: Impl) => wrap(<>
  {impl === 'cable'
    ? <><line x1="50" y1="14" x2="50" y2="20" {...thin} /><line x1="30" y1="20" x2="70" y2="20" {...stroke} /></>
    : <Load impl="barbell" x1={32} x2={68} y={20} />}
  <g>{tr('0 0;0 -10;0 0')}
    <Head cx={50} cy={50} />
    <line x1="50" y1="56" x2="50" y2="74" {...stroke} />
    <line x1="50" y1="74" x2="44" y2="88" {...stroke} /><line x1="50" y1="74" x2="56" y2="88" {...stroke} />
    <path {...stroke}>{morph('M44,50 L40,20 M56,50 L60,20;M44,50 L46,20 M56,50 L54,20;M44,50 L40,20 M56,50 L60,20')}</path>
  </g>
</>)

const Curl = (impl: Impl) => wrap(<>
  <path d="M40,88 L44,64 L50,52 M60,88 L56,64 L50,52" {...stroke} />
  <line x1="50" y1="52" x2="50" y2="40" {...stroke} /><Head cx={50} cy={33} />
  <line x1="44" y1="46" x2="42" y2="62" {...stroke} /><line x1="56" y1="46" x2="58" y2="62" {...stroke} />
  <g>{rot('0 50 62;-115 50 62;0 50 62')}
    <line x1="42" y1="62" x2="42" y2="80" {...stroke} /><line x1="58" y1="62" x2="58" y2="80" {...stroke} />
    <Load impl={impl === 'barbell' || impl === 'band' ? impl : 'dumbbell'} x1={42} x2={58} y={80} />
  </g>
</>)

const Pushdown = () => wrap(<>
  <line x1="36" y1="16" x2="64" y2="16" {...thin} />
  <line x1="50" y1="16" x2="50" y2="30" {...thin} />
  <path d="M40,88 L44,64 L50,52 M60,88 L56,64 L50,52" {...stroke} />
  <line x1="50" y1="52" x2="50" y2="40" {...stroke} /><Head cx={50} cy={33} />
  <line x1="44" y1="46" x2="44" y2="58" {...stroke} /><line x1="56" y1="46" x2="56" y2="58" {...stroke} />
  <g>{rot('-40 50 58;6 50 58;-40 50 58')}
    <line x1="44" y1="58" x2="44" y2="74" {...stroke} /><line x1="56" y1="58" x2="56" y2="74" {...stroke} />
    <line x1="42" y1="74" x2="58" y2="74" {...stroke} />
  </g>
</>)

const Lunge = (impl: Impl) => wrap(<>
  <Ground />
  <path {...stroke}>{morph('M34,90 L40,68 L50,58 M66,90 L60,72 L50,58;M34,90 L40,74 L50,66 M66,90 L58,78 L50,66;M34,90 L40,68 L50,58 M66,90 L60,72 L50,58')}</path>
  <g>{tr('0 0;0 8;0 0')}
    <line x1="50" y1="58" x2="50" y2="44" {...stroke} /><Head cx={50} cy={37} />
    {impl === 'bodyweight'
      ? <><line x1="44" y1="46" x2="40" y2="58" {...stroke} /><line x1="56" y1="46" x2="60" y2="58" {...stroke} /></>
      : <Load impl={impl} x1={38} x2={62} y={impl === 'barbell' ? 44 : 56} />}
  </g>
</>)

const Plank = () => wrap(<>
  <Ground />
  <g>{tr('0 0;0 -3;0 0', '2.8s')}
    <line x1="22" y1="74" x2="78" y2="62" {...stroke} /><Head cx={82} cy={60} />
    <line x1="32" y1="72" x2="32" y2="88" {...stroke} /><line x1="60" y1="68" x2="64" y2="88" {...stroke} />
  </g>
</>)

const Pushup = () => wrap(<>
  <Ground />
  <g>{tr('0 0;0 6;0 0')}
    <line x1="24" y1="70" x2="76" y2="58" {...stroke} /><Head cx={80} cy={56} />
    <line x1="64" y1="62" x2="66" y2="88" {...stroke} />
  </g>
  <line x1="34" y1="64" x2="34" y2="88" {...stroke} />
</>)

const Generic = (impl: Impl) => wrap(
  <g>{tr('0 -3;0 3;0 -3', '2.6s')}
    <Load impl={impl === 'bodyweight' ? 'barbell' : impl} x1={34} x2={66} y={50} />
  </g>,
)

type Mv = (impl: Impl) => React.ReactElement
const MOVES: Record<string, Mv> = {
  squat: Squat, deadlift: Deadlift, hipthrust: HipThrust, bench: Bench, overhead: Overhead,
  row: Row, pulldown: Pulldown, curl: Curl, pushdown: Pushdown, lunge: Lunge, plank: Plank,
  pushup: Pushup, generic: Generic,
}

// keyword → movement (first match wins)
const NAME_RULES: Array<[RegExp, string]> = [
  [/plancha|\bcore\b|olla|rueda|hollow|pallof|isometr|bird ?dog|dead ?bug|abdominal colgad|inf\. colgad/, 'plank'],
  [/flexion|push ?up|fondo/, 'pushup'],
  [/hip thrust|puente|gluteo|elevacion de cadera/, 'hipthrust'],
  [/peso muerto|deadlift|\brdl\b|buenos dias|good ?morning|ghd|reverse hyper|nordic|isquio|bisagra/, 'deadlift'],
  [/bulgara|zancada|estocada|desplante|lunge|split|hatfield|step ?(down|up)|prensa|hack|sentadilla frontal|sillon/, 'lunge'],
  [/sentadilla|squat|sissy/, 'squat'],
  [/dominada|pull ?up|chin ?up|jalon|pulldown/, 'pulldown'],
  [/remo|\brow\b|face ?pull|menton|encogimiento|shrug|pajaro|invertid|apertura inclinada|apertura plana/, 'row'],
  [/tricep|frances|polea alta|pushdown|trasnuca|extension de codo|patada/, 'pushdown'],
  [/curl|biceps|martillo/, 'curl'],
  [/press (militar|de hombro|parado|arnold|cubano|kodama)|militar|overhead|push press|hombro/, 'overhead'],
  [/press (plano|inclinado|banca|de banca)|banca|bench|apertura|vuelo/, 'bench'],
]

const PATTERN_FALLBACK: Record<MovementPattern, string> = {
  squat: 'squat', hinge: 'deadlift', push: 'overhead', pull: 'row', core: 'plank', carry: 'generic', other: 'generic',
}

export function pickMove(name: string, pattern: MovementPattern): string {
  const s = deburr(name)
  for (const [re, key] of NAME_RULES) if (re.test(s)) return key
  return PATTERN_FALLBACK[pattern] ?? 'generic'
}

export function detectImpl(name: string): Impl {
  const s = deburr(name)
  if (/mancuerna|dumbbell|\bdb\b|martillo/.test(s)) return 'dumbbell'
  if (/\bkb\b|kettlebell|rusa|pesa rusa|goblet/.test(s)) return 'kettlebell'
  if (/polea|cable|soga|cruce/.test(s)) return 'cable'
  if (/banda|band\b|gomas?/.test(s)) return 'band'
  if (/dominada|pull ?up|chin ?up|flexion|fondo|plancha|abdominal|colgad|pc\b|peso corporal|libre/.test(s)) return 'bodyweight'
  return 'barbell'
}

export function AnimatedExercise({ name, pattern, size = 'full' }: {
  name: string; pattern: MovementPattern; size?: 'full' | 'thumb'
}) {
  const move = MOVES[pickMove(name, pattern)] ?? Generic
  const impl = detectImpl(name)
  if (size === 'thumb') {
    return <div className="h-11 w-11 shrink-0 rounded-xl bg-black/30 border border-gold/15 grid place-items-center">{move(impl)}</div>
  }
  return (
    <div className="relative h-full w-full bg-dark-stage overflow-hidden grid place-items-center">
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px',
      }} />
      <div className="h-44 w-44">{move(impl)}</div>
    </div>
  )
}
