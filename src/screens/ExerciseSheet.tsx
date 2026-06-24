import type { ExerciseRow } from '../lib/types'
import { BottomSheet } from '../components/ui'
import { TechniqueChips, setsReps, loadText } from '../components/TechniqueChips'
import { PlateCalc } from '../components/PlateCalc'
import { isDeadliftName } from '../lib/plates'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { PATTERN_LABEL } from '../lib/media'
import { resolveWeek } from '../lib/week'

export function ExerciseSheet({ ex, week = 1, onClose }: {
  ex: ExerciseRow | null; week?: number; onClose: () => void
}) {
  const load = ex ? resolveWeek(ex, week).load : null
  return (
    <BottomSheet open={!!ex} onClose={onClose}>
      {ex && (
        <div className="px-5 pb-8">
          <div className="relative -mx-5 mb-4 h-52 overflow-hidden">
            <ExerciseMedia slug={ex.slug} pattern={ex.pattern} name={ex.name} />
            <div className="absolute inset-0" style={{ background: 'var(--grad-photo)' }} />
            <div className="absolute bottom-3 left-5 right-5">
              <div className="kicker">{PATTERN_LABEL[ex.pattern]}</div>
              <h2 className="heading text-2xl text-white mt-1">{ex.name}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Mini label="Series × reps" value={setsReps(ex, week)} />
            <Mini label="Carga" value={loadText(ex, week)} />
          </div>

          <TechniqueChips ex={ex} />

          {load && load.value != null && load.perSide && (
            <div className="mt-4"><PlateCalc perSideKg={load.value} deadlift={isDeadliftName(ex.name)} /></div>
          )}

          {ex.notes && (
            <div className="mt-4 rounded-card bg-white/5 border border-white/10 p-3">
              <div className="kicker mb-1">Nota del coach</div>
              <p className="text-white/80 text-sm">{ex.notes}</p>
            </div>
          )}

          <p className="mt-4 text-center text-[0.68rem] text-white/35">
            Animación de referencia. Ante cualquier duda con la técnica, consultá a tu coach.
          </p>
        </div>
      )}
    </BottomSheet>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-white/5 border border-white/10 p-3">
      <div className="text-[0.6rem] uppercase tracking-micro text-white/45 font-bold">{label}</div>
      <div className="text-gold text-lg font-black mt-0.5">{value}</div>
    </div>
  )
}
