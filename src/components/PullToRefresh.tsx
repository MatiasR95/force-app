import { useEffect, useRef, useState } from 'react'

// Pull-to-refresh for the app shell.
//
// Before this, the only way to force a re-read of the coach's sheet was the
// "Actualizar" button on Inicio — which did `location.reload()`, i.e. threw the
// whole PWA away and cold-started it. Members expect the phone gesture instead,
// so the shell now answers a downward pull at the top of the scroller.
//
// The indicator is FORCE's Spine bent into a ring: it fills as you travel toward
// the trigger, and spins while the sheet is being re-read. Touch only — mouse
// wheel keeps the browser's own behaviour.

const THRESHOLD = 64   // px of travel (after resistance) that arms the refresh
const MAX = 92         // how far the dial can travel
const RESISTANCE = 0.5 // rubber-band factor on the raw finger delta

type Phase = 'idle' | 'pull' | 'refreshing'

// Takes the scroller ELEMENT, not a ref: the app shell renders a splash/skeleton
// before the routine arrives, so the node this hooks onto only exists on a later
// render. A ref would have been null when the effect first ran and never re-bound.
export function usePullToRefresh(
  el: HTMLElement | null,
  onRefresh: () => Promise<unknown>,
  enabled = true,
) {
  const [dist, setDist] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  // refs, not state: the touch handlers are attached once (non-passive, so they
  // can cancel the browser's overscroll) and must not be re-bound per frame.
  const startY = useRef<number | null>(null)
  const active = useRef(false)
  const phaseRef = useRef<Phase>('idle')
  phaseRef.current = phase
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    if (!el || !enabled) return

    const onStart = (e: TouchEvent) => {
      if (phaseRef.current === 'refreshing' || e.touches.length !== 1) return
      // only arm at the very top — mid-list the gesture belongs to the scroller
      if (el.scrollTop > 0) return
      startY.current = e.touches[0].clientY
      active.current = true
    }

    const onMove = (e: TouchEvent) => {
      if (!active.current || startY.current == null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        // they turned it into a normal upward scroll — hand the gesture back
        active.current = false
        setDist(0)
        setPhase('idle')
        return
      }
      if (el.scrollTop > 0) { active.current = false; setDist(0); setPhase('idle'); return }
      e.preventDefault() // suppress the OS overscroll so only the dial moves
      setPhase('pull')
      setDist(Math.min(MAX, dy * RESISTANCE))
    }

    const onEnd = () => {
      if (!active.current) return
      active.current = false
      startY.current = null
      setDist((d) => {
        if (d < THRESHOLD) { setPhase('idle'); return 0 }
        setPhase('refreshing')
        // hold the spinner for a beat even on a fast network: a dial that vanishes
        // instantly reads as "nothing happened".
        Promise.allSettled([
          refreshRef.current(),
          new Promise((r) => window.setTimeout(r, 550)),
        ]).then(() => { setPhase('idle'); setDist(0) })
        return THRESHOLD
      })
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, enabled])

  return { dist, refreshing: phase === 'refreshing', armed: dist >= THRESHOLD }
}

const R = 13
const CIRC = 2 * Math.PI * R

export function PullDial({ dist, refreshing, armed }: {
  dist: number; refreshing: boolean; armed: boolean
}) {
  if (dist <= 0 && !refreshing) return null
  const p = Math.min(1, dist / THRESHOLD)
  return (
    <div className="ptr" style={{ height: 0 }} aria-hidden>
      <div
        className="mt-1 grid place-items-center h-9 w-9 rounded-full bg-surface-2/90 border border-white/10 backdrop-blur"
        style={{
          transform: `translateY(${dist}px) scale(${0.72 + p * 0.28})`,
          opacity: Math.min(1, p * 1.4),
          transition: refreshing ? 'transform .25s cubic-bezier(.22,1,.36,1)' : undefined,
          boxShadow: armed ? '0 0 14px rgb(var(--gold-rgb) / 0.45)' : undefined,
        }}
      >
        <svg viewBox="0 0 32 32" className={`h-5 w-5 -rotate-90 ${refreshing ? 'ptr-spin' : 'ptr-dial'}`}>
          <circle cx="16" cy="16" r={R} fill="none" strokeWidth="3" className="ptr-track" />
          <circle cx="16" cy="16" r={R} fill="none" strokeWidth="3" strokeLinecap="round"
            className="ptr-arc" strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - (refreshing ? 0.28 : p))} />
        </svg>
      </div>
    </div>
  )
}

export const PTR_THRESHOLD = THRESHOLD
