import { useEffect, useRef, useState } from 'react'

// "Respirá" — a box-breathing guide for the rest pause. The orb expands on the
// inhale and shrinks on the exhale (CSS, 11s cadence); the phase label is driven
// from the same clock so they stay in sync. Slow breathing during rest nudges the
// nervous system toward recovery — dead time turned into a small ritual.
// Reduced-motion shows a calm static orb with a plain "Respirá" prompt.

// phase boundaries as a fraction of the 11s cycle (matches .breathe-orb keyframes)
const PHASES: { until: number; label: string }[] = [
  { until: 0.36, label: 'Inhalá' },   // 0–4s
  { until: 0.55, label: 'Sostené' },  // 4–6s
  { until: 0.91, label: 'Exhalá' },   // 6–10s
  { until: 1.0, label: 'Sostené' },   // 10–11s
]
const CYCLE_MS = 11_000

export function BreathePacer() {
  const [label, setLabel] = useState('Inhalá')
  const start = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setLabel('Respirá'); return }
    start.current = performance.now()
    const id = window.setInterval(() => {
      const t = ((performance.now() - start.current) % CYCLE_MS) / CYCLE_MS
      setLabel(PHASES.find((p) => t < p.until)?.label ?? 'Inhalá')
    }, 200)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <div className="breathe-orb h-9 w-9 shrink-0" aria-hidden />
      <div className="text-left leading-tight">
        <div className="text-[0.55rem] uppercase tracking-micro text-gold/70 font-bold">Respirá al ritmo</div>
        <div className="breathe-label text-gold-pale text-sm font-black tabular-nums" aria-live="polite">{label}</div>
      </div>
    </div>
  )
}
