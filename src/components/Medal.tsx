import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import type { Tier } from '../lib/medals'

// A tiered medal disc (Bronce / Plata / Oro / Platino), or a locked placeholder.
const RING: Record<Tier, string> = {
  bronce: 'conic-gradient(from 210deg,#e8a06a,#a85e2e 30%,#d9854f 60%,#8a4a22,#e8a06a)',
  plata: 'conic-gradient(from 210deg,#f4f4f6,#9fa2ab 30%,#e8e9ec 60%,#7e828c,#f4f4f6)',
  oro: 'conic-gradient(from 210deg,#EADEB4,#8A6A38 30%,#C6AE78 60%,#6e511f,#EADEB4)',
  platino: 'conic-gradient(from 210deg,#eaf2f7,#aab8c2 30%,#dfe9ef 60%,#8aa0ad,#eaf2f7)',
}
const FACE: Record<Tier, string> = { bronce: '#e0a06a', plata: '#dfe1e6', oro: '#C6AE78', platino: '#dbe8f0' }

export function Medal({ tier, icon, size = 60, locked = false }: {
  tier: Tier | null; icon: ReactNode; size?: number; locked?: boolean
}) {
  if (locked || !tier) {
    return (
      <div className="rounded-full grid place-items-center shrink-0"
        style={{ width: size, height: size, background: 'rgba(255,255,255,.05)', border: '2px dashed rgba(255,255,255,.18)' }}>
        <Lock size={size * 0.36} className="text-white/35" />
      </div>
    )
  }
  const pad = Math.max(4, size * 0.08)
  return (
    <div className="rounded-full shrink-0" style={{ width: size, height: size, background: RING[tier], padding: pad }}>
      <div className="w-full h-full rounded-full grid place-items-center" style={{ background: 'radial-gradient(circle at 50% 34%, #2a2a2e, #111 72%)', color: FACE[tier] }}>
        {icon}
      </div>
    </div>
  )
}
