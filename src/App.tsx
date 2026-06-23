import { useEffect, useState } from 'react'
import type { Routine } from './lib/types'
import { fetchRoutine, isDemo, syncOutbox } from './lib/api'
import { getToken, setToken, getClientName, setClientName, getSessions, localDate } from './lib/store'
import { Hoy } from './screens/Hoy'
import { Semana } from './screens/Semana'
import { Dashboard } from './screens/Dashboard'
import { Entrenar } from './screens/Entrenar'
import { CalendarDays, LayoutGrid, BarChart3 } from 'lucide-react'
import emblem from './assets/logo/emblem_gold_t.png'

type Tab = 'hoy' | 'semana' | 'panel'

export default function App() {
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('hoy')
  const [training, setTraining] = useState<number | null>(null)

  useEffect(() => {
    // capture the magic-link token (?t=...) once, then clean the URL
    const t = new URLSearchParams(location.search).get('t')
    if (t) {
      setToken(t)
      history.replaceState(null, '', location.pathname)
    }
    // demo: seed a friendly client name so the greeting feels real
    if (!getClientName() && isDemo()) setClientName('Agu Rivera')
    const token = getToken()
    fetchRoutine(token).then(setRoutine).catch((e) => setError(String(e)))
    syncOutbox(token).catch(() => {})
  }, [])

  if (error) return <Splash sub={`No pudimos cargar tu rutina.\n${error}`} />
  if (!routine) return <Splash sub="Cargando tu rutina…" />

  // suggested day = next session not yet trained this week (by count, mod #days)
  const trainedThisWeek = getSessions().filter((s) => withinDays(s.date, 7)).length
  const suggested = routine.days.length ? trainedThisWeek % routine.days.length : 0

  return (
    <div className="min-h-full max-w-md mx-auto relative">
      {isDemo() && (
        <div className="text-center text-[0.6rem] uppercase tracking-micro font-bold text-gold/80
          bg-gold/10 border-b border-gold/20 py-1">
          Modo demo · datos de ejemplo
        </div>
      )}

      {tab === 'hoy' && <Hoy routine={routine} suggested={suggested} onTrain={setTraining} />}
      {tab === 'semana' && <Semana routine={routine} />}
      {tab === 'panel' && <Dashboard routine={routine} />}

      {/* bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 max-w-md mx-auto
        bg-black/80 backdrop-blur border-t border-white/10
        pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3">
          <NavBtn active={tab === 'hoy'} onClick={() => setTab('hoy')} icon={<CalendarDays size={20} />} label="Hoy" />
          <NavBtn active={tab === 'semana'} onClick={() => setTab('semana')} icon={<LayoutGrid size={20} />} label="Plan" />
          <NavBtn active={tab === 'panel'} onClick={() => setTab('panel')} icon={<BarChart3 size={20} />} label="Panel" />
        </div>
      </nav>

      {training != null && (
        <Entrenar day={routine.days[training]} onClose={() => setTraining(null)} />
      )}
    </div>
  )
}

function withinDays(date: string, n: number): boolean {
  const today = localDate()
  const a = new Date(date + 'T00:00:00'), b = new Date(today + 'T00:00:00')
  return (b.getTime() - a.getTime()) / 86400000 < n
}

function NavBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2.5 transition ${active ? 'text-gold' : 'text-white/45'}`}>
      {icon}
      <span className="text-[0.6rem] font-bold uppercase tracking-micro">{label}</span>
    </button>
  )
}

function Splash({ sub }: { sub: string }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
      <img src={emblem} alt="FORCE" className="h-16 w-16 object-contain animate-pulse" />
      <div className="heading text-xl text-white">FORCE</div>
      <p className="text-white/50 text-sm whitespace-pre-line">{sub}</p>
    </div>
  )
}
