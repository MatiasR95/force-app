import { useState } from 'react'
import type { Routine, ExerciseRow } from '../lib/types'
import { DayView } from '../components/DayView'
import { Pill } from '../components/ui'
import { WeekBar } from '../components/WeekBar'
import { ExerciseSheet } from './ExerciseSheet'
import emblem from '../assets/logo/emblem_gold_t.png'
import { CheckCircle2, Dumbbell, CalendarCheck } from 'lucide-react'
import { hasCheckedInToday, addCheckin, getClientName } from '../lib/store'

const TODAY = () =>
  new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

export function Hoy({ routine, week, setWeek, suggestedDay, onTrain }: {
  routine: Routine
  week: number
  setWeek: (w: number) => void
  suggestedDay: number
  onTrain: (dayIdx: number, week: number) => void
}) {
  const [dayIdx, setDayIdx] = useState(suggestedDay)
  const [picked, setPicked] = useState<ExerciseRow | null>(null)
  const [checked, setChecked] = useState(hasCheckedInToday())
  const day = routine.days[dayIdx]
  const name = getClientName()
  const dayWeeks = day.weeks.length > 1 ? day.weeks : routine.weeksAvailable
  const effWeek = dayWeeks.includes(week) ? week : 1

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28">
      <header className="flex items-start justify-between mb-4">
        <div>
          <div className="kicker">{name ? `Hola, ${name.split(' ')[0]}` : 'Tu rutina'}</div>
          <h1 className="heading text-3xl text-white mt-1">
            {day.label.replace('DÍA', 'Día')}
            <span className="text-white/30"> · </span>
            <span className="text-gold">Sem {week}</span>
          </h1>
          <div className="text-white/40 text-xs mt-1 capitalize">{TODAY()}</div>
        </div>
        <img src={emblem} alt="FORCE" className="h-10 w-10 object-contain opacity-90 mt-1" />
      </header>

      <div className="mb-4"><WeekBar week={week} totalWeeks={routine.totalWeeks} onChange={setWeek} /></div>

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

      <DayView day={day} week={effWeek} onPick={setPicked} />

      {/* start training */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] px-4 pointer-events-none max-w-md mx-auto">
        <button
          onClick={() => onTrain(dayIdx, effWeek)}
          className="pointer-events-auto w-full flex items-center justify-center gap-2 rounded-full
            bg-gold-fill text-ink font-black uppercase tracking-wide py-4 shadow-lg shadow-black/40 active:scale-[0.98]"
        >
          <Dumbbell size={18} /> Entrenar {day.label.replace('DÍA', 'Día')}
        </button>
      </div>

      <ExerciseSheet ex={picked} week={effWeek} onClose={() => setPicked(null)} />
    </div>
  )
}
