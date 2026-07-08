import { useState } from 'react'
import type { Routine, ExerciseRow } from '../lib/types'
import { DayView } from '../components/DayView'
import { BottomSheet } from '../components/ui'
import { ExerciseSheet } from './ExerciseSheet'
import emblem from '../assets/logo/emblem_gold_t.png'
import { Dumbbell, History, Quote, TriangleAlert, Repeat, CheckCircle2, Circle } from 'lucide-react'
import { getClientName, lastSession, localDate, getSessions, getSession } from '../lib/store'
import { weekStartOf } from '../lib/metrics'
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

// HOY = only today. No week stepper, no day-pill carousel — that navigation
// lives in Plan. One session, unmistakable, with a single escape hatch ("cambiar
// el día") for the member who swaps their training day.
export function Hoy({ routine, currentWk, suggestedDay, onPickWeek, onTrain }: {
  routine: Routine
  currentWk: number
  suggestedDay: number
  onPickWeek: (week: number) => void
  onTrain: (dayIdx: number, week: number) => void
}) {
  const [dayIdx, setDayIdx] = useState(suggestedDay)
  const [wk, setWk] = useState(currentWk) // the member's current cycle week (they can adjust it)
  const [picker, setPicker] = useState(false)
  const [picked, setPicked] = useState<ExerciseRow | null>(null)
  const [quote] = useState(() => nextQuote())
  const day = routine.days[dayIdx] ?? routine.days[0]
  const weekly = routine.style === 'weekly'
  const dayWeeks = day.weeks.length > 1 ? day.weeks : routine.weeksAvailable
  // clamp to the day's last DEFINED week (repeat-previous), never snap back to week 1
  const effWeek = Math.min(Math.max(1, wk), Math.max(1, ...dayWeeks))
  const isLastWeek = weekly && routine.totalWeeks > 1 && wk >= routine.totalWeeks
  const multiWeek = weekly && routine.totalWeeks > 1
  // adjust + persist the cycle week (re-anchors so it advances one/real-week and the
  // whole app follows — Plan, Inicio, next launch). Day suggestion keeps auto-advancing.
  const pickWeek = (w: number) => {
    const clamped = Math.min(routine.totalWeeks, Math.max(1, w))
    setWk(clamped); onPickWeek(clamped)
  }
  const isToday = dayIdx === suggestedDay
  const bigNames = day.blocks.find((b) => b.tag === 'big')?.exercises.map((e) => e.name).join(' + ')
  const focus = bigNames || day.blocks.flatMap((b) => b.exercises)[0]?.name || 'Entrenamiento'
  const name = getClientName()

  // last-session recap (day · week · Big One · when)
  const ls = lastSession()
  const lastDay = ls ? routine.days.find((d) => d.id === ls.dayId) : null
  const lastBig = ls?.bigOne || lastDay?.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name
  const lastWhen = relativeDay(ls?.date)

  // which plan days were already trained THIS week (ticks in the day picker)
  const weekKey = weekStartOf(localDate())
  const trainedThisWeek = getSessions().filter((s) => weekStartOf(s.date) === weekKey)
  const dayDone = (d: { id: string; label: string }) =>
    trainedThisWeek.some((s) => s.dayId === d.id || (!!s.dayLabel && s.dayLabel === d.label))

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
      <header className="flex items-center justify-between mb-3">
        <div className="kicker capitalize">Hoy · {TODAY()}</div>
        <img src={emblem} alt="FORCE" className="h-9 w-9 object-contain opacity-90" />
      </header>

      {/* the session, unmistakably */}
      <div className="hero-card rounded-card p-4 mb-3">
        <div className="kicker">{isToday ? `🔥 ${name ? `${name.split(' ')[0]}, hoy` : 'Hoy'} te toca` : 'Estás viendo'}</div>
        <h1 className="heading text-3xl text-white mt-1 glow-text">
          {day.label.replace('DÍA', 'Día')}
          {weekly && <><span className="text-white/30"> · </span><span className="text-gold">Sem {effWeek}</span></>}
        </h1>
        <div className="text-gold/90 font-bold text-sm mt-1">{focus}</div>
        <div className="flex gap-2.5 mt-3 pt-3 border-t border-white/10">
          <Quote size={15} className="text-gold/60 shrink-0 mt-0.5" />
          <p className="text-white/80 text-sm leading-relaxed">{quote}</p>
        </div>
      </div>

      {/* last session recap + the one escape hatch */}
      <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
        {lastWhen && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-white/60">
            <History size={12} className="text-gold/70" />
            Últ.: {ls?.dayLabel?.replace('DÍA', 'Día') ?? lastDay?.label.replace('DÍA', 'Día') ?? '—'}
            {ls?.week ? ` · Sem ${ls.week}` : ''}{lastBig ? ` · ${lastBig}` : ''} ({lastWhen})
          </span>
        )}
        {routine.days.length > 1 && (
          <button onClick={() => (isToday ? setPicker(true) : setDayIdx(suggestedDay))}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.07] px-3 py-1.5 text-gold/90 font-bold active:scale-95">
            <Repeat size={12} /> {isToday ? (multiWeek ? 'Cambiar día o semana' : '¿Entrenás otro día?') : 'Volver a hoy'}
          </button>
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

      {/* already logged this day today → say so before they double-book it */}
      {getSession(localDate(), day.id) && (
        <div className="mb-2 text-center text-xs text-gold/90 font-bold">
          ✅ Ya completaste este día hoy. Si entrenás de nuevo, se registra igual.
        </div>
      )}

      {/* start training — inline so nothing covers the day content */}
      <button
        onClick={() => onTrain(dayIdx, effWeek)}
        className="btn-glow w-full flex items-center justify-center gap-2 rounded-full
          bg-gold-fill text-ink font-black uppercase tracking-wide py-4 mb-5 active:scale-[0.98]"
      >
        <Dumbbell size={18} /> Entrenar {day.label.replace('DÍA', 'Día')}
      </button>

      <DayView day={day} week={effWeek} onPick={setPicked} />

      {/* day switcher: which day is HOY, which are already done this week */}
      {picker && (
        <BottomSheet open onClose={() => setPicker(false)}>
          <div className="px-5 pb-8 pt-1">
            <div className="kicker mb-1">{multiWeek ? 'Cambiar día y semana' : 'Cambiar el día'}</div>
            <p className="text-white/45 text-xs mb-3">¿Adelantás o recuperás un día? El plan completo vive en la pestaña Plan.</p>

            {/* week of the cycle: choose it once and it advances one per real week,
                so finishing a day always continues from where you left off */}
            {multiWeek && (
              <div className="rounded-card border border-gold/25 bg-gold/[0.06] p-3 mb-4">
                <div className="text-[0.62rem] uppercase tracking-kicker font-black text-gold/85 mb-2">Semana del ciclo</div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => pickWeek(wk - 1)} disabled={wk <= 1} aria-label="Semana anterior"
                    className="h-11 w-11 grid place-items-center rounded-full bg-white/8 border border-white/10 text-white text-2xl font-black disabled:opacity-30 active:scale-90">−</button>
                  <div className="text-center min-w-[4.5rem]">
                    <div className="text-gold text-3xl font-black tabular-nums leading-none">{wk}</div>
                    <div className="text-white/45 text-[0.62rem] mt-0.5">de {routine.totalWeeks}</div>
                  </div>
                  <button onClick={() => pickWeek(wk + 1)} disabled={wk >= routine.totalWeeks} aria-label="Semana siguiente"
                    className="h-11 w-11 grid place-items-center rounded-full bg-white/8 border border-white/10 text-white text-2xl font-black disabled:opacity-30 active:scale-90">+</button>
                </div>
                <p className="text-white/40 text-[0.68rem] text-center mt-2">Avanza sola cada semana. Ajustala si te salteaste o adelantaste.</p>
              </div>
            )}

            <div className="space-y-1.5">
              {routine.days.map((d, i) => {
                const done = dayDone(d)
                const isSug = i === suggestedDay
                const cur = i === dayIdx
                return (
                  <button key={d.id} onClick={() => { setDayIdx(i); setPicker(false) }}
                    className={`w-full flex items-center gap-3 rounded-card border p-3 text-left active:scale-[0.99]
                      ${cur ? 'border-gold/50 bg-gold/[0.10]' : 'border-white/8 bg-white/[0.03]'}`}>
                    {done ? <CheckCircle2 size={18} className="text-gold shrink-0" /> : <Circle size={18} className={`shrink-0 ${cur ? 'text-gold' : 'text-white/25'}`} />}
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${done ? 'text-white/50' : 'text-white'}`}>{d.label.replace('DÍA', 'Día')}</div>
                      <div className="text-xs text-white/45 truncate">
                        {d.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name ?? d.blocks.flatMap((b) => b.exercises)[0]?.name ?? '—'}
                        {done ? ' · hecho esta semana' : ''}
                      </div>
                    </div>
                    {isSug && <span className="text-[0.5rem] font-black uppercase tracking-wide text-ink bg-gold px-1.5 py-0.5 rounded-full shrink-0">Hoy</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </BottomSheet>
      )}

      <ExerciseSheet ex={picked} week={effWeek} onClose={() => setPicked(null)} />
    </div>
  )
}
