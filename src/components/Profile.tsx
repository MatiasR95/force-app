import { useState } from 'react'
import { BottomSheet } from './ui'
import {
  getClientName, setClientName, getGender, setGender,
  getBirthday, setBirthday, getBodyweight, addBodyweight, setStartWeek,
} from '../lib/store'
import type { Gender } from '../lib/records'
import { weightClass } from '../lib/records'
import { memberCurrentWeek } from '../lib/week'
import type { Routine } from '../lib/types'
import { User, Cake, Scale, Check, CalendarRange, Minus, Plus } from 'lucide-react'

// Member profile: name, gender (record categories), birthday (cumpleaños board),
// current bodyweight (record weight class + monthly nudge) and — for weekly plans —
// "mi semana actual" so a member who joined mid-cycle can fix their week. All local-first.
export function Profile({ open, onClose, routine }: { open: boolean; onClose: () => void; routine?: Routine }) {
  const [name, setName] = useState(getClientName() ?? '')
  const [gender, setG] = useState<Gender>(getGender() ?? 'M')
  const [bday, setB] = useState(getBirthday() ?? '') // MM-DD
  const [bw, setBw] = useState(getBodyweight()?.toString() ?? '')
  const weekly = !!routine && routine.style === 'weekly' && routine.totalWeeks > 1
  const [week, setWk] = useState(() => (routine ? memberCurrentWeek(routine) : 1))
  const [saved, setSaved] = useState(false)

  const wc = weightClass(gender, parseFloat(bw) || null)

  const save = () => {
    if (name.trim()) setClientName(name.trim())
    setGender(gender)
    if (bday) setBirthday(bday)
    const n = parseFloat(bw.replace(',', '.'))
    if (n > 0 && n !== getBodyweight()) addBodyweight(n)
    if (weekly && routine && week !== memberCurrentWeek(routine)) setStartWeek(week) // re-anchor only if changed
    setSaved(true)
    window.setTimeout(() => { setSaved(false); onClose() }, 650)
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pb-7 pt-1">
        <div className="kicker mb-1">Tu perfil</div>
        <h2 className="heading text-2xl text-white mb-5">Tus datos</h2>

        <Field icon={<User size={15} />} label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre"
            className="w-full bg-white/5 border border-white/10 rounded-card px-3 py-2.5 text-white placeholder-white/30 focus:border-gold/50 outline-none" />
        </Field>

        <Field icon={<User size={15} />} label="Categoría de récords">
          <div className="flex gap-2">
            <button onClick={() => setG('F')} className={`flex-1 rounded-card py-2.5 font-bold uppercase text-sm border ${gender === 'F' ? 'bg-gold text-ink border-gold' : 'bg-white/5 text-white/60 border-white/10'}`}>Mujeres</button>
            <button onClick={() => setG('M')} className={`flex-1 rounded-card py-2.5 font-bold uppercase text-sm border ${gender === 'M' ? 'bg-gold text-ink border-gold' : 'bg-white/5 text-white/60 border-white/10'}`}>Hombres</button>
          </div>
        </Field>

        <Field icon={<Cake size={15} />} label="Cumpleaños">
          <BirthdayPicker value={bday} onChange={setB} />
          <p className="text-[0.62rem] text-white/40 mt-1.5">Aparecés en el tablero de cumpleaños del día. Guardamos solo día y mes.</p>
        </Field>

        <Field icon={<Scale size={15} />} label="Peso actual (kg)">
          <input value={bw} onChange={(e) => setBw(e.target.value)} inputMode="decimal" placeholder="Ej. 78"
            className="w-full bg-white/5 border border-white/10 rounded-card px-3 py-2.5 text-white placeholder-white/30 focus:border-gold/50 outline-none" />
          <p className="text-[0.62rem] text-white/40 mt-1.5">
            {wc ? <>Tu categoría: <b className="text-gold">{wc.label}</b>. </> : null}
            Actualizalo una vez por mes para clasificar bien tus récords.
          </p>
        </Field>

        {weekly && routine && (
          <Field icon={<CalendarRange size={15} />} label="Mi semana actual">
            <div className="flex items-center justify-between rounded-card bg-white/5 border border-white/10 px-3 py-2">
              <button onClick={() => setWk((w) => Math.max(1, w - 1))} disabled={week <= 1}
                className="h-9 w-9 grid place-items-center rounded-full bg-white/8 border border-white/10 text-white disabled:opacity-30 active:scale-90"><Minus size={16} /></button>
              <div className="text-center">
                <span className="text-gold text-2xl font-black tabular-nums">{week}</span>
                <span className="text-white/35 text-sm font-bold"> / {routine.totalWeeks}</span>
              </div>
              <button onClick={() => setWk((w) => Math.min(routine.totalWeeks, w + 1))} disabled={week >= routine.totalWeeks}
                className="h-9 w-9 grid place-items-center rounded-full bg-white/8 border border-white/10 text-white disabled:opacity-30 active:scale-90"><Plus size={16} /></button>
            </div>
            <p className="text-[0.62rem] text-white/40 mt-1.5">Avanza sola cada semana. Ajustala solo si arrancaste el ciclo a mitad de camino.</p>
          </Field>
        )}

        <button onClick={save}
          className="btn-glow w-full flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-3.5 mt-2 active:scale-[0.98]">
          {saved ? <><Check size={18} /> Guardado</> : 'Guardar'}
        </button>
      </div>
    </BottomSheet>
  )
}

// Day + month picker (no year — we only store/use día y mes for the birthday board,
// so a date input's year field just confused people by snapping back).
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const pad2 = (n: number) => String(n).padStart(2, '0')

function BirthdayPicker({ value, onChange }: { value: string; onChange: (mmdd: string) => void }) {
  const [mm, dd] = value ? value.split('-') : ['', '']
  const daysInMonth = mm ? new Date(2024, parseInt(mm, 10), 0).getDate() : 31 // 2024 = leap → allows 29 Feb
  const set = (month: string, day: string) => {
    if (!month || !day) { onChange(''); return }
    onChange(`${month}-${day}`)
  }
  const selCls = 'flex-1 bg-white/5 border border-white/10 rounded-card px-3 py-2.5 text-white focus:border-gold/50 outline-none [color-scheme:dark]'
  return (
    <div className="flex gap-2">
      <select value={dd} onChange={(e) => set(mm || '01', e.target.value)} className={selCls} aria-label="Día">
        <option value="">Día</option>
        {Array.from({ length: daysInMonth }, (_, i) => pad2(i + 1)).map((d) => <option key={d} value={d}>{parseInt(d, 10)}</option>)}
      </select>
      <select value={mm} onChange={(e) => set(e.target.value, dd || '01')} className={selCls} aria-label="Mes">
        <option value="">Mes</option>
        {MESES.map((name, i) => <option key={name} value={pad2(i + 1)}>{name}</option>)}
      </select>
    </div>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="kicker flex items-center gap-1.5 mb-1.5"><span className="text-gold/70">{icon}</span> {label}</div>
      {children}
    </div>
  )
}
