import type { RoutineDay, ExerciseRow, SectionTag } from '../lib/types'
import { Spine } from './ui'
import { setsReps, loadText } from './TechniqueChips'
import { Flame, ChevronRight } from 'lucide-react'

const SECTION_ORDER: SectionTag[] = ['ramp', 'big', 'accessory', 'finisher', 'core', 'other']

export function DayView({ day, onPick }: { day: RoutineDay; onPick: (ex: ExerciseRow) => void }) {
  const blocks = [...day.blocks].sort(
    (a, b) => SECTION_ORDER.indexOf(a.tag) - SECTION_ORDER.indexOf(b.tag),
  )
  return (
    <div className="space-y-5">
      {day.warmup && (
        <div className="card p-4">
          <div className="flex items-center gap-2 kicker mb-1.5">
            <Flame size={13} className="text-gold" /> Entrada en calor
          </div>
          <p className="text-white/75 text-sm leading-relaxed">{day.warmup}</p>
        </div>
      )}

      {blocks.map((block) => (
        <section key={block.tag}>
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <h3 className={`heading text-sm ${block.tag === 'big' ? 'text-gold' : 'text-white/85'}`}>
              {block.title}
            </h3>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div className="space-y-2">
            {block.exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onPick(ex)}
                className={`w-full text-left flex items-stretch gap-3 rounded-card border p-3 transition active:scale-[0.99]
                  ${block.tag === 'big'
                    ? 'bg-gold/10 border-gold/30'
                    : 'bg-white/[0.035] border-white/8 hover:border-white/15'}`}
              >
                {block.tag === 'big' && <Spine />}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{ex.name || '—'}</div>
                  <div className="text-xs text-white/55 mt-0.5">
                    {setsReps(ex)}{ex.load.value != null || ex.load.band ? ` · ${loadText(ex)}` : ''}
                  </div>
                </div>
                <ChevronRight size={18} className="self-center text-white/30 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
