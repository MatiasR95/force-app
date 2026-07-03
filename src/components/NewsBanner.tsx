import { useEffect, useState } from 'react'
import { fetchNews, type NewsItem } from '../lib/api'
import { getToken } from '../lib/store'
import { DoorClosed, Clock, Megaphone } from 'lucide-react'

// Gym announcements on Inicio — holiday closures and special hours especially.
// Staff manage these in the config sheet's `novedades` tab; the app just shows
// whatever is in its date window. Non-critical: silent on any failure.

const TONE: Record<string, { icon: typeof Megaphone; ring: string; fg: string }> = {
  cerrado: { icon: DoorClosed, ring: 'border-amber-400/40 bg-amber-400/[0.08]', fg: 'text-amber-300' },
  horario: { icon: Clock, ring: 'border-gold/40 bg-gold/[0.08]', fg: 'text-gold' },
  info: { icon: Megaphone, ring: 'border-white/15 bg-white/[0.04]', fg: 'text-gold' },
}

export function NewsBanner() {
  const [news, setNews] = useState<NewsItem[]>([])
  useEffect(() => { fetchNews(getToken()).then(setNews).catch(() => {}) }, [])
  if (!news.length) return null
  return (
    <div className="space-y-2 mb-4">
      {news.map((n, i) => {
        const t = TONE[n.tipo] ?? TONE.info
        const Icon = t.icon
        return (
          <div key={i} className={`rounded-card border p-3.5 flex items-start gap-3 ${t.ring}`}>
            <Icon size={19} className={`${t.fg} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">{n.titulo}</p>
              {n.mensaje && <p className="text-white/65 text-[0.8rem] leading-snug mt-0.5">{n.mensaje}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
