import type { Routine } from '../../lib/types'
import { getSessions, getCheckins, localDate } from '../../lib/store'
import { weekStartOf, currentStreakWeeks } from '../../lib/metrics'
import { useUiPrefs } from '../../lib/UiPrefsContext'
import { Check, Flame, LayoutGrid } from 'lucide-react'

// One question: "¿cómo vengo esta semana?" — sessions as big dots, one sentence.
// Deliberately absent: Panel charts, the heatmap, medals, category tables, rival
// watch. And the way back to the full app, plainly labelled: a member who turned
// this on by accident must be able to leave without asking anyone.

export function SimpleProgreso({ routine, onExit }: { routine: Routine; onExit: () => void }) {
  const { prefs } = useUiPrefs()
  const icon = Math.round(20 * prefs.fontScale)
  const weekKey = weekStartOf(localDate())
  const doneThisWeek = getSessions().filter((s) => weekStartOf(s.date) === weekKey).length
  const target = Math.max(1, routine.days.length)
  const streak = currentStreakWeeks(getCheckins())
  const left = Math.max(0, target - doneThisWeek)

  const sentence =
    doneThisWeek === 0 ? 'Todavía no entrenaste esta semana. Un día alcanza para arrancar.'
      : left === 0 ? '¡Semana completa! Descansá tranquilo, te lo ganaste.'
        : left === 1 ? 'Te queda un solo día para completar la semana. Vamos.'
          : `Vas ${doneThisWeek} de ${target}. Seguí así.`

  return (
    <div className="px-4 pt-4 pb-8">
      <h2 className="heading text-2xl text-white">Esta semana</h2>

      <div className="card rounded-card p-5 mt-3">
        <div className="flex flex-wrap gap-2.5 justify-center">
          {Array.from({ length: target }, (_, i) => {
            const done = i < doneThisWeek
            return (
              <span key={i}
                className={`grid place-items-center rounded-full border-2 font-black
                  ${done ? 'bg-gold-fill text-ink border-gold' : 'border-white/25 text-white/35'}`}
                style={{ height: icon * 2.6, width: icon * 2.6 }}>
                {done ? <Check size={icon} /> : i + 1}
              </span>
            )
          })}
        </div>
        <p className="text-white text-lg font-bold text-center mt-4 leading-snug">{sentence}</p>
      </div>

      {streak > 0 && (
        <div className="card rounded-card p-4 mt-3 flex items-center gap-3">
          <Flame size={Math.round(26 * prefs.fontScale)} className="text-gold shrink-0" />
          <p className="text-white text-base font-bold">
            {streak} {streak === 1 ? 'semana seguida' : 'semanas seguidas'} entrenando.
          </p>
        </div>
      )}

      {/* the way out — plain words, full width, never hidden behind a gesture */}
      <button onClick={onExit}
        className="mt-8 w-full rounded-card border border-white/15 bg-white/5 px-4 py-4 flex items-center gap-3 text-left active:scale-[0.99]">
        <LayoutGrid size={icon} className="text-gold shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-white font-black uppercase tracking-wide">Modo normal</span>
          <span className="block text-white/60 text-sm">Volvé a la app completa cuando quieras.</span>
        </span>
      </button>
    </div>
  )
}
