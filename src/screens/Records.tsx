import { useEffect, useMemo, useState } from 'react'
import type { RecordEntry, Gender } from '../lib/records'
import { RECORD_LIFTS, rank, bestOf, epley1RM, liftLabel } from '../lib/records'
import { fetchRecords } from '../lib/api'
import { getToken, getGender, getClientName } from '../lib/store'
import { Pill } from '../components/ui'
import { Trophy, Crown, Sparkles } from 'lucide-react'

export function Records() {
  const [all, setAll] = useState<RecordEntry[]>([])
  const [lift, setLift] = useState(RECORD_LIFTS[0].key)
  const [gender, setG] = useState<Gender>(getGender() ?? 'M')
  const client = getClientName() ?? 'Vos'

  useEffect(() => { fetchRecords(getToken()).then(setAll).catch(() => {}) }, [])

  const board = useMemo(
    () => rank(all.filter((e) => e.lift === lift && e.gender === gender)),
    [all, lift, gender],
  )
  const mine = bestOf(board, client)
  const top = board[0]
  const gap = mine && top ? Math.round((top.kg - mine.kg) * 10) / 10 : null

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28">
      <div className="kicker flex items-center gap-1.5"><Trophy size={13} className="text-gold" /> Salón de la fama</div>
      <h1 className="heading text-2xl text-white mb-1 glow-text">Récords FORCE</h1>
      <p className="text-white/45 text-xs mb-4 flex items-center gap-1.5">
        <Sparkles size={12} className="text-gold/70" /> Se cargan solos cuando terminás una serie de estos ejercicios.
      </p>

      {/* gender toggle */}
      <div className="flex gap-2 mb-3">
        <Pill active={gender === 'F'} onClick={() => setG('F')}>Mujeres</Pill>
        <Pill active={gender === 'M'} onClick={() => setG('M')}>Hombres</Pill>
      </div>

      {/* lift selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-1 px-1">
        {RECORD_LIFTS.map((l) => (
          <Pill key={l.key} active={l.key === lift} onClick={() => setLift(l.key)}>
            {l.emoji} {l.label.split(' ')[0]}
          </Pill>
        ))}
      </div>

      <h2 className="heading text-lg text-white mb-2">{liftLabel(lift)}</h2>

      {mine && (
        <div className="hero-card rounded-card p-4 mb-5">
          <div className="kicker mb-1">Tu mejor marca</div>
          <div className="flex items-end justify-between">
            <div className="text-gold text-3xl font-black tabular-nums">{mine.kg}<span className="text-lg"> kg</span> <span className="text-white/50 text-base font-bold">× {mine.reps}</span></div>
            <div className="text-right text-xs text-white/60">
              {gap === 0 ? <span className="text-gold font-black">🏆 ¡Tenés el récord!</span>
                : gap != null ? <>Te faltan <b className="text-gold">{gap} kg</b> para el #1</>
                : null}
            </div>
          </div>
        </div>
      )}

      {/* leaderboard */}
      <div className="space-y-2">
        {board.length === 0 && (
          <p className="text-white/45 text-sm text-center py-8">
            Todavía no hay récords de {liftLabel(lift)}.<br />¡Hacé una serie y entrá al ranking! 🚀
          </p>
        )}
        {board.slice(0, 20).map((e, i) => {
          const isMe = e.client === client
          return (
            <div key={e.id}
              className={`flex items-center gap-3 rounded-card border p-3 ${isMe ? 'border-gold/50 bg-gold/[0.10]' : i < 3 ? 'border-gold/20 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]'}`}>
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
    </div>
  )
}
