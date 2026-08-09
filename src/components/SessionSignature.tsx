// La firma de la sesión.
//
// Every set the member marks drops one bar here, its height set by the kilos that
// set actually moved. A pyramid day, a long accessory day and a heavy triple all
// draw a different shape — by the end the session has a silhouette that belongs to
// it and to nobody else's, and it's the thing worth putting on the share card.
//
// It is also readable at a glance while training: a session that is drifting
// downward is visible in the bars, not just in a total that only goes up.
//
// Mirrored around a centre line (a waveform, not a chart), newest bar lit, and it
// scales down its own bar width as the session grows so 40 sets still fit the
// footer. Pure geometry + CSS — no canvas, no dependency.

const MIN_W = 2
const MAX_W = 5

export function SessionSignature({ peaks, height = 26, className = '', label }: {
  /** one entry per completed set, in order — the kilos that set moved */
  peaks: number[]
  height?: number
  className?: string
  label?: string
}) {
  if (!peaks.length) return null
  const max = Math.max(...peaks)
  // the bar pitch shrinks as the session fills so the signature never overflows
  const w = peaks.length <= 12 ? MAX_W : peaks.length <= 24 ? 3.5 : MIN_W
  const gap = w * 0.7
  const total = peaks.length * (w + gap) - gap
  const h = height
  const mid = h / 2

  return (
    <div className={`relative ${className}`} aria-hidden>
      {label && (
        <div className="text-[0.5rem] uppercase tracking-micro text-white/35 font-bold mb-0.5">{label}</div>
      )}
      <svg viewBox={`0 0 ${total} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet"
        className="overflow-visible">
        <defs>
          <linearGradient id="sig-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--gold-pale-rgb))" />
            <stop offset="50%" stopColor="rgb(var(--gold-rgb))" />
            <stop offset="100%" stopColor="rgb(var(--gold-pale-rgb))" />
          </linearGradient>
        </defs>
        {/* the spine the waveform hangs off — FORCE's gold rule, laid flat */}
        <line x1="0" y1={mid} x2={total} y2={mid} strokeWidth="0.6" className="stroke-white/12" />
        {peaks.map((v, i) => {
          // every set gets a visible bar, even a light one: floor at 18% of the tallest
          const f = max > 0 ? Math.max(0.18, v / max) : 0.18
          const bh = f * (h - 2)
          const live = i === peaks.length - 1
          return (
            <rect key={i} x={i * (w + gap)} y={mid - bh / 2} width={w} height={bh} rx={w / 2}
              fill="url(#sig-bar)" opacity={live ? 1 : 0.55}
              className={live ? 'sig-live' : 'sig-bar'}
              style={{ animationDelay: `${Math.min(i, 20) * 28}ms` }} />
          )
        })}
      </svg>
    </div>
  )
}
