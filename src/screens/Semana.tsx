import { useState, useEffect } from 'react'
import type { Routine, ExerciseRow } from '../lib/types'
import { DayView } from '../components/DayView'
import { Pill } from '../components/ui'
import { WeekBar } from '../components/WeekBar'
import { ExerciseSheet } from './ExerciseSheet'
import { fetchHistory } from '../lib/api'
import { getToken, getSessions } from '../lib/store'
import { Target, CalendarRange, Clock, History, MapPinned } from 'lucide-react'

// PLAN = the whole cycle at a glance. The bird's-eye matrix (weeks × days) is the
// navigator: filled cells are sessions already trained, the gold ring is what
// you're looking at, the ▸ row is where you are in the cycle. Tap any cell.
export function Semana({ routine, week, currentWk, setWeek }: {
  routine: Routine; week: number; currentWk: number; setWeek: (w: number) => void
}) {
  const [dayIdx, setDayIdx] = useState(0)
  const [picked, setPicked] = useState<ExerciseRow | null>(null)
  const [history, setHistory] = useState<Array<{ id: string; title: string }>>([])
  const day = routine.days[dayIdx] ?? routine.days[0]
  // clamp to the day's last defined week (repeat-previous), never snap back to week 1
  const dayWeeks = day.weeks.length > 1 ? day.weeks : routine.weeksAvailable
  const effWeek = Math.min(Math.max(1, week), Math.max(1, ...dayWeeks))
  const matrix = routine.style === 'weekly' && routine.totalWeeks > 1

  useEffect(() => { fetchHistory(getToken()).then(setHistory).catch(() => {}) }, [])

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
      <div className="kicker">{routine.title}</div>
      <h1 className="heading text-2xl text-white mb-4">El plan completo</h1>

      {/* meta strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Meta icon={<Target size={14} />} label="Objetivo" value={routine.meta.goal || '—'} />
        <Meta icon={<CalendarRange size={14} />} label="Frecuencia" value={routine.meta.sessionsPerWeek || '—'} />
        <Meta icon={<Clock size={14} />} label="Duración" value={routine.meta.weeks || '—'} />
      </div>

      {matrix ? (
        <CycleMatrix routine={routine} week={week} dayIdx={dayIdx} currentWk={currentWk}
          onPick={(w, d) => { setWeek(w); setDayIdx(d) }} />
      ) : (
        <>
          {routine.style === 'weekly' && <div className="mb-4"><WeekBar week={week} totalWeeks={routine.totalWeeks} onChange={setWeek} /></div>}
          <div className="flex gap-2 overflow-x-auto no-scrollbar my-4 -mx-1 px-1">
            {routine.days.map((d, i) => (
              <Pill key={d.id} active={i === dayIdx} onClick={() => setDayIdx(i)}>
                {d.label.replace('DÍA', 'Día')}
              </Pill>
            ))}
          </div>
        </>
      )}

      {/* what the selected cell shows */}
      <h2 className="heading text-lg text-white mt-5 mb-2">
        {day.label.replace('DÍA', 'Día')}
        {routine.style === 'weekly' && <span className="text-gold text-sm"> · Semana {effWeek}</span>}
      </h2>
      <DayView day={day} week={effWeek} onPick={setPicked} />

      {history.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <History size={14} className="text-gold" />
            <h3 className="heading text-sm text-white/85">Historial</h3>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-card bg-white/[0.035] border border-white/8 p-3 text-white/70 text-sm font-bold">
                {h.title}
              </div>
            ))}
          </div>
        </section>
      )}

      {routine.parsedWarnings.length > 0 && (
        <p className="mt-6 text-[0.66rem] text-white/30 text-center">
          Algunas filas se muestran tal cual las escribió el coach.
        </p>
      )}

      <ExerciseSheet ex={picked} week={effWeek} onClose={() => setPicked(null)} />
    </div>
  )
}

// weeks × days grid. Trained cells fill gold (matched to real sessions by
// week + day id/label), the viewed cell gets a ring, your current week a ▸.
function CycleMatrix({ routine, week, dayIdx, currentWk, onPick }: {
  routine: Routine; week: number; dayIdx: number; currentWk: number
  onPick: (week: number, dayIdx: number) => void
}) {
  const sessions = getSessions()
  const trained = (w: number, d: { id: string; label: string }) =>
    sessions.some((s) => s.week === w && (s.dayId === d.id || (!!s.dayLabel && s.dayLabel === d.label)))
  const weeks = Array.from({ length: routine.totalWeeks }, (_, i) => i + 1)
  return (
    <div className="card p-3.5">
      <div className="kicker flex items-center gap-1.5 mb-2.5"><MapPinned size={13} className="text-gold" /> Tu ciclo de un vistazo</div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `2rem repeat(${routine.days.length}, minmax(0, 1fr))` }}>
        <span />
        {routine.days.map((d) => (
          <span key={d.id} className="text-center text-[0.58rem] uppercase tracking-micro font-bold text-white/45 truncate">
            {d.label.replace(/D[ÍI]A\s*/i, 'D')}
          </span>
        ))}
        {weeks.map((w) => (
          <FragmentRow key={w} w={w} routine={routine} week={week} dayIdx={dayIdx} currentWk={currentWk}
            trained={trained} onPick={onPick} />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2.5 text-[0.58rem] text-white/40 font-bold">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-gold-fill" /> entrenado</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-[3px] border border-gold ring-1 ring-gold/40" /> viendo</span>
        <span className="flex items-center gap-1"><span className="text-gold">▸</span> tu semana</span>
      </div>
    </div>
  )
}

function FragmentRow({ w, routine, week, dayIdx, currentWk, trained, onPick }: {
  w: number; routine: Routine; week: number; dayIdx: number; currentWk: number
  trained: (w: number, d: { id: string; label: string }) => boolean
  onPick: (week: number, dayIdx: number) => void
}) {
  const isCur = w === currentWk
  return (
    <>
      <span className={`flex items-center gap-0.5 text-[0.62rem] font-black tabular-nums ${isCur ? 'text-gold' : 'text-white/40'}`}>
        {isCur && <span aria-hidden>▸</span>}S{w}
      </span>
      {routine.days.map((d, i) => {
        const done = trained(w, d)
        const sel = w === week && i === dayIdx
        return (
          <button key={d.id} onClick={() => onPick(w, i)}
            aria-label={`Semana ${w}, ${d.label}${done ? ' (entrenado)' : ''}`}
            className={`h-9 rounded-[6px] transition active:scale-95
              ${done ? 'bg-gold-fill' : isCur ? 'bg-white/[0.09]' : 'bg-white/[0.05]'}
              ${sel ? 'ring-2 ring-gold' : 'ring-1 ring-white/[0.06]'}`} />
        )
      })}
    </>
  )
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-card bg-white/5 border border-white/10 p-2.5">
      <div className="flex items-center gap-1 text-gold/80 mb-1">{icon}
        <span className="text-[0.55rem] uppercase tracking-micro font-bold text-white/45">{label}</span>
      </div>
      <div className="text-white text-xs font-bold leading-tight break-words hyphens-auto">{value}</div>
    </div>
  )
}
