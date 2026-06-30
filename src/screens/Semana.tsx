import { useState, useEffect } from 'react'
import type { Routine, ExerciseRow } from '../lib/types'
import { DayView } from '../components/DayView'
import { Pill } from '../components/ui'
import { WeekBar } from '../components/WeekBar'
import { ExerciseSheet } from './ExerciseSheet'
import { fetchHistory } from '../lib/api'
import { getToken } from '../lib/store'
import { Target, CalendarRange, Clock, History } from 'lucide-react'

export function Semana({ routine, week, setWeek }: {
  routine: Routine; week: number; setWeek: (w: number) => void
}) {
  const [dayIdx, setDayIdx] = useState(0)
  const [picked, setPicked] = useState<ExerciseRow | null>(null)
  const [history, setHistory] = useState<Array<{ id: string; title: string }>>([])
  const day = routine.days[dayIdx] ?? routine.days[0]
  // clamp to the day's last defined week (repeat-previous), never snap back to week 1
  const dayWeeks = day.weeks.length > 1 ? day.weeks : routine.weeksAvailable
  const effWeek = Math.min(Math.max(1, week), Math.max(1, ...dayWeeks))

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

      {routine.style === 'weekly' && <div className="mb-4"><WeekBar week={week} totalWeeks={routine.totalWeeks} onChange={setWeek} /></div>}

      <div className="flex gap-2 overflow-x-auto no-scrollbar my-4 -mx-1 px-1">
        {routine.days.map((d, i) => (
          <Pill key={d.id} active={i === dayIdx} onClick={() => setDayIdx(i)}>
            {d.label.replace('DÍA', 'Día')}
          </Pill>
        ))}
      </div>

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
