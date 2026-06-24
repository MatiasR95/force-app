import { useState } from 'react'
import { BottomSheet } from './ui'
import {
  getClientName, setClientName, getGender, setGender,
  getBirthday, setBirthday, getBodyweight, addBodyweight,
} from '../lib/store'
import type { Gender } from '../lib/records'
import { weightClass } from '../lib/records'
import { User, Cake, Scale, Check } from 'lucide-react'

// Member profile: name, gender (record categories), birthday (cumpleaños board)
// and current bodyweight (record weight class + monthly nudge). All local-first.
export function Profile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState(getClientName() ?? '')
  const [gender, setG] = useState<Gender>(getGender() ?? 'M')
  const [bday, setB] = useState(getBirthday() ?? '') // MM-DD
  const [bw, setBw] = useState(getBodyweight()?.toString() ?? '')
  const [saved, setSaved] = useState(false)

  const wc = weightClass(gender, parseFloat(bw) || null)

  const save = () => {
    if (name.trim()) setClientName(name.trim())
    setGender(gender)
    if (bday) setBirthday(bday)
    const n = parseFloat(bw.replace(',', '.'))
    if (n > 0 && n !== getBodyweight()) addBodyweight(n)
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
          <input type="date" value={bday ? `2000-${bday}` : ''} onChange={(e) => setB(e.target.value ? e.target.value.slice(5) : '')}
            className="w-full bg-white/5 border border-white/10 rounded-card px-3 py-2.5 text-white focus:border-gold/50 outline-none [color-scheme:dark]" />
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

        <button onClick={save}
          className="btn-glow w-full flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-3.5 mt-2 active:scale-[0.98]">
          {saved ? <><Check size={18} /> Guardado</> : 'Guardar'}
        </button>
      </div>
    </BottomSheet>
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
