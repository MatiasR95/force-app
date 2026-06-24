import type { MovementPattern } from '../lib/types'
import { deburr } from '../lib/normalize'

// On-brand exercise icons (gold line-art on the dark stage) that ANIMATE the rep.
// Each shows the movement with the CORRECT implement (barbell / dumbbell /
// kettlebell / cable / band / bodyweight / fitball), mapped first by exercise
// name then by movement pattern. The moving segment is wrapped in `<g className
// ="exm exm-…">` and animated with CSS @keyframes (see index.css) — translate-only
// so it's iOS-safe and needs no SMIL (SMIL broke tooling last round). Poses follow
// the coach agent's biomechanics notes (.claude/agents/sc-coach.md). Per-slug real
// images still override these via media.ts when produced.

const GOLD = '#C6AE78'
const stroke = { stroke: GOLD, strokeWidth: 3.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const thin = { stroke: GOLD, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const }

type Impl = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'band' | 'bodyweight'

const Head = ({ cx, cy }: { cx: number; cy: number }) => <circle cx={cx} cy={cy} r="6.5" {...stroke} />
const Ground = () => <line x1="14" y1="90" x2="86" y2="90" stroke={GOLD} strokeWidth="2" opacity="0.3" />
const Bell = ({ cx, y }: { cx: number; y: number }) => (
  <g><rect x={cx - 7} y={y - 5} width="3.5" height="10" rx="1" fill={GOLD} /><rect x={cx + 3.5} y={y - 5} width="3.5" height="10" rx="1" fill={GOLD} /><line x1={cx - 4} y1={y} x2={cx + 4} y2={y} {...stroke} /></g>
)
const Kettlebell = ({ cx, y }: { cx: number; y: number }) => (
  <g><path d={`M${cx - 3},${y - 2} q3,-6 6,0`} {...thin} /><circle cx={cx} cy={y + 4} r="5.5" fill={GOLD} /></g>
)
function Load({ impl, x1, x2, y }: { impl: Impl; x1: number; x2: number; y: number }) {
  const mid = (x1 + x2) / 2
  switch (impl) {
    case 'dumbbell': return <><Bell cx={x1} y={y} /><Bell cx={x2} y={y} /></>
    case 'kettlebell': return <Kettlebell cx={mid} y={y} />
    case 'band': return <line x1={x1 - 4} y1={y} x2={x2 + 4} y2={y} stroke={GOLD} strokeWidth="2.4" strokeDasharray="3 3" />
    case 'cable': return <line x1={x1} y1={y} x2={x2} y2={y} {...stroke} />
    case 'bodyweight': return null
    default: return <><line x1={x1 - 9} y1={y} x2={x2 + 9} y2={y} {...stroke} /><rect x={x1 - 11} y={y - 7} width="4" height="14" rx="1" fill={GOLD} /><rect x={x2 + 7} y={y - 7} width="4" height="14" rx="1" fill={GOLD} /></>
  }
}
const wrap = (c: React.ReactNode) => <svg viewBox="0 0 100 100" className="h-full w-full">{c}</svg>
// Moving group: `k` selects the keyframe (exm-<k>) that drives the rep.
const M = ({ k, children }: { k: string; children: React.ReactNode }) => <g className={`exm exm-${k}`}>{children}</g>

// ---- animated poses (static frame + one moving group per rep) -------------

const Squat = (impl: Impl) => wrap(<>
  <Ground />
  {/* legs stay planted; the whole upper body + bar dips and drives up */}
  <path d="M37,90 L33,72 M63,90 L67,72" {...stroke} />
  <M k="dip">
    <path d="M33,72 L50,64 M67,72 L50,64" {...stroke} />
    <line x1="50" y1="64" x2="50" y2="52" {...stroke} /><Head cx={50} cy={45} />
    {impl === 'kettlebell' ? <Kettlebell cx={50} y={58} /> : <Load impl={impl} x1={38} x2={62} y={54} />}
  </M>
</>)

const Deadlift = (impl: Impl) => wrap(<>
  <Ground />
  {/* hips hinge: torso + bar rise off the floor to lockout, then return */}
  <M k="pull">
    <path d="M40,90 L42,72 L50,66 L64,54 M60,90 L58,72 L50,66" {...stroke} />
    <Head cx={68} cy={50} />
    <line x1="64" y1="56" x2="64" y2="80" {...stroke} />
    <Load impl={impl} x1={56} x2={72} y={82} />
  </M>
</>)

const HipThrust = (impl: Impl) => wrap(<>
  <Ground />
  <line x1="18" y1="60" x2="30" y2="60" {...thin} />{/* bench */}
  <Head cx={24} cy={56} />
  <line x1="28" y1="60" x2="56" y2="58" {...stroke} />{/* shoulders→hips */}
  {/* hips + bar drive up and lower */}
  <M k="hip">
    <line x1="56" y1="58" x2="72" y2="80" {...stroke} />
    <line x1="72" y1="80" x2="72" y2="90" {...stroke} />
    <Load impl={impl} x1={48} x2={62} y={54} />
  </M>
</>)

const Bench = (impl: Impl) => wrap(<>
  <line x1="24" y1="66" x2="70" y2="66" {...thin} /><line x1="30" y1="66" x2="30" y2="78" {...thin} /><line x1="64" y1="66" x2="64" y2="78" {...thin} />
  <Head cx={32} cy={58} />
  <line x1="38" y1="61" x2="66" y2="61" {...stroke} />{/* torso on bench */}
  <line x1="66" y1="61" x2="74" y2="54" {...stroke} /><line x1="74" y1="54" x2="76" y2="66" {...stroke} />{/* legs */}
  {/* bar presses from chest to lockout */}
  <M k="press">
    <path d="M50,60 L50,42 M58,60 L58,42" {...stroke} />
    <Load impl={impl} x1={46} x2={62} y={40} />
  </M>
</>)

const Overhead = (impl: Impl) => wrap(<>
  <path d="M40,90 L44,66 L50,54 M60,90 L56,66 L50,54" {...stroke} />
  <line x1="50" y1="54" x2="50" y2="42" {...stroke} /><Head cx={50} cy={35} />
  {/* bar from shoulders to overhead lockout */}
  <M k="press">
    <path d="M45,44 L47,26 M55,44 L53,26" {...stroke} />
    <Load impl={impl} x1={40} x2={60} y={24} />
  </M>
</>)

const Row = (impl: Impl) => wrap(<>
  <Ground />
  <path d="M40,90 L44,66 M60,90 L56,66" {...stroke} />
  <line x1="50" y1="66" x2="72" y2="46" {...stroke} /><Head cx={76} cy={41} />
  {/* bar pulls up to the torso and lowers */}
  <M k="press">
    <path d="M53,60 L57,70" {...stroke} />
    <Load impl={impl} x1={46} x2={62} y={70} />
  </M>
</>)

const Pulldown = (impl: Impl) => wrap(<>
  {impl === 'cable'
    ? <><line x1="50" y1="14" x2="50" y2="22" {...thin} /><line x1="32" y1="22" x2="68" y2="22" {...stroke} /></>
    : <Load impl="barbell" x1={34} x2={66} y={22} />}
  {/* body rises so the chin reaches the bar, then lowers */}
  <M k="chin">
    <path d="M44,24 L46,40 M56,24 L54,40" {...stroke} />
    <Head cx={50} cy={46} />
    <line x1="50" y1="52" x2="50" y2="70" {...stroke} />
    <path d="M50,70 L44,86 M50,70 L56,86" {...stroke} />
  </M>
</>)

const Curl = (impl: Impl) => wrap(<>
  <path d="M40,90 L44,66 L50,54 M60,90 L56,66 L50,54" {...stroke} />
  <line x1="50" y1="54" x2="50" y2="42" {...stroke} /><Head cx={50} cy={35} />
  <line x1="44" y1="48" x2="42" y2="62" {...stroke} /><line x1="56" y1="48" x2="58" y2="62" {...stroke} />
  {/* forearms + load curl up to the contraction */}
  <M k="curl">
    <path d="M42,62 L46,50 M58,62 L54,50" {...stroke} />
    <Load impl={impl === 'barbell' || impl === 'band' ? impl : 'dumbbell'} x1={46} x2={54} y={48} />
  </M>
</>)

const Pushdown = () => wrap(<>
  <line x1="36" y1="16" x2="64" y2="16" {...thin} /><line x1="50" y1="16" x2="50" y2="30" {...thin} />
  <path d="M40,90 L44,66 L50,54 M60,90 L56,66 L50,54" {...stroke} />
  <line x1="50" y1="54" x2="50" y2="42" {...stroke} /><Head cx={50} cy={35} />
  <line x1="44" y1="48" x2="44" y2="62" {...stroke} /><line x1="56" y1="48" x2="56" y2="62" {...stroke} />
  {/* forearms extend down (lockout) and flex back up */}
  <M k="pushdown">
    <line x1="44" y1="62" x2="44" y2="74" {...stroke} /><line x1="56" y1="62" x2="56" y2="74" {...stroke} />
    <line x1="42" y1="74" x2="58" y2="74" {...stroke} />
  </M>
</>)

const Lunge = (impl: Impl) => wrap(<>
  <Ground />
  <path d="M34,90 L40,74 M66,90 L58,78" {...stroke} />{/* feet planted */}
  {/* torso + back knee dip into the lunge and rise */}
  <M k="dip">
    <path d="M40,74 L50,66 M58,78 L50,66" {...stroke} />
    <line x1="50" y1="66" x2="50" y2="54" {...stroke} /><Head cx={50} cy={47} />
    {impl === 'bodyweight'
      ? <path d="M45,56 L41,68 M55,56 L59,68" {...stroke} />
      : <Load impl={impl} x1={38} x2={62} y={impl === 'barbell' ? 56 : 64} />}
  </M>
</>)

const Plank = () => wrap(<>
  <Ground />
  <M k="bob">
    <line x1="22" y1="74" x2="78" y2="62" {...stroke} /><Head cx={82} cy={60} />
    <line x1="32" y1="72" x2="32" y2="88" {...stroke} /><line x1="60" y1="68" x2="64" y2="88" {...stroke} />
  </M>
</>)

const Pushup = () => wrap(<>
  <Ground />
  {/* arms pivot; torso lowers and presses up */}
  <M k="press">
    <line x1="24" y1="72" x2="76" y2="60" {...stroke} /><Head cx={80} cy={58} />
    <line x1="34" y1="68" x2="34" y2="88" {...stroke} /><line x1="64" y1="62" x2="66" y2="88" {...stroke} />
  </M>
</>)

const Crunch = () => wrap(<>
  <Ground />
  <path d="M58,88 L50,74 L40,80" {...stroke} />{/* knees up */}
  {/* torso curls up toward the knees and back */}
  <M k="crunch">
    <line x1="40" y1="80" x2="30" y2="70" {...stroke} /><Head cx={27} cy={66} />
  </M>
</>)

const Rollout = () => wrap(<>
  <Ground />
  <Head cx={26} cy={60} />
  <line x1="30" y1="64" x2="34" y2="82" {...stroke} />{/* torso → knees on floor */}
  {/* arms + wheel roll out and back */}
  <M k="reach">
    <line x1="34" y1="70" x2="54" y2="82" {...stroke} />
    <circle cx="60" cy="84" r="5" {...stroke} /><line x1="60" y1="80" x2="60" y2="88" {...thin} />
  </M>
</>)

// Batir la olla / stir the pot: kneeling, forearms on a big fitball, hips braced.
const StirPot = () => wrap(<>
  <Ground />
  <circle cx="58" cy="66" r="17" {...stroke} />{/* fit-ball */}
  <line x1="40" y1="78" x2="62" y2="76" {...thin} opacity={0.5} />
  <Head cx={22} cy={50} />
  <line x1="26" y1="54" x2="30" y2="72" {...stroke} />{/* torso */}
  <line x1="30" y1="72" x2="44" y2="86" {...stroke} />{/* thigh to knee on floor */}
  {/* forearms circle on top of the ball — the stir */}
  <M k="stir">
    <line x1="28" y1="58" x2="46" y2="52" {...stroke} />
  </M>
</>)

const Generic = (impl: Impl) => wrap(<g>
  <M k="bob"><Load impl={impl === 'bodyweight' ? 'barbell' : impl} x1={34} x2={66} y={52} /></M>
</g>)

type Mv = (impl: Impl) => React.ReactElement
const MOVES: Record<string, Mv> = {
  squat: Squat, deadlift: Deadlift, hipthrust: HipThrust, bench: Bench, overhead: Overhead,
  row: Row, pulldown: Pulldown, curl: Curl, pushdown: Pushdown, lunge: Lunge, plank: Plank,
  crunch: Crunch, rollout: Rollout, pushup: Pushup, stirpot: StirPot, generic: Generic,
}

const NAME_RULES: Array<[RegExp, string]> = [
  [/batir|olla|stir/, 'stirpot'],
  [/rueda|ruedita|rollout|ab ?wheel/, 'rollout'],
  [/abdominal|crunch|bolita|sit ?up|encogimiento|elevacion de piernas|elevaciones de piernas/, 'crunch'],
  [/plancha|\bcore\b|hollow|pallof|isometr|bird ?dog|dead ?bug|colgad|inf\. colgad/, 'plank'],
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
  if (/dominada|pull ?up|chin ?up|flexion|fondo|plancha|abdominal|colgad|pc\b|peso corporal|libre|olla|batir|rueda/.test(s)) return 'bodyweight'
  return 'barbell'
}

// Name kept for compatibility; renders an animated icon.
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
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      <div className="h-40 w-40">{move(impl)}</div>
    </div>
  )
}
