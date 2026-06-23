import { useState, useEffect } from 'react'
import type { Routine, ExerciseRow } from '../lib/types'
import { DayView } from '../components/DayView'
import { Pill } from '../components/ui'
import { WeekBar } from '../components/WeekBar'
import { ExerciseSheet } from './ExerciseSheet'
import emblem from '../assets/logo/emblem_gold_t.png'
import { CheckCircle2, Dumbbell, CalendarCheck, History, Quote, TriangleAlert } from 'lucide-react'
import { hasCheckedInToday, addCheckin, getClientName, lastSession, localDate } from '../lib/store'
import { getWeather, type Weather } from '../lib/weather'
import { nextQuote } from '../lib/quotes'

const TODAY = () =>
  new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

function relativeDay(date: string | null | undefined): string | null {
  if (!date) return null
  const a = new Date(date + 'T00:00:00').getTime()
  const b = new Date(localDate() + 'T00:00:00').getTime()
  const days = Math.round((b - a) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  if (days < 14) return 'hace 1 semana'
  return `hace ${Math.floor(days / 7)} semanas`
}

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
  const [weather, setWeather] = useState<Weather | null>(null)
  const [quote] = useState(() => nextQuote())
  const day = routine.days[dayIdx]
  const name = getClientName()
  const dayWeeks = day.weeks.length > 1 ? day.weeks : routine.weeksAvailable
  const effWeek = dayWeeks.includes(week) ? week : 1
  const isLastWeek = routine.totalWeeks > 1 && week >= routine.totalWeeks

  // last-session recap (day · week · Big One · when)
  const ls = lastSession()
  const lastDay = ls ? routine.days.find((d) => d.id === ls.dayId) : null
  const lastBig = ls?.bigOne || lastDay?.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name
  const lastWhen = relativeDay(ls?.date)

  useEffect(() => { getWeather().then(setWeather) }, [])

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28">
      <header className="flex items-start justify-between mb-3">
        <div>
          <div className="kicker">{name ? `Hola, ${name.split(' ')[0]}` : 'Bienvenido'}</div>
          <h1 className="heading text-3xl text-white mt-1 glow-text">
            {day.label.replace('DÍA', 'Día')}
            <span className="text-white/30"> · </span>
            <span className="text-gold">Sem {week}</span>
          </h1>
          <div className="text-white/40 text-xs mt-1 capitalize">{TODAY()}</div>
        </div>
        <img src={emblem} alt="FORCE" className="h-10 w-10 object-contain opacity-90 mt-1" />
      </header>

      {/* welcome hero: motivational quote */}
      <div className="hero-card rounded-card p-4 mb-3">
        <div className="flex gap-2.5">
          <Quote size={16} className="text-gold/70 shrink-0 mt-0.5" />
          <p className="text-white/85 text-sm leading-relaxed font-medium">{quote}</p>
        </div>
      </div>

      {/* weather + last session recap */}
      <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
        {weather && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-white/75">
            <span>{weather.emoji}</span>
            <span className="font-bold text-white">{weather.tempC}°</span>
            <span className="text-white/45">La Plata</span>
          </span>
        )}
        {lastWhen && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-white/60">
            <History size={12} className="text-gold/70" />
            Últ.: {ls?.dayLabel?.replace('DÍA', 'Día') ?? lastDay?.label.replace('DÍA', 'Día') ?? '—'}
            {ls?.week ? ` · Sem ${ls.week}` : ''}{lastBig ? ` · ${lastBig}` : ''} ({lastWhen})
          </span>
        )}
      </div>

      {isLastWeek && (
        <div className="rounded-card border border-gold/30 bg-gold/[0.08] p-3 mb-3 flex gap-2.5">
          <TriangleAlert size={16} className="text-gold shrink-0 mt-0.5" />
          <p className="text-white/85 text-sm leading-snug">
            <b>Última semana de tu planificación.</b> Avisale a tu coach para que prepare el próximo ciclo. 💪
          </p>
        </div>
      )}

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
          className="btn-glow pointer-events-auto w-full flex items-center justify-center gap-2 rounded-full
            bg-gold-fill text-ink font-black uppercase tracking-wide py-4 active:scale-[0.98]"
        >
          <Dumbbell size={18} /> Entrenar {day.label.replace('DÍA', 'Día')}
        </button>
      </div>

      <ExerciseSheet ex={picked} week={effWeek} onClose={() => setPicked(null)} />
    </div>
  )
}
