import type { Routine, ExerciseRow } from '../../lib/types'
import { AnimatedExercise } from '../../components/AnimatedExercise'
import { setsReps, loadText } from '../../components/TechniqueChips'
import { liftOfWeek } from '../../lib/week'
import { getSession, localDate, getClientName } from '../../lib/store'
import { useUiPrefs } from '../../lib/UiPrefsContext'
import { Play, Check } from 'lucide-react'

// "¿Qué hago hoy?" — the whole screen answers that one question.
// Deliberately absent: RPE, notes, tempo/pause/myo annotations, the week stepper,
// records, streaks, weather, coach tips and quotes. All of it still exists in the
// normal app, one switch away.

const TODAY = () => new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

export function SimpleHoy({ routine, week, suggestedDay, onTrain }: {
  routine: Routine
  week: number
  suggestedDay: number
  onTrain: (dayIdx: number, week: number) => void
}) {
  const { prefs } = useUiPrefs()
  const dayIdx = routine.days[suggestedDay] ? suggestedDay : 0
  const day = routine.days[dayIdx]
  const name = getClientName()?.split(' ')[0]
  const doneToday = !!getSession(localDate(), day.id)
  // One flat list — no blocks, no circuits, no sections to decode. Approach sets
  // are folded into their working exercise: four "Press Plano" cards in a row is
  // exactly the noise this screen exists to remove.
  const all: ExerciseRow[] = day.blocks
    .flatMap((b) => b.exercises)
    .map((ex) => liftOfWeek(ex, week))
  const rampNames = new Set(all.filter((ex) => ex.isWarmupRamp).map((ex) => ex.name))
  const exercises = all.filter((ex) => !ex.isWarmupRamp)
  const icon = Math.round(20 * prefs.fontScale)

  return (
    <div className="px-4 pt-4 pb-8">
      <p className="text-white/60 text-base capitalize">{TODAY()}</p>
      <h2 className="heading text-3xl text-white mt-1">{day.label.replace('DÍA', 'Día')}</h2>
      {name && <p className="text-gold text-lg font-black mt-1">Dale, {name} 💪</p>}

      {doneToday && (
        <div className="mt-4 flex items-center gap-2.5 rounded-card border border-gold/40 bg-gold/[0.12] px-4 py-3">
          <Check size={icon} className="text-gold shrink-0" />
          <span className="text-white font-bold">Ya entrenaste hoy. ¡Bien ahí!</span>
        </div>
      )}

      <button onClick={() => onTrain(dayIdx, week)}
        className="btn-glow mt-4 w-full rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide
          py-5 text-lg flex items-center justify-center gap-2 active:scale-[0.98]">
        <Play size={Math.round(22 * prefs.fontScale)} /> {doneToday ? 'Entrenar otra vez' : 'Empezar'}
      </button>

      <p className="text-white/60 text-sm mt-5 mb-2">Lo que vas a hacer:</p>

      <div className="space-y-3">
        {day.warmup && (
          <div className="card rounded-card p-4">
            <div className="text-gold font-black uppercase tracking-wide text-sm">Entrada en calor</div>
            <p className="text-white text-base leading-snug mt-1">{day.warmup}</p>
          </div>
        )}
        {exercises.map((ex, i) => (
          <div key={ex.id || i} className="card rounded-card p-4 flex items-center gap-4">
            <AnimatedExercise name={ex.name} pattern={ex.pattern} size="thumb" />
            <div className="min-w-0 flex-1">
              {/* the exercise name is the biggest thing on the card, on purpose */}
              <div className="text-white font-black text-xl leading-tight">{ex.name || '—'}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Chip>{setsReps(ex, week)}</Chip>
                <Chip gold>{loadText(ex, week)}</Chip>
              </div>
              {rampNames.has(ex.name) && (
                <div className="text-white/60 text-sm mt-1.5">Antes hacés series de aproximación.</div>
              )}
            </div>
          </div>
        ))}
        {exercises.length === 0 && (
          <p className="text-white/60 text-center py-8">Hoy no hay ejercicios cargados. Hablá con tu coach.</p>
        )}
      </div>
    </div>
  )
}

function Chip({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span className={`rounded-chip px-2.5 py-1 font-black text-base tabular-nums
      ${gold ? 'bg-gold-fill text-ink' : 'bg-white/8 text-white border border-white/12'}`}>
      {children}
    </span>
  )
}
