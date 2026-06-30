import { useEffect, useMemo, useState } from 'react'
import type { Routine } from '../lib/types'
import emblem from '../assets/logo/emblem_gold_t.png'
import { ArgentinaFlag } from '../components/ArgentinaFlag'
import { Profile } from '../components/Profile'
import { getWeather, type WeatherBundle } from '../lib/weather'
import { nextFeriado } from '../lib/feriados'
import { coachTip } from '../lib/coachTips'
import { currentStreakWeeks } from '../lib/metrics'
import {
  getClientName, getCheckins, getMaxStreak, localDate,
  isBirthdayToday, bodyweightAgeDays, getBodyweight,
} from '../lib/store'
import { Dumbbell, Flame, CalendarDays, Quote, UserCog, Cake, Scale, ChevronRight } from 'lucide-react'

const TODAY_LONG = () =>
  new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const shortDay = (iso: string) => WD[new Date(iso + 'T00:00:00').getDay()]

export function Home({ routine, week, suggestedDay, onTrain, onGoRecords }: {
  routine: Routine
  week: number
  suggestedDay: number
  onTrain: (dayIdx: number, week: number) => void
  onGoRecords: () => void
}) {
  const [weather, setWeather] = useState<WeatherBundle | null>(null)
  const [profile, setProfile] = useState(false)
  const name = getClientName()
  const day = routine.days[suggestedDay]
  const bigOne = day?.blocks.find((b) => b.tag === 'big')?.exercises[0]?.name
  const tip = useMemo(() => coachTip(bigOne), [bigOne])
  const fer = nextFeriado(localDate())
  const streak = currentStreakWeeks(getCheckins())
  const best = Math.max(getMaxStreak(), streak)
  const bwAge = bodyweightAgeDays()
  const needBw = getBodyweight() == null || (bwAge != null && bwAge >= 30)

  useEffect(() => { getWeather().then(setWeather) }, [])

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
      {/* hero */}
      <div className="hero-card rounded-card p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <img src={emblem} alt="FORCE" className="h-11 w-11 object-contain" />
            <ArgentinaFlag h={24} />
          </div>
          <button onClick={() => setProfile(true)} aria-label="Perfil"
            className="h-9 w-9 grid place-items-center rounded-full bg-white/8 border border-white/10 text-white/70 active:scale-90">
            <UserCog size={18} />
          </button>
        </div>
        <h1 className="heading text-3xl text-white mt-4 glow-text">
          {name ? <>Hola, <span className="text-gold">{name.split(' ')[0]}</span></> : 'Bienvenido a FORCE'}
        </h1>
        <div className="text-white/45 text-sm mt-1 capitalize">{TODAY_LONG()}</div>
      </div>

      {/* birthday board (only today) */}
      {isBirthdayToday() && (
        <div className="rounded-card border border-gold/40 bg-gold/[0.10] p-4 mb-4 flex items-center gap-3">
          <Cake size={22} className="text-gold shrink-0" />
          <p className="text-white/90 text-sm">¡Feliz cumpleaños{name ? `, ${name.split(' ')[0]}` : ''}! 🎉 Hoy entrenás con todo. La sala te festeja. 💪</p>
        </div>
      )}

      {/* today's session CTA */}
      {day && (
        <button onClick={() => onTrain(suggestedDay, week)}
          className="hero-card rounded-card p-4 mb-4 w-full text-left active:scale-[0.99] block">
          <div className="kicker">🔥 Hoy te toca</div>
          <div className="flex items-center justify-between mt-1">
            <div>
              <div className="heading text-2xl text-white">{day.label.replace('DÍA', 'Día')}{routine.style === 'weekly' && <span className="text-gold text-base"> · Sem {week}</span>}</div>
              {bigOne && <div className="text-gold/90 font-bold text-sm mt-0.5">{bigOne}</div>}
            </div>
            <span className="btn-glow shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide text-sm px-4 py-2.5">
              <Dumbbell size={16} /> Entrenar
            </span>
          </div>
        </button>
      )}

      {/* weather: detailed today + next-days strip */}
      {weather && weather.days.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="kicker flex items-center gap-1.5 mb-3"><CalendarDays size={13} className="text-gold" /> La Plata · pronóstico</div>

          {/* today, in detail */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/10">
            <div className="text-4xl leading-none">{weather.now.emoji}</div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-white text-3xl font-black tabular-nums leading-none">{weather.now.tempC}°</span>
                <span className="text-white/85 text-sm font-bold truncate">{weather.now.label}</span>
              </div>
              <div className="text-white/45 text-xs mt-1">
                Sensación {weather.now.feelsC}°
                <span className="text-white/25"> · </span>
                Máx {weather.days[0].max}° / Mín {weather.days[0].min}°
                {weather.days[0].rainProb >= 20 && <><span className="text-white/25"> · </span>🌧️ {weather.days[0].rainProb}%</>}
              </div>
            </div>
            <div className="ml-auto text-right shrink-0">
              <div className="text-[0.55rem] uppercase tracking-micro text-gold/80 font-bold">Ahora</div>
              <div className="text-white/40 text-[0.6rem] capitalize">{shortDay(weather.days[0].date)}</div>
            </div>
          </div>

          {/* next 3 days */}
          <div className="grid grid-cols-3 gap-2">
            {weather.days.slice(1, 4).map((f) => (
              <div key={f.date} className="text-center">
                <div className="text-[0.6rem] uppercase tracking-micro text-white/45 font-bold capitalize">{shortDay(f.date)}</div>
                <div className="text-2xl my-1">{f.emoji}</div>
                <div className="text-white font-black text-sm tabular-nums">{f.max}°</div>
                <div className="text-white/40 text-xs tabular-nums">{f.min}°</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* coach tip tied to today's Big One */}
      <div className="card p-4 mb-4">
        <div className="kicker flex items-center gap-1.5 mb-2"><Quote size={13} className="text-gold" /> {tip.title}</div>
        <p className="text-white/85 text-sm leading-relaxed">{tip.tip}</p>
      </div>

      {/* next feriado */}
      {fer && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <div className="text-3xl shrink-0">{fer.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="kicker mb-0.5">Próximo feriado</div>
            <div className="text-white font-bold text-sm leading-snug">{fer.name}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-gold text-2xl font-black leading-none tabular-nums">{fer.daysLeft === 0 ? '¡Hoy!' : fer.daysLeft}</div>
            {fer.daysLeft > 0 && <div className="text-[0.6rem] uppercase tracking-micro text-white/45 font-bold">{fer.daysLeft === 1 ? 'día' : 'días'}</div>}
          </div>
        </div>
      )}

      {/* rachas snapshot → Récords */}
      <button onClick={onGoRecords} className="card p-4 mb-4 w-full text-left active:scale-[0.99] flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <Flame size={26} className="text-gold" />
          <div>
            <div className="text-gold text-3xl font-black leading-none tabular-nums">{streak}</div>
            <div className="text-[0.58rem] uppercase tracking-micro text-white/45 font-bold mt-0.5">semanas seguidas</div>
          </div>
        </div>
        <div className="flex-1 text-right text-white/50 text-xs">
          Mejor racha: <b className="text-white/80">{best}</b>
          <div className="flex items-center justify-end gap-1 text-gold/80 font-bold mt-1">Ver récords <ChevronRight size={14} /></div>
        </div>
      </button>

      {/* bodyweight nudge */}
      {needBw && (
        <button onClick={() => setProfile(true)} className="rounded-card border border-gold/25 bg-white/[0.03] p-3.5 mb-2 w-full text-left flex items-center gap-3 active:scale-[0.99]">
          <Scale size={20} className="text-gold/80 shrink-0" />
          <p className="text-white/75 text-sm flex-1">
            {getBodyweight() == null ? 'Cargá tu peso para clasificar tus récords por categoría.' : 'Pasó un mes: actualizá tu peso para mantener tu categoría al día.'}
          </p>
          <ChevronRight size={16} className="text-white/40 shrink-0" />
        </button>
      )}

      <Profile open={profile} onClose={() => setProfile(false)} routine={routine} />
    </div>
  )
}
