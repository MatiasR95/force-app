import { useEffect, useMemo, useState } from 'react'
import { getSessions, getMyRecords, getRecapSeen, setRecapSeen, getClientName, getCheckins } from '../lib/store'
import { tonnageComparison, currentStreakWeeks } from '../lib/metrics'
import { liftLabel } from '../lib/records'
import { CountUp } from './NumberTicker'
import { FoilBurst } from './Celebration'
import { ShareCard, type ShareData } from './ShareCard'
import { X, Share2, Disc3, Trophy, Dumbbell, CalendarCheck } from 'lucide-react'

// "Tu mes en FORCE": a story-style recap of last month (sessions, kg, best new
// record), offered ONCE when the month turns. Opt-in via a Home banner — it
// never interrupts; once seen (or dismissed) it's gone until next month.

export interface RecapData {
  ym: string          // "2026-06"
  label: string       // "junio"
  sessions: number
  kg: number          // 0 when unknown (older sessions carry no kg)
  bestPr: { lift: string; kg: number; reps: number } | null
}

export function recapMonth(): RecapData | null {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  if (getRecapSeen() === ym) return null
  const sessions = getSessions().filter((s) => s.date.startsWith(ym))
  if (sessions.length === 0) return null
  const kg = Math.round(sessions.reduce((a, s) => a + (s.kg ?? 0), 0))
  // record ts is UTC ISO — compare in LOCAL time so a 21:00 PR doesn't slide
  // into the next month (UTC-3 here)
  const prs = getMyRecords().filter((r) => {
    const d = new Date(r.ts)
    return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()
  }).sort((a, b) => b.kg - a.kg)
  const bestPr = prs[0] ? { lift: liftLabel(prs[0].lift), kg: prs[0].kg, reps: prs[0].reps } : null
  return { ym, label: prev.toLocaleDateString('es-AR', { month: 'long' }), sessions: sessions.length, kg, bestPr }
}

/** Dismiss without watching — stops the banner until next month. */
export function dismissRecap(ym: string) { setRecapSeen(ym) }

// Tap-through story (IG style): progress bars on top, tap right = next,
// tap left third = back. Marked seen on open so it never nags twice.
export function RecapStory({ data, onClose }: { data: RecapData; onClose: () => void }) {
  useEffect(() => setRecapSeen(data.ym), [data.ym]) // side effect, not render work
  const slides = useMemo(() => {
    const s: Array<'intro' | 'sessions' | 'kg' | 'pr' | 'end'> = ['intro', 'sessions']
    if (data.kg > 0) s.push('kg')
    if (data.bestPr) s.push('pr')
    s.push('end')
    return s
  }, [data])
  const [i, setI] = useState(0)
  const cur = slides[i]
  const next = () => (i < slides.length - 1 ? setI(i + 1) : onClose())
  const back = () => setI((n) => Math.max(0, n - 1))
  const comparison = tonnageComparison(data.kg).passed
  const name = getClientName()?.split(' ')[0]

  // The recap used to share PLAIN TEXT — nothing to post to a story. It now builds
  // the same 1080×1920 branded PNG every other celebration in the app produces.
  const [share, setShare] = useState(false)
  const card = (): ShareData => ({
    kind: 'recap',
    name: getClientName() ?? 'Vos',
    monthLabel: data.label,
    sessions: data.sessions,
    totalKg: data.kg,
    comparison: comparison ?? undefined,
    streak: currentStreakWeeks(getCheckins()),
    ...(data.bestPr
      ? { lift: data.bestPr.lift, thresholdText: `${data.bestPr.kg.toLocaleString('es-AR')} kg × ${data.bestPr.reps}` }
      : {}),
  })

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md max-w-[448px] mx-auto flex flex-col"
      role="dialog" aria-modal="true" aria-label={`Tu ${data.label} en FORCE`}>
      {/* story progress */}
      <div className="flex gap-1.5 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        {slides.map((_, k) => (
          <span key={k} className="h-[3px] flex-1 rounded-full overflow-hidden bg-white/15">
            <span className="block h-full bg-gold transition-all duration-300" style={{ width: k < i ? '100%' : k === i ? '55%' : '0%' }} />
          </span>
        ))}
      </div>
      <div className="flex justify-end px-3 pt-2">
        <button onClick={onClose} aria-label="Cerrar" className="h-11 w-11 grid place-items-center text-white/70 active:scale-90"><span className="h-9 w-9 grid place-items-center rounded-full bg-white/8"><X size={18} /></span></button>
      </div>

      {/* tap zones */}
      <div className="relative flex-1 flex items-center justify-center px-8 text-center select-none"
        onClick={(e) => { const x = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth; (x < 0.33 ? back : next)() }}>
        {cur === 'intro' && (
          <div key="intro" className="animate-[pop_.35s_ease]">
            <Disc3 size={40} className="text-gold mx-auto mb-4" />
            <div className="kicker">FORCE Recap</div>
            <h1 className="heading text-5xl text-white mt-2 capitalize glow-text">{data.label}</h1>
            <p className="text-white/60 text-sm mt-4">{name ? `${name}, esto` : 'Esto'} fue tu mes. Tocá para verlo.</p>
          </div>
        )}
        {cur === 'sessions' && (
          <div key="s" className="animate-[pop_.35s_ease]">
            <CalendarCheck size={34} className="text-gold mx-auto mb-5" />
            <div className="text-gold text-7xl font-black tabular-nums leading-none">
              <CountUp to={data.sessions} duration={700} />
            </div>
            <div className="heading text-xl text-white mt-3">{data.sessions === 1 ? 'Entrenamiento' : 'Entrenamientos'}</div>
            <p className="text-white/55 text-sm mt-3">Cada uno lo fuiste a buscar. Ninguno se hizo solo.</p>
          </div>
        )}
        {cur === 'kg' && (
          <div key="kg" className="animate-[pop_.35s_ease]">
            <Dumbbell size={34} className="text-gold mx-auto mb-5" />
            <div className="text-gold text-6xl font-black tabular-nums leading-none">
              <CountUp to={data.kg} duration={900} />
            </div>
            <div className="heading text-xl text-white mt-3">kg movidos</div>
            {comparison && <p className="text-white/70 text-sm mt-3">Más que <b className="text-white">{comparison}</b></p>}
          </div>
        )}
        {cur === 'pr' && data.bestPr && (
          <div key="pr" className="animate-[pop_.35s_ease]">
            <FoilBurst />
            <Trophy size={38} className="text-gold mx-auto mb-5" />
            <div className="kicker">Tu mejor marca nueva</div>
            <h2 className="heading text-3xl text-white mt-2">{data.bestPr.lift}</h2>
            <div className="text-gold text-5xl font-black tabular-nums mt-2">
              {data.bestPr.kg.toLocaleString('es-AR')} <span className="text-2xl">kg</span>
              <span className="text-white/50 text-xl font-bold"> × {data.bestPr.reps}</span>
            </div>
          </div>
        )}
        {cur === 'end' && (
          <div key="end" className="animate-[pop_.35s_ease] w-full">
            <div className="kicker capitalize">{data.label}, cerrado</div>
            <h2 className="heading text-2xl text-white mt-2">Y el que viene, mejor.</h2>
            <p className="text-white/65 text-sm mt-3 italic">"No tenés que ser el más fuerte de la sala. Solo más fuerte que el mes pasado."</p>
            <button onClick={(e) => { e.stopPropagation(); setShare(true) }}
              className="btn-glow mt-7 w-full rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-4 flex items-center justify-center gap-2 active:scale-[0.98]">
              <Share2 size={17} /> Compartir mi mes
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose() }} className="mt-3 text-white/50 text-sm font-bold py-2 w-full">Cerrar</button>
          </div>
        )}
      </div>
      <div className="pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-[0.55rem] uppercase tracking-kicker text-gold/50 font-bold">#TrustTheProcess</div>
      {share && <ShareCard data={card()} onClose={() => setShare(false)} />}
    </div>
  )
}
