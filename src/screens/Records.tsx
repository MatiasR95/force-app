import { useEffect, useMemo, useState } from 'react'
import type { RecordEntry, Gender, StreakEntry } from '../lib/records'
import { RECORD_LIFTS, rank, bestOf, epley1RM, liftLabel, WEIGHT_CLASSES } from '../lib/records'
import { fetchRecords, syncStreak } from '../lib/api'
import { getToken, getGender, getClientName, getCheckins, getMaxStreak } from '../lib/store'
import { currentStreakWeeks } from '../lib/metrics'
import { Pill } from '../components/ui'
import { Trophy, Crown, Sparkles, Flame } from 'lucide-react'

export function Records() {
  const [view, setView] = useState<'records' | 'rachas'>('records')
  const client = getClientName() ?? 'Vos'

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
      <div className="kicker flex items-center gap-1.5"><Trophy size={13} className="text-gold" /> Salón de la fama</div>
      <h1 className="heading text-2xl text-white mb-3 glow-text">Récords FORCE</h1>

      <div className="flex gap-2 mb-5">
        <Pill active={view === 'records'} onClick={() => setView('records')}>🏋️ Récords</Pill>
        <Pill active={view === 'rachas'} onClick={() => setView('rachas')}>🔥 Rachas</Pill>
      </div>

      {view === 'records' ? <RecordsView client={client} /> : <RachasView client={client} />}
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
