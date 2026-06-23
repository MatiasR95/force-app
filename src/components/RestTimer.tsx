import { useEffect, useRef, useState } from 'react'
import { getRestPref, setRestPref } from '../lib/store'
import { Timer, Play, Pause, RotateCcw, Minus, Plus } from 'lucide-react'

// Client-controlled rest timer. The member sets their OWN pause length (saved &
// adjustable) and starts it manually when they want — it never auto-fires when
// moving between sets, because doing the set itself takes time.

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function RestTimer() {
  const [pref, setPref] = useState(getRestPref())
  const [secs, setSecs] = useState<number | null>(null) // null = idle
  const [running, setRunning] = useState(false)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    ref.current = window.setInterval(() => {
      setSecs((s) => {
        if (s == null) return s
        if (s <= 1) {
          setRunning(false)
          try { navigator.vibrate?.([120, 60, 120]) } catch { /* no-op */ }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  const adjust = (d: number) => {
    const v = Math.max(15, Math.min(600, pref + d))
    setPref(v); setRestPref(v)
  }
  const start = () => { setSecs(pref); setRunning(true) }
  const reset = () => { setSecs(null); setRunning(false) }

  return (
    <div className="rounded-card glass p-4">
      <div className="flex items-center gap-2 mb-3">
        <Timer size={16} className="text-gold" />
        <span className="kicker">Pausa</span>
        <span className="text-[0.62rem] text-white/40 ml-auto">la manejás vos</span>
      </div>

      {secs == null ? (
        <div className="flex items-center gap-3">
          <button onClick={() => adjust(-15)} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Minus size={18} /></button>
          <div className="flex-1 text-center">
            <div className="text-3xl font-black tabular-nums text-white">{fmt(pref)}</div>
            <div className="text-[0.58rem] uppercase tracking-micro text-white/40 font-bold">tu descanso</div>
          </div>
          <button onClick={() => adjust(15)} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Plus size={18} /></button>
          <button onClick={start} className="btn-glow ml-1 px-5 h-11 rounded-full bg-gold-fill text-ink font-black uppercase text-sm flex items-center gap-1.5 active:scale-95">
            <Play size={16} /> Iniciar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className={`text-4xl font-black tabular-nums flex-1 ${secs === 0 ? 'text-gold' : 'text-white'}`}>
            {secs === 0 ? '¡Listo!' : fmt(secs)}
          </span>
          {secs > 0 && (
            <button onClick={() => setRunning((r) => !r)} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70">
              {running ? <Pause size={18} /> : <Play size={18} />}
            </button>
          )}
          <button onClick={reset} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70"><RotateCcw size={18} /></button>
        </div>
      )}
    </div>
  )
}
