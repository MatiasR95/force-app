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
const GLOW: Record<Tier, string> = {
  bronce: 'rgba(224,160,106,0.45)', plata: 'rgba(223,225,230,0.40)',
  oro: 'rgba(198,174,120,0.55)', platino: 'rgba(219,232,240,0.45)',
}

// `shine`: a slow specular sweep crosses the earned disc every few seconds — the
// medal reads as metal, not a flat icon. `hero`: the big detail-sheet variant
// (springs in with a breathing tier-colored halo).
export function Medal({ tier, icon, size = 60, locked = false, shine = false, hero = false }: {
  tier: Tier | null; icon: ReactNode; size?: number; locked?: boolean; shine?: boolean; hero?: boolean
}) {
  if (locked || !tier) {
    return (
      <div className="rounded-full grid place-items-center shrink-0"
        style={{ width: size, height: size, background: 'rgb(var(--fg-rgb) / .05)', border: '2px dashed rgb(var(--fg-rgb) / .18)' }}>
        <Lock size={size * 0.36} className="text-white/35" />
      </div>
    )
  }
  const pad = Math.max(4, size * 0.08)
  return (
    <div className={`relative shrink-0 ${hero ? 'medal-hero' : ''}`} style={{ width: size, height: size }}>
      {hero && <div className="medal-halo" style={{ background: `radial-gradient(circle, ${GLOW[tier]}, transparent 68%)` }} />}
      <div className="relative w-full h-full rounded-full overflow-hidden" style={{ background: RING[tier], padding: pad }}>
        <div className="w-full h-full rounded-full grid place-items-center"
          style={{ background: 'radial-gradient(circle at 50% 34%, #2a2a2e, #111 72%)', color: FACE[tier] }}>
          {icon}
        </div>
        {(shine || hero) && <span className="medal-sheen" aria-hidden />}
      </div>
    </div>
  )
}
