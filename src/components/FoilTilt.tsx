import { useEffect, useRef, useState, type ReactNode } from 'react'

// Tilt-reactive gold foil (Apple Wallet vibe): the card rotates subtly in 3D and
// a specular sheen slides across it as the phone physically tilts, or as the
// pointer moves on desktop. Pure CSS-variable driven — no library, no reflow.
//
// iOS quirk: DeviceOrientation needs an explicit permission gesture (iOS 13+),
// so we request it on the member's FIRST TAP on a foil surface and fall back to
// pointer/no-motion silently if denied. Android/desktop need no permission.
// prefers-reduced-motion disables everything (static card).

const MAX_TILT = 9 // degrees — subtle, not a carnival

export function FoilTilt({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const apply = (nx: number, ny: number) => {
    // nx/ny in [-0.5, 0.5]
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tilt-y', `${(nx * MAX_TILT * 2).toFixed(2)}deg`)
    el.style.setProperty('--tilt-x', `${(-ny * MAX_TILT * 1.6).toFixed(2)}deg`)
    el.style.setProperty('--foil-x', `${(14 + (nx + 0.5) * 62).toFixed(1)}%`)
  }
  const reset = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tilt-y', '0deg')
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--foil-x', '24%')
  }

  useEffect(() => {
    if (reduce) return
    // device tilt (Android fires without permission; iOS after the tap below)
    let base: { beta: number; gamma: number } | null = null
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return
      base ??= { beta: e.beta, gamma: e.gamma } // relative to how they're holding it
      const nx = Math.max(-0.5, Math.min(0.5, (e.gamma - base.gamma) / 60))
      const ny = Math.max(-0.5, Math.min(0.5, (e.beta - base.beta) / 60))
      apply(nx, ny)
      setLive(true)
    }
    window.addEventListener('deviceorientation', onTilt)
    return () => window.removeEventListener('deviceorientation', onTilt)
  }, [reduce])

  const askIOSPermission = () => {
    type DOEC = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }
    const D = DeviceOrientationEvent as unknown as DOEC
    if (typeof D?.requestPermission === 'function') D.requestPermission().catch(() => {})
  }

  return (
    <div
      ref={ref}
      className={`${className} foil-tilt`}
      onPointerDown={askIOSPermission}
      onPointerMove={(e) => {
        if (reduce || live) return // real tilt wins over pointer once it's flowing
        const r = ref.current!.getBoundingClientRect()
        apply((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5)
      }}
      onPointerLeave={() => { if (!live) reset() }}
    >
      {!reduce && (
        <span aria-hidden className="foil-sheen">
          <span className="foil-sheen-wide" />
          <span className="foil-sheen-core" />
        </span>
      )}
      {children}
    </div>
  )
}
