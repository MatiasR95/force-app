import type { Routine } from '../lib/types'
import type { MovementPattern } from '../lib/types'
import { StatHero, Spine } from '../components/ui'
import {
  bigThreeE1RM, weeklySetVolume, routineTonnage, attendanceThisMonth, currentStreak, fmtTonnage, fmtKg,
} from '../lib/metrics'
import { PATTERN_LABEL } from '../lib/media'
import { getCheckins, getSessions } from '../lib/store'
import { Flame, TrendingUp, Dumbbell, Activity } from 'lucide-react'

export function Dashboard({ routine }: { routine: Routine }) {
  const checkins = getCheckins()
  const sessions = getSessions()
  const asistencia = attendanceThisMonth(checkins)
  const racha = currentStreak(checkins)
  const big = bigThreeE1RM(routine)
  const vol = weeklySetVolume(routine)
  const tonnage = routineTonnage(routine)
  const month = new Date().toLocaleDateString('es-AR', { month: 'long' })

  const patterns = (Object.entries(vol) as Array<[MovementPattern, number]>)
    .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const maxVol = Math.max(1, ...patterns.map(([, n]) => n))

  const rpes = sessions.filter((s) => s.rpe != null).slice(-8)

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28">
      <div className="kicker">Tu progreso</div>
      <h1 className="heading text-2xl text-white mb-5">Panel</h1>

      {/* attendance + streak */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="flex-1"><StatHero value={String(asistencia)} label={`Días en ${month}`} /></div>
        </div>
        <div className="card p-4 flex items-center justify-center gap-2">
          <Flame className="text-gold" size={22} />
          <div><StatHero value={String(racha)} label="Racha (días)" /></div>
        </div>
      </div>

      {/* Big lifts e1RM */}
      <SectionTitle icon={<TrendingUp size={14} />}>Fuerza estimada (1RM)</SectionTitle>
      <div className="space-y-2 mb-6">
        {big.slice(0, 3).map((b) => (
          <div key={b.slug} className="card p-3.5 flex items-center gap-3">
            <Spine />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{b.name}</div>
              <div className="text-xs text-white/50">Mejor serie: {fmtKg(b.topSetKg)} kg × {b.reps}</div>
            </div>
            <div className="text-right">
              <div className="text-gold text-2xl font-black leading-none tabular-nums">{fmtKg(b.e1rm)}</div>
              <div className="text-[0.55rem] uppercase tracking-micro text-white/40 font-bold">kg est.</div>
            </div>
          </div>
        ))}
        {big.length === 0 && <Empty>Cuando tu rutina tenga cargas en los básicos, vas a ver tu 1RM estimado.</Empty>}
      </div>

      {/* volume by pattern */}
      <SectionTitle icon={<Dumbbell size={14} />}>Volumen por patrón (series)</SectionTitle>
      <div className="card p-4 mb-6 space-y-2.5">
        {patterns.map(([p, n]) => (
          <div key={p} className="flex items-center gap-3">
            <span className="text-xs text-white/60 w-24 shrink-0">{PATTERN_LABEL[p]}</span>
            <div className="flex-1 h-2.5 rounded-bar bg-white/8 overflow-hidden">
              <div className="h-full rounded-bar bg-gold-fill" style={{ width: `${(n / maxVol) * 100}%` }} />
            </div>
            <span className="text-xs font-bold text-gold w-6 text-right tabular-nums">{n}</span>
          </div>
        ))}
      </div>

      {/* effort trend */}
      <SectionTitle icon={<Activity size={14} />}>Esfuerzo reciente (RPE)</SectionTitle>
      <div className="card p-4 mb-6">
        {rpes.length >= 2 ? <Spark values={rpes.map((s) => s.rpe!)} /> : (
          <Empty>Registrá el esfuerzo al terminar de entrenar y vas a ver tu tendencia acá.</Empty>
        )}
      </div>

      {/* tonnage */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="kicker mb-1">Tonelaje del plan</div>
          <div className="text-white/50 text-xs">Carga total levantada en un ciclo completo</div>
        </div>
        <div className="text-gold text-2xl font-black tabular-nums">{fmtTonnage(tonnage)}</div>
      </div>

      <p className="mt-5 text-[0.66rem] text-white/35 leading-relaxed text-center">
        Cómo se calcula: 1RM estimado con la fórmula de Epley (carga × [1 + reps/30]).
        Tonelaje = carga × reps × series. Barra olímpica de 20 kg; "x lado" = peso por lado.
      </p>
    </div>
  )
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-1">
      <span className="text-gold">{icon}</span>
      <h3 className="heading text-sm text-white/85">{children}</h3>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-white/45 text-sm py-2 text-center">{children}</p>
}

function Spark({ values }: { values: number[] }) {
  const W = 280, H = 70, pad = 6
  const max = 10, min = 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (v - min) / (max - min)) * (H - pad * 2)
    return [x, y] as const
  })
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[70px]">
      <path d={d} fill="none" stroke="#C6AE78" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#C6AE78" />
      ))}
      {pts.map((p, i) => (
        <text key={i} x={p[0]} y={p[1] - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.5)">{values[i]}</text>
      ))}
    </svg>
  )
}
