import { useState } from 'react'
import { BottomSheet } from './ui'
import { useUiPrefs } from '../lib/UiPrefsContext'
import { FONT_SCALES, getAwakeIdleSec, setAwakeIdleSec } from '../lib/store'
import type { ThemePref } from '../lib/store'
import { Dumbbell, Check, Smartphone, Type, Palette } from 'lucide-react'

// Apariencia — the one place a member changes how the app LOOKS: text size, theme,
// and how long the screen stays awake while they train.
//
// Two rules shape this screen:
//  1. Everything applies live. Someone who can't read the app can't read a
//     "Guardar" button either — they need to see the change while their finger is
//     still on the control. There is no commit step, only "Listo" to close.
//  2. Every control is its own sample. The size stops are drawn at their own size,
//     the theme cards are painted with the actual theme's colours (they can do
//     that because the palette lives in `[data-theme]` attribute blocks), and the
//     preview card at the top is a real Hoy row.

const SCALE_LABELS = ['Chico', 'Normal', 'Grande', 'Muy grande', 'Máximo']
// absolute px, NOT rem: each stop must show its own size, and rem would compound
// with the scale the member is already on.
const SCALE_PX = [10, 11.5, 13, 14.5, 16]

const THEMES: Array<{ key: ThemePref; label: string; hint: string }> = [
  { key: 'auto', label: 'Automático', hint: 'Sigue tu teléfono' },
  { key: 'dark', label: 'Oscuro', hint: 'La noche del gimnasio' },
  { key: 'light', label: 'Claro', hint: 'Para el día' },
]

const AWAKE_OPTIONS = [
  { sec: 30, label: '30 seg' },
  { sec: 120, label: '2 min' },
  { sec: 0, label: 'Siempre' },
]

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setPref } = useUiPrefs()
  const [awake, setAwake] = useState<number>(getAwakeIdleSec())
  const scaleIdx = Math.max(0, (FONT_SCALES as readonly number[]).indexOf(prefs.fontScale))

  const pickAwake = (sec: number) => { setAwake(sec); setAwakeIdleSec(sec) } // live, like the rest

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pb-7 pt-1">
        <div className="kicker mb-1">Cómo se ve</div>
        <h2 className="heading text-2xl text-white mb-4">Apariencia</h2>

        <PreviewRow scale={prefs.fontScale} />

        {/* ---- text size ---- */}
        <SectionLabel icon={<Type size={15} />}>Tamaño del texto</SectionLabel>
        <div className="relative grid grid-cols-5 rounded-card bg-white/5 border border-white/10 p-1"
          role="radiogroup" aria-label="Tamaño del texto">
          {/* one gold indicator that springs to the chosen stop — same gesture as the
              nav's hilo de oro, so the app feels like one thing */}
          <span aria-hidden
            className="absolute inset-y-1 left-1 rounded-[12px] bg-gold-fill motion-reduce:transition-none"
            style={{
              width: 'calc((100% - 0.5rem) / 5)',
              transform: `translateX(${scaleIdx * 100}%)`,
              transition: 'transform .34s cubic-bezier(.34,1.4,.64,1)',
            }} />
          {FONT_SCALES.map((s, i) => (
            <button key={s} role="radio" aria-checked={i === scaleIdx} aria-label={SCALE_LABELS[i]}
              onClick={() => { setPref({ fontScale: s }); try { navigator.vibrate?.(8) } catch { /* no-op */ } }}
              className={`relative z-10 min-h-[44px] px-1 font-black uppercase tracking-wide leading-none
                ${i === scaleIdx ? 'text-ink' : 'text-white/55'}`}>
              <span style={{ fontSize: SCALE_PX[i] }}>Aa</span>
            </button>
          ))}
        </div>
        <p className="text-white/60 text-[0.7rem] mt-1.5">
          {SCALE_LABELS[scaleIdx]} · toda la app cambia al toque, no solo esta pantalla.
        </p>

        {/* ---- theme ---- */}
        <SectionLabel icon={<Palette size={15} />}>Tema</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {THEMES.map((t) => (
            <button key={t.key} onClick={() => setPref({ theme: t.key })}
              aria-pressed={prefs.theme === t.key}
              className={`rounded-card border p-2 text-left transition active:scale-[0.97]
                ${prefs.theme === t.key ? 'border-gold bg-gold/[0.12]' : 'border-white/10 bg-white/5'}`}>
              <Swatch kind={t.key} />
              <div className="flex items-center gap-1 mt-2">
                <span className="text-white text-[0.68rem] font-black uppercase tracking-wide truncate">{t.label}</span>
                {prefs.theme === t.key && <Check size={13} className="text-gold shrink-0" />}
              </div>
              <span className="text-white/60 text-[0.6rem] leading-tight block">{t.hint}</span>
            </button>
          ))}
        </div>

        {/* ---- screen awake ---- */}
        <SectionLabel icon={<Smartphone size={15} />}>Pantalla mientras entrenás</SectionLabel>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 flex-1">
            {AWAKE_OPTIONS.map((o) => (
              <button key={o.sec} onClick={() => pickAwake(o.sec)}
                className={`flex-1 rounded-card py-2.5 font-bold uppercase text-sm border min-h-[44px]
                  ${awake === o.sec ? 'bg-gold text-ink border-gold' : 'bg-white/5 text-white/60 border-white/10'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <PhoneGlyph lit={awake === 0 ? 1 : awake === 120 ? 0.5 : 0.14} />
        </div>
        <p className="text-white/60 text-[0.7rem] mt-1.5">
          Después de ese tiempo sin tocarla, dejamos que el teléfono apague la pantalla solo.
          Tu serie queda guardada y la alarma del descanso suena igual, aunque esté bloqueado.
        </p>

        <button onClick={onClose}
          className="btn-glow w-full rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-3.5 mt-6 active:scale-[0.98]">
          Listo
        </button>
      </div>
    </BottomSheet>
  )
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="kicker flex items-center gap-1.5 mt-6 mb-2">
      <span className="text-gold/70">{icon}</span> {children}
    </div>
  )
}

// A real Hoy row, at the member's current size — the sample that answers "¿voy a
// poder leer mi rutina?" without leaving the sheet. Pops when the size changes.
function PreviewRow({ scale }: { scale: number }) {
  const icon = Math.round(19 * scale) // lucide sizes are px and don't follow the rem scale
  return (
    <div key={scale} className="card rounded-card p-3 flex items-center gap-3 animate-[pop_.3s_ease] motion-reduce:animate-none">
      <span className="grid place-items-center rounded-full bg-gold/15 border border-gold/30 text-gold shrink-0"
        style={{ height: icon * 2.1, width: icon * 2.1 }}>
        <Dumbbell size={icon} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold truncate">Press Plano</div>
        <div className="text-white/50 text-xs">4 series × 8 reps</div>
      </div>
      <span className="rounded-chip bg-gold-fill text-ink font-black px-2.5 py-1 text-sm shrink-0 tabular-nums">45 kg</span>
    </div>
  )
}

// Each card is painted with the ACTUAL palette it selects — `data-theme` re-declares
// the colour channels for its own subtree, so these are the real surfaces, not a
// hand-picked approximation that could drift from the theme.
function Swatch({ kind }: { kind: ThemePref }) {
  if (kind === 'auto') {
    return (
      <div className="relative h-14 w-full rounded-[10px] overflow-hidden border border-white/10">
        <div data-theme="dark" className="absolute inset-0"><SwatchFace /></div>
        <div data-theme="light" className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>
          <SwatchFace />
        </div>
      </div>
    )
  }
  return (
    <div data-theme={kind} className="h-14 w-full rounded-[10px] overflow-hidden border border-white/10">
      <SwatchFace />
    </div>
  )
}

// the miniature: app floor, a gold accent bar, two lines of "text"
function SwatchFace() {
  return (
    <div className="h-full w-full p-1.5 flex flex-col justify-between" style={{ background: 'var(--grad-dark-stage)' }}>
      <span className="block h-1 w-5 rounded-full bg-gold-fill" />
      <div className="space-y-1">
        <span className="block h-1 w-full rounded-full" style={{ background: 'rgb(var(--fg-rgb) / 0.75)' }} />
        <span className="block h-1 w-2/3 rounded-full" style={{ background: 'rgb(var(--fg-rgb) / 0.35)' }} />
      </div>
    </div>
  )
}

// the screen dims as you choose a shorter timeout — the control samples itself
function PhoneGlyph({ lit }: { lit: number }) {
  return (
    <svg viewBox="0 0 26 42" className="h-11 w-7 shrink-0" aria-hidden>
      <rect x="1" y="1" width="24" height="40" rx="5" fill="none" className="stroke-white/30" strokeWidth="1.5" />
      <rect x="4" y="5" width="18" height="32" rx="2.5" className="fill-gold"
        style={{ opacity: lit, transition: 'opacity 220ms cubic-bezier(.34,1.56,.64,1)' }} />
    </svg>
  )
}
