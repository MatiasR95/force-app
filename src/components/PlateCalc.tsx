import { planPlates, groupPlates, DEFAULT_BAR_KG, DEFAULT_PLATES_KG, DEADLIFT_PLATES_KG } from '../lib/plates'

// Plate sizes → a color, loosely matching IPF/competition plates so the visual
// reads fast on the gym floor. Micro plates (≤2kg) render small and gold.
const PLATE_COLOR: Record<number, string> = {
  25: '#C0392B', 20: '#2C6FB5', 15: '#E0A92B', 10: '#3B7A3B',
  5: '#E8E6E2', 2.5: '#1A1916', 2: '#C6AE78', 1.5: '#C6AE78', 1.25: '#8A6A38', 1: '#8A6A38', 0.5: '#EADEB4',
}

export function PlateCalc({ perSideKg, barKg = DEFAULT_BAR_KG, deadlift = false }: {
  perSideKg: number; barKg?: number; deadlift?: boolean
}) {
  const plan = planPlates(perSideKg, barKg, deadlift ? DEADLIFT_PLATES_KG : DEFAULT_PLATES_KG)
  const groups = groupPlates(plan.plates)

  return (
    <div className="rounded-card bg-black/30 border border-white/10 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="kicker">Cómo cargar la barra</span>
        <span className="text-white/50 text-xs font-bold">
          Total {plan.totalKg.toLocaleString('es-AR')} kg · barra {barKg}
        </span>
      </div>

      {/* visual: bar with plates per side */}
      <div className="flex items-center justify-center gap-[3px] py-2">
        {[...plan.plates].reverse().map((p, i) => (
          <Plate key={`l${i}`} kg={p} />
        ))}
        <div className="h-1.5 w-10 bg-white/30 rounded-full mx-0.5" title="barra" />
        {plan.plates.map((p, i) => (
          <Plate key={`r${i}`} kg={p} />
        ))}
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

function Plate({ kg }: { kg: number }) {
  const color = PLATE_COLOR[kg] ?? '#8A6A38'
  // larger plates render taller
  const h = 26 + Math.min(kg, 25) * 1.4
  const light = kg === 5
  return (
    <div
      className="w-2.5 rounded-[2px] flex items-center justify-center shrink-0"
      style={{ height: h, background: color, border: light ? '1px solid #999' : 'none' }}
      title={`${kg} kg`}
    />
  )
}
