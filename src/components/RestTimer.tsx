import { useEffect, useRef, useState } from 'react'
import { getRestPref, setRestPref } from '../lib/store'
import { Timer, Play, Pause, RotateCcw, Minus, Plus, BellRing } from 'lucide-react'

// Client-controlled rest timer. The member sets their OWN pause length (saved &
// adjustable) and starts it manually when they want — it never auto-fires when
// moving between sets, because doing the set itself takes time. When it runs out
// it signals clearly: a chime, a vibration and a flashing card — easy to catch
// even with the phone face-down on the bench.

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function RestTimer({ startSignal = 0 }: { startSignal?: number }) {
  const [pref, setPref] = useState(getRestPref())
  const [secs, setSecs] = useState<number | null>(null) // null = idle
  const [running, setRunning] = useState(false)
  const ref = useRef<number | null>(null)
  const audio = useRef<AudioContext | null>(null)

  // RESET the pause to "ready" whenever the member marks a set done — it does
  // NOT auto-start; the member taps Iniciar when they actually begin resting.
  useEffect(() => {
    if (startSignal > 0) { setSecs(null); setRunning(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal])

  useEffect(() => {
    if (!running) return
    ref.current = window.setInterval(() => {
      setSecs((s) => {
        if (s == null) return s
        if (s <= 1) {
          setRunning(false)
          signalDone(audio.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  // release the audio context when the timer unmounts
  useEffect(() => () => { audio.current?.close().catch(() => {}) }, [])

  const adjust = (d: number) => {
    const v = Math.max(15, Math.min(600, pref + d))
    setPref(v); setRestPref(v)
  }
  const start = () => {
    // create/resume the AudioContext from this user gesture so iOS lets the
    // end-of-pause chime actually play later (autoplay is blocked otherwise).
    try {
      type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext }
      const Ctx = window.AudioContext ?? (window as WithWebkit).webkitAudioContext
      if (Ctx) { audio.current ??= new Ctx(); audio.current.resume?.() }
    } catch { /* no-op */ }
    setSecs(pref); setRunning(true)
  }
  const reset = () => { setSecs(null); setRunning(false) }
  const done = secs === 0

  return (
    <div className={`rounded-card glass p-4 transition ${done ? 'rest-done ring-2 ring-gold bg-gold/[0.14]' : ''}`}>
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
          {done ? (
            <span className="text-3xl font-black flex-1 text-gold flex items-center gap-2">
              <BellRing size={26} className="animate-[pop_.4s_ease] text-gold" /> ¡A darle!
            </span>
          ) : (
            <span className="text-4xl font-black tabular-nums flex-1 text-white">{fmt(secs)}</span>
          )}
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

// End-of-pause signal: a two-note chime + a triple buzz. Both are best-effort —
// either may be blocked/absent, so we fire both for the best chance of catching it.
function signalDone(ctx: AudioContext | null): void {
  try { navigator.vibrate?.([140, 70, 140, 70, 200]) } catch { /* no-op */ }
  if (!ctx) return
  try {
    const tone = (freq: number, at: number, dur = 0.18) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = freq
      o.connect(g); g.connect(ctx.destination)
      const t = ctx.currentTime + at
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.start(t); o.stop(t + dur + 0.02)
    }
    tone(880, 0)      // A5
    tone(1318.5, 0.2) // E6 — a bright "ready!" interval
  } catch { /* no-op */ }
}
