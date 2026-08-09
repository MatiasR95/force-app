import { useEffect, useMemo, useState } from 'react'
import { getRestPref, setRestPref, getRestEduPref, setRestEduPref } from '../lib/store'
import { getRest, subscribeRest, restRemaining, startRest, pauseRest, resumeRest, resetRest, tickRest, extendRest } from '../lib/restTimer'
import { nextEducation } from '../lib/restEducation'
import { RestExplainer } from './RestExplainer'
import { BreathePacer } from './BreathePacer'
import { RestDial } from './RestDial'
import { Timer, Play, Pause, RotateCcw, Minus, Plus, BookOpen, X } from 'lucide-react'

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
              className={`ml-auto min-h-[44px] px-2 -mr-2 text-[0.58rem] flex items-center gap-1 ${eduPref ? 'text-white/35' : 'text-gold/80'}`}
              aria-label={eduPref ? 'Ocultar datos' : 'Mostrar datos'}>
              {eduPref ? <><X size={11} /> datos</> : <><BookOpen size={11} /> datos</>}
            </button>
          )}
          {!active && <span className="text-[0.62rem] text-white/40 ml-auto">la manejás vos</span>}
        </div>

        {!active && !done ? (
          /* Two rows, not four items on one line: at the larger text scales the
             ± / readout / Iniciar row ran past the card and turned the whole shell
             into a horizontal scroller. Iniciar now owns its own full-width row. */
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => adjust(-15)} aria-label="Menos 15 segundos de descanso" className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Minus size={18} /></button>
              <div className="flex-1 min-w-0 text-center">
                <div className="text-3xl font-black tabular-nums text-white">{fmt(pref)}</div>
                <div className="text-[0.58rem] uppercase tracking-micro text-white/40 font-bold">tu descanso</div>
              </div>
              <button onClick={() => adjust(15)} aria-label="Más 15 segundos de descanso" className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Plus size={18} /></button>
            </div>
            <button onClick={() => startRest(pref)} className="btn-glow w-full px-5 h-12 rounded-full bg-gold-fill text-ink font-black uppercase text-sm flex items-center justify-center gap-1.5 active:scale-95">
              <Play size={16} /> Iniciar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <RestDial remaining={remaining} total={pref} done={done} paused={state.status === 'paused'} />
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {state.status === 'running' && (
                <button onClick={() => extendRest(30)} aria-label="Sumar 30 segundos"
                  className="min-h-[44px] px-4 rounded-full bg-white/5 border border-gold/30 text-gold text-sm font-black active:scale-95">
                  +30s
                </button>
              )}
              {active && (
                <button onClick={() => (state.status === 'running' ? pauseRest() : resumeRest())} aria-label={state.status === 'running' ? 'Pausar el descanso' : 'Seguir el descanso'} className="h-11 w-11 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95">
                  {state.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
                </button>
              )}
              <button onClick={() => resetRest()} aria-label="Reiniciar el descanso" className="h-11 w-11 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><RotateCcw size={18} /></button>
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
