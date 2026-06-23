import { useState } from 'react'
import type { Routine, ExerciseRow } from '../lib/types'
import { DayView } from '../components/DayView'
import { Pill } from '../components/ui'
import { ExerciseSheet } from './ExerciseSheet'
import emblem from '../assets/logo/emblem_gold_t.png'
import { CheckCircle2, Dumbbell, CalendarCheck } from 'lucide-react'
import { hasCheckedInToday, addCheckin, getClientName } from '../lib/store'

const GREET = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Buen día' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}
const TODAY = () =>
  new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

export function Hoy({ routine, suggested, onTrain }: {
  routine: Routine; suggested: number; onTrain: (dayIdx: number) => void
}) {
  const [dayIdx, setDayIdx] = useState(suggested)
  const [picked, setPicked] = useState<ExerciseRow | null>(null)
  const [checked, setChecked] = useState(hasCheckedInToday())
  const day = routine.days[dayIdx]
  const name = getClientName()

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28">
      <header className="flex items-center justify-between mb-5">
        <div>
          <div className="kicker">{GREET()}{name ? `, ${name.split(' ')[0]}` : ''}</div>
          <h1 className="heading text-2xl text-white capitalize">{TODAY()}</h1>
        </div>
        <img src={emblem} alt="FORCE" className="h-10 w-10 object-contain opacity-90" />
      </header>

      {/* check-in */}
      <button
        onClick={() => { setChecked(true); addCheckin() }}
        disabled={checked}
        className={`w-full flex items-center gap-3 rounded-card p-3.5 mb-5 border transition
          ${checked ? 'bg-gold/10 border-gold/30' : 'bg-white/5 border-white/10 active:scale-[0.99]'}`}
      >
        {checked
          ? <CheckCircle2 className="text-gold shrink-0" size={22} />
          : <CalendarCheck className="text-white/70 shrink-0" size={22} />}
        <div className="text-left flex-1">
          <div className="font-bold text-white text-sm">
            {checked ? '¡Entrenamiento registrado!' : 'Registrar que viniste hoy'}
          </div>
          <div className="text-xs text-white/50">
            {checked ? 'Suma a tu asistencia del mes' : 'Un toque para marcar tu asistencia'}
          </div>
        </div>
      </button>

      {/* day selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-1 px-1">
        {routine.days.map((d, i) => (
          <Pill key={d.id} active={i === dayIdx} onClick={() => setDayIdx(i)}>
            {d.label.replace('DÍA', 'Día')}
          </Pill>
        ))}
      </div>

      <DayView day={day} onPick={setPicked} />

      {/* start training */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] px-4 pointer-events-none">
        <button
          onClick={() => onTrain(dayIdx)}
          className="pointer-events-auto w-full flex items-center justify-center gap-2 rounded-full
            bg-gold-fill text-ink font-black uppercase tracking-wide py-4 shadow-lg shadow-black/40 active:scale-[0.98]"
        >
          <Dumbbell size={18} /> Entrenar {day.label.replace('DÍA', 'Día')}
        </button>
      </div>

      <ExerciseSheet ex={picked} onClose={() => setPicked(null)} />
    </div>
  )
}
