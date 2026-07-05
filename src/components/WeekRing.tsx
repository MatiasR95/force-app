import { useEffect, useState } from 'react'

// Compact radial that shows how many of this week's sessions are done (e.g. 2/4).
// The gold arc sweeps to its value on mount (spring-ish ease); when the week is
// complete it fills fully and glows. Reduced-motion renders it filled instantly.
export function WeekRing({ done, total, size = 40 }: { done: number; total: number; size?: number }) {
  const safeTotal = Math.max(1, total)
  const target = Math.max(0, Math.min(1, done / safeTotal))
  const [p, setP] = useState(0)
  const complete = done >= total && total > 0

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setP(target); return }
    const id = requestAnimationFrame(() => setP(target)) // next frame → CSS transition animates
    return () => cancelAnimationFrame(id)
  }, [target])

  const r = 15
  const circ = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}
      role="img" aria-label={`${done} de ${total} días de la semana`}>
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round"
          stroke={complete ? '#EADEB4' : '#C6AE78'} strokeDasharray={circ}
          strokeDashoffset={circ * (1 - p)}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)', filter: complete ? 'drop-shadow(0 0 4px rgba(198,174,120,.7))' : undefined }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-[0.62rem] font-black tabular-nums leading-none">
          {done}<span className="text-white/40">/{total}</span>
        </span>
      </div>
    </div>
  )
}
