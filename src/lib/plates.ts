// Plate calculator — turns the coach's "X kg x lado" notation into the exact
// plates to load on each side. Default inventory matches a typical Argentine
// strength gym (kg plates); both bar and inventory are configurable per gym.

export interface PlatePlan {
  perSide: number          // kg of plates per side requested
  barKg: number
  totalKg: number          // bar + both sides
  plates: number[]         // plates for ONE side, largest first
  remainder: number        // kg that couldn't be matched (plate gap)
  achievable: boolean
}

export const DEFAULT_BAR_KG = 20
// FORCE disc inventory (Jul 2026, per Matías): the gym has full 20 · 15 · 10 · 5 kg
// discs plus change plates (2,5 · 2 · 1,5 · 1,25 · 1 · 0,5) for fine jumps. 25s aren't
// stocked. Greedy loading favours the fewest discs, so 30/lado = 20+10, not 3×10.
export const DEFAULT_PLATES_KG = [20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5]
export const DEADLIFT_PLATES_KG = DEFAULT_PLATES_KG

/** The disc set for a lift, given the heaviest per-side load it reaches today. */
export function inventoryFor(_deadlift: boolean, _workingMaxKg: number): number[] {
  return DEFAULT_PLATES_KG
}

export const isDeadliftName = (name: string): boolean =>
  /peso\s*muerto|deadlift|\brdl\b|hex|sumo/i.test(
    name.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  )

// Exercises whose added weight hangs from a single belt/grip — weighted pull-ups,
// chin-ups, muscle-ups and dips. These are NEVER loaded "per side" (you add one
// stack of plates to a belt), so any "x lado" on them is a typo or a mid-cycle
// substitution and must not show an impossible per-side load or a plate calc.
export const isHangingLoad = (name: string): boolean =>
  /dominad|pull\s*up|chin\s*up|muscle\s*up|fondos|\bdips?\b/i.test(
    name.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  )

/**
 * Greedy plate decomposition for one side.
 * `perSideKg` is the per-side load as written in OBSERVACIONES ("27,5 x lado").
 */
export function planPlates(
  perSideKg: number,
  barKg = DEFAULT_BAR_KG,
  inventory = DEFAULT_PLATES_KG,
): PlatePlan {
  const sorted = [...inventory].sort((a, b) => b - a)
  let left = Math.max(0, perSideKg)
  const plates: number[] = []
  // small epsilon for float math (1.25 increments)
  const EPS = 1e-6
  for (const p of sorted) {
    while (left + EPS >= p) {
      plates.push(p)
      left = Math.round((left - p) * 1000) / 1000
    }
  }
  return {
    perSide: perSideKg,
    barKg,
    totalKg: barKg + perSideKg * 2,
    plates,
    remainder: Math.round(left * 1000) / 1000,
    achievable: left < EPS,
  }
}

/**
 * Ramp-aware plate plan: what's already on the bar STAYS on the bar — each jump
 * of the same lift (1° aproximación → 2° → working sets) only ADDS plates, so
 * the member never sees "swap your two 10s for a 20" halfway through. A load
 * BELOW an earlier set (a back-off) is the one case where re-racking is real,
 * so it plans fresh.
 */
export function planPlatesProgressive(
  perSideKg: number,
  priorLoads: number[],
  barKg = DEFAULT_BAR_KG,
  inventory = DEFAULT_PLATES_KG,
): PlatePlan {
  const EPS = 1e-6
  if (priorLoads.some((p) => p > perSideKg + EPS)) return planPlates(perSideKg, barKg, inventory)
  const plates: number[] = []
  let loaded = 0
  for (const target of [...priorLoads, perSideKg]) {
    if (target <= loaded + EPS) continue // same load as the previous set: bar untouched
    const step = planPlates(Math.round((target - loaded) * 1000) / 1000, 0, inventory)
    plates.push(...step.plates)
    loaded = Math.round((target - step.remainder) * 1000) / 1000
  }
  plates.sort((a, b) => b - a)
  const remainder = Math.round((perSideKg - loaded) * 1000) / 1000
  return {
    perSide: perSideKg,
    barKg,
    totalKg: barKg + perSideKg * 2,
    plates,
    remainder,
    achievable: remainder < EPS,
  }
}

// Group identical plates → [{kg, count}] for compact display ("25×2  10×1").
export function groupPlates(plates: number[]): Array<{ kg: number; count: number }> {
  const map = new Map<number, number>()
  for (const p of plates) map.set(p, (map.get(p) ?? 0) + 1)
  return [...map.entries()].map(([kg, count]) => ({ kg, count })).sort((a, b) => b.kg - a.kg)
}
