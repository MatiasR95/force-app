import { useMemo, useState } from 'react'
import type { RoutineDay, ExerciseRow, SectionTag, Block } from '../lib/types'
import { setsReps, loadText, TechniqueChips } from '../components/TechniqueChips'
import { PlateCalc } from '../components/PlateCalc'
import { RestTimer } from '../components/RestTimer'
import { AnimatedExercise } from '../components/AnimatedExercise'
import { Rail } from '../components/ui'
import { resolveWeek, circuitRounds } from '../lib/week'
import { logSet, logSession, localDate } from '../lib/store'
import { Celebration } from '../components/Celebration'
import { X, ChevronLeft, Check, Repeat, ArrowRight } from 'lucide-react'

const ORDER: SectionTag[] = ['ramp', 'big', 'accessory', 'hiit', 'finisher', 'core', 'other']

type Item =
  | { type: 'single'; ex: ExerciseRow; section: SectionTag }
  | { type: 'circuit'; block: Block }

function buildItems(day: RoutineDay): Item[] {
  const blocks = [...day.blocks]
    .filter((b) => b.exercises.length)
    .sort((a, b) => ORDER.indexOf(a.tag) - ORDER.indexOf(b.tag))
  const items: Item[] = []
  for (const b of blocks) {
    if (b.circuit) items.push({ type: 'circuit', block: b })
    else for (const ex of b.exercises) items.push({ type: 'single', ex, section: b.tag })
  }
  return items
}

const SECTION_LABEL: Record<SectionTag, string> = {
  ramp: 'Aproximación', big: 'The Big One', accessory: 'Accesorio',
  hiit: 'HIIT', finisher: 'Finisher', core: 'Zona media', warmup: 'Calentamiento', other: 'Trabajo',
}

export function Entrenar({ day, week, lastWeek, onClose }: {
  day: RoutineDay; week: number; lastWeek?: boolean; onClose: () => void
}) {
  const items = useMemo(() => buildItems(day), [day])
  const [i, setI] = useState(0)
  const [done, setDone] = useState<Record<string, number>>({})
  const [flash, setFlash] = useState(-1)
  const [finishing, setFinishing] = useState(false)

  const totalUnits = items.reduce((a, it) => a + unitsOf(it, week), 0)
  const totalDone = Object.values(done).reduce((a, b) => a + b, 0)

  if (finishing) return <Finish day={day} week={week} lastWeek={lastWeek} onClose={onClose} />
  const item = items[i]
  if (!item) return null
  const key = item.type === 'single' ? item.ex.id : `c-${item.block.tag}`
  const target = unitsOf(item, week)
  const doneCount = done[key] ?? 0
  const allDone = doneCount >= target
  const isLast = i === items.length - 1

  const mark = () => {
    const n = Math.min(target, doneCount + 1)
    setDone((d) => ({ ...d, [key]: n }))
    setFlash(n - 1); window.setTimeout(() => setFlash(-1), 420)
    try { navigator.vibrate?.(25) } catch { /* no-op */ }
    if (item.type === 'single') logSet({ exerciseId: item.ex.id, dayId: day.id, done: n >= target })
    else if (n >= target) item.block.exercises.forEach((ex) => logSet({ exerciseId: ex.id, dayId: day.id, done: true }))
  }
  const go = () => setI((n) => Math.min(items.length - 1, n + 1))

  const primary = !allDone
    ? { label: item.type === 'circuit' ? `Marcar vuelta ${doneCount + 1}` : `Marcar serie ${doneCount + 1}`, onClick: mark, icon: <Check size={18} /> }
    : isLast
      ? { label: 'Finalizar', onClick: () => setFinishing(true), icon: <ArrowRight size={18} /> }
      : { label: 'Siguiente', onClick: go, icon: <ArrowRight size={18} /> }

  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <button onClick={onClose} className="p-1.5 text-white/60"><X size={22} /></button>
        <div className="flex-1"><Rail value={totalUnits ? totalDone / totalUnits : 0} /></div>
        <span className="text-xs font-bold text-white/50 tabular-nums">Sem {week} · {i + 1}/{items.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {item.type === 'single'
          ? <SingleView ex={item.ex} section={item.section} week={week} done={doneCount} target={target} flash={flash} />
          : <CircuitView block={item.block} week={week} round={doneCount} rounds={target} flash={flash} />}

        <button onClick={primary.onClick}
          className={`mt-5 w-full rounded-full py-4 font-black uppercase tracking-wide flex items-center justify-center gap-2 transition active:scale-[0.98]
            ${allDone ? 'bg-gold-fill text-ink btn-glow' : 'bg-white/10 text-white border border-gold/30'}`}>
          {primary.icon} {primary.label}
        </button>

        <div className="mt-4"><RestTimer /></div>

        {item.type === 'single' && singleLoad(item.ex, week) && (
          <div className="mt-4 mb-6"><PlateCalc perSideKg={resolveWeek(item.ex, week).load.value!} /></div>
        )}
        <div className="h-4" />
      </div>

      <div className="flex items-center gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-white/10">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}
          className="p-3 rounded-full bg-white/5 text-white/70 disabled:opacity-30"><ChevronLeft size={20} /></button>
        {!isLast && (
          <button onClick={go} className="text-white/45 text-sm font-bold px-3 py-2 ml-auto">Saltar →</button>
        )}
      </div>
    </div>
  )
}

function unitsOf(it: Item, week: number): number {
  if (it.type === 'single') return resolveWeek(it.ex, week).sets ?? 1
  return circuitRounds(it.block, week) ?? 1
}

const singleLoad = (ex: ExerciseRow, week: number) => {
  const l = resolveWeek(ex, week).load
  return l.value != null && l.perSide
}

function Dots({ n, done, flash, label }: { n: number; done: number; flash: number; label?: (i: number) => string }) {
  return (
    <div className="flex items-center gap-2 mt-6 flex-wrap">
      {Array.from({ length: n }).map((_, s) => (
        <div key={s}
          className={`${label ? 'h-9 px-3 text-xs' : 'h-11 w-11'} rounded-full border-2 flex items-center justify-center font-black transition
            ${s < done ? 'bg-gold border-gold text-ink' : 'border-white/20 text-white/40'} ${s === flash ? 'dot-pop' : ''}`}>
          {s < done ? <Check size={label ? 14 : 18} /> : (label ? label(s) : s + 1)}
        </div>
      ))}
    </div>
  )
}

function SingleView({ ex, section, week, done, target, flash }: {
  ex: ExerciseRow; section: SectionTag; week: number; done: number; target: number; flash: number
}) {
  return (
    <>
      <div className="kicker">{SECTION_LABEL[section]}</div>
      <h1 className="heading text-3xl text-white mt-1 mb-1">{ex.name || '—'}</h1>
      <div className="text-gold text-lg font-black">{setsReps(ex, week)} · {loadText(ex, week)}</div>
      <TechniqueChips ex={ex} />
      <div className="mt-4 h-36"><AnimatedExercise name={ex.name} pattern={ex.pattern} /></div>
      <Dots n={target} done={done} flash={flash} />
    </>
  )
}

function CircuitView({ block, week, round, rounds, flash }: {
  block: Block; week: number; round: number; rounds: number; flash: number
}) {
  return (
    <>
      <div className="flex items-center gap-2 kicker"><Repeat size={13} /> {block.title} · Circuito</div>
      <h1 className="heading text-3xl text-white mt-1 mb-1">Vuelta {Math.min(round + 1, rounds)} <span className="text-white/30">/ {rounds}</span></h1>
      <p className="text-white/50 text-sm mb-4">Hacé una serie de cada ejercicio, una atrás de otra. La pausa, al terminar la vuelta.</p>
      <div className="space-y-2">
        {block.exercises.map((ex, idx) => (
          <div key={ex.id} className="flex items-center gap-3 rounded-card bg-white/[0.04] border border-white/10 p-2.5">
            <span className="text-gold/70 font-black text-sm w-3 shrink-0">{idx + 1}</span>
            <AnimatedExercise name={ex.name} pattern={ex.pattern} size="thumb" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm truncate">{ex.name}</div>
              <div className="text-xs text-white/55">{repsCol(ex, week)} · {loadText(ex, week)}</div>
            </div>
          </div>
        ))}
      </div>
      <Dots n={rounds} done={round} flash={flash} label={(s) => `V${s + 1}`} />
    </>
  )
}

function repsCol(ex: ExerciseRow, week: number): string {
  const s = setsReps(ex, week)
  const m = s.match(/×\s*(.+)$/)
  return m ? `${m[1]} reps` : s
}

// ---- finish: session RPE + note ------------------------------------------
function Finish({ day, week, lastWeek, onClose }: {
  day: RoutineDay; week: number; lastWeek?: boolean; onClose: () => void
}) {
  const [rpe, setRpe] = useState(7)
  const [note, setNote] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const bigOne = day.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name
  const save = () => {
    logSession({ date: localDate(), dayId: day.id, rpe, note: note.trim() || undefined, week, dayLabel: day.label, bigOne })
    setCelebrating(true)
  }
  if (celebrating) {
    return (
      <Celebration
        title={`${day.label.replace('DÍA', 'Día')} completado`}
        extra={lastWeek ? 'Cerraste la última semana del ciclo. ¡Avisale a tu coach para armar el próximo! 💪' : undefined}
        onClose={onClose}
      />
    )
  }
  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+2rem)] max-w-md mx-auto">
      <div className="kicker">{day.label.replace('DÍA', 'Día')} completado</div>
      <h1 className="heading text-3xl text-white mt-1 mb-6">¿Cómo te fue?</h1>

      <div className="rounded-card glass p-5">
        <div className="flex justify-between items-baseline mb-2">
          <span className="kicker">Esfuerzo de la sesión (RPE)</span>
          <span className="text-gold text-3xl font-black tabular-nums">{rpe}</span>
        </div>
        <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(+e.target.value)}
          className="w-full accent-[#C6AE78]" />
        <div className="flex justify-between text-[0.6rem] text-white/40 font-bold mt-1">
          <span>Suave</span><span>Máximo</span>
        </div>
      </div>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
        placeholder="¿Algo para que sepa el coach? (ej: 'hice 25kg', 'me faltó una serie', 'máquina ocupada')"
        className="mt-4 w-full rounded-card bg-white/5 border border-white/10 p-3 text-white text-sm
          placeholder:text-white/30 focus:border-gold/40 outline-none resize-none" />

      <div className="mt-auto mb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-6 flex gap-3">
        <button onClick={onClose} className="px-5 rounded-full bg-white/5 text-white/60 font-bold py-4">Saltar</button>
        <button onClick={save} className="btn-glow flex-1 rounded-full bg-gold-fill text-ink font-black uppercase py-4">
          Guardar y cerrar
        </button>
      </div>
    </div>
  )
}
