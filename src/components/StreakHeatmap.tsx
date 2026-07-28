import { useMemo } from 'react'
import { localDate } from '../lib/store'

// A compact training heatmap: one column per week (most recent on the right), one
// cell per day, shaded by how many times the member trained that day using the
// gold ramp (not green — brand discipline). A shape you can scan, not just a number.

// 0..4+ trainings. Theme-aware: on paper the "nothing here" cell has to be the
// LIGHTEST of the ramp, not the darkest, or the shape reads inverted.
const RAMP = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']
const WEEKS = 12
const DAY_MS = 86_400_000

// Monday-start weekday index (0 = Mon … 6 = Sun) for a YYYY-MM-DD date.
function dow(date: string): number {
  const d = new Date(date + 'T00:00:00').getDay() // 0 = Sun
  return (d + 6) % 7
}

export function StreakHeatmap({ dates }: { dates: string[] }) {
  const grid = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1)

    const today = new Date(localDate() + 'T00:00:00').getTime()
    // anchor the last column to the Monday of the current week
    const thisMonday = today - dow(localDate()) * DAY_MS
    const cols: Array<Array<{ date: string; count: number; future: boolean }>> = []
    for (let w = WEEKS - 1; w >= 0; w--) {
      const monday = thisMonday - w * 7 * DAY_MS
      const col: Array<{ date: string; count: number; future: boolean }> = []
      for (let day = 0; day < 7; day++) {
        const t = monday + day * DAY_MS
        const iso = new Date(t).toISOString().slice(0, 10)
        col.push({ date: iso, count: counts.get(iso) ?? 0, future: t > today })
      }
      cols.push(col)
    }
    return cols
  }, [dates])

  return (
    <div>
      <div className="flex gap-[3px]">
        {grid.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-1">
            {col.map((cell) => {
              const lvl = Math.min(cell.count, 4)
              return (
                <div key={cell.date}
                  title={cell.count ? `${cell.date}: ${cell.count} ${cell.count === 1 ? 'entreno' : 'entrenos'}` : cell.date}
                  className="aspect-square rounded-[3px]"
                  style={{ background: cell.future ? 'transparent' : RAMP[lvl], border: cell.future ? '1px dashed rgb(var(--fg-rgb) / 0.12)' : 'none' }} />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[0.55rem] text-white/30 font-bold">
        <span>hace {WEEKS} semanas</span>
        <span>hoy</span>
      </div>
    </div>
  )
}
