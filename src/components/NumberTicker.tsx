import { useEffect, useRef, useState } from 'react'

// Animated numeral: rolls from the previous value to the new one (~600ms,
// ease-out cubic) instead of a hard swap — a PR should feel like it accumulates.
// Rioplatense decimal comma; honors prefers-reduced-motion (instant swap).

const fmt = (n: number, decimals: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export function NumberTicker({ value, decimals = 0, duration = 600, className = '' }: {
  value: number; decimals?: number; duration?: number; className?: string
}) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || duration <= 0) { setShown(value); return }
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const ease = 1 - Math.pow(1 - p, 3)
      setShown(from + (value - from) * ease)
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  return <span className={`tabular-nums ${className}`}>{fmt(shown, decimals)}</span>
}

/** Count-up from 0 on mount (for celebration stats). */
export function CountUp({ to, decimals = 0, duration = 900, delay = 0, className = '' }: {
  to: number; decimals?: number; duration?: number; delay?: number; className?: string
}) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setVal(to); return }
    let raf = 0
    const timer = window.setTimeout(() => {
      const t0 = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration)
        const ease = 1 - Math.pow(1 - p, 3)
        setVal(to * ease)
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [to, duration, delay])
  return <span className={`tabular-nums ${className}`}>{fmt(val, decimals)}</span>
}
