import type { ExerciseRow } from '../lib/types'
import { BottomSheet } from '../components/ui'
import { TechniqueChips, setsReps, loadText } from '../components/TechniqueChips'
import { PlateCalc } from '../components/PlateCalc'
import { LastTime } from '../components/LastTime'
import { isDeadliftName } from '../lib/plates'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { PATTERN_LABEL } from '../lib/media'
import { resolveWeek } from '../lib/week'

export function ExerciseSheet({ ex, week = 1, onClose }: {
  ex: ExerciseRow | null; week?: number; onClose: () => void
}) {
  const load = ex ? resolveWeek(ex, week).load : null
  return (
    <BottomSheet open={!!ex} onClose={onClose}>
      {ex && (
        <div className="px-5 pb-8">
          <div className="relative -mx-5 mb-4 h-52 overflow-hidden">
            <ExerciseMedia slug={ex.slug} pattern={ex.pattern} name={ex.name} />
            <div className="absolute inset-0" style={{ background: 'var(--grad-photo)' }} />
            <div className="absolute bottom-3 left-5 right-5">
              <div className="kicker">{PATTERN_LABEL[ex.pattern]}</div>
              <h2 className="heading text-2xl text-white mt-1">{ex.name}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Mini label="Series × reps" value={setsReps(ex, week)} />
            <Mini label="Carga" value={loadText(ex, week)} />
          </div>

          <div><LastTime exId={ex.id} /></div>

          <TechniqueChips ex={ex} />

          <LoadProgression ex={ex} />

          {load && load.value != null && load.perSide && (
            <div className="mt-4"><PlateCalc perSideKg={load.value} deadlift={isDeadliftName(ex.name)} /></div>
          )}

          {ex.notes && (
            <div className="mt-4 rounded-card bg-white/5 border border-white/10 p-3">
              <div className="kicker mb-1">Nota del coach</div>
              <p className="text-white/80 text-sm">{ex.notes}</p>
            </div>
          )}

          <p className="mt-4 text-center text-[0.68rem] text-white/35">
            Animación de referencia. Ante cualquier duda con la técnica, consultá a tu coach.
          </p>
        </div>
      )}
    </BottomSheet>
  )
}

// Per-week load progression for this exercise — a small gold sparkline so the
// member sees the planned climb across the cycle ("te vas haciendo más fuerte").
// Only shown for weekly plans where the load actually changes.
function LoadProgression({ ex }: { ex: ExerciseRow }) {
  const maxWeek = Math.max(1, ...Object.keys(ex.weeks).map(Number))
  if (maxWeek < 2) return null
  const pts: Array<{ w: number; v: number }> = []
  let perSide = false
  for (let w = 1; w <= maxWeek; w++) {
    const r = resolveWeek(ex, w)
    if (r.load.value != null) { pts.push({ w, v: r.load.value }); perSide = perSide || r.load.perSide }
  }
  if (pts.length < 2 || new Set(pts.map((p) => p.v)).size < 2) return null

  const W = 300, H = 92, padX = 14, padTop = 18, padBot = 16
  const lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v))
  const span = hi - lo || 1
  const xy = pts.map((p, i) => {
    const x = padX + (i / (pts.length - 1)) * (W - padX * 2)
    const y = padTop + (1 - (p.v - lo) / span) * (H - padTop - padBot)
    return { ...p, x, y }
  })
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${xy[xy.length - 1].x.toFixed(1)},${H - padBot} L${xy[0].x.toFixed(1)},${H - padBot} Z`

  return (
    <div className="mt-4 rounded-card bg-black/30 border border-white/10 p-3">
      <div className="flex items-baseline justify-between mb-1">
        <div className="kicker">Progresión de carga</div>
        <div className="text-white/40 text-[0.6rem] font-bold">por semana{perSide ? ' · por lado' : ''}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 92 }}>
        <defs>
          <linearGradient id="lp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6AE78" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C6AE78" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lp-fill)" />
        <path d={line} fill="none" stroke="#C6AE78" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {xy.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#C6AE78" />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="rgba(255,255,255,.75)">{p.v.toLocaleString('es-AR')}</text>
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.4)">S{p.w}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-white/5 border border-white/10 p-3">
      <div className="text-[0.6rem] uppercase tracking-micro text-white/45 font-bold">{label}</div>
      <div className="text-gold text-lg font-black mt-0.5">{value}</div>
    </div>
  )
}
