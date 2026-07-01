import { useEffect, useMemo, useState } from 'react'
import type { RoutineDay, ExerciseRow, SectionTag, Block } from '../lib/types'
import { setsReps, loadText, repsText, TechniqueChips } from '../components/TechniqueChips'
import { PlateCalc } from '../components/PlateCalc'
import { isDeadliftName } from '../lib/plates'
import { RestTimer } from '../components/RestTimer'
import { AnimatedExercise, detectImpl } from '../components/AnimatedExercise'
import { LastTime } from '../components/LastTime'
import { groupInfo } from '../components/DayView'
import { Rail, BottomSheet } from '../components/ui'
import { resolveWeek, circuitRounds } from '../lib/week'
import { logSet, logSession, localDate, getNote, saveNote, getActual, saveActual, getGender, getClientName, getMyRecords, addMyRecord, getToken, queueCellWrites, getBodyweight, addCheckin, hasCheckedInToday, setLastDone, getCheckins, getSessions, getSeenMedals, markMedalsSeen, getSessionProgress, saveSessionProgress, clearSessionProgress } from '../lib/store'
import { matchRecordLift, recordKg, bestOf, liftLabel, noteWeight, weightClass, wcLabel } from '../lib/records'
import { currentStreakWeeks } from '../lib/metrics'
import {
  type Tier, TIER_LABEL, defaultCat, strengthThresholds, strengthMedals, earnedMedalIds, STREAK_LADDER, SESSION_LADDER,
} from '../lib/medals'
import { submitRecord, syncOutbox } from '../lib/api'
import { buildCellWrites } from '../lib/sheetWrite'
import { Celebration } from '../components/Celebration'
import { ShareCard, type ShareData } from '../components/ShareCard'
import { X, ChevronLeft, Check, Repeat, MessageSquarePlus, Trophy, Megaphone, SlidersHorizontal, Minus, Plus, Flame, ListChecks, Circle, CheckCircle2 } from 'lucide-react'

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
  // restore an in-progress session for THIS day today (so leaving never wipes it)
  const saved = getSessionProgress()
  const restored = saved && saved.dayId === day.id && saved.date === localDate() ? saved : null
  const [i, setI] = useState(restored?.i ?? 0)
  const [done, setDone] = useState<Record<string, number>>(restored?.done ?? {})
  const [flash, setFlash] = useState(-1)
  const [pr, setPr] = useState<string | null>(null)
  const [restSignal, setRestSignal] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [overview, setOverview] = useState(false)
  const [prHits, setPrHits] = useState<Set<string>>(new Set()) // exercise ids that set a PR this session

  const totalUnits = items.reduce((a, it) => a + unitsOf(it, week), 0)
  const totalDone = Object.values(done).reduce((a, b) => a + b, 0)

  // persist progress on every change so backgrounding / leaving keeps it
  useEffect(() => {
    if (!finishing) saveSessionProgress({ dayId: day.id, date: localDate(), i, done })
  }, [i, done, finishing, day.id])

  if (finishing) return <Finish day={day} week={week} lastWeek={lastWeek} prHits={prHits} onClose={onClose} onBack={() => setFinishing(false)} />
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
    setPrHits((s) => new Set(s).add(ex.id))
    setPr(`¡Récord! ${liftLabel(lift)}: ${kg} kg × ${reps}`)
    window.setTimeout(() => setPr(null), 3600)
  }

  // snapshot what was done for this exercise, to show as "la vez pasada" next time
  const recordLastDone = (ex: ExerciseRow) => {
    const r = resolveWeek(ex, week)
    const act = getActual(ex.id)
    const kg = act?.kg ?? r.load.value ?? null
    const reps = act?.reps ?? r.reps ?? null
    if (kg == null && reps == null) return
    setLastDone(ex.id, { kg, reps, perSide: r.load.perSide, date: localDate() })
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
      if (n >= target && item.section !== 'ramp') { captureRecord(item.ex); recordLastDone(item.ex) }
    } else if (n >= target) {
      item.block.exercises.forEach((ex) => { logSet({ exerciseId: ex.id, dayId: day.id, done: true }); captureRecord(ex); recordLastDone(ex) })
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
      <div className="flex items-center gap-2.5 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <button onClick={onClose} className="p-1.5 text-white/60"><X size={22} /></button>
        <div className="flex-1"><Rail value={totalUnits ? totalDone / totalUnits : 0} /></div>
        <span className="text-xs font-bold text-white/50 tabular-nums">Sem {week} · {i + 1}/{items.length}</span>
        <button onClick={() => setOverview(true)} aria-label="Ver toda la sesión" className="p-1.5 text-white/60"><ListChecks size={20} /></button>
      </div>

      {overview && (
        <OverviewSheet items={items} week={week} done={done} current={i}
          onPick={(idx) => { setI(idx); setOverview(false) }} onClose={() => setOverview(false)} />
      )}

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
      {section !== 'ramp' && <div><LastTime exId={ex.id} /></div>}
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

function keyOf(it: Item): string {
  return it.type === 'single' ? it.ex.id : it.type === 'warmup' ? 'warmup' : `c-${it.block.tag}`
}
function itemLabel(it: Item): string {
  return it.type === 'warmup' ? 'Entrada en calor' : it.type === 'single' ? (it.ex.name || '—') : it.block.title
}
function itemSub(it: Item, week: number): string {
  if (it.type === 'warmup') return 'Antes de arrancar'
  if (it.type === 'single') { const l = loadText(it.ex, week); return `${setsReps(it.ex, week)}${l !== '—' ? ` · ${l}` : ''}` }
  const r = circuitRounds(it.block, week)
  return `${it.block.exercises.length} ejercicios${r ? ` · ${r} vueltas` : ''}`
}

// See the whole session at a glance (to prep equipment for what's next) and jump
// to any step — WITHOUT leaving Entrenar or losing progress.
function OverviewSheet({ items, week, done, current, onPick, onClose }: {
  items: Item[]; week: number; done: Record<string, number>; current: number
  onPick: (idx: number) => void; onClose: () => void
}) {
  return (
    <BottomSheet open onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <div className="kicker mb-1">Tu sesión de hoy</div>
        <p className="text-white/45 text-xs mb-3">Mirá lo que viene y preparate. Tocá para saltar a un ejercicio.</p>
        <div className="space-y-1.5">
          {items.map((it, idx) => {
            const complete = (done[keyOf(it)] ?? 0) >= unitsOf(it, week)
            const isCur = idx === current
            const sub = itemSub(it, week)
            return (
              <button key={idx} onClick={() => onPick(idx)}
                className={`w-full flex items-center gap-3 rounded-card border p-3 text-left active:scale-[0.99] ${isCur ? 'border-gold/50 bg-gold/[0.10]' : 'border-white/8 bg-white/[0.03]'}`}>
                {complete ? <CheckCircle2 size={18} className="text-gold shrink-0" /> : <Circle size={18} className={`shrink-0 ${isCur ? 'text-gold' : 'text-white/25'}`} />}
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm truncate ${complete ? 'text-white/45 line-through' : 'text-white'}`}>{idx + 1}. {itemLabel(it)}</div>
                  <div className="text-xs text-white/45 truncate">{sub}</div>
                </div>
                {isCur && <span className="text-[0.55rem] uppercase tracking-micro font-black text-gold shrink-0">Acá vas</span>}
              </button>
            )
          })}
        </div>
      </div>
    </BottomSheet>
  )
}

// rioplatense lines about showing up + finishing (for the shareable finish card)
const COMMIT_QUOTES = [
  'Viniste, la peleaste y la terminaste. Eso es lo que te hace fuerte.',
  'No fue suerte: fue que apareciste. Otro día que sumás. 💪',
  'El que vuelve siempre, gana siempre. Bien ahí por no faltar.',
  'Lo difícil no era el peso, era venir — y viniste.',
  'Cada sesión terminada es una promesa que te cumplís. Seguí así.',
]

function sessionStats(day: RoutineDay, week: number): { kg: number; series: number } {
  let kg = 0, series = 0
  for (const b of day.blocks) for (const ex of b.exercises) {
    const r = resolveWeek(ex, week)
    const s = r.sets ?? r.plan?.length ?? 0
    series += s
    if (r.load.value != null) {
      const reps = r.reps ?? (r.plan?.length ? Math.round(r.plan.reduce((a, n) => a + n, 0) / r.plan.length) : 0)
      kg += recordKg(r.load.value, r.load.perSide, detectImpl(ex.name) === 'barbell') * reps * s
    }
  }
  return { kg: Math.round(kg), series }
}

function bigOneRow(ex: ExerciseRow, week: number, prHits: Set<string>): { name: string; detail: string; record: boolean } {
  const r = resolveWeek(ex, week)
  const reps = r.reps != null ? `${r.reps}` : (r.plan?.length ? r.plan.join('·') : '')
  const detail = r.load.value != null
    ? `${r.load.value.toLocaleString('es-AR')} kg${r.load.perSide ? '/lado' : ''}${reps ? ` × ${reps}` : ''}`
    : setsReps(ex, week)
  return { name: ex.name, detail, record: prHits.has(ex.id) }
}

function idToCard(id: string, gender: 'M' | 'F', cat: never, records: ReturnType<typeof getMyRecords>, name: string): ShareData | null {
  if (id.startsWith('str:')) {
    const [, lift, tier] = id.split(':')
    const thr = strengthThresholds(lift, gender, cat); if (!thr) return null
    const dom = lift === 'dominadas'
    const val = thr[tier as 'bronce' | 'plata' | 'oro']
    const sm = strengthMedals(records, gender, cat).find((m) => m.lift === lift)
    const kg = (n: number) => n.toLocaleString('es-AR')
    const nextText = sm?.nextTier ? `${TIER_LABEL[sm.nextTier]} · ${dom ? '+' : ''}${kg(sm.nextAt!)} kg${dom ? ' lastre' : ''}` : undefined
    return { kind: 'medal', name, tier: tier as Tier, lift: liftLabel(lift), thresholdText: dom ? `+${kg(val)} kg de lastre` : `${kg(val)} kg`, category: wcLabel(cat), nextText }
  }
  if (id.startsWith('streak:')) { const n = +id.split(':')[1]; return { kind: 'medal', name, tier: STREAK_LADDER.find((s) => s.n === n)?.tier, lift: 'Racha', thresholdText: `${n} semanas seguidas` } }
  if (id.startsWith('sessions:')) { const n = +id.split(':')[1]; return { kind: 'medal', name, tier: SESSION_LADDER.find((s) => s.n === n)?.tier, lift: 'Entrenamientos', thresholdText: `${n} entrenamientos` } }
  return null
}

// New medals earned this session → unlock cards (ladders last, capped so it never floods).
function computeUnlockCards(): ShareData[] {
  const gender = getGender(); if (!gender) return []
  const cat = (weightClass(gender, getBodyweight())?.key ?? defaultCat(gender)) as never
  const records = getMyRecords()
  const earned = earnedMedalIds(records, gender, cat, currentStreakWeeks(getCheckins()), getSessions().length)
  const fresh = earned.filter((id) => !getSeenMedals().includes(id))
  markMedalsSeen(earned)
  const name = getClientName() ?? 'Vos'
  return fresh
    .map((id) => idToCard(id, gender, cat, records, name))
    .filter((c): c is ShareData => !!c)
    .sort((a, b) => (a.lift === 'Racha' || a.lift === 'Entrenamientos' ? 1 : 0) - (b.lift === 'Racha' || b.lift === 'Entrenamientos' ? 1 : 0))
    .slice(0, 3)
}

// ---- finish: session RPE + note, then celebrate + share + medal unlocks ----
function Finish({ day, week, lastWeek, prHits, onClose, onBack }: {
  day: RoutineDay; week: number; lastWeek?: boolean; prHits: Set<string>; onClose: () => void; onBack: () => void
}) {
  const [rpe, setRpe] = useState(7)
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<'rpe' | 'celebrate' | 'medals'>('rpe')
  const [shareFinish, setShareFinish] = useState(false)
  const [queue, setQueue] = useState<ShareData[]>([])
  const bigBlock = day.blocks.find((b) => b.tag === 'big')
  const bigOne = bigBlock?.exercises[0]?.name
  const quote = useMemo(() => COMMIT_QUOTES[[...day.id].reduce((a, c) => a + c.charCodeAt(0), 0) % COMMIT_QUOTES.length], [day.id])
  // reaching this screen means the whole day is done → register attendance
  // automatically (no manual "Registrar que viniste hoy" button anymore).
  useEffect(() => { if (!hasCheckedInToday()) addCheckin() }, [])
  // "Saltar" still saves the session (without RPE) so the day is NEVER lost.
  const persist = (withRpe: boolean) => logSession({
    date: localDate(), dayId: day.id, week, dayLabel: day.label, bigOne,
    ...(withRpe ? { rpe, note: note.trim() || undefined } : {}),
  })
  const finishData = (): ShareData => {
    const s = sessionStats(day, week)
    return {
      kind: 'finish', name: getClientName() ?? 'Vos', dayLabel: day.label.replace('DÍA', 'Día'), week,
      totalKg: s.kg, series: s.series, streak: currentStreakWeeks(getCheckins()),
      bigOnes: (bigBlock?.exercises ?? []).map((ex) => bigOneRow(ex, week, prHits)), quote,
    }
  }
  const finish = (withRpe: boolean) => { persist(withRpe); clearSessionProgress(); setQueue(computeUnlockCards()); setPhase('celebrate') }
  const save = () => finish(true)
  const skip = () => finish(false)

  if (phase === 'celebrate') {
    return (
      <>
        <Celebration
          title={`${day.label.replace('DÍA', 'Día')} completado`}
          extra={lastWeek ? 'Cerraste la última semana del ciclo. ¡Avisale a tu coach para armar el próximo! 💪' : undefined}
          onClose={() => (queue.length ? setPhase('medals') : onClose())}
          onShare={() => setShareFinish(true)}
        />
        {shareFinish && <ShareCard data={finishData()} onClose={() => setShareFinish(false)} />}
      </>
    )
  }
  if (phase === 'medals') {
    const card = queue[0]
    if (!card) { onClose(); return null }
    return <ShareCard data={card} onClose={() => { setQueue((q) => q.slice(1)); if (queue.length <= 1) onClose() }} />
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
