import { useMemo, useState, useEffect, useRef } from 'react'
import type { RoutineDay, ExerciseRow, SectionTag, Block } from '../lib/types'
import { setsReps, loadText, TechniqueChips } from '../components/TechniqueChips'
import { PlateCalc } from '../components/PlateCalc'
import { Rail } from '../components/ui'
import { resolveWeek, circuitRounds } from '../lib/week'
import { logSet, logSession, localDate } from '../lib/store'
import { Celebration } from '../components/Celebration'
import { X, ChevronLeft, ChevronRight, Check, Timer, Play, Pause, RotateCcw, Repeat } from 'lucide-react'

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

function restFor(section: SectionTag): number {
  if (section === 'big' || section === 'ramp') return 180
  if (section === 'accessory') return 120
  return 90
}

export function Entrenar({ day, week, onClose }: { day: RoutineDay; week: number; onClose: () => void }) {
  const items = useMemo(() => buildItems(day), [day])
  const [i, setI] = useState(0)
  const [done, setDone] = useState<Record<string, number>>({}) // itemKey → units done
  const [finishing, setFinishing] = useState(false)

  // rest timer
  const [secs, setSecs] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef<number | null>(null)
  const startTimer = (s: number) => { setSecs(s); setRunning(true) }
  useEffect(() => {
    if (!running) return
    ref.current = window.setInterval(() => {
      setSecs((s) => { if (s <= 1) { setRunning(false); return 0 } return s - 1 })
    }, 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  const totalUnits = items.reduce((a, it) => a + unitsOf(it, week), 0)
  const totalDone = Object.values(done).reduce((a, b) => a + b, 0)

  if (finishing) return <Finish day={day} onClose={onClose} />
  const item = items[i]
  if (!item) return null
  const key = item.type === 'single' ? item.ex.id : `c-${item.block.tag}`
  const target = unitsOf(item, week)
  const doneCount = done[key] ?? 0

  const advance = () => {
    const n = Math.min(target, doneCount + 1)
    setDone((d) => ({ ...d, [key]: n }))
    if (item.type === 'single') {
      logSet({ exerciseId: item.ex.id, dayId: day.id, done: n >= target })
      startTimer(restFor(item.section))
    } else {
      if (n >= target) item.block.exercises.forEach((ex) => logSet({ exerciseId: ex.id, dayId: day.id, done: true }))
      startTimer(90)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <button onClick={onClose} className="p-1.5 text-white/60"><X size={22} /></button>
        <div className="flex-1"><Rail value={totalUnits ? totalDone / totalUnits : 0} /></div>
        <span className="text-xs font-bold text-white/50 tabular-nums">Sem {week} · {i + 1}/{items.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {item.type === 'single'
          ? <SingleView ex={item.ex} section={item.section} week={week} done={doneCount} target={target} />
          : <CircuitView block={item.block} week={week} round={doneCount} rounds={target} />}

        <button onClick={advance} disabled={doneCount >= target}
          className={`mt-5 w-full rounded-full py-4 font-black uppercase tracking-wide transition active:scale-[0.98]
            ${doneCount >= target ? 'bg-white/10 text-white/40' : 'bg-gold-fill text-ink'}`}>
          {doneCount >= target
            ? (item.type === 'circuit' ? 'Circuito completo ✓' : 'Ejercicio completo ✓')
            : (item.type === 'circuit' ? `Marcar vuelta ${doneCount + 1}` : `Marcar serie ${doneCount + 1}`)}
        </button>

        <div className="mt-4 rounded-card bg-black/30 border border-white/10 p-4 flex items-center gap-3">
          <Timer size={20} className="text-gold" />
          <span className="text-2xl font-black tabular-nums text-white flex-1">{mmss}</span>
          <button onClick={() => setRunning((r) => !r)} className="p-2 text-white/70">
            {running ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={() => startTimer(item.type === 'single' ? restFor(item.section) : 90)} className="p-2 text-white/70"><RotateCcw size={18} /></button>
        </div>

        {item.type === 'single' && singleLoad(item.ex, week) && (
          <div className="mt-4 mb-6"><PlateCalc perSideKg={resolveWeek(item.ex, week).load.value!} /></div>
        )}
        <div className="h-4" />
      </div>

      <div className="flex items-center gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-white/10">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}
          className="p-3 rounded-full bg-white/5 text-white/70 disabled:opacity-30"><ChevronLeft size={20} /></button>
        {i < items.length - 1 ? (
          <button onClick={() => setI((n) => Math.min(items.length - 1, n + 1))}
            className="flex-1 rounded-full bg-white/10 text-white font-bold py-3 flex items-center justify-center gap-1">
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={() => setFinishing(true)}
            className="flex-1 rounded-full bg-gold-fill text-ink font-black uppercase py-3">Finalizar</button>
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

function SingleView({ ex, section, week, done, target }: {
  ex: ExerciseRow; section: SectionTag; week: number; done: number; target: number
}) {
  return (
    <>
      <div className="kicker">{SECTION_LABEL[section]}</div>
      <h1 className="heading text-3xl text-white mt-1 mb-1">{ex.name || '—'}</h1>
      <div className="text-gold text-lg font-black">{setsReps(ex, week)} · {loadText(ex, week)}</div>
      <TechniqueChips ex={ex} />
      <div className="flex items-center gap-2 mt-6 flex-wrap">
        {Array.from({ length: target }).map((_, s) => (
          <div key={s} className={`h-11 w-11 rounded-full border-2 flex items-center justify-center font-black transition
            ${s < done ? 'bg-gold border-gold text-ink' : 'border-white/20 text-white/40'}`}>
            {s < done ? <Check size={18} /> : s + 1}
          </div>
        ))}
      </div>
    </>
  )
}

function CircuitView({ block, week, round, rounds }: {
  block: Block; week: number; round: number; rounds: number
}) {
  return (
    <>
      <div className="flex items-center gap-2 kicker"><Repeat size={13} /> {block.title} · Circuito</div>
      <h1 className="heading text-3xl text-white mt-1 mb-1">Vuelta {Math.min(round + 1, rounds)} <span className="text-white/30">/ {rounds}</span></h1>
      <p className="text-white/50 text-sm mb-4">Hacé una serie de cada ejercicio, una atrás de otra. Descansá al terminar la vuelta.</p>
      <div className="space-y-2">
        {block.exercises.map((ex, idx) => (
          <div key={ex.id} className="flex items-center gap-3 rounded-card bg-white/[0.04] border border-white/10 p-3">
            <span className="text-gold/70 font-black text-sm w-5 shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm truncate">{ex.name}</div>
              <div className="text-xs text-white/55">{repsCol(ex, week)} · {loadText(ex, week)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-5 flex-wrap">
        {Array.from({ length: rounds }).map((_, s) => (
          <div key={s} className={`h-9 px-3 rounded-full border-2 flex items-center justify-center font-black text-xs transition
            ${s < round ? 'bg-gold border-gold text-ink' : 'border-white/20 text-white/40'}`}>
            {s < round ? <Check size={14} /> : `V${s + 1}`}
          </div>
        ))}
      </div>
    </>
  )
}

function repsCol(ex: ExerciseRow, week: number): string {
  const s = setsReps(ex, week)
  const m = s.match(/×\s*(.+)$/)
  return m ? `${m[1]} reps` : s
}

// ---- finish: session RPE + note ------------------------------------------
function Finish({ day, onClose }: { day: RoutineDay; onClose: () => void }) {
  const [rpe, setRpe] = useState(7)
  const [note, setNote] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const save = () => {
    logSession({ date: localDate(), dayId: day.id, rpe, note: note.trim() || undefined })
    setCelebrating(true)
  }
  if (celebrating) {
    return <Celebration title={`${day.label.replace('DÍA', 'Día')} completado`} onClose={onClose} />
  }
  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+2rem)] max-w-md mx-auto">
      <div className="kicker">{day.label.replace('DÍA', 'Día')} completado</div>
      <h1 className="heading text-3xl text-white mt-1 mb-6">¿Cómo te fue?</h1>

      <div className="rounded-card bg-white/5 border border-white/10 p-5">
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
        <button onClick={save} className="flex-1 rounded-full bg-gold-fill text-ink font-black uppercase py-4">
          Guardar y cerrar
        </button>
      </div>
    </div>
  )
}
