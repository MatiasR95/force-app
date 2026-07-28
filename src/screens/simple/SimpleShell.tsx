import { useState } from 'react'
import type { Routine } from '../../lib/types'
import { useUiPrefs } from '../../lib/UiPrefsContext'
import { SimpleHoy } from './SimpleHoy'
import { SimpleProgreso } from './SimpleProgreso'
import { Dumbbell, Flame, LayoutGrid } from 'lucide-react'

// Modo Simple — a SEPARATE shell, not the normal screens with things hidden.
// Two destinations instead of five, and the answer to "¿qué hago hoy?" is the
// whole first screen. The animations, icons and gold stay: what shrinks is the
// AMOUNT of information, not the care.
//
// Strictly opt-in. `force.ui.simple` defaults to false and is only ever set by
// the member flipping the switch in Apariencia — never inferred from age, device,
// font scale or anything else. Until then this file is dead code at runtime.

type SimpleTab = 'hoy' | 'progreso'

const TABS: Array<{ key: SimpleTab; label: string; icon: typeof Dumbbell }> = [
  { key: 'hoy', label: 'Hoy', icon: Dumbbell },
  { key: 'progreso', label: 'Mi progreso', icon: Flame },
]

export function SimpleShell({ routine, week, suggestedDay, onTrain }: {
  routine: Routine
  week: number
  suggestedDay: number
  onTrain: (dayIdx: number, week: number) => void
}) {
  const [tab, setTab] = useState<SimpleTab>('hoy')
  const { prefs, setPref } = useUiPrefs()
  // lucide sizes are px and do NOT follow the rem scale — without this the icons
  // shrink visually as the text grows, which is backwards for who this is for.
  const icon = Math.round(24 * prefs.fontScale)

  return (
    <>
      {/* Where am I: a title bar that never scrolls away — and the way out, right
          there on every screen. Buried on one tab, the exit isn't an exit: a member
          who turned this on by accident shouldn't have to go looking for it. */}
      <header className="shrink-0 relative z-20 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3
        border-b border-white/10 flex items-center justify-between gap-3">
        <h1 className="heading text-2xl text-white truncate">
          {tab === 'hoy' ? 'Hoy' : 'Mi progreso'}
        </h1>
        <button onClick={() => setPref({ simple: false })}
          className="shrink-0 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8
            px-3 min-h-[44px] text-white/80 font-bold uppercase tracking-wide text-xs active:scale-95">
          <LayoutGrid size={Math.round(15 * prefs.fontScale)} className="text-gold" />
          App completa
        </button>
      </header>

      <div className="app-scroll relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {tab === 'hoy'
          ? <SimpleHoy routine={routine} week={week} suggestedDay={suggestedDay} onTrain={onTrain} />
          : <SimpleProgreso routine={routine} onExit={() => setPref({ simple: false })} />}
      </div>

      {/* Two buttons, full width each, icon AND label always visible. The active one
          is a filled gold block — not a colour shift you have to look for. */}
      <nav className="shrink-0 z-30 relative bg-black/85 backdrop-blur border-t border-white/10
        pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-2 gap-2 p-2">
          {TABS.map((t) => {
            const active = tab === t.key
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => { setTab(t.key); try { navigator.vibrate?.(8) } catch { /* no-op */ } }}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-card py-3 min-h-[64px] font-black uppercase tracking-wide transition
                  ${active ? 'bg-gold-fill text-ink' : 'bg-white/5 text-white/70 border border-white/10'}`}>
                <Icon size={icon} />
                <span className="text-sm leading-none">{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
