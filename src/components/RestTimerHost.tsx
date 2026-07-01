import { useEffect } from 'react'
import { useRest } from './RestTimer'
import { resetRest } from '../lib/restTimer'
import { Timer, BellRing, X } from 'lucide-react'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// App-wide rest-timer watcher + floating pill. Mounted once in App: the watcher
// (via useRest's tick) fires the end alert on any screen; the pill lets the member
// see the pause counting while they browse other tabs. Hidden while Entrenar is
// open (that screen has the full timer) and when idle.
export function RestTimerHost({ showPill }: { showPill: boolean }) {
  const { state, remaining } = useRest()

  // re-check the moment the app regains focus (background timers get throttled)
  useEffect(() => {
    const onVis = () => { /* useRest's interval calls tickRest; this nudges a render */ }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [])

  if (!showPill || state.status === 'idle') return null
  const done = state.status === 'done'
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex justify-center px-4 pointer-events-none max-w-md mx-auto">
      <div className={`pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2.5 backdrop-blur shadow-lg
        ${done ? 'rest-done border-gold bg-gold/[0.18]' : 'border-white/12 bg-black/80'}`}>
        {done ? <BellRing size={17} className="text-gold" /> : <Timer size={16} className="text-gold" />}
        <span className={`font-black tabular-nums ${done ? 'text-gold' : 'text-white'}`}>
          {done ? '¡Descanso listo!' : `Pausa ${fmt(remaining)}`}
        </span>
        <button onClick={() => resetRest()} aria-label="Cerrar" className="ml-1 h-6 w-6 grid place-items-center rounded-full bg-white/10 text-white/70 active:scale-90"><X size={14} /></button>
      </div>
    </div>
  )
}
