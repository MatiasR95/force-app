import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Week stepper: "SEMANA 3 / 8" with prev/next, clamped to available weeks. */
export function WeekBar({ week, totalWeeks, onChange }: {
  week: number; totalWeeks: number; onChange: (w: number) => void
}) {
  const min = 1
  const max = Math.max(totalWeeks, 1)
  return (
    <div className="flex items-center justify-between rounded-card bg-white/5 border border-white/10 px-2 py-2">
      <button onClick={() => onChange(Math.max(min, week - 1))} disabled={week <= min}
        className="p-2 text-white/70 disabled:opacity-25"><ChevronLeft size={18} /></button>
      <div className="text-center">
        <div className="text-[0.55rem] uppercase tracking-micro text-white/45 font-bold">Semana</div>
        <div className="text-gold font-black text-lg leading-none tabular-nums">
          {week}<span className="text-white/35 text-sm font-bold"> / {totalWeeks}</span>
        </div>
      </div>
      <button onClick={() => onChange(Math.min(max, week + 1))} disabled={week >= max}
        className="p-2 text-white/70 disabled:opacity-25"><ChevronRight size={18} /></button>
    </div>
  )
}
