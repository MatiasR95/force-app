import { useEffect, useState } from 'react'
import { getRestPref, setRestPref } from '../lib/store'
import { getRest, subscribeRest, restRemaining, startRest, pauseRest, resumeRest, resetRest, tickRest } from '../lib/restTimer'
import { Timer, Play, Pause, RotateCcw, Minus, Plus, BellRing } from 'lucide-react'

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

// The full timer control shown inside Entrenar. The member sets their own pause and
// starts it; it then runs on the wall clock (survives background) and the app-wide
// host fires the chime/vibration/notification when it ends.
export function RestTimer({ startSignal = 0 }: { startSignal?: number }) {
  const [pref, setPref] = useState(getRestPref())
  const { state, remaining } = useRest()

  // marking a set resets the pause to "ready" (member taps Iniciar when they rest)
  useEffect(() => { if (startSignal > 0) resetRest() /* eslint-disable-next-line */ }, [startSignal])

  const adjust = (d: number) => { const v = Math.max(15, Math.min(600, pref + d)); setPref(v); setRestPref(v) }
  const done = state.status === 'done'
  const active = state.status === 'running' || state.status === 'paused'

  return (
    <div className={`rounded-card glass p-4 transition ${done ? 'rest-done ring-2 ring-gold bg-gold/[0.14]' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Timer size={16} className="text-gold" />
        <span className="kicker">Pausa</span>
        <span className="text-[0.62rem] text-white/40 ml-auto">la manejás vos</span>
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
        <div className="flex items-center gap-3">
          {done ? (
            <span className="text-3xl font-black flex-1 text-gold flex items-center gap-2">
              <BellRing size={26} className="animate-[pop_.4s_ease] text-gold" /> ¡A darle!
            </span>
          ) : (
            <span className="text-4xl font-black tabular-nums flex-1 text-white">{fmt(remaining)}</span>
          )}
          {active && (
            <button onClick={() => (state.status === 'running' ? pauseRest() : resumeRest())} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70">
              {state.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
            </button>
          )}
          <button onClick={() => resetRest()} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70"><RotateCcw size={18} /></button>
        </div>
      )}
    </div>
  )
}
