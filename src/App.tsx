import { useEffect, useState } from 'react'
import type { Routine } from './lib/types'
import { fetchRoutine, isDemo, syncOutbox } from './lib/api'
import { getToken, setToken, getClientName, setClientName, getSessions, localDate } from './lib/store'
import { currentWeek } from './lib/week'
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
  const [week, setWeek] = useState<number | null>(null)
  const [training, setTraining] = useState<{ dayIdx: number; week: number } | null>(null)

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

    // Keep the routine fresh: re-read the live sheet whenever the app regains
    // focus (so a coach's edit appears without a restart), and flush the offline
    // outbox to Seguimiento when connectivity returns. Silent — never flashes the
    // splash, never clobbers the screen if the network momentarily fails.
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      const t = getToken()
      fetchRoutine(t).then(setRoutine).catch(() => {})
      syncOutbox(t).catch(() => {})
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [])

  if (error) return <Splash sub={`No pudimos cargar tu rutina.\n${error}`} />
  if (!routine) return <Splash sub="Cargando tu rutina…" />

  // current week: from the plan's start date, but let the client override it
  const wk = week ?? currentWeek(routine.meta.startDate, routine.totalWeeks)

  // suggested day = next day NOT trained this week (miss a day → do the next one)
  const trainedDayIds = new Set(getSessions().filter((s) => withinDays(s.date, 7)).map((s) => s.dayId))
  const nextUndone = routine.days.findIndex((d) => !trainedDayIds.has(d.id))
  const suggestedDay = nextUndone >= 0 ? nextUndone : 0

  return (
    <div className="min-h-full max-w-md mx-auto relative">
      {isDemo() && (
        <div className="text-center text-[0.6rem] uppercase tracking-micro font-bold text-gold/80
          bg-gold/10 border-b border-gold/20 py-1">
          Modo demo · datos de ejemplo
        </div>
      )}

      <div key={tab} className="screen-in">
        {tab === 'hoy' && <Hoy routine={routine} week={wk} setWeek={setWeek} suggestedDay={suggestedDay} onTrain={(dayIdx, w) => setTraining({ dayIdx, week: w })} />}
        {tab === 'semana' && <Semana routine={routine} week={wk} setWeek={setWeek} />}
        {tab === 'panel' && <Dashboard routine={routine} />}
      </div>

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
        <Entrenar
          day={routine.days[training.dayIdx]}
          week={training.week}
          lastWeek={routine.totalWeeks > 1 && training.week >= routine.totalWeeks}
          onClose={() => setTraining(null)}
        />
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
      className={`relative flex flex-col items-center gap-1 py-2.5 transition ${active ? 'text-gold' : 'text-white/45'}`}>
      {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gold-fill shadow-[0_0_10px_rgba(198,174,120,0.7)]" />}
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
