import { useEffect, useRef, useState } from 'react'
import { nextFact } from '../lib/facts'
import { CountUp } from './NumberTicker'
import { Sparkles, X, Share2, Check, Trophy } from 'lucide-react'

// Gold foil-shard burst — a short, intentional radial spray of thin gold slivers.
// Reserved for medal/PR-tier moments (see `intense`); ordinary completion uses the
// calmer ring-sweep alone. Honors prefers-reduced-motion (renders nothing).
export function FoilBurst() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const W = (canvas.width = innerWidth * dpr)
    const H = (canvas.height = innerHeight * dpr)
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`
    const COLORS = ['#C6AE78', '#EADEB4', '#F0E2BE', '#8A6A38']
    const N = 34
    const cx = W / 2, cy = H * 0.4
    const parts = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + (((i * 37) % 100) / 100 - 0.5) * 0.5
      const sp = (7 + ((i * 53) % 60) / 10) * dpr
      return {
        x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3 * dpr,
        len: (9 + ((i * 17) % 8)) * dpr, w: 2.4 * dpr, rot: a, vr: (((i * 13) % 100) / 100 - 0.5) * 0.5,
        color: COLORS[i % COLORS.length],
      }
    })
    let raf = 0, frame = 0
    const g = 0.26 * dpr
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, W, H)
      const fade = Math.max(0, 1 - frame / 68)
      for (const p of parts) {
        p.vy += g; p.vx *= 0.98; p.x += p.vx; p.y += p.vy; p.rot += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = fade
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.len / 2, p.w, p.len)
        ctx.restore()
      }
      if (frame < 70) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60]" />
}

// The completion ring: sweeps 0→full on mount, then blooms a check. This is the
// "shape that finishes" — the primary celebratory beat, calm by default.
function SweepRing({ intense }: { intense: boolean }) {
  const R = 46
  const CIRC = 2 * Math.PI * R
  const [swept, setSwept] = useState(false)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setSwept(true), reduce ? 0 : 40)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="relative w-28 h-28 mx-auto mb-3">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#3A3832" strokeWidth="7" />
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
          stroke={intense ? '#F0E2BE' : '#C6AE78'} strokeDasharray={CIRC}
          strokeDashoffset={swept ? 0 : CIRC}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={swept ? 'ring-pop' : 'opacity-0'}>
          {intense ? <Trophy size={40} className="text-gold-pale" /> : <Check size={40} className="text-gold" strokeWidth={3} />}
        </span>
      </div>
    </div>
  )
}

export interface CelebrationStats { totalKg: number; series: number; streak: number }

export function Celebration({ title, extra, stats, intense = false, onClose, onShare }: {
  title: string; extra?: string; stats?: CelebrationStats; intense?: boolean; onClose: () => void; onShare?: () => void
}) {
  const [fact] = useState(() => nextFact())
  return (
    <div data-theme="dark" className="fixed inset-0 z-[55] flex items-center justify-center px-6 bg-black/85 backdrop-blur-sm max-w-[448px] mx-auto">
      {intense && <FoilBurst />}
      <div className="relative z-[58] w-full text-center animate-[pop_.35s_ease]">
        <SweepRing intense={intense} />
        <div className="kicker">{title}</div>
        <h1 className="heading text-3xl text-white mt-1 mb-5">¡Bien ahí!</h1>

        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCell label="Kg movidos" value={stats.totalKg} delay={250} />
            <StatCell label="Series" value={stats.series} delay={400} />
            <StatCell label="Semanas" value={stats.streak} delay={550} />
          </div>
        )}

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

        {onShare && (
          <button onClick={onShare}
            className="mt-6 w-full rounded-full bg-white/8 border border-white/15 text-white font-bold uppercase py-3.5 active:scale-[0.98] flex items-center justify-center gap-2">
            <Share2 size={17} className="text-gold" /> Compartir mi entreno
          </button>
        )}
        <button onClick={onClose}
          className={`${onShare ? 'mt-2.5' : 'mt-6'} w-full rounded-full bg-gold-fill text-ink font-black uppercase py-4 active:scale-[0.98]`}>
          Listo
        </button>
        <button onClick={onClose} className="absolute -top-2 -right-1 p-2 text-white/40"><X size={20} /></button>
      </div>
      <style>{`@keyframes pop { from { transform: scale(.9); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  )
}

function StatCell({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="rounded-card bg-white/5 border border-white/8 py-2.5">
      <div className="text-gold text-2xl font-black"><CountUp to={value} delay={delay} /></div>
      <div className="text-[0.52rem] uppercase tracking-micro text-white/45 font-bold mt-0.5">{label}</div>
    </div>
  )
}
