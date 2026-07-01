import { useEffect, useMemo, useState } from 'react'
import type { RecordEntry, Gender, StreakEntry } from '../lib/records'
import { RECORD_LIFTS, rank, bestOf, epley1RM, liftLabel, WEIGHT_CLASSES, wcLabel, weightClass } from '../lib/records'
import { fetchRecords, syncStreak } from '../lib/api'
import { getToken, getGender, getClientName, getCheckins, getMaxStreak, getMyRecords, getBodyweight, getSessions } from '../lib/store'
import { currentStreakWeeks } from '../lib/metrics'
import {
  type Tier, TIER_LABEL, defaultCat, strengthMedals, ladderState, STREAK_LADDER, SESSION_LADDER,
} from '../lib/medals'
import { Medal } from '../components/Medal'
import { Pill } from '../components/ui'
import { Trophy, Crown, Sparkles, Flame, Dumbbell, CalendarCheck } from 'lucide-react'

export function Records() {
  const [view, setView] = useState<'records' | 'medallas' | 'rachas'>('records')
  const client = getClientName() ?? 'Vos'

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
      <div className="kicker flex items-center gap-1.5"><Trophy size={13} className="text-gold" /> Salón de la fama</div>
      <h1 className="heading text-2xl text-white mb-3 glow-text">Récords FORCE</h1>

      <div className="flex gap-2 mb-5">
        <Pill active={view === 'records'} onClick={() => setView('records')}>🏋️ Récords</Pill>
        <Pill active={view === 'medallas'} onClick={() => setView('medallas')}>🏅 Medallas</Pill>
        <Pill active={view === 'rachas'} onClick={() => setView('rachas')}>🔥 Rachas</Pill>
      </div>

      {view === 'records' ? <RecordsView client={client} />
        : view === 'medallas' ? <MedalleroView />
          : <RachasView client={client} />}
    </div>
  )
}

function MedalleroView() {
  const gender = getGender()
  if (!gender) {
    return <p className="text-white/45 text-sm text-center py-10">Elegí tu categoría (Mujeres / Hombres) al entrar para ver tus medallas. 🏅</p>
  }
  const cat = weightClass(gender, getBodyweight())?.key ?? defaultCat(gender)
  const records = getMyRecords()
  const streakWeeks = currentStreakWeeks(getCheckins())
  const sessions = getSessions().length
  const lifts = strengthMedals(records, gender, cat as never)

  const streak = ladderState(streakWeeks, STREAK_LADDER)
  const sess = ladderState(sessions, SESSION_LADDER)

  return (
    <>
      <p className="text-white/45 text-xs mb-4 flex items-center gap-1.5">
        <Sparkles size={12} className="text-gold/70" /> Se desbloquean solas cuando entrenás y rompés tus marcas. Categoría: <b className="text-white/70">{wcLabel(cat)}</b>.
      </p>

      <SectionTitle icon={<Flame size={14} />}>Constancia</SectionTitle>
      <div className="space-y-2 mb-6">
        <LadderRow label="Semanas seguidas" icon={<Flame size={22} />} value={streakWeeks} unit="sem" state={streak} />
        <LadderRow label="Entrenamientos" icon={<CalendarCheck size={20} />} value={sessions} unit="" state={sess} />
      </div>

      <SectionTitle icon={<Dumbbell size={14} />}>Fuerza · por categoría</SectionTitle>
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

const TIER_COLOR: Record<Tier, string> = { bronce: '#e0a06a', plata: '#cfd2d8', oro: '#C6AE78', platino: '#cfe0ea' }
const fmt = (n: number) => n.toLocaleString('es-AR')

function LadderRow({ label, icon, value, unit, state }: {
  label: string; icon: React.ReactNode; value: number; unit: string
  state: ReturnType<typeof ladderState>
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

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-1">
      <span className="text-gold">{icon}</span>
      <h3 className="heading text-sm text-white/85">{children}</h3>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}

function RecordsView({ client }: { client: string }) {
  const [all, setAll] = useState<RecordEntry[]>([])
  const [lift, setLift] = useState(RECORD_LIFTS[0].key)
  const [gender, setG] = useState<Gender>(getGender() ?? 'M')
  const [wc, setWc] = useState<string>('all') // 'all' | weight-class key

  useEffect(() => { fetchRecords(getToken()).then(setAll).catch(() => {}) }, [])

  const board = useMemo(
    () => rank(all.filter((e) =>
      e.lift === lift && e.gender === gender && (wc === 'all' || e.wc === wc))),
    [all, lift, gender, wc],
  )
  const mine = bestOf(board, client)
  const top = board[0]
  const gap = mine && top ? Math.round((top.kg - mine.kg) * 10) / 10 : null

  return (
    <>
      <p className="text-white/45 text-xs mb-4 flex items-center gap-1.5">
        <Sparkles size={12} className="text-gold/70" /> Se cargan solos cuando terminás una serie de estos ejercicios.
      </p>

      <div className="flex gap-2 mb-3">
        <Pill active={gender === 'F'} onClick={() => { setG('F'); setWc('all') }}>Mujeres</Pill>
        <Pill active={gender === 'M'} onClick={() => { setG('M'); setWc('all') }}>Hombres</Pill>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 -mx-1 px-1">
        {RECORD_LIFTS.map((l) => (
          <Pill key={l.key} active={l.key === lift} onClick={() => setLift(l.key)}>{l.emoji} {l.label.split(' ')[0]}</Pill>
        ))}
      </div>

      {/* bodyweight category */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-1 px-1">
        <Pill active={wc === 'all'} onClick={() => setWc('all')}>Todas las categorías</Pill>
        {WEIGHT_CLASSES[gender].map((w) => (
          <Pill key={w.key} active={wc === w.key} onClick={() => setWc(w.key)}>{w.label}</Pill>
        ))}
      </div>

      <h2 className="heading text-lg text-white mb-2">{liftLabel(lift)}
        {wc !== 'all' && <span className="text-gold/80 text-sm font-bold"> · {WEIGHT_CLASSES[gender].find((w) => w.key === wc)?.label}</span>}
      </h2>

      {mine && (
        <div className="hero-card rounded-card p-4 mb-5">
          <div className="kicker mb-1">Tu mejor marca</div>
          <div className="flex items-end justify-between">
            <div className="text-gold text-3xl font-black tabular-nums">{mine.kg}<span className="text-lg"> kg</span> <span className="text-white/50 text-base font-bold">× {mine.reps}</span></div>
            <div className="text-right text-xs text-white/60">
              {gap === 0 ? <span className="text-gold font-black">🏆 ¡Tenés el récord!</span>
                : gap != null ? <>Te faltan <b className="text-gold">{gap} kg</b> para el #1</> : null}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {board.length === 0 && (
          <p className="text-white/45 text-sm text-center py-8">Todavía no hay récords de {liftLabel(lift)}.<br />¡Hacé una serie y entrá al ranking! 🚀</p>
        )}
        {board.slice(0, 20).map((e, i) => {
          const isMe = e.client === client
          return (
            <div key={e.id} className={`flex items-center gap-3 rounded-card border p-3 ${isMe ? 'border-gold/50 bg-gold/[0.10]' : i < 3 ? 'border-gold/20 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]'}`}>
              <div className={`w-7 text-center font-black ${i === 0 ? 'text-gold text-lg' : 'text-white/50'}`}>
                {i === 0 ? <Crown size={18} className="text-gold mx-auto" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{e.client}{isMe && <span className="text-gold/80 text-xs font-bold"> · vos</span>}</div>
                <div className="text-[0.62rem] text-white/40">1RM est. {epley1RM(e.kg, e.reps)} kg</div>
              </div>
              <div className="text-right">
                <div className="text-white font-black tabular-nums">{e.kg} <span className="text-white/50 text-sm">kg</span></div>
                <div className="text-[0.62rem] text-white/45">× {e.reps} reps</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function RachasView({ client }: { client: string }) {
  const [streaks, setStreaks] = useState<StreakEntry[]>([])
  const myCur = currentStreakWeeks(getCheckins())
  const myMax = Math.max(getMaxStreak(), myCur)

  useEffect(() => {
    syncStreak(getToken(), { client, weeks: myCur, max: myMax }).then(setStreaks).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const board = [...streaks].sort((a, b) => (b.weeks - a.weeks) || (b.max - a.max)).slice(0, 10)
  const historic = streaks.reduce<StreakEntry | null>((m, s) => (!m || s.max > m.max ? s : m), null)

  return (
    <>
      <p className="text-white/45 text-xs mb-4 flex items-center gap-1.5">
        <Sparkles size={12} className="text-gold/70" /> Una racha es entrenar al menos una vez por semana, sin saltarte ninguna.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="hero-card rounded-card p-4 text-center">
          <div className="kicker mb-1">Tu racha</div>
          <div className="text-gold text-4xl font-black leading-none tabular-nums">{myCur}</div>
          <div className="text-[0.6rem] uppercase tracking-micro text-white/45 font-bold mt-1">semanas seguidas</div>
        </div>
        <div className="card p-4 text-center flex flex-col justify-center">
          <div className="kicker mb-1">Tu récord</div>
          <div className="text-white text-3xl font-black leading-none tabular-nums">{myMax}</div>
          <div className="text-[0.6rem] uppercase tracking-micro text-white/45 font-bold mt-1">mejor racha</div>
        </div>
      </div>

      {historic && historic.max > 0 && (
        <div className="rounded-card border border-gold/30 bg-gold/[0.08] p-3 mb-5 flex items-center gap-2.5">
          <Trophy size={16} className="text-gold shrink-0" />
          <p className="text-white/85 text-sm">Récord histórico del gimnasio: <b className="text-gold">{historic.max} semanas</b>{historic.client ? ` — ${historic.client}` : ''} 🔥</p>
        </div>
      )}

      <h2 className="heading text-lg text-white mb-2">Top 10 rachas activas</h2>
      <div className="space-y-2">
        {board.length === 0 && (
          <p className="text-white/45 text-sm text-center py-8">Todavía no hay rachas.<br />¡Vení cada semana y encabezá la tabla! 🔥</p>
        )}
        {board.map((s, i) => {
          const isMe = s.client === client
          return (
            <div key={s.client + i} className={`flex items-center gap-3 rounded-card border p-3 ${isMe ? 'border-gold/50 bg-gold/[0.10]' : i < 3 ? 'border-gold/20 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]'}`}>
              <div className={`w-7 text-center font-black ${i === 0 ? 'text-gold text-lg' : 'text-white/50'}`}>
                {i === 0 ? <Crown size={18} className="text-gold mx-auto" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{s.client}{isMe && <span className="text-gold/80 text-xs font-bold"> · vos</span>}</div>
                <div className="text-[0.62rem] text-white/40">mejor: {s.max} semanas</div>
              </div>
              <div className="flex items-center gap-1.5 text-gold font-black tabular-nums">
                <Flame size={16} />{s.weeks}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
