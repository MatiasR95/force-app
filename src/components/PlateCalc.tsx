import { planPlatesProgressive, groupPlates, inventoryFor, DEFAULT_BAR_KG } from '../lib/plates'

// Plate sizes → a color, loosely matching IPF/competition plates so the visual
// reads fast on the gym floor. Micro plates (≤2kg) render small and gold.
const PLATE_COLOR: Record<number, string> = {
  25: '#C0392B', 20: '#2C6FB5', 15: '#E0A92B', 10: '#3B7A3B',
  5: '#E8E6E2', 2.5: '#1A1916', 2: '#C6AE78', 1.5: '#C6AE78', 1.25: '#8A6A38', 1: '#8A6A38', 0.5: '#EADEB4',
}

// `priorLoads` = this lift's earlier per-side loads today (aproximación sets),
// so the plan only ADDS plates set to set; `dayMaxKg` = the heaviest load the
// lift reaches today, which decides whether 20s are on the menu (deadlift >50).
export function PlateCalc({ perSideKg, barKg = DEFAULT_BAR_KG, deadlift = false, priorLoads = [], dayMaxKg }: {
  perSideKg: number; barKg?: number; deadlift?: boolean; priorLoads?: number[]; dayMaxKg?: number
}) {
  const inventory = inventoryFor(deadlift, Math.max(dayMaxKg ?? 0, perSideKg))
  const plan = planPlatesProgressive(perSideKg, priorLoads, barKg, inventory)
  const groups = groupPlates(plan.plates)

  return (
    <div className="rounded-card bg-black/30 border border-white/10 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="kicker">Cómo cargar la barra</span>
        <span className="text-white/50 text-xs font-bold">
          Total {plan.totalKg.toLocaleString('es-AR')} kg · barra {barKg}
        </span>
      </div>

      {/* visual: side view of the loaded bar — shaft, collars, and the plates
          sliding onto each sleeve (staggered, like loading them for real) */}
      <div className="relative flex items-center justify-center py-3">
        <div className="absolute inset-x-1 h-[7px] rounded-full bg-gradient-to-b from-white/40 via-white/22 to-white/8" />
        <div className="relative flex items-center gap-[3px]">
          {[...plan.plates].reverse().map((p, i) => (
            <Plate key={`l${i}`} kg={p} delay={(plan.plates.length - 1 - i) * 80} side="l" />
          ))}
          <div className="h-4 w-1.5 rounded-[2px] bg-white/55 shrink-0" title="tope" />
          <div className="h-[7px] w-14 rounded-full bg-gradient-to-b from-white/55 via-white/32 to-white/14 mx-0.5 shrink-0" title="barra" />
          <div className="h-4 w-1.5 rounded-[2px] bg-white/55 shrink-0" title="tope" />
          {plan.plates.map((p, i) => (
            <Plate key={`r${i}`} kg={p} delay={i * 80} side="r" />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {groups.length === 0 && <span className="text-white/50 text-sm">Solo la barra</span>}
        {groups.map((g) => (
          <span key={g.kg} className="text-sm font-bold text-white/80">
            {g.kg.toLocaleString('es-AR')}<span className="text-white/40">×{g.count}</span>
          </span>
        ))}
        <span className="text-gold text-sm font-bold">· {perSideKg.toLocaleString('es-AR')} kg/lado</span>
      </div>

      {!plan.achievable && (
        <p className="mt-2 text-center text-[0.7rem] text-white/45">
          Faltan {plan.remainder} kg para el valor exacto con los discos del gimnasio.
        </p>
      )}
    </div>
  )
}

function Plate({ kg, delay = 0, side = 'r' }: { kg: number; delay?: number; side?: 'l' | 'r' }) {
  const color = PLATE_COLOR[kg] ?? '#8A6A38'
  // larger plates render taller
  const h = 26 + Math.min(kg, 25) * 1.4
  const light = kg === 5
  return (
    <div
      className={`w-2.5 rounded-[3px] shrink-0 ${side === 'l' ? 'plate-in-l' : 'plate-in-r'}`}
      style={{
        height: h,
        background: `linear-gradient(90deg, ${color}, ${color} 55%, rgba(0,0,0,0.28))`,
        border: light ? '1px solid #999' : 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
        animationDelay: `${delay}ms`,
      }}
      title={`${kg} kg`}
    />
  )
}
