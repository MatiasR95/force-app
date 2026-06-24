import { useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

// FORCE visual vocabulary as small primitives (see brand §4).

export function Spine({ className = '' }: { className?: string }) {
  return <div className={`spine self-stretch ${className}`} />
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="kicker">{children}</div>
}

export function Card({ children, className = '', spine = false }: {
  children: ReactNode; className?: string; spine?: boolean
}) {
  return (
    <div className={`card flex ${className}`}>
      {spine && <Spine className="mr-3" />}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export function StatHero({ value, label, suffix }: { value: string; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-1">
        <span className="text-gold/40 text-2xl font-black leading-none">[</span>
        <span className="text-gold text-4xl font-black leading-none tabular-nums">{value}</span>
        {suffix && <span className="text-gold/70 text-sm font-bold mb-1">{suffix}</span>}
        <span className="text-gold/40 text-2xl font-black leading-none">]</span>
      </div>
      <div className="mt-1.5 text-[0.62rem] font-bold uppercase tracking-micro text-white/50">{label}</div>
    </div>
  )
}

export function Rail({ value }: { value: number }) {
  return <div className="rail"><span style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} /></div>
}

export function Pill({ active, children, onClick }: {
  active?: boolean; children: ReactNode; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition
        ${active ? 'bg-gold text-ink' : 'bg-white/5 text-white/60 border border-white/10'}`}
    >
      {children}
    </button>
  )
}

export function BottomSheet({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: ReactNode
}) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)
  const dragging = useRef(false)
  if (!open) return null
  const onStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; dragging.current = true }
  const onMove = (e: React.TouchEvent) => {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  const onEnd = () => { dragging.current = false; if (dragY > 90) onClose(); else setDragY(0); startY.current = null }

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fade_.2s_ease]" onClick={onClose} />
      <div className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-[22px] border-t border-white/10
        bg-surface-2 pb-[env(safe-area-inset-bottom)] animate-[slideup_.25s_ease]"
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragging.current ? 'none' : 'transform .2s ease' }}>
        <div className="sticky top-0 z-10 flex items-center justify-center pt-3 pb-2 bg-surface-2/95 backdrop-blur"
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
          <div className="h-1.5 w-12 rounded-full bg-white/25" />
          <button onClick={onClose} aria-label="Cerrar"
            className="absolute right-3 top-2.5 h-8 w-8 grid place-items-center rounded-full bg-white/8 text-white/60 active:scale-90">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes slideup { from { transform: translateY(12%); opacity:.6 } to { transform: none; opacity:1 } }
        @keyframes fade { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </div>
  )
}
