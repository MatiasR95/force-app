import { History } from 'lucide-react'
import { getLastDone, relDay, localDate } from '../lib/store'

// "La vez pasada" — what the member did last time for this exact exercise, shown
// as a subtle chip so they know what to match/beat (progressive overload). Hidden
// when there's nothing recorded or it was already done today.
export function LastTime({ exId }: { exId: string }) {
  const ld = getLastDone(exId)
  if (!ld || ld.date === localDate()) return null
  const parts: string[] = []
  if (ld.kg != null) parts.push(`${ld.kg.toLocaleString('es-AR')} kg${ld.perSide ? '/lado' : ''}`)
  if (ld.reps != null) parts.push(`× ${ld.reps}`)
  if (!parts.length) return null
  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white/70">
      <History size={12} className="text-gold/70" />
      <span>La vez pasada · {relDay(ld.date)}: <b className="text-white/85">{parts.join(' ')}</b></span>
    </div>
  )
}
