import { useEffect, useRef, useState } from 'react'
import { nextFact } from '../lib/facts'
import { Sparkles, X } from 'lucide-react'

const COLORS = ['#C6AE78', '#EADEB4', '#8A6A38', '#FFFFFF']

/** Full-screen confetti burst (gold palette), ~3s, then idles. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const W = (canvas.width = innerWidth * dpr)
    const H = (canvas.height = innerHeight * dpr)
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`

    const N = 140
    const parts = Array.from({ length: N }, (_, i) => ({
      x: W / 2 + (i - N / 2) * 2,
      y: H * 0.35,
      vx: (((i * 73) % 100) / 100 - 0.5) * 16 * dpr,
      vy: (-((i * 31) % 100) / 100 * 14 - 6) * dpr,
      size: (3 + ((i * 17) % 5)) * dpr,
      rot: (i % 360) * (Math.PI / 180),
      vr: (((i * 13) % 100) / 100 - 0.5) * 0.4,
      color: COLORS[i % COLORS.length],
    }))

    let raf = 0
    let frame = 0
    const g = 0.35 * dpr
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        p.vy += g
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (frame < 260) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60]" />
}

export function Celebration({ title, extra, onClose }: { title: string; extra?: string; onClose: () => void }) {
  const [fact] = useState(() => nextFact())
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-6 bg-black/85 backdrop-blur-sm max-w-md mx-auto">
      <Confetti />
      <div className="relative z-[58] w-full text-center animate-[pop_.35s_ease]">
        <div className="text-5xl mb-2">🎉</div>
        <div className="kicker">{title}</div>
        <h1 className="heading text-3xl text-white mt-1 mb-5">¡Bien ahí!</h1>

        {extra && (
          <div className="rounded-card border border-gold/40 bg-gold/[0.12] p-3 text-left mb-3">
            <p className="text-white/90 text-sm leading-snug">{extra}</p>
          </div>
        )}

        <div className="rounded-card border border-gold/30 bg-gold/[0.07] p-4 text-left">
          <div className="flex items-center gap-2 kicker mb-1.5">
            <Sparkles size={13} className="text-gold" /> ¿Sabías que…?
          </div>
          <p className="text-white/85 text-sm leading-relaxed">{fact}</p>
        </div>

        <button onClick={onClose}
          className="mt-6 w-full rounded-full bg-gold-fill text-ink font-black uppercase py-4 active:scale-[0.98]">
          Listo
        </button>
        <button onClick={onClose} className="absolute -top-2 -right-1 p-2 text-white/40"><X size={20} /></button>
      </div>
      <style>{`@keyframes pop { from { transform: scale(.9); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  )
}
