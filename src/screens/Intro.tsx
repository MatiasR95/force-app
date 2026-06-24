import { useState } from 'react'
import emblem from '../assets/logo/emblem_gold_t.png'
import { nextQuote } from '../lib/quotes'
import { getClientName } from '../lib/store'
import { ArrowRight } from 'lucide-react'

// Big motivational opening screen. Shown once per app launch; on "Sí" it animates
// away to reveal the app.
export function Intro({ onStart }: { onStart: () => void }) {
  const [quote] = useState(() => nextQuote())
  const [leaving, setLeaving] = useState(false)
  const name = getClientName()
  const go = () => { setLeaving(true); window.setTimeout(onStart, 480) }

  return (
    <div className={`fixed inset-0 z-[70] bg-dark-stage max-w-md mx-auto flex flex-col items-center justify-center px-7 text-center
      ${leaving ? 'intro-out' : 'intro-in'}`}>
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px',
      }} />

      <div className="relative">
        <img src={emblem} alt="FORCE" className="h-24 w-24 object-contain mx-auto intro-emblem" />
        <div className="heading text-4xl text-white mt-3 glow-text tracking-wide">FORCE</div>
        <div className="kicker mt-1">#TrustTheProcess</div>

        <p className="text-white/85 text-lg leading-relaxed font-medium mt-8 max-w-xs mx-auto intro-quote">
          {quote}
        </p>

        <div className="mt-10">
          <div className="text-white/60 text-sm mb-3">
            {name ? `${name.split(' ')[0]}, ` : ''}¿listo para el entrenamiento de hoy?
          </div>
          <button onClick={go}
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide px-10 py-4 active:scale-[0.97]">
            Sí, a entrenar <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <button onClick={go} className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] text-white/35 text-xs font-bold uppercase tracking-micro">
        Saltar
      </button>

      <style>{`
        .intro-in { animation: introIn .5s ease both; }
        .intro-out { animation: introOut .48s ease forwards; }
        @keyframes introIn { from { opacity:0 } to { opacity:1 } }
        @keyframes introOut { to { opacity:0; transform: scale(1.06); } }
        .intro-emblem { animation: emblemPop .7s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes emblemPop { from { opacity:0; transform: scale(.7) } to { opacity:.95; transform: scale(1) } }
        .intro-quote { animation: introIn .6s ease .25s both; }
      `}</style>
    </div>
  )
}
