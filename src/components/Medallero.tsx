import { RECORD_LIFTS, liftLabel, wcLabel, weightClass } from '../lib/records'
import { getGender, getBodyweight, getMyRecords, getSessions, getCheckins } from '../lib/store'
import { currentStreakWeeks } from '../lib/metrics'
import {
  type Tier, TIER_LABEL, defaultCat, strengthMedals, ladderState, STREAK_LADDER, SESSION_LADDER,
} from '../lib/medals'
import { Medal } from './Medal'
import { Sparkles, Flame, Dumbbell, CalendarCheck } from 'lucide-react'

const TIER_COLOR: Record<Tier, string> = { bronce: '#e0a06a', plata: '#cfd2d8', oro: '#C6AE78', platino: '#cfe0ea' }
const fmt = (n: number) => n.toLocaleString('es-AR')

// The member's personal achievements: constancia ladders (endless) + per-lift
// strength medals by gender/category. Personal, so it lives in Panel — not on the
// gym-wide Récords board.
export function Medallero() {
  const gender = getGender()
  if (!gender) {
    return <p className="text-white/45 text-sm text-center py-6">Elegí tu categoría (Mujeres / Hombres) al entrar para ver tus medallas. 🏅</p>
  }
  const cat = (weightClass(gender, getBodyweight())?.key ?? defaultCat(gender)) as never
  const records = getMyRecords()
  const streakWeeks = currentStreakWeeks(getCheckins())
  const sessions = getSessions().length
  const lifts = strengthMedals(records, gender, cat)
  const streak = ladderState(streakWeeks, STREAK_LADDER)
  const sess = ladderState(sessions, SESSION_LADDER)

  return (
    <>
      <p className="text-white/45 text-xs mb-4 flex items-center gap-1.5">
        <Sparkles size={12} className="text-gold/70" /> Se desbloquean solas cuando entrenás y rompés tus marcas. Categoría: <b className="text-white/70">{wcLabel(cat)}</b>.
      </p>

      <Section icon={<Flame size={14} />}>Constancia</Section>
      <div className="space-y-2 mb-6">
        <LadderRow label="Semanas seguidas" icon={<Flame size={22} />} value={streakWeeks} unit="sem" state={streak} />
        <LadderRow label="Entrenamientos" icon={<CalendarCheck size={20} />} value={sessions} unit="" state={sess} />
      </div>

      <Section icon={<Dumbbell size={14} />}>Fuerza · por categoría</Section>
      <div className="space-y-2">
        {lifts.map((m) => {
          const lift = RECORD_LIFTS.find((l) => l.key === m.lift)!
          const isDom = m.lift === 'dominadas'
          return (
            <div key={m.lift} className="card p-3 flex items-center gap-3">
              <Medal tier={m.tier} icon={<Dumbbell size={22} />} size={52} locked={!m.tier} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{lift.emoji} {liftLabel(m.lift)}</div>
                {m.tier
                  ? <div className="text-xs"><span style={{ color: TIER_COLOR[m.tier] }} className="font-black">{TIER_LABEL[m.tier]}</span><span className="text-white/45"> · tu mejor {fmt(m.value)}{isDom ? ' kg lastre' : ' kg'}</span></div>
                  : <div className="text-xs text-white/45">Sin medalla todavía</div>}
                {m.nextTier && (
                  <div className="text-[0.66rem] text-white/40 mt-0.5">
                    {TIER_LABEL[m.nextTier]} a {fmt(m.nextAt!)}{isDom ? ' kg lastre' : ' kg'} · faltan {fmt(Math.max(0, m.nextAt! - m.value))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-5 text-[0.66rem] text-white/35 leading-relaxed text-center">
        Bronce / Plata / Oro según tu género y categoría de peso. La constancia suma Bronce → Platino y sigue contando para siempre.
      </p>
    </>
  )
}

function LadderRow({ label, icon, value, unit, state }: {
  label: string; icon: React.ReactNode; value: number; unit: string; state: ReturnType<typeof ladderState>
}) {
  const cur = state.step?.tier ?? null
  const prevN = state.step?.n ?? 0
  const nextN = state.next?.n ?? null
  const pct = nextN ? Math.min(100, Math.round(((value - prevN) / (nextN - prevN)) * 100)) : 100
  return (
    <div className="card p-3 flex items-center gap-3">
      <Medal tier={cur} icon={icon} size={52} locked={!cur} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm">{label}: <span className="text-gold">{fmt(value)}</span> {unit}</div>
        {cur && <div className="text-[0.66rem] font-black" style={{ color: TIER_COLOR[cur] }}>{TIER_LABEL[cur]}</div>}
        {nextN
          ? <>
            <div className="h-1.5 rounded-bar bg-white/8 overflow-hidden mt-1.5"><div className="h-full rounded-bar bg-gold-fill" style={{ width: `${pct}%` }} /></div>
            <div className="text-[0.62rem] text-white/40 mt-1">Próxima a {fmt(nextN)} {unit}</div>
          </>
          : <div className="text-[0.62rem] text-gold/80 mt-1">¡Máximo nivel! Y sigue contando 🔥</div>}
      </div>
    </div>
  )
}

function Section({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-1">
      <span className="text-gold">{icon}</span>
      <h3 className="heading text-sm text-white/85">{children}</h3>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}
