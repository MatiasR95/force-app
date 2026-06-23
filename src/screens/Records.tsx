import { useEffect, useMemo, useState } from 'react'
import type { RecordEntry, Gender } from '../lib/records'
import { RECORD_LIFTS, rank, bestOf, epley1RM, liftLabel } from '../lib/records'
import { fetchRecords, submitRecord } from '../lib/api'
import { getToken, getGender, setGender, getClientName, addMyRecord } from '../lib/store'
import { Pill, BottomSheet } from '../components/ui'
import { Trophy, Crown, Plus, Minus, X } from 'lucide-react'

const rid = () => `r-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`

export function Records() {
  const [all, setAll] = useState<RecordEntry[]>([])
  const [lift, setLift] = useState(RECORD_LIFTS[0].key)
  const [gender, setG] = useState<Gender>(getGender() ?? 'M')
  const [adding, setAdding] = useState(false)
  const client = getClientName() ?? 'Vos'

  const reload = () => fetchRecords(getToken()).then(setAll).catch(() => {})
  useEffect(() => { reload() }, [])

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
      <h1 className="heading text-2xl text-white mb-4 glow-text">Récords FORCE</h1>

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

      <h2 className="heading text-lg text-white mb-1">{liftLabel(lift)}</h2>

      {/* your mark vs the record */}
      {mine ? (
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
      ) : (
        <div className="card p-4 mb-5 text-white/55 text-sm">
          Todavía no cargaste tu marca en {liftLabel(lift)}. Cuando lo hagas, tocá <b className="text-gold">Cargar récord</b>.
        </div>
      )}

      {/* leaderboard */}
      <div className="space-y-2">
        {board.length === 0 && <p className="text-white/45 text-sm text-center py-6">Sin récords todavía. ¡Sé el primero! 🚀</p>}
        {board.slice(0, 15).map((e, i) => {
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

      {/* add record FAB */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] px-4 pointer-events-none max-w-md mx-auto">
        <button onClick={() => setAdding(true)}
          className="btn-glow pointer-events-auto w-full flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-4 active:scale-[0.98]">
          <Trophy size={18} /> Cargar récord
        </button>
      </div>

      <AddRecord open={adding} lift={lift} gender={gender} client={client}
        onClose={() => setAdding(false)}
        onSaved={(entry) => { addMyRecord(entry); setGender(entry.gender); submitRecord(getToken(), entry); setAdding(false); reload() }} />
    </div>
  )
}

function AddRecord({ open, lift, gender, client, onClose, onSaved }: {
  open: boolean; lift: string; gender: Gender; client: string
  onClose: () => void; onSaved: (e: RecordEntry) => void
}) {
  const [selLift, setSelLift] = useState(lift)
  const [g, setG] = useState<Gender>(gender)
  const [kg, setKg] = useState(60)
  const [reps, setReps] = useState(1)
  useEffect(() => { setSelLift(lift); setG(gender) }, [lift, gender, open])

  const save = () => onSaved({ id: rid(), client, gender: g, lift: selLift, kg, reps, ts: new Date().toISOString() })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading text-xl text-white">Cargar récord</h2>
          <button onClick={onClose} className="p-1.5 text-white/50"><X size={20} /></button>
        </div>
        <p className="text-white/55 text-sm mb-4">Solo cargá una marca que <b className="text-gold">ya lograste</b>. Va al ranking del gimnasio.</p>

        <div className="kicker mb-1.5">Ejercicio</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
          {RECORD_LIFTS.map((l) => (
            <Pill key={l.key} active={l.key === selLift} onClick={() => setSelLift(l.key)}>{l.emoji} {l.label.split(' ')[0]}</Pill>
          ))}
        </div>

        <div className="kicker mb-1.5">Categoría</div>
        <div className="flex gap-2 mb-4">
          <Pill active={g === 'F'} onClick={() => setG('F')}>Mujeres</Pill>
          <Pill active={g === 'M'} onClick={() => setG('M')}>Hombres</Pill>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <Stepper label="Peso total (kg)" value={kg} step={2.5} min={1} onChange={setKg} />
          <Stepper label="Repeticiones" value={reps} step={1} min={1} onChange={setReps} />
        </div>

        <button onClick={save} className="btn-glow w-full rounded-full bg-gold-fill text-ink font-black uppercase py-4">
          Guardar mi récord 🏆
        </button>
      </div>
    </BottomSheet>
  )
}

function Stepper({ label, value, step, min, onChange }: {
  label: string; value: number; step: number; min: number; onChange: (v: number) => void
}) {
  return (
    <div className="rounded-card bg-white/5 border border-white/10 p-3">
      <div className="text-[0.58rem] uppercase tracking-micro text-white/45 font-bold mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
          className="h-9 w-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Minus size={16} /></button>
        <div className="flex-1 text-center text-gold text-2xl font-black tabular-nums">{value}</div>
        <button onClick={() => onChange(Math.round((value + step) * 10) / 10)}
          className="h-9 w-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 active:scale-95"><Plus size={16} /></button>
      </div>
    </div>
  )
}
