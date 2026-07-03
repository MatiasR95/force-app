import { useEffect, useState } from 'react'
import { useRest } from './RestTimer'
import { resetRest, pauseRest, resumeRest, getRest } from '../lib/restTimer'
import { getRestPref } from '../lib/store'
import { Flame, Pause, Play, X } from 'lucide-react'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const MINI_R = 8
const MINI_C = 2 * Math.PI * MINI_R
const BIG_R = 44
const BIG_C = 2 * Math.PI * BIG_R

// App-wide rest-timer watcher + floating pill, Live-Activity style: a compact
// capsule (mini progress ring + time) that MORPHS open with a spring into the
// full dial + controls when tapped — one continuous element, like iOS's Dynamic
// Island. Mounted once in App; hidden while Entrenar is open (that screen has
// the full timer) and when idle. Honors prefers-reduced-motion (no spring).
export function RestTimerHost({ showPill }: { showPill: boolean }) {
  const { state, remaining } = useRest()
  const [open, setOpen] = useState(false)

  // re-check the moment the app regains focus (background timers get throttled)
  useEffect(() => {
    const onVis = () => { /* useRest's interval calls tickRest; this nudges a render */ }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [])

  // collapse when the timer goes idle so the next pause starts compact
  useEffect(() => { if (state.status === 'idle') setOpen(false) }, [state.status])

  if (!showPill || state.status === 'idle') return null
  const done = state.status === 'done'
  const paused = state.status === 'paused'
  const total = getRestPref()
  const p = done ? 1 : total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const stroke = done ? '#F0E2BE' : '#C6AE78'

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex justify-center px-4 pointer-events-none max-w-md mx-auto">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((o) => !o) }}
        className={`pill-morph pointer-events-auto relative overflow-hidden border backdrop-blur shadow-lg cursor-pointer
          ${done ? 'rest-done border-gold bg-gold/[0.18]' : 'border-white/12 bg-black/85'}`}
        style={{
          width: open ? 232 : 172,
          height: open ? 178 : 44,
          borderRadius: open ? 22 : 28,
        }}
      >
        {/* compact face */}
        <div className="absolute inset-0 flex items-center justify-center gap-2.5 transition-opacity duration-200"
          style={{ opacity: open ? 0 : 1, pointerEvents: 'none' }}>
          {done ? (
            <Flame size={17} className="text-gold" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
              <circle cx="10" cy="10" r={MINI_R} fill="none" stroke="#3A3832" strokeWidth="3" />
              <circle cx="10" cy="10" r={MINI_R} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={MINI_C} strokeDashoffset={MINI_C * p} />
            </svg>
          )}
          <span className={`font-black tabular-nums ${done ? 'text-gold' : 'text-white'}`}>
            {done ? '¡Metele!' : fmt(remaining)}
          </span>
        </div>

        {/* expanded face */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-200"
          style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transitionDelay: open ? '120ms' : '0ms' }}>
          <div className="relative w-[104px] h-[104px]">
            <svg viewBox="0 0 104 104" className="w-full h-full -rotate-90">
              <circle cx="52" cy="52" r={BIG_R} fill="none" stroke="#3A3832" strokeWidth="6" />
              <circle cx="52" cy="52" r={BIG_R} fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={BIG_C} strokeDashoffset={BIG_C * p}
                style={{ transition: 'stroke-dashoffset .95s linear, stroke .3s' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {done ? (
                <span className="ring-pop flex flex-col items-center leading-none">
                  <Flame size={20} className="text-gold mb-0.5" />
                  <span className="text-gold-pale text-base font-black">¡Metele!</span>
                </span>
              ) : (
                <>
                  <span className="text-2xl font-black tabular-nums text-white leading-none">{fmt(remaining)}</span>
                  <span className="text-[0.5rem] uppercase tracking-micro text-gold-deep font-bold mt-0.5">próxima serie</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
            {!done && (
              <button onClick={() => (getRest().status === 'running' ? pauseRest() : resumeRest())}
                aria-label={paused ? 'Reanudar' : 'Pausar'}
                className="h-8 w-8 grid place-items-center rounded-full bg-white/8 border border-white/12 text-white/75 active:scale-90">
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            )}
            <button onClick={() => resetRest()} aria-label="Cerrar"
              className="h-8 w-8 grid place-items-center rounded-full bg-white/8 border border-white/12 text-white/75 active:scale-90">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
