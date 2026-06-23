import { useMemo, useState, useEffect, useRef } from 'react'
import type { RoutineDay, ExerciseRow, SectionTag } from '../lib/types'
import { setsReps, loadText, TechniqueChips } from '../components/TechniqueChips'
import { PlateCalc } from '../components/PlateCalc'
import { Rail } from '../components/ui'
import { logSet, logSession, localDate } from '../lib/store'
import { X, ChevronLeft, ChevronRight, Check, Timer, Play, Pause, RotateCcw } from 'lucide-react'

const ORDER: SectionTag[] = ['ramp', 'big', 'accessory', 'finisher', 'core', 'other']

function flatten(day: RoutineDay): ExerciseRow[] {
  return [...day.blocks]
    .sort((a, b) => ORDER.indexOf(a.tag) - ORDER.indexOf(b.tag))
    .flatMap((b) => b.exercises)
}

function restSeconds(ex: ExerciseRow): number {
  const cluster = ex.techniques.find((t) => t.type === 'cluster')
  if (cluster && cluster.type === 'cluster' && cluster.restSeconds) return cluster.restSeconds
  if (ex.section === 'big') return 180
  if (ex.section === 'accessory') return 120
  return 90
}

export function Entrenar({ day, onClose }: { day: RoutineDay; onClose: () => void }) {
  const list = useMemo(() => flatten(day), [day])
  const [i, setI] = useState(0)
  const [done, setDone] = useState<Record<string, number>>({}) // exerciseId → sets done
  const [finishing, setFinishing] = useState(false)
  const ex = list[i]
  const targetSets = ex?.sets ?? 1
  const doneCount = done[ex?.id] ?? 0
  const totalDone = Object.values(done).reduce((a, b) => a + b, 0)
  const totalSets = list.reduce((a, e) => a + (e.sets ?? 1), 0)

  const checkSet = () => {
    const n = Math.min(targetSets, doneCount + 1)
    setDone((d) => ({ ...d, [ex.id]: n }))
    logSet({ exerciseId: ex.id, dayId: day.id, done: n >= targetSets })
    startTimer(restSeconds(ex))
  }

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

  if (finishing) return <Finish day={day} onClose={onClose} />

  if (!ex) return null

  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col">
      {/* top bar */}
      <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <button onClick={onClose} className="p-1.5 text-white/60"><X size={22} /></button>
        <div className="flex-1">
          <Rail value={totalSets ? totalDone / totalSets : 0} />
        </div>
        <span className="text-xs font-bold text-white/50 tabular-nums">{i + 1}/{list.length}</span>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-5">
        <div className="kicker">{sectionLabel(ex.section)}</div>
        <h1 className="heading text-3xl text-white mt-1 mb-1">{ex.name || '—'}</h1>
        <div className="text-gold text-lg font-black">{setsReps(ex)} · {loadText(ex)}</div>
        <TechniqueChips ex={ex} />

        {/* set dots */}
        <div className="flex items-center gap-2 mt-6 flex-wrap">
          {Array.from({ length: targetSets }).map((_, s) => (
            <div key={s}
              className={`h-11 w-11 rounded-full border-2 flex items-center justify-center font-black transition
                ${s < doneCount ? 'bg-gold border-gold text-ink' : 'border-white/20 text-white/40'}`}>
              {s < doneCount ? <Check size={18} /> : s + 1}
            </div>
          ))}
        </div>

        <button onClick={checkSet} disabled={doneCount >= targetSets}
          className={`mt-5 w-full rounded-full py-4 font-black uppercase tracking-wide transition active:scale-[0.98]
            ${doneCount >= targetSets ? 'bg-white/10 text-white/40' : 'bg-gold-fill text-ink'}`}>
          {doneCount >= targetSets ? 'Serie completa ✓' : `Marcar serie ${doneCount + 1}`}
        </button>

        {/* rest timer */}
        <div className="mt-4 rounded-card bg-black/30 border border-white/10 p-4 flex items-center gap-3">
          <Timer size={20} className="text-gold" />
          <span className="text-2xl font-black tabular-nums text-white flex-1">{mmss}</span>
          <button onClick={() => setRunning((r) => !r)} className="p-2 text-white/70">
            {running ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={() => startTimer(restSeconds(ex))} className="p-2 text-white/70"><RotateCcw size={18} /></button>
        </div>

        {ex.load.value != null && ex.load.perSide && (
          <div className="mt-4"><PlateCalc perSideKg={ex.load.value} /></div>
        )}
      </div>

      {/* nav */}
      <div className="flex items-center gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-white/10">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}
          className="p-3 rounded-full bg-white/5 text-white/70 disabled:opacity-30"><ChevronLeft size={20} /></button>
        {i < list.length - 1 ? (
          <button onClick={() => setI((n) => n + 1)}
            className="flex-1 rounded-full bg-white/10 text-white font-bold py-3 flex items-center justify-center gap-1">
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={() => setFinishing(true)}
            className="flex-1 rounded-full bg-gold-fill text-ink font-black uppercase py-3">
            Finalizar
          </button>
        )}
      </div>
    </div>
  )
}

function sectionLabel(t: SectionTag): string {
  return ({ ramp: 'Aproximación', big: 'The Big One', accessory: 'Accesorio',
    finisher: 'Finisher', core: 'Core', warmup: 'Calentamiento', other: 'Trabajo' } as const)[t]
}

// ---- finish: session RPE + note ------------------------------------------
function Finish({ day, onClose }: { day: RoutineDay; onClose: () => void }) {
  const [rpe, setRpe] = useState(7)
  const [note, setNote] = useState('')
  const save = () => {
    logSession({ date: localDate(), dayId: day.id, rpe, note: note.trim() || undefined })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+2rem)]">
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
