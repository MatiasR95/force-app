import { useEffect, useMemo, useState } from 'react'
import type { RoutineDay, ExerciseRow, SectionTag, Block } from '../lib/types'
import { setsReps, loadText, repsText, TechniqueChips } from '../components/TechniqueChips'
import { PlateCalc } from '../components/PlateCalc'
import { isDeadliftName } from '../lib/plates'
import { RestTimer } from '../components/RestTimer'
import { AnimatedExercise, detectImpl } from '../components/AnimatedExercise'
import { groupInfo } from '../components/DayView'
import { Rail } from '../components/ui'
import { resolveWeek, circuitRounds } from '../lib/week'
import { logSet, logSession, localDate, getNote, saveNote, getActual, saveActual, getGender, getClientName, getMyRecords, addMyRecord, getToken, queueCellWrites, getBodyweight, addCheckin, hasCheckedInToday } from '../lib/store'
import { matchRecordLift, recordKg, bestOf, liftLabel, noteWeight, weightClass } from '../lib/records'
import { submitRecord, syncOutbox } from '../lib/api'
import { buildCellWrites } from '../lib/sheetWrite'
import { Celebration } from '../components/Celebration'
import { X, ChevronLeft, Check, Repeat, MessageSquarePlus, Trophy, Megaphone, SlidersHorizontal, Minus, Plus, Flame } from 'lucide-react'

const ORDER: SectionTag[] = ['ramp', 'big', 'accessory', 'hiit', 'finisher', 'core', 'other']
const rid = () => `r-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`

type Item =
  | { type: 'warmup'; text: string }
  | { type: 'single'; ex: ExerciseRow; section: SectionTag }
  | { type: 'circuit'; block: Block }

function buildItems(day: RoutineDay): Item[] {
  const items: Item[] = []
  // the day's entrada en calor is the first step — same as Hoy/Plan, so it's never
  // skipped just because the member jumped straight into "Entrenar".
  if (day.warmup) items.push({ type: 'warmup', text: day.warmup })
  const blocks = [...day.blocks]
    .filter((b) => b.exercises.length)
    .sort((a, b) => ORDER.indexOf(a.tag) - ORDER.indexOf(b.tag))
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
  const [pr, setPr] = useState<string | null>(null)
  const [restSignal, setRestSignal] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const totalUnits = items.reduce((a, it) => a + unitsOf(it, week), 0)
  const totalDone = Object.values(done).reduce((a, b) => a + b, 0)

  if (finishing) return <Finish day={day} week={week} lastWeek={lastWeek} onClose={onClose} onBack={() => setFinishing(false)} />
  const item = items[i]
  // a day with no exercises (e.g. a tab with only a warm-up) — don't strand the
  // member on a blank overlay; give them a way back.
  if (!item) return <EmptyDay day={day} onClose={onClose} />
  const isTimed = item.type === 'circuit' && item.block.timed
  const key = item.type === 'single' ? item.ex.id : item.type === 'warmup' ? 'warmup' : `c-${item.block.tag}`
  const target = unitsOf(item, week)
  const doneCount = done[key] ?? 0
  const isLast = i === items.length - 1

  // Auto-capture a record when a record-eligible lift is completed (a PR vs the
  // member's own best). No manual entry — it just happens when they finish it.
  const captureRecord = (ex: ExerciseRow) => {
    const lift = matchRecordLift(ex.name)
    const gender = getGender()
    if (!lift || !gender) return
    const r = resolveWeek(ex, week)
    // prefer what the member actually did: explicit edit > note mention > prescription
    const act = getActual(ex.id)
    const reps = act?.reps ?? r.reps ?? ex.reps ?? 0
    if (r.load.value == null || reps <= 0) return
    const used = act?.kg ?? noteWeight(getNote(ex.id)) ?? r.load.value
    const kg = recordKg(used, r.load.perSide, detectImpl(ex.name) === 'barbell')
    if (kg <= 0) return
    const client = getClientName() ?? 'Vos'
    const prev = bestOf(getMyRecords().filter((e) => e.lift === lift && e.gender === gender), client)
    if (prev && (kg < prev.kg || (kg === prev.kg && reps <= prev.reps))) return // not a PR
    const wc = weightClass(gender, getBodyweight())?.key
    const entry = { id: rid(), client, gender, lift, kg, reps, ts: new Date().toISOString(), ...(wc ? { wc } : {}) }
    addMyRecord(entry)
    submitRecord(getToken(), entry).catch(() => {})
    setPr(`¡Récord! ${liftLabel(lift)}: ${kg} kg × ${reps}`)
    window.setTimeout(() => setPr(null), 3600)
  }

  const skip = () => setI((n) => Math.min(items.length - 1, n + 1))

  // One gold button: mark this set/round done, and auto-advance when the
  // exercise/round count is complete (no separate "Siguiente" press).
  const onPrimary = () => {
    // warm-up is just a "done, let's go" step — no sets, records or rest timer.
    if (item.type === 'warmup') {
      try { navigator.vibrate?.(25) } catch { /* no-op */ }
      if (isLast) window.setTimeout(() => setFinishing(true), 200)
      else skip()
      return
    }
    const n = Math.min(target, doneCount + 1)
    setDone((d) => ({ ...d, [key]: n }))
    setFlash(n - 1); window.setTimeout(() => setFlash(-1), 420)
    if (!isTimed) setRestSignal((s) => s + 1) // start/reset the pause after marking
    try { navigator.vibrate?.(25) } catch { /* no-op */ }
    if (item.type === 'single') {
      logSet({ exerciseId: item.ex.id, dayId: day.id, done: n >= target })
      if (n >= target && item.section !== 'ramp') captureRecord(item.ex)
    } else if (n >= target) {
      item.block.exercises.forEach((ex) => { logSet({ exerciseId: ex.id, dayId: day.id, done: true }); captureRecord(ex) })
    }
    if (n >= target) {
      if (isLast) window.setTimeout(() => setFinishing(true), 260)
      else window.setTimeout(skip, 260)
    }
  }

  const markWord = item.type === 'circuit' && item.block.tag !== 'big' ? 'vuelta' : 'serie'
  const remaining = target - doneCount
  const primary = {
    label: item.type === 'warmup' ? 'Calentamiento listo' : isTimed ? 'Finalizado' : remaining <= 1 ? `Marcar ${markWord} hecha` : `Marcar ${markWord} (${doneCount + 1}/${target})`,
    onClick: onPrimary,
    icon: item.type === 'warmup' ? <Flame size={18} /> : <Check size={18} />,
  }

  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <button onClick={onClose} className="p-1.5 text-white/60"><X size={22} /></button>
        <div className="flex-1"><Rail value={totalUnits ? totalDone / totalUnits : 0} /></div>
        <span className="text-xs font-bold text-white/50 tabular-nums">Sem {week} · {i + 1}/{items.length}</span>
      </div>

      {/* PR toast */}
      {pr && (
        <div className="mx-4 mb-2 rounded-card border border-gold/50 bg-gold/[0.14] px-3 py-2 flex items-center gap-2 animate-[pop_.3s_ease]">
          <Trophy size={16} className="text-gold" /><span className="text-gold font-bold text-sm">{pr}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5">
        {item.type === 'single'
          ? <SingleView ex={item.ex} dayId={day.id} section={item.section} week={week} done={doneCount} target={target} flash={flash} />
          : item.type === 'warmup'
            ? <WarmupView text={item.text} />
            : <CircuitView block={item.block} dayId={day.id} week={week} round={doneCount} rounds={target} flash={flash} timed={isTimed} />}

        <button onClick={primary.onClick}
          className="mt-5 w-full rounded-full py-4 font-black uppercase tracking-wide flex items-center justify-center gap-2 transition active:scale-[0.97] bg-gold-fill text-ink btn-glow">
          {primary.icon} {primary.label}
        </button>

        {item.type !== 'warmup' && !isTimed && <div className="mt-4"><RestTimer startSignal={restSignal} /></div>}

        {item.type === 'single' && singleLoad(item.ex, week) && (
          <div className="mt-4 mb-6"><PlateCalc perSideKg={resolveWeek(item.ex, week).load.value!} deadlift={isDeadliftName(item.ex.name)} /></div>
        )}
        <div className="h-4" />
      </div>

      <div className="flex items-center gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-white/10">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}
          className="p-3 rounded-full bg-white/5 text-white/70 disabled:opacity-30"><ChevronLeft size={20} /></button>
        {!isLast && (
          <button onClick={skip} className="text-white/45 text-sm font-bold px-3 py-2 ml-auto">Saltar →</button>
        )}
      </div>
    </div>
  )
}

function unitsOf(it: Item, week: number): number {
  if (it.type === 'warmup') return 1
  if (it.type === 'single') return resolveWeek(it.ex, week).sets ?? 1
  if (it.block.timed) return 1 // HIIT: one "Finalizado", not round-by-round
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

// Per-exercise observación (e.g. "no pude terminar", "bajé el peso"). Saved to Seguimiento.
function NoteField({ id, dayId }: { id: string; dayId: string }) {
  const [open, setOpen] = useState(() => !!getNote(id))
  const [text, setText] = useState(() => getNote(id))
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-5 flex items-center gap-2 text-white/55 text-sm font-bold">
        <MessageSquarePlus size={16} className="text-gold/70" /> Agregar observación
      </button>
    )
  }
  return (
    <div className="mt-5">
      <div className="kicker mb-1.5">Tu observación (la ve el coach)</div>
      <textarea value={text} rows={2} onChange={(e) => setText(e.target.value)} onBlur={() => saveNote(id, dayId, text)}
        placeholder="Ej: no pude terminar la última serie / bajé a 25 kg / molestó el hombro"
        className="w-full rounded-card bg-white/5 border border-white/10 p-3 text-white text-sm placeholder:text-white/30 focus:border-gold/40 outline-none resize-none" />
    </div>
  )
}

// Adjust what the member actually did (weight per side / reps). Saved to
// Seguimiento and used for records + progress. Prefilled with the prescription.
function AdjustField({ ex, dayId, week }: { ex: ExerciseRow; dayId: string; week: number }) {
  const r = resolveWeek(ex, week)
  const saved = getActual(ex.id)
  const [open, setOpen] = useState(() => !!saved)
  const [kg, setKg] = useState(() => saved?.kg ?? r.load.value ?? 0)
  const [reps, setReps] = useState(() => saved?.reps ?? r.reps ?? 0)
  const [sets, setSets] = useState(() => saved?.sets ?? r.sets ?? 0)
  const commit = (a: { kg?: number; reps?: number; sets?: number }) => {
    if (a.kg != null) setKg(a.kg); if (a.reps != null) setReps(a.reps); if (a.sets != null) setSets(a.sets)
    saveActual(ex.id, dayId, { kg, reps, sets, ...a })
    // overwrite the matching prescription cell(s) in the routine sheet (only the
    // field the member just changed). Queued + flushed; no-op offline / in demo.
    const writes = buildCellWrites(ex, week, { kg: a.kg, reps: a.reps, series: a.sets })
    if (writes.length) { queueCellWrites(writes); syncOutbox(getToken()).catch(() => {}) }
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 flex items-center gap-2 text-white/55 text-sm font-bold">
        <SlidersHorizontal size={16} className="text-gold/70" /> Ajustar lo que hiciste
      </button>
    )
  }
  return (
    <div className="mt-3 rounded-card bg-white/5 border border-white/10 p-3">
      <div className="kicker mb-2">Lo que hiciste de verdad</div>
      <div className="grid grid-cols-3 gap-2.5">
        <Stepper label={r.load.perSide ? 'Kg x lado' : 'Kg'} value={kg} step={1.25} onChange={(v) => commit({ kg: v })} />
        <Stepper label="Reps" value={reps} step={1} onChange={(v) => commit({ reps: v })} />
        <Stepper label="Series" value={sets} step={1} onChange={(v) => commit({ sets: v })} />
      </div>
      <p className="text-[0.62rem] text-white/40 mt-2">Esto manda. Se usa para tu récord y progreso, y lo ve el coach.</p>
    </div>
  )
}

function Stepper({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-[0.52rem] uppercase tracking-micro text-white/45 font-bold mb-1.5 truncate">{label}</div>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(0, Math.round((value - step) * 100) / 100))} className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-90"><Minus size={13} /></button>
        <div className="flex-1 text-center text-gold text-base font-black tabular-nums">{value}</div>
        <button onClick={() => onChange(Math.round((value + step) * 100) / 100)} className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-90"><Plus size={13} /></button>
      </div>
    </div>
  )
}

// The day's entrada en calor as the opening step. Split the "A + B + C" line the
// coach writes into a short checklist so it reads clearly before the first lift.
function WarmupView({ text }: { text: string }) {
  const parts = text.split('+').map((s) => s.trim()).filter(Boolean)
  return (
    <>
      <div className="kicker flex items-center gap-1.5"><Flame size={13} className="text-gold" /> Entrada en calor</div>
      <h1 className="heading text-3xl text-white mt-1 mb-1">Calentamiento</h1>
      <p className="text-white/50 text-sm mb-4">Activá antes de la primera serie. Hacelo completo, sin apuro.</p>
      <div className="space-y-2">
        {(parts.length ? parts : [text]).map((p, i) => (
          <div key={i} className="flex items-center gap-3 rounded-card bg-white/[0.04] border border-white/10 p-3">
            {parts.length > 1 && <span className="text-gold/70 font-black text-sm w-3 shrink-0">{i + 1}</span>}
            <div className="text-white/85 text-sm leading-snug">{p}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function SingleView({ ex, dayId, section, week, done, target, flash }: {
  ex: ExerciseRow; dayId: string; section: SectionTag; week: number; done: number; target: number; flash: number
}) {
  // non-linear weeks (e.g. "4X1+3X3") carry a per-series rep plan — show the reps
  // for each series and mark the current one so it's trainable, not just raw text.
  const plan = resolveWeek(ex, week).plan
  return (
    <>
      <div className="kicker">{SECTION_LABEL[section]}</div>
      <h1 className="heading text-3xl text-white mt-1 mb-1">{ex.name || '—'}</h1>
      <div className="text-gold text-lg font-black">{setsReps(ex, week)} · {loadText(ex, week)}</div>
      {plan && plan.length > 1 && (
        <div className="text-white/60 text-sm font-bold mt-1">
          {plan.length} series · reps {plan.join(' · ')}
        </div>
      )}
      <TechniqueChips ex={ex} />
      <div className="mt-4 h-36"><AnimatedExercise name={ex.name} pattern={ex.pattern} /></div>
      {plan && plan.length > 1
        ? <Dots n={target} done={done} flash={flash} label={(s) => `${plan[s] ?? ''}`} />
        : <Dots n={target} done={done} flash={flash} />}
      <NoteField id={ex.id} dayId={dayId} />
      {section !== 'ramp' && ex.load.value != null && <AdjustField ex={ex} dayId={dayId} week={week} />}
    </>
  )
}

function CircuitView({ block, dayId, week, round, rounds, flash, timed }: {
  block: Block; dayId: string; week: number; round: number; rounds: number; flash: number; timed: boolean
}) {
  const g = groupInfo(block)
  const word = g.roundWord === 'series' ? 'Serie' : 'Vuelta'
  const seriesCount = circuitRounds(block, week) ?? rounds // real series (timed completion is single)
  const intro = block.tag === 'big'
    ? 'Una serie de cada ejercicio, alternando. Descansá entre series.'
    : 'Hacé una serie de cada ejercicio, una atrás de otra. La pausa, al terminar la vuelta.'
  return (
    <>
      <div className="flex items-center gap-2 kicker"><Repeat size={13} /> {block.title} · {g.text}</div>
      {timed
        ? <h1 className="heading text-3xl text-white mt-1 mb-1">{seriesCount} {seriesCount === 1 ? 'serie' : 'series'} por tiempo</h1>
        : <h1 className="heading text-3xl text-white mt-1 mb-1">{word} {Math.min(round + 1, rounds)} <span className="text-white/30">/ {rounds}</span></h1>}
      {!timed && <p className="text-white/50 text-sm mb-4">{intro}</p>}

      {timed && (
        <div className="rounded-card border border-gold/30 bg-gold/[0.08] p-3 my-3 flex gap-2.5">
          <Megaphone size={16} className="text-gold shrink-0 mt-0.5" />
          <p className="text-white/85 text-sm leading-snug">Pedile al entrenador que arranque el programa de HIIT. Cuando termines, tocá <b className="text-gold">Finalizado</b>.</p>
        </div>
      )}

      <div className="space-y-2">
        {block.exercises.map((ex, idx) => (
          <div key={ex.id} className="flex items-center gap-3 rounded-card bg-white/[0.04] border border-white/10 p-2.5">
            <span className="text-gold/70 font-black text-sm w-3 shrink-0">{idx + 1}</span>
            <AnimatedExercise name={ex.name} pattern={ex.pattern} size="thumb" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm truncate">{ex.name}</div>
              <div className="text-xs text-white/55">{repsCol(ex, week)}{loadText(ex, week) !== '—' ? ` · ${loadText(ex, week)}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
      {!timed && <Dots n={rounds} done={round} flash={flash} label={(s) => `V${s + 1}`} />}
      <NoteField id={`${dayId}-${block.tag}`} dayId={dayId} />
    </>
  )
}

function repsCol(ex: ExerciseRow, week: number): string {
  const r = repsText(ex, week)
  return ex.timeSec != null ? r : `${r} reps`
}

// A day-tab that has a warm-up (or nothing) but no logged exercises.
function EmptyDay({ day, onClose }: { day: RoutineDay; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col max-w-md mx-auto">
      <div className="flex items-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <button onClick={onClose} className="p-1.5 text-white/60"><X size={22} /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
        <h1 className="heading text-2xl text-white">{day.label.replace('DÍA', 'Día')}</h1>
        {day.warmup && <p className="text-white/70 text-sm leading-relaxed">{day.warmup}</p>}
        <p className="text-white/45 text-sm">Este día no tiene ejercicios cargados todavía. Avisale a tu coach.</p>
        <button onClick={onClose} className="btn-glow mt-2 rounded-full bg-gold-fill text-ink font-black uppercase px-8 py-3">Volver</button>
      </div>
    </div>
  )
}

// ---- finish: session RPE + note ------------------------------------------
function Finish({ day, week, lastWeek, onClose, onBack }: {
  day: RoutineDay; week: number; lastWeek?: boolean; onClose: () => void; onBack: () => void
}) {
  const [rpe, setRpe] = useState(7)
  const [note, setNote] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const bigOne = day.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name
  // reaching this screen means the whole day is done → register attendance
  // automatically (no manual "Registrar que viniste hoy" button anymore).
  useEffect(() => { if (!hasCheckedInToday()) addCheckin() }, [])
  // record the completed session. The RPE/note are optional enrichment — "Saltar"
  // still saves the session (without them) so the day is NEVER lost; only the
  // rating is skipped.
  const persist = (withRpe: boolean) => logSession({
    date: localDate(), dayId: day.id, week, dayLabel: day.label, bigOne,
    ...(withRpe ? { rpe, note: note.trim() || undefined } : {}),
  })
  const save = () => { persist(true); setCelebrating(true) }
  const skip = () => { persist(false); setCelebrating(true) }
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
    <div className="fixed inset-0 z-40 bg-dark-stage flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-white/55 text-sm font-bold -ml-1 mb-3 self-start">
        <ChevronLeft size={18} /> Volver al entrenamiento
      </button>
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
        <button onClick={skip} className="px-5 rounded-full bg-white/5 text-white/60 font-bold py-4">Saltar</button>
        <button onClick={save} className="btn-glow flex-1 rounded-full bg-gold-fill text-ink font-black uppercase py-4">
          Guardar y cerrar
        </button>
      </div>
    </div>
  )
}
