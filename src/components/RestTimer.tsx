import { useEffect, useMemo, useState } from 'react'
import { getRestPref, setRestPref, getRestEduPref, setRestEduPref } from '../lib/store'
import { getRest, subscribeRest, restRemaining, startRest, pauseRest, resumeRest, resetRest, tickRest, extendRest } from '../lib/restTimer'
import { nextEducation } from '../lib/restEducation'
import { RestExplainer } from './RestExplainer'
import { BreathePacer } from './BreathePacer'
import { Timer, Play, Pause, RotateCcw, Minus, Plus, Flame, BookOpen, X } from 'lucide-react'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Subscribe to the global rest-timer + re-render every ~250ms while it counts.
export function useRest() {
  const [, force] = useState(0)
  useEffect(() => {
    const bump = () => force((n) => n + 1)
    const unsub = subscribeRest(bump)
    const iv = window.setInterval(() => { tickRest(); bump() }, 250)
    return () => { unsub(); clearInterval(iv) }
  }, [])
  return { state: getRest(), remaining: restRemaining() }
}

const R = 52
const CIRC = 2 * Math.PI * R

// A radial gold dial: the arc depletes clockwise as the pause runs down, and
// holds a bright glow-pulse + echo ring when it hits zero.
function RestRing({ remaining, total, done }: { remaining: number; total: number; done: boolean }) {
  const p = done ? 1 : total > 0 ? 1 - remaining / total : 0
  return (
    <div className="relative w-[132px] h-[132px] mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#3A3832" strokeWidth="8" />
        {done && <circle className="ring-echo" cx="60" cy="60" r={R} fill="none" stroke="#F0E2BE" strokeWidth="8" />}
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="8" strokeLinecap="round"
          stroke={done ? '#F0E2BE' : '#C6AE78'} strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - p)} style={{ transition: 'stroke-dashoffset .95s linear, stroke .3s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {done ? (
          <span className="ring-pop text-gold-pale flex flex-col items-center leading-none">
            <Flame size={26} className="text-gold mb-1" />
            <span className="text-xl font-black">¡Metele!</span>
          </span>
        ) : (
          <>
            <span className="text-3xl font-black tabular-nums text-white leading-none">{fmt(remaining)}</span>
            <span className="text-[0.55rem] uppercase tracking-micro text-gold-deep font-bold mt-1">próxima serie</span>
          </>
        )}
      </div>
    </div>
  )
}

// One-time opt-in ask for rest-time micro-education.
function EduOptIn({ onChoose }: { onChoose: (v: boolean) => void }) {
  return (
    <div className="mt-3 rounded-card border border-gold/25 bg-gold/[0.06] p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <BookOpen size={14} className="text-gold" />
        <span className="kicker">Mientras descansás</span>
      </div>
      <p className="text-white/75 text-[0.8rem] leading-snug mb-2.5">
        ¿Querés aprender algo de tu cuerpo en cada pausa? Datos cortos sobre cómo funcionás al entrenar. Lo activás o desactivás cuando quieras.
      </p>
      <div className="flex gap-2">
        <button onClick={() => onChoose(true)} className="flex-1 rounded-full bg-gold-fill text-ink font-black text-sm py-2 active:scale-95">Sí, mostrame</button>
        <button onClick={() => onChoose(false)} className="flex-1 rounded-full bg-white/5 border border-white/10 text-white/70 font-bold text-sm py-2 active:scale-95">Ahora no</button>
      </div>
    </div>
  )
}

// The full timer control shown inside Entrenar. The member sets their own pause and
// starts it; it then runs on the wall clock (survives background) and the app-wide
// host fires the chime/vibration/notification when it ends.
export function RestTimer({ startSignal = 0 }: { startSignal?: number }) {
  const [pref, setPref] = useState(getRestPref())
  const [eduPref, setEduPrefState] = useState(getRestEduPref())
  const { state, remaining } = useRest()

  // marking a set resets the pause to "ready" (member taps Iniciar when they rest)
  useEffect(() => { if (startSignal > 0) resetRest() /* eslint-disable-next-line */ }, [startSignal])

  // pick one explainer per pause (stable while this pause is on screen)
  const eduId = useMemo(() => (eduPref ? nextEducation().id : null), [startSignal, eduPref])

  const adjust = (d: number) => { const v = Math.max(15, Math.min(600, pref + d)); setPref(v); setRestPref(v) }
  const choose = (v: boolean) => { setRestEduPref(v); setEduPrefState(v) }
  const done = state.status === 'done'
  const active = state.status === 'running' || state.status === 'paused'

  return (
    <>
      <div className={`rounded-card glass p-4 transition ${done ? 'ring-2 ring-gold bg-gold/[0.14]' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <Timer size={16} className="text-gold" />
          <span className="kicker">Pausa</span>
          {/* datos toggle: reflects the current state so it's ALWAYS reversible —
              hide when on, bring back when off (once the member has chosen once). */}
          {active && eduPref != null && (
            <button onClick={() => choose(!eduPref)}
              className={`ml-auto text-[0.58rem] flex items-center gap-1 ${eduPref ? 'text-white/35' : 'text-gold/80'}`}
              aria-label={eduPref ? 'Ocultar datos' : 'Mostrar datos'}>
              {eduPref ? <><X size={11} /> datos</> : <><BookOpen size={11} /> datos</>}
            </button>
          )}
          {!active && <span className="text-[0.62rem] text-white/40 ml-auto">la manejás vos</span>}
        </div>

        {!active && !done ? (
          <div className="flex items-center gap-3">
            <button onClick={() => adjust(-15)} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Minus size={18} /></button>
            <div className="flex-1 text-center">
              <div className="text-3xl font-black tabular-nums text-white">{fmt(pref)}</div>
              <div className="text-[0.58rem] uppercase tracking-micro text-white/40 font-bold">tu descanso</div>
            </div>
            <button onClick={() => adjust(15)} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Plus size={18} /></button>
            <button onClick={() => startRest(pref)} className="btn-glow ml-1 px-5 h-11 rounded-full bg-gold-fill text-ink font-black uppercase text-sm flex items-center gap-1.5 active:scale-95">
              <Play size={16} /> Iniciar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <RestRing remaining={remaining} total={pref} done={done} />
            <div className="flex items-center gap-3">
              {state.status === 'running' && (
                <button onClick={() => extendRest(30)}
                  className="h-10 px-3.5 rounded-full bg-white/5 border border-gold/30 text-gold text-sm font-black active:scale-95">
                  +30s
                </button>
              )}
              {active && (
                <button onClick={() => (state.status === 'running' ? pauseRest() : resumeRest())} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70">
                  {state.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
                </button>
              )}
              <button onClick={() => resetRest()} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70"><RotateCcw size={18} /></button>
            </div>
            {/* box-breathing guide while the pause runs (not on the "time's up" state) */}
            {active && <BreathePacer />}
          </div>
        )}
      </div>

      {/* opt-in ask (first pauses) or the rotating explainer while resting */}
      {active && eduPref == null && <EduOptIn onChoose={choose} />}
      {active && eduPref && eduId && <div className="mt-3"><RestExplainer id={eduId} /></div>}
    </>
  )
}
