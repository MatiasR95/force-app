import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Gauge } from 'lucide-react'

// Tempo pacer.
//
// Coaches write a tempo in the sheet ("3:1:0" = three seconds down, one held, up
// fast) and the app used to render it as a dead chip. Tempo is the one variable a
// member can't self-check mid-set — you cannot count seconds and brace at the same
// time — so this turns it into something trainable: a gold marker that walks the
// prescribed seconds, phase by phase, looping until they stop it.
//
// Silent by design (the gym is loud and the rest chime already owns audio): the
// cue is visual, with a short haptic tick at each phase change.

interface Phase { word: string; sec: number }

/** "3:1:0" → the phases actually worth pacing. A 0 on the concentric means
 *  "as fast as you can", which still needs a beat on screen, not a skip. */
export function parseTempo(value: string): Phase[] | null {
  const n = value.split(':').map((s) => Number(s.trim()))
  if (n.length !== 3 || n.some((v) => !Number.isFinite(v) || v < 0)) return null
  const [ecc, hold, con] = n
  const out: Phase[] = []
  out.push({ word: 'Bajá', sec: ecc > 0 ? ecc : 1 })
  if (hold > 0) out.push({ word: 'Sostené', sec: hold })
  out.push({ word: con > 0 ? 'Subí' : 'Explotá', sec: con > 0 ? con : 0.7 })
  return out
}

export function TempoPacer({ value }: { value: string }) {
  const phases = parseTempo(value)
  const [running, setRunning] = useState(false)
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(0)
  const [reps, setReps] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!running || !phases) return
    const total = phases.map((p) => p.sec)
    let t0 = performance.now()
    let i = 0
    setIdx(0); setLeft(total[0])
    try { navigator.vibrate?.(12) } catch { /* no-op */ }
    const tick = (t: number) => {
      const elapsed = (t - t0) / 1000
      if (elapsed >= total[i]) {
        t0 = t
        i = (i + 1) % total.length
        if (i === 0) setReps((r) => r + 1)
        setIdx(i)
        try { navigator.vibrate?.(i === 0 ? [10, 40, 10] : 12) } catch { /* no-op */ }
      }
      setLeft(Math.max(0, total[i] - (t - t0) / 1000))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, value])

  if (!phases) return null

  return (
    <div className="rounded-card glass p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <Gauge size={15} className="text-gold" />
        <span className="kicker">Tempo {value}</span>
        {reps > 0 && (
          <span className="text-[0.6rem] font-black text-white/45 tabular-nums">
            {reps} {reps === 1 ? 'rep' : 'reps'}
          </span>
        )}
        <button onClick={() => { setRunning((r) => !r); if (running) setReps(0) }}
          aria-label={running ? 'Frenar el tempo' : 'Marcar el tempo'}
          className={`ml-auto min-h-[44px] px-4 rounded-full text-xs font-black uppercase tracking-wide flex items-center gap-1.5 active:scale-95
            ${running ? 'bg-white/8 border border-white/12 text-white/70' : 'bg-gold-fill text-ink'}`}>
          {running ? <><Pause size={14} /> Frenar</> : <><Play size={14} /> Marcá</>}
        </button>
      </div>

      {/* the rep as a track: each phase is a segment as wide as its own seconds */}
      <div className="flex gap-1 h-2.5">
        {phases.map((p, i) => (
          <div key={i} className="rounded-full bg-white/10 overflow-hidden"
            style={{ flexGrow: p.sec, flexBasis: 0 }}>
            <span className="tempo-fill block h-full rounded-full bg-gold-fill"
              style={{
                transform: `scaleX(${running ? (i < idx ? 1 : i === idx ? 1 - left / p.sec : 0) : 0})`,
                transition: 'transform .08s linear',
              }} />
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <span className={`heading text-lg ${running ? 'text-gold' : 'text-white/35'}`}>
          {running ? phases[idx].word : phases.map((p) => p.word).join(' · ')}
        </span>
        {running && (
          <span className="text-white text-2xl font-black tabular-nums leading-none">
            {left.toFixed(1)}<span className="text-white/40 text-xs font-bold">s</span>
          </span>
        )}
      </div>
      {!running && (
        <p className="text-white/40 text-[0.68rem] mt-1.5 leading-snug">
          Seguí el ritmo del coach: la barra marca cada fase de la repetición.
        </p>
      )}
    </div>
  )
}
