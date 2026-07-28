import { useEffect, useMemo, useState } from 'react'
import type { RecordEntry, Gender, StreakEntry } from '../lib/records'
import { RECORD_LIFTS, rankUnique, bestOf, sameClient, epley1RM, liftLabel, WEIGHT_CLASSES } from '../lib/records'
import { fetchRecords, syncStreak, cachedRecords, cachedStreaks } from '../lib/api'
import { getToken, getGender, getClientName, getCheckins, getMaxStreak, getMyRecords } from '../lib/store'
import { currentStreakWeeks } from '../lib/metrics'
import { Pill } from '../components/ui'
import { StreakFlame } from '../components/StreakFlame'
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

// Rotate which lift greets you: a different record leads the board each day (the
// member can still pick any lift from the pills — the whole list is one tap away).
function rotatedLifts() {
  const shift = Math.floor(Date.now() / 86_400_000) % RECORD_LIFTS.length
  return [...RECORD_LIFTS.slice(shift), ...RECORD_LIFTS.slice(0, shift)]
}

function RecordsView({ client }: { client: string }) {
  // paint the last known board instantly; the fetch below refreshes it silently
  const [all, setAll] = useState<RecordEntry[]>(() => cachedRecords() ?? [])
  const [lifts] = useState(rotatedLifts)
  const [lift, setLift] = useState(lifts[0].key)
  const [gender, setG] = useState<Gender>(getGender() ?? 'M')
  const [wc, setWc] = useState<string>('all') // 'all' | weight-class key

  useEffect(() => { fetchRecords(getToken()).then(setAll).catch(() => {}) }, [])

  // filter → dedupe → rank. One row per person (their best), so someone with three
  // PRs on the same lift can't fill the podium alone — and "#N del ranking" counts
  // people, not marks. Order matters: a category board dedupes *within* that category.
  const board = useMemo(
    () => rankUnique(all.filter((e) =>
      e.lift === lift && e.gender === gender && (wc === 'all' || e.wc === wc))),
    [all, lift, gender, wc],
  )
  const mine = bestOf(board, client)
  const top = board[0]
  const gap = mine && top ? Math.round((top.kg - mine.kg) * 10) / 10 : null
  const myPos = mine ? board.findIndex((e) => e.id === mine.id) + 1 : 0

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
        {lifts.map((l) => (
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

      <p className="text-white/40 text-[0.7rem] mb-3 -mt-1">Una marca por persona — la mejor de cada uno.</p>

      {/* records captured before the member loaded their bodyweight carry no
          category — surface why a category board can look emptier than "Todas" */}
      {wc !== 'all' && (() => {
        const sinCat = all.filter((e) => e.lift === lift && e.gender === gender && !e.wc).length
        return sinCat > 0 ? (
          <p className="text-white/40 text-[0.7rem] mb-3 -mt-1">
            {sinCat} {sinCat === 1 ? 'marca no tiene categoría' : 'marcas no tienen categoría'} (esa persona no cargó su peso corporal) — {sinCat === 1 ? 'la ves' : 'las ves'} en "Todas las categorías".
          </p>
        ) : null
      })()}

      {mine && (
        <div className="hero-card rounded-card p-4 mb-5">
          <div className="flex items-baseline justify-between mb-1">
            <div className="kicker">Tu mejor marca</div>
            {myPos > 0 && (
              <span className="text-[0.62rem] font-black uppercase tracking-micro text-gold/90">
                #{myPos} del ranking
              </span>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-gold text-3xl font-black tabular-nums">{mine.kg}<span className="text-lg"> kg</span> <span className="text-white/50 text-base font-bold">× {mine.reps}</span></div>
            <div className="text-right text-xs text-white/60">
              {gap === 0 ? <span className="text-gold font-black">🏆 ¡Tenés el récord!</span>
                : gap != null ? <>Te faltan <b className="text-gold">{gap} kg</b> para el #1</> : null}
            </div>
          </div>
          <PrTimeline lift={lift} gender={gender} />
        </div>
      )}

      {/* top 3 → a real podium (2·1·3); the rest of the board lists from #4.
          Keyed by the active filters so the blocks rise again on each new board. */}
      {board.length >= 3 && <Podium key={`${lift}-${gender}-${wc}`} top3={[board[0], board[1], board[2]]} client={client} />}

      <div className="space-y-2">
        {board.length === 0 && (
          <p className="text-white/45 text-sm text-center py-8">Todavía no hay récords de {liftLabel(lift)}.<br />¡Hacé una serie y entrá al ranking! 🚀</p>
        )}
        {(board.length >= 3 ? board.slice(3, 20) : board.slice(0, 20)).map((e, i) => {
          const isMe = sameClient(e.client, client)
          const pos = board.length >= 3 ? i + 4 : i + 1
          return (
            <div key={e.id} className={`flex items-center gap-3 rounded-card border p-3 ${isMe ? 'border-gold/50 bg-gold/[0.10]' : pos <= 3 ? 'border-gold/20 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]'}`}>
              <div className={`w-7 text-center font-black ${pos === 1 ? 'text-gold text-lg' : 'text-white/50'}`}>
                {pos === 1 ? <Crown size={18} className="text-gold mx-auto" /> : pos}
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

// Your PR history for this lift, drawn as a self-tracing gold line — every dot a
// record you set. Appears once there are 2+ marks (a line needs a story).
function PrTimeline({ lift, gender }: { lift: string; gender: Gender }) {
  const hist = getMyRecords()
    .filter((e) => e.lift === lift && e.gender === gender)
    .sort((a, b) => (a.ts < b.ts ? -1 : 1))
  if (hist.length < 2) return null
  const values = hist.map((e) => e.kg)
  const gain = Math.round((values[values.length - 1] - values[0]) * 10) / 10
  const W = 280, H = 56, pad = 8
  const lo = Math.min(...values), hi = Math.max(...values)
  const span = Math.max(0.01, hi - lo)
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (v - lo) / span) * (H - pad * 2)
    return [x, y] as const
  })
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const fmtMon = (ts: string) => new Date(ts).toLocaleDateString('es-AR', { month: 'short' })
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[0.58rem] uppercase tracking-micro text-white/40 font-bold">Tu camino en este ejercicio</span>
        {gain > 0 && <span className="text-gold text-xs font-black">+{gain.toLocaleString('es-AR')} kg desde tu primera marca</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 12}`} className="w-full" style={{ height: (H + 12) * (280 / W) }}>
        <path d={d} pathLength={1} className="spark-draw" fill="none"
          stroke="#C6AE78" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i} className="spark-dot" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
            <circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 3}
              fill={i === pts.length - 1 ? '#F0E2BE' : '#C6AE78'} />
            <text x={p[0]} y={p[1] - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="rgba(255,255,255,.6)">{values[i]}</text>
            <text x={p[0]} y={H + 9} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.35)">{fmtMon(hist[i].ts)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts.map((w) => w[0].toUpperCase()).slice(0, 2).join('') : '?'
}

// Salón de la fama: the top 3 stand on a gold podium — center elevated, crown on
// #1, monogram rings (brand rule: no faces). Blocks rise from the floor on entry.
function Podium({ top3, client }: { top3: RecordEntry[]; client: string }) {
  const cols = [
    { e: top3[1], place: 2, block: 'h-12' },
    { e: top3[0], place: 1, block: 'h-20' },
    { e: top3[2], place: 3, block: 'h-9' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2 items-end mb-5 px-1">
      {cols.map(({ e, place, block }, col) => {
        const isMe = sameClient(e.client, client)
        const first = place === 1
        return (
          <div key={e.id} className="flex flex-col items-center min-w-0">
            {first && <Crown size={18} className="podium-crown text-gold mb-1" />}
            <div style={{ animationDelay: `${col * 90 + 300}ms` }}
              className={`podium-avatar grid place-items-center rounded-full bg-gold-fill text-ink font-black shrink-0
              ${first ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm opacity-80'} ${isMe ? 'ring-2 ring-gold-pale' : ''}`}>
              {initials(e.client)}
            </div>
            <div className="w-full text-center mt-1.5 mb-2">
              <div className="text-white text-xs font-bold truncate">
                {e.client.split(' ')[0]}{isMe && <span className="text-gold/80"> · vos</span>}
              </div>
              <div className={`font-black tabular-nums ${first ? 'text-gold text-base' : 'text-gold/90 text-sm'}`}>
                {e.kg} <span className="text-[0.62rem] font-bold">kg</span>
                <span className="text-white/45 font-bold text-[0.62rem]"> × {e.reps}</span>
              </div>
            </div>
            <div className={`podium-block ${first ? 'podium-block--champ' : 'podium-block--dim'} w-full rounded-t-lg ${block}`}
              style={{ animationDelay: `${col * 90}ms` }}>
              <span className={`grid place-items-center h-full font-black text-sm ${first ? 'text-ink/70' : 'text-gold/80'}`}>{place}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RachasView({ client }: { client: string }) {
  // paint the last known board instantly; syncStreak refreshes it silently
  const [streaks, setStreaks] = useState<StreakEntry[]>(() => cachedStreaks() ?? [])
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
          <div className="flex items-center justify-center gap-2">
            <StreakFlame streak={myCur} size={30} />
            <div className="text-gold text-4xl font-black leading-none tabular-nums">{myCur}</div>
          </div>
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
