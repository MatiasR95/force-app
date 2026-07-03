import { useEffect, useRef, useState, type ReactNode } from 'react'

// Scroll-orchestrated entrance: the wrapped block rises in with a soft spring the
// first time it scrolls into view (IntersectionObserver — no scroll listeners).
// Stagger siblings with `delay`. prefers-reduced-motion renders instantly.
export function Reveal({ children, delay = 0, className = '' }: {
  children: ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect() } },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(14px)',
      transition: `opacity .5s ease ${delay}ms, transform .55s cubic-bezier(.22,1,.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}
