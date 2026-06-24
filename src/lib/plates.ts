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
// FORCE disc inventory: 25kg plates are only used for deadlifts. Everything else
// loads off a 20/15 base, then 10/5/2.5/1.25, plus micro plates (2/1.5/1/0.5)
// available per side for fine jumps.
export const DEFAULT_PLATES_KG = [20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5]
export const DEADLIFT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5]

export const isDeadliftName = (name: string): boolean =>
  /peso\s*muerto|deadlift|\brdl\b|hex|sumo/i.test(
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

// Group identical plates → [{kg, count}] for compact display ("25×2  10×1").
export function groupPlates(plates: number[]): Array<{ kg: number; count: number }> {
  const map = new Map<number, number>()
  for (const p of plates) map.set(p, (map.get(p) ?? 0) + 1)
  return [...map.entries()].map(([kg, count]) => ({ kg, count })).sort((a, b) => b.kg - a.kg)
}
