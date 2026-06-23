import type { RoutineDay, ExerciseRow, SectionTag, Block } from '../lib/types'
import { Spine } from './ui'
import { setsReps, loadText } from './TechniqueChips'
import { AnimatedExercise } from './AnimatedExercise'
import { circuitRounds } from '../lib/week'
import { Flame, ChevronRight, Repeat } from 'lucide-react'

const SECTION_ORDER: SectionTag[] = ['ramp', 'big', 'accessory', 'hiit', 'finisher', 'core', 'other']

export function DayView({ day, week, onPick }: {
  day: RoutineDay; week: number; onPick: (ex: ExerciseRow) => void
}) {
  const blocks = [...day.blocks]
    .filter((b) => b.exercises.length)
    .sort((a, b) => SECTION_ORDER.indexOf(a.tag) - SECTION_ORDER.indexOf(b.tag))

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

      {blocks.map((block) =>
        block.circuit
          ? <CircuitCard key={block.tag} block={block} week={week} onPick={onPick} />
          : <PlainBlock key={block.tag} block={block} week={week} onPick={onPick} />,
      )}
    </div>
  )
}

function PlainBlock({ block, week, onPick }: {
  block: Block; week: number; onPick: (ex: ExerciseRow) => void
}) {
  return (
    <section>
      <BlockHeader title={block.title} big={block.tag === 'big'} />
      <div className="space-y-2">
        {block.exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => onPick(ex)}
            className={`w-full text-left flex items-stretch gap-3 rounded-card border p-3 transition active:scale-[0.99]
              ${block.tag === 'big' ? 'bg-gold/10 border-gold/30' : 'bg-white/[0.035] border-white/8'}`}
          >
            {block.tag === 'big' && <Spine />}
            <AnimatedExercise name={ex.name} pattern={ex.pattern} size="thumb" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{ex.name || '—'}</div>
              <div className="text-xs text-white/55 mt-0.5">
                {setsReps(ex, week)}{showLoad(ex) ? ` · ${loadText(ex, week)}` : ''}
              </div>
            </div>
            <ChevronRight size={18} className="self-center text-white/30 shrink-0" />
          </button>
        ))}
      </div>
    </section>
  )
}

function CircuitCard({ block, week, onPick }: {
  block: Block; week: number; onPick: (ex: ExerciseRow) => void
}) {
  const rounds = circuitRounds(block, week)
  return (
    <section>
      <BlockHeader title={block.title} />
      <div className="rounded-card border border-gold/25 bg-gold/[0.06] overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/10 bg-black/20">
          <Repeat size={14} className="text-gold" />
          <span className="text-xs font-bold text-gold uppercase tracking-wide">
            Circuito{rounds ? ` · ${rounds} vueltas` : ''}
          </span>
          <span className="text-[0.62rem] text-white/45 ml-auto">se hacen juntos</span>
        </div>
        <div className="divide-y divide-white/8">
          {block.exercises.map((ex, i) => (
            <button key={ex.id} onClick={() => onPick(ex)}
              className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 active:bg-white/5">
              <span className="text-gold/60 font-black text-xs w-3 shrink-0">{i + 1}</span>
              <AnimatedExercise name={ex.name} pattern={ex.pattern} size="thumb" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{ex.name || '—'}</div>
                <div className="text-xs text-white/55">
                  {repsOnly(ex, week)}{showLoad(ex) ? ` · ${loadText(ex, week)}` : ''}
                </div>
              </div>
              <ChevronRight size={16} className="text-white/30 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function BlockHeader({ title, big }: { title: string; big?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-1">
      <h3 className={`heading text-sm ${big ? 'text-gold' : 'text-white/85'}`}>{title}</h3>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}

const showLoad = (ex: ExerciseRow) => ex.load.value != null || !!ex.load.band

// In a circuit the round count is shown once on the header; per-row we show reps only.
function repsOnly(ex: ExerciseRow, week: number): string {
  const s = setsReps(ex, week)
  const m = s.match(/×\s*(.+)$/)
  return m ? m[1] : s
}
