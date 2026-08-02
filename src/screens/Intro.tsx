import { useState } from 'react'
import type { RoutineDay } from '../lib/types'
import emblem from '../assets/logo/emblem_gold_t.png'
import { nextQuote } from '../lib/quotes'
import { getClientName, getCheckins } from '../lib/store'
import { currentStreakWeeks } from '../lib/metrics'
import { currentEventTheme } from '../lib/eventTheme'
import { ArrowRight, Flame, Dumbbell } from 'lucide-react'

// Time-of-day greeting (rioplatense). Argentina is the member's timezone.
function dayPartGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

// Big motivational opening screen. Shown once per app launch; on "Sí" it animates
// away to reveal the app. Now personalized: greeting by time of day, today's
// session preview, the member's live streak, and an event nod on patriotic days.
export function Intro({ day, week, onStart }: { day?: RoutineDay; week?: number; onStart: () => void }) {
  const [quote] = useState(() => nextQuote())
  const [leaving, setLeaving] = useState(false)
  const name = getClientName()
  const first = name?.split(' ')[0]
  const streak = currentStreakWeeks(getCheckins())
  const event = currentEventTheme()
  const bigOne = day?.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name
  const dayLabel = day?.label.replace('DÍA', 'Día')
  const go = () => { setLeaving(true); window.setTimeout(onStart, 480) }

  return (
    <div className={`fixed inset-0 z-[70] bg-dark-stage max-w-[448px] mx-auto flex flex-col items-center justify-center px-7 text-center
      ${leaving ? 'intro-out' : 'intro-in'}`}>
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px',
      }} />

      <div className="relative">
        {/* emblem inside a slowly-rotating gold halo — the signature moment */}
        <div className="relative h-32 w-32 mx-auto">
          <svg viewBox="0 0 120 120" className="absolute inset-0 intro-halo" style={{ color: event?.accent ?? '#C6AE78' }}>
            <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray="8 344" pathLength="352" />
            <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray="4 348" pathLength="352" strokeDashoffset="176" />
          </svg>
          <img src={emblem} alt="FORCE" className="absolute inset-0 m-auto h-24 w-24 object-contain intro-emblem" />
        </div>
        <div className="heading text-4xl text-white mt-3 glow-text tracking-wide">FORCE</div>
        <div className="kicker mt-1" style={{ color: event?.accent ?? undefined }}>
          {event ? event.title : '#TrustTheProcess'}
        </div>

        {/* personalized greeting */}
        <div className="text-white/85 text-lg font-bold mt-7">
          {dayPartGreeting()}{first ? <>, <span className="text-gold">{first}</span></> : ''}
        </div>

        <p className="text-white/70 text-base leading-relaxed font-medium mt-3 max-w-xs mx-auto intro-quote">
          {quote}
        </p>

        {/* today's session preview — makes the CTA contextual */}
        {(dayLabel || bigOne) && (
          <div className="intro-card mt-7 mx-auto max-w-[17rem] rounded-card hero-card px-4 py-3 flex items-center gap-3 text-left">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gold/12 border border-gold/30 grid place-items-center">
              <Dumbbell size={18} className="text-gold" />
            </div>
            <div className="min-w-0">
              <div className="text-[0.58rem] uppercase tracking-micro text-gold-deep font-bold">Hoy te toca</div>
              <div className="text-white font-black leading-tight truncate">
                {dayLabel}{week ? <span className="text-white/45 font-bold"> · Sem {week}</span> : ''}
              </div>
              {bigOne && <div className="text-gold text-sm font-bold truncate">{bigOne}</div>}
            </div>
          </div>
        )}

        {/* live streak nudge */}
        {streak > 0 && (
          <div className="intro-streak mt-3 inline-flex items-center gap-1.5 text-sm text-white/70">
            <Flame size={15} className="text-gold" />
            Llevás <span className="text-gold font-black">{streak}</span> {streak === 1 ? 'semana' : 'semanas'} seguidas — no la cortes
          </div>
        )}

        <div className="mt-8">
          <button onClick={go}
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide px-10 py-4 active:scale-[0.97]">
            {streak > 0 ? 'Metele' : 'Sí, a entrenar'} <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* was a bare 60×16 text link — below the 44px touch floor, and the first
          control a brand-new member ever sees */}
      <button onClick={go}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] min-h-[44px] px-6 grid place-items-center
          rounded-full text-white/35 text-xs font-bold uppercase tracking-micro active:scale-95">
        Saltar
      </button>

      <style>{`
        .intro-in { animation: introIn .5s ease both; }
        .intro-out { animation: introOut .48s ease forwards; }
        @keyframes introIn { from { opacity:0 } to { opacity:1 } }
        @keyframes introOut { to { opacity:0; transform: scale(1.06); } }
        .intro-emblem { animation: emblemPop .7s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes emblemPop { from { opacity:0; transform: scale(.7) } to { opacity:.95; transform: scale(1) } }
        .intro-halo { animation: haloSpin 14s linear infinite; transform-origin: center; }
        @keyframes haloSpin { to { transform: rotate(360deg); } }
        .intro-quote { animation: introIn .6s ease .25s both; }
        .intro-card { animation: introUp .55s cubic-bezier(.22,1,.36,1) .4s both; }
        .intro-streak { animation: introUp .55s cubic-bezier(.22,1,.36,1) .55s both; }
        @keyframes introUp { from { opacity:0; transform: translateY(10px) } to { opacity:1; transform:none } }
        @media (prefers-reduced-motion: reduce) {
          .intro-halo, .intro-emblem, .intro-quote, .intro-card, .intro-streak { animation: none; }
        }
      `}</style>
    </div>
  )
}
