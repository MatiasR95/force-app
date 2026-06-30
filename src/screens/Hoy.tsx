import { useState } from 'react'
import type { Routine, ExerciseRow } from '../lib/types'
import { DayView } from '../components/DayView'
import { Pill } from '../components/ui'
import { WeekBar } from '../components/WeekBar'
import { ExerciseSheet } from './ExerciseSheet'
import emblem from '../assets/logo/emblem_gold_t.png'
import { Dumbbell, History, Quote, TriangleAlert } from 'lucide-react'
import { getClientName, lastSession, localDate } from '../lib/store'
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

export function Hoy({ routine, week, currentWk, setWeek, suggestedDay, onTrain }: {
  routine: Routine
  week: number
  currentWk: number
  setWeek: (w: number) => void
  suggestedDay: number
  onTrain: (dayIdx: number, week: number) => void
}) {
  const [dayIdx, setDayIdx] = useState(suggestedDay)
  const [picked, setPicked] = useState<ExerciseRow | null>(null)
  const [quote] = useState(() => nextQuote())
  const day = routine.days[dayIdx] ?? routine.days[0]
  const name = getClientName()
  const weekly = routine.style === 'weekly'
  const dayWeeks = day.weeks.length > 1 ? day.weeks : routine.weeksAvailable
  // clamp to the day's last DEFINED week (never snap back to week 1): if the member
  // is on a week this day doesn't list, repeat-previous shows the last real week.
  const effWeek = Math.min(Math.max(1, week), Math.max(1, ...dayWeeks))
  const isLastWeek = weekly && routine.totalWeeks > 1 && week >= routine.totalWeeks
  // "Hoy te toca" only when this really is today's session: the suggested day AND
  // (for weekly plans) the member's current week. Browsing other weeks → "Estás viendo".
  const onCurrentWeek = !weekly || week === currentWk
  const isToday = dayIdx === suggestedDay && onCurrentWeek
  const bigNames = day.blocks.find((b) => b.tag === 'big')?.exercises.map((e) => e.name).join(' + ')
  const focus = bigNames || day.blocks.flatMap((b) => b.exercises)[0]?.name || 'Entrenamiento'

  // last-session recap (day · week · Big One · when)
  const ls = lastSession()
  const lastDay = ls ? routine.days.find((d) => d.id === ls.dayId) : null
  const lastBig = ls?.bigOne || lastDay?.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name
  const lastWhen = relativeDay(ls?.date)

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
      <header className="flex items-center justify-between mb-3">
        <div>
          <div className="kicker">{name ? `Hola, ${name.split(' ')[0]}` : 'Bienvenido'}</div>
          <div className="text-white/40 text-xs mt-0.5 capitalize">{TODAY()}</div>
        </div>
        <img src={emblem} alt="FORCE" className="h-10 w-10 object-contain opacity-90" />
      </header>

      {/* welcome hero: WHAT to do today, unmistakably */}
      <div className="hero-card rounded-card p-4 mb-3">
        <div className="kicker">{isToday ? '🔥 Hoy te toca' : 'Estás viendo'}</div>
        <h1 className="heading text-3xl text-white mt-1 glow-text">
          {day.label.replace('DÍA', 'Día')}
          {weekly && <><span className="text-white/30"> · </span><span className="text-gold">Sem {week}</span></>}
        </h1>
        <div className="text-gold/90 font-bold text-sm mt-1">{focus}</div>
        <div className="flex gap-2.5 mt-3 pt-3 border-t border-white/10">
          <Quote size={15} className="text-gold/60 shrink-0 mt-0.5" />
          <p className="text-white/80 text-sm leading-relaxed">{quote}</p>
        </div>
      </div>

      {/* last session recap */}
      <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
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

      {weekly && <div className="mb-4"><WeekBar week={week} totalWeeks={routine.totalWeeks} onChange={setWeek} /></div>}

      {/* day selector — the suggested (next undone) day is tagged HOY */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-1 px-1 pt-2">
        {routine.days.map((d, i) => (
          <div key={d.id} className="relative shrink-0">
            {i === suggestedDay && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[0.5rem] font-black uppercase tracking-wide text-ink bg-gold px-1.5 py-0.5 rounded-full">Hoy</span>
            )}
            <Pill active={i === dayIdx} onClick={() => setDayIdx(i)}>
              {d.label.replace('DÍA', 'Día')}
            </Pill>
          </div>
        ))}
      </div>

      {/* start training — inline so nothing covers the day content */}
      <button
        onClick={() => onTrain(dayIdx, effWeek)}
        className="btn-glow w-full flex items-center justify-center gap-2 rounded-full
          bg-gold-fill text-ink font-black uppercase tracking-wide py-4 mb-5 active:scale-[0.98]"
      >
        <Dumbbell size={18} /> Entrenar {day.label.replace('DÍA', 'Día')}
      </button>

      <DayView day={day} week={effWeek} onPick={setPicked} />

      <ExerciseSheet ex={picked} week={effWeek} onClose={() => setPicked(null)} />
    </div>
  )
}
