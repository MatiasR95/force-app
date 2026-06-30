import { useEffect, useState } from 'react'
import type { Routine } from './lib/types'
import { fetchRoutine, isDemo, syncOutbox } from './lib/api'
import { getToken, setToken, getClientName, setClientName, getSessions, localDate, getGender, setGender, getStartDay, setStartDay, setStartWeek, getIntroSeen, setIntroSeen, extractToken } from './lib/store'
import type { Gender } from './lib/records'
import { memberCurrentWeek } from './lib/week'
import { Home } from './screens/Home'
import { Hoy } from './screens/Hoy'
import { Semana } from './screens/Semana'
import { Dashboard } from './screens/Dashboard'
import { Records } from './screens/Records'
import { Intro } from './screens/Intro'
import { Entrenar } from './screens/Entrenar'
import { PatriaDecor } from './components/PatriaDecor'
import { ErrorBoundary } from './components/ErrorBoundary'
import { House, CalendarDays, LayoutGrid, BarChart3, Trophy } from 'lucide-react'
import emblem from './assets/logo/emblem_gold_t.png'

type Tab = 'inicio' | 'hoy' | 'semana' | 'panel' | 'records'

// Capture the magic-link token (?t=…) synchronously, before React renders, so the
// "need link" guard below is correct on first paint. CRITICAL for iOS: an installed
// PWA has its OWN storage (it can't read the token Safari saved), and it launches at
// the URL baked into the home-screen icon. So we KEEP ?t= in the URL while in the
// browser — that way "Agregar a inicio" bakes the token into the icon and the
// installed app launches with it. Only clean the URL once already running standalone
// (no address bar there anyway).
function captureToken() {
  try {
    const t = new URLSearchParams(location.search).get('t')
    if (!t) return
    setToken(t)
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone
    if (standalone) history.replaceState(null, '', location.pathname)
  } catch { /* no-op */ }
}
captureToken()

export default function App() {
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('inicio')
  const [week, setWeek] = useState<number | null>(null)
  const [training, setTraining] = useState<{ dayIdx: number; week: number } | null>(null)
  const [askGender, setAskGender] = useState(!getGender())
  const [intro, setIntro] = useState(!getIntroSeen())
  const [slow, setSlow] = useState(false)
  const [askStartDay, setAskStartDay] = useState(getStartDay() == null && getSessions().length === 0)

  // (re)load the routine — also used by the Reintentar button on the error screen
  const load = () => {
    setError(null); setRoutine(null); setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 9_000)
    const token = getToken()
    fetchRoutine(token)
      .then((r) => { setRoutine(r); clearTimeout(slowTimer) })
      .catch((e) => { setError(String(e?.message ?? e)); clearTimeout(slowTimer) })
    syncOutbox(token).catch(() => {})
  }

  useEffect(() => {
    // demo: seed a friendly client name so the greeting feels real
    if (!getClientName() && isDemo()) setClientName('Agu Rivera')
    load()

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
    // also poll every 5 min while open, so a coach's edit (weights, added weeks…)
    // shows up even if the member never backgrounds the app.
    const poll = window.setInterval(refresh, 5 * 60_000)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
      window.clearInterval(poll)
    }
  }, [])

  // live build but no access token (e.g. the iOS home-screen app was opened without
  // the magic link): guide the member to open their link instead of showing the demo.
  if (!isDemo() && !getToken()) return <NeedLink />
  if (error) return <LoadError detail={error} onRetry={load} />
  if (!routine) return <Loading slow={slow} onRetry={load} />
  // empty plan (no days parsed): show a calm, on-brand message instead of letting
  // a day-indexing screen crash. The nav/screens below all assume routine.days[0].
  if (routine.days.length === 0)
    return <Splash sub={'Tu rutina todavía no tiene días cargados.\nAvisale a tu coach y volvé a entrar. 💪'} onRetry={load} retryLabel="Volver a buscar" />

  // the member's current week: from their chosen start-week anchor (advancing each
  // real week), else the plan's start date. `week` is a transient manual override.
  const currentWk = memberCurrentWeek(routine)
  const wk = week ?? currentWk

  // suggested day = next day NOT trained this week (miss a day → do the next one)
  const trainedDayIds = new Set(getSessions().filter((s) => withinDays(s.date, 7)).map((s) => s.dayId))
  const nextUndone = routine.days.findIndex((d) => !trainedDayIds.has(d.id))
  let suggestedDay = nextUndone >= 0 ? nextUndone : 0
  // first run (nothing trained yet): start from the day the member chose on launch
  const startDayId = getStartDay()
  if (startDayId && getSessions().length === 0) {
    const idx = routine.days.findIndex((d) => d.id === startDayId)
    if (idx >= 0) suggestedDay = idx
  }

  return (
    <div className="min-h-full max-w-md mx-auto relative">
      <PatriaDecor />
      {isDemo() && (
        <div className="text-center text-[0.6rem] uppercase tracking-micro font-bold text-gold/80
          bg-gold/10 border-b border-gold/20 py-1">
          Modo demo · datos de ejemplo
        </div>
      )}

      <ErrorBoundary key={tab}>
        <div className="screen-in">
          {tab === 'inicio' && <Home routine={routine} week={wk} suggestedDay={suggestedDay} onTrain={(dayIdx, w) => setTraining({ dayIdx, week: w })} onGoRecords={() => setTab('records')} />}
          {tab === 'hoy' && <Hoy routine={routine} week={wk} currentWk={currentWk} setWeek={setWeek} suggestedDay={suggestedDay} onTrain={(dayIdx, w) => setTraining({ dayIdx, week: w })} />}
          {tab === 'semana' && <Semana routine={routine} week={wk} setWeek={setWeek} />}
          {tab === 'panel' && <Dashboard routine={routine} />}
          {tab === 'records' && <Records />}
        </div>
      </ErrorBoundary>

      {/* bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 max-w-md mx-auto
        bg-black/80 backdrop-blur border-t border-white/10
        pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          <NavBtn active={tab === 'inicio'} onClick={() => setTab('inicio')} icon={<House size={19} />} label="Inicio" />
          <NavBtn active={tab === 'hoy'} onClick={() => setTab('hoy')} icon={<CalendarDays size={19} />} label="Hoy" />
          <NavBtn active={tab === 'semana'} onClick={() => setTab('semana')} icon={<LayoutGrid size={19} />} label="Plan" />
          <NavBtn active={tab === 'records'} onClick={() => setTab('records')} icon={<Trophy size={19} />} label="Récords" />
          <NavBtn active={tab === 'panel'} onClick={() => setTab('panel')} icon={<BarChart3 size={19} />} label="Panel" />
        </div>
      </nav>

      {training != null && routine.days[training.dayIdx] && (
        <ErrorBoundary onReset={() => setTraining(null)}>
          <Entrenar
            day={routine.days[training.dayIdx]}
            week={training.week}
            lastWeek={routine.totalWeeks > 1 && training.week >= routine.totalWeeks}
            onClose={() => setTraining(null)}
          />
        </ErrorBoundary>
      )}

      {askGender && !intro && <GenderGate onPick={(g) => { setGender(g); setAskGender(false) }} />}
      {askStartDay && !askGender && !intro && routine.days.length > 1 && (
        <StartGate
          routine={routine}
          defaultWeek={currentWk}
          onPick={(dayId, startWeek) => {
            setStartDay(dayId)
            if (startWeek != null) { setStartWeek(startWeek); setWeek(null) }
            setAskStartDay(false); setTab('hoy')
          }}
        />
      )}
      {intro && <Intro onStart={() => { setIntroSeen(); setIntro(false) }} />}
    </div>
  )
}

function GenderGate({ onPick }: { onPick: (g: Gender) => void }) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-6 bg-black/85 backdrop-blur-sm max-w-md mx-auto">
      <div className="w-full text-center">
        <img src={emblem} alt="FORCE" className="h-12 w-12 object-contain mx-auto mb-3" />
        <div className="kicker">Para los récords</div>
        <h1 className="heading text-2xl text-white mt-1 mb-5">¿En qué categoría competís?</h1>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onPick('F')} className="rounded-card glass py-6 text-white font-black uppercase active:scale-[0.98]">Mujeres</button>
          <button onClick={() => onPick('M')} className="rounded-card glass py-6 text-white font-black uppercase active:scale-[0.98]">Hombres</button>
        </div>
        <p className="text-white/40 text-xs mt-4">Lo usamos solo para el ranking de récords.</p>
      </div>
    </div>
  )
}

// First-run: the member picks which DAY they're starting on, and (for multi-week
// plans) which WEEK they're on — many join mid-cycle ("arranco en la semana 5").
function StartGate({ routine, defaultWeek, onPick }: {
  routine: Routine; defaultWeek: number; onPick: (dayId: string, startWeek: number | null) => void
}) {
  const weekly = routine.style === 'weekly' && routine.totalWeeks > 1
  const [day, setDay] = useState<string | null>(null)
  const [wk, setWk] = useState(defaultWeek)

  // step 1: choose the day
  if (!day) {
    return (
      <GateShell title="¿Con qué día arrancás hoy?" sub="Después la app te va guiando sola, día a día.">
        <div className="space-y-2 text-left">
          {routine.days.map((d) => {
            const focus = d.blocks.find((b) => b.tag === 'big')?.exercises.map((e) => e.name).join(' + ')
              || d.blocks.flatMap((b) => b.exercises)[0]?.name
            return (
              <button key={d.id} onClick={() => (weekly ? setDay(d.id) : onPick(d.id, null))}
                className="w-full rounded-card glass px-4 py-3.5 text-left active:scale-[0.99] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-white uppercase">{d.label.replace('DÍA', 'Día')}</div>
                  {focus && <div className="text-gold/85 text-sm font-bold truncate">{focus}</div>}
                </div>
                <span className="text-white/30 shrink-0">›</span>
              </button>
            )
          })}
        </div>
      </GateShell>
    )
  }

  // step 2 (weekly plans): choose the starting week
  return (
    <GateShell title="¿En qué semana estás?" sub="Si arrancás el ciclo a mitad de camino, elegí tu semana. Va a avanzar sola cada semana.">
      <div className="flex items-center justify-center gap-4 my-2">
        <button onClick={() => setWk((w) => Math.max(1, w - 1))} disabled={wk <= 1}
          className="h-12 w-12 grid place-items-center rounded-full bg-white/8 border border-white/10 text-white text-2xl font-black disabled:opacity-30 active:scale-90">−</button>
        <div className="text-center min-w-[5rem]">
          <div className="text-gold text-4xl font-black tabular-nums leading-none">{wk}</div>
          <div className="text-[0.6rem] uppercase tracking-micro text-white/45 font-bold mt-1">de {routine.totalWeeks}</div>
        </div>
        <button onClick={() => setWk((w) => Math.min(routine.totalWeeks, w + 1))} disabled={wk >= routine.totalWeeks}
          className="h-12 w-12 grid place-items-center rounded-full bg-white/8 border border-white/10 text-white text-2xl font-black disabled:opacity-30 active:scale-90">+</button>
      </div>
      <button onClick={() => onPick(day, wk)}
        className="btn-glow w-full rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-3.5 mt-4 active:scale-[0.98]">
        Empezar
      </button>
    </GateShell>
  )
}

function GateShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-6 bg-black/85 backdrop-blur-sm max-w-md mx-auto">
      <div className="w-full max-h-full overflow-y-auto py-6 text-center">
        <img src={emblem} alt="FORCE" className="h-12 w-12 object-contain mx-auto mb-3" />
        <div className="kicker">Para arrancar</div>
        <h1 className="heading text-2xl text-white mt-1 mb-1">{title}</h1>
        <p className="text-white/45 text-xs mb-5">{sub}</p>
        {children}
      </div>
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

function Splash({ sub, onRetry, retryLabel = 'Reintentar', pulse = true }: {
  sub: string; onRetry?: () => void; retryLabel?: string; pulse?: boolean
}) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
      <img src={emblem} alt="FORCE" className={`h-16 w-16 object-contain ${pulse ? 'animate-pulse' : ''}`} />
      <div className="heading text-xl text-white">FORCE</div>
      <p className="text-white/50 text-sm whitespace-pre-line">{sub}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="btn-glow mt-1 inline-flex items-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide px-7 py-3 active:scale-[0.98]">
          {retryLabel}
        </button>
      )}
    </div>
  )
}

// No access token in a live build — most often the iOS home-screen app was opened
// without the magic link (its storage is isolated from Safari's). Instead of a
// dead-end, let the member PASTE their access link right here: we pull the token
// out, save it into THIS app's own storage and reload — so it sticks for good,
// even if iOS relaunches the app cold. This is the reliable way out of "Activá
// tu acceso" inside the installed app.
function NeedLink() {
  const [val, setVal] = useState('')
  const [err, setErr] = useState(false)
  const submit = () => {
    const tok = extractToken(val)
    if (!tok) { setErr(true); return }
    setToken(tok)
    location.reload()
  }
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
      <img src={emblem} alt="FORCE" className="h-16 w-16 object-contain" />
      <div className="heading text-xl text-white">Activá tu acceso</div>
      <p className="text-white/60 text-sm leading-relaxed max-w-xs">
        Pegá acá el <b className="text-white">link de acceso</b> que te pasó FORCE y entrá. Queda guardado para siempre.
      </p>
      <div className="w-full max-w-xs flex flex-col gap-2">
        <input
          value={val}
          onChange={(e) => { setVal(e.target.value); setErr(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          placeholder="Pegá tu link de acceso acá"
          className={`w-full rounded-card bg-white/5 border p-3 text-white text-sm text-center placeholder:text-white/30 outline-none focus:border-gold/50 ${err ? 'border-red-400/60' : 'border-white/10'}`}
        />
        {err && <p className="text-red-300/80 text-xs">No reconocimos ese link. Pegá el link completo que te pasó FORCE.</p>}
        <button onClick={submit}
          className="btn-glow rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-3 active:scale-[0.98]">
          Entrar
        </button>
      </div>
      <p className="text-white/40 text-xs leading-relaxed max-w-xs">
        💡 En iPhone, para que quede como app: abrí tu link en Safari y, <b className="text-white/70">desde esa pantalla</b>,
        tocá Compartir → <b className="text-white/70">Agregar a inicio</b>.
      </p>
    </div>
  )
}

// Loading: after ~9s with no response, offer a way out so a slow/stuck backend
// never traps the member on an endless spinner.
function Loading({ slow, onRetry }: { slow: boolean; onRetry: () => void }) {
  if (!slow) return <Splash sub="Cargando tu rutina…" />
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
      <img src={emblem} alt="FORCE" className="h-16 w-16 object-contain animate-pulse" />
      <div className="heading text-xl text-white">FORCE</div>
      <p className="text-white/50 text-sm">Está tardando más de lo normal…</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button onClick={onRetry}
          className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide px-7 py-3 active:scale-[0.98]">
          Reintentar
        </button>
        <button onClick={() => location.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/10 text-white/80 font-bold px-7 py-3 active:scale-[0.98]">
          Recargar la app
        </button>
      </div>
    </div>
  )
}

function LoadError({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
      <img src={emblem} alt="FORCE" className="h-16 w-16 object-contain" />
      <div className="heading text-xl text-white">No pudimos cargar tu rutina</div>
      <p className="text-white/50 text-sm">Probá de nuevo; si sigue pasando, recargá la app o avisale a tu coach.</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button onClick={onRetry}
          className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide px-7 py-3 active:scale-[0.98]">
          Reintentar
        </button>
        <button onClick={() => location.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/10 text-white/80 font-bold px-7 py-3 active:scale-[0.98]">
          Recargar la app
        </button>
      </div>
      <details className="mt-1 text-left max-w-xs w-full">
        <summary className="text-white/30 text-[0.65rem] uppercase tracking-micro font-bold cursor-pointer">Detalle técnico</summary>
        <p className="mt-1 text-white/40 text-xs font-mono break-words">{detail}</p>
      </details>
    </div>
  )
}
