import { useEffect, useRef, useState } from 'react'
import type { Routine } from './lib/types'
import { fetchRoutine, fetchRecords, isDemo, syncOutbox } from './lib/api'
import { runRivalWatch } from './lib/rivalWatch'
import { getToken, setToken, getClientName, setClientName, getSessions, localDate, getGender, setGender, getStartDay, getStartDayAfter, setStartDay, setStartWeek, getSessionProgress, sessionIdleMin, getIntroSeen, setIntroSeen, extractToken, routineFingerprint, getRoutineId, setRoutineId, resetForNewRoutine, dropStaleWeekAnchor } from './lib/store'
import type { Gender } from './lib/records'
import { memberCurrentWeek, parseStartDate } from './lib/week'
import { currentEventTheme } from './lib/eventTheme'
import { Home } from './screens/Home'
import { Hoy } from './screens/Hoy'
import { Semana } from './screens/Semana'
import { Dashboard } from './screens/Dashboard'
import { Records } from './screens/Records'
import { Intro } from './screens/Intro'
import { Entrenar } from './screens/Entrenar'
import { EventDecor } from './components/EventDecor'
import { RestTimerHost } from './components/RestTimerHost'
import { InstallSheet, armInstallCapture, canPromptInstall } from './components/InstallSheet'
import { installNudgeSeen } from './lib/store'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomeSkeleton } from './components/HomeSkeleton'
import { SimpleShell } from './screens/simple/SimpleShell'
import { useUiPrefs } from './lib/UiPrefsContext'
import { House, CalendarDays, LayoutGrid, BarChart3, Trophy, Play, X as XIcon } from 'lucide-react'
import emblem from './assets/logo/emblem_gold_t.png'

type Tab = 'inicio' | 'hoy' | 'semana' | 'panel' | 'records'
// visual order of the bottom-nav tabs — drives the sliding indicator position and
// the direction each screen glides in from (forward = from the right).
const TAB_ORDER: Tab[] = ['inicio', 'hoy', 'semana', 'records', 'panel']

// Capture the magic-link token (?t=…) synchronously, before React renders, so the
// "need link" guard below is correct on first paint. CRITICAL for iOS: an installed
// PWA has its OWN storage (it can't read the token Safari saved), and it launches at
// the URL baked into the home-screen icon. So we KEEP ?t= in the URL while in the
// browser — that way "Agregar a inicio" bakes the token into the icon and the
// installed app launches with it. Only clean the URL once already running standalone
// (no address bar there anyway).
// The last time we actually re-fetched routine + records. Refresh triggers fire on
// EVERY phone unlock (visibilitychange) — many times per workout — and all members
// share one Apps Script quota pool of 30 simultaneous executions, so reads are
// throttled; pending writes (outbox) always flush.
let lastReadAt = 0
const READ_THROTTLE_MS = 150_000 // 2.5 min

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
armInstallCapture() // catch Android's beforeinstallprompt before React mounts

export default function App() {
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('inicio')
  const [navDir, setNavDir] = useState(0) // -1 back, +1 forward, 0 first paint
  // all tab changes go through here: sets the glide direction + a tiny haptic tick
  const go = (t: Tab) => {
    if (t === tab) return
    setNavDir(Math.sign(TAB_ORDER.indexOf(t) - TAB_ORDER.indexOf(tab)))
    setTab(t)
    try { navigator.vibrate?.(8) } catch { /* no-op */ }
  }
  const [week, setWeek] = useState<number | null>(null)
  const [training, setTraining] = useState<{ dayIdx: number; week: number } | null>(null)
  const [resume, setResume] = useState<{ dayIdx: number; week: number; label: string } | null>(null)
  // Modo Simple: a separate 2-destination shell, entered ONLY by the member flipping
  // the switch in Apariencia. Off, the app below behaves exactly as it always has.
  const { prefs } = useUiPrefs()
  const resumeChecked = useRef(false)
  const [askGender, setAskGender] = useState(!getGender())
  const [intro, setIntro] = useState(!getIntroSeen())
  const [slow, setSlow] = useState(false)
  const [askStartDay, setAskStartDay] = useState(getStartDay() == null && getSessions().length === 0)
  const [newCycle, setNewCycle] = useState(false)
  const [showInstall, setShowInstall] = useState(false)

  // A NEW routine arrived (the coach loaded next month's plan). Everything the app
  // remembers per exercise is keyed by a POSITION in the plan ("d1-1-x3"), and the
  // week anchor belongs to the cycle that just ended — carrying either one over shows
  // the member the previous plan's weights on their new plan. Reset that state and
  // ask again which day/week they're starting on (defaulting to week 1).
  useEffect(() => {
    if (!routine || routine.days.length === 0) return
    // Never mid-workout: the gate would cover the training screen and the reset would
    // drop the sets/weights of the session in progress. (A session left unfinished on
    // an EARLIER day is stale and must not block this forever.)
    if (training != null || getSessionProgress()?.date === localDate()) return
    const fp = routineFingerprint(routine)
    const prev = getRoutineId()
    setRoutineId(fp)
    if (prev == null) {
      // first run on this build: no fingerprint stored yet, so we can't compare — but
      // an anchor set well before the plan started belongs to a previous cycle. Ask
      // rather than silently moving them, since we can't tell which plan it was for.
      if (dropStaleWeekAnchor(parseStartDate(routine.meta.startDate)?.getTime() ?? null)) {
        setWeek(null); setNewCycle(true); setAskStartDay(true)
      }
      return
    }
    if (prev === fp) return
    resetForNewRoutine()
    setWeek(null)
    setNewCycle(true)
    setAskStartDay(true)
  }, [routine, training])

  // The screen locking mid-session is normal; iOS THROWING AWAY the page while it's
  // locked is what hurts — a relaunch is a cold start with `training` back to null,
  // stranding the member on Inicio mid-workout. Their sets are safe in localStorage,
  // so put them back where they were: straight into Entrenar if they were there
  // minutes ago, otherwise a card they can tap (opening a full-screen training
  // overlay hours later would feel like the app trapping them). Runs once per load —
  // the routine refetches on every focus, and leaving Entrenar must never re-open it.
  useEffect(() => {
    if (!routine || routine.days.length === 0 || resumeChecked.current) return
    resumeChecked.current = true
    const p = getSessionProgress()
    if (!p || p.date !== localDate()) return
    const dayIdx = routine.days.findIndex((d) => d.id === p.dayId)
    if (dayIdx < 0) return
    const w = p.week ?? memberCurrentWeek(routine)
    if (sessionIdleMin(p) <= 45) setTraining({ dayIdx, week: w })
    else setResume({ dayIdx, week: w, label: routine.days[dayIdx].label })
  }, [routine])

  // Close of a training session → if they just finished their first one and we can
  // still install, offer the branded "add to home" nudge (once, at peak goodwill).
  const endTraining = () => {
    setTraining(null)
    if (!installNudgeSeen() && canPromptInstall() && getSessions().length >= 1) {
      window.setTimeout(() => setShowInstall(true), 400)
    }
  }

  // (re)load the routine — also used by the Reintentar button on the error screen
  const load = () => {
    setError(null); setRoutine(null); setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 9_000)
    const token = getToken()
    lastReadAt = Date.now()
    fetchRoutine(token)
      .then((r) => { setRoutine(r); clearTimeout(slowTimer) })
      .catch((e) => { setError(String(e?.message ?? e)); clearTimeout(slowTimer) })
    syncOutbox(token).catch(() => {})
    // check the gym board: did a rival in my category take a record? (notify)
    fetchRecords(token).then(runRivalWatch).catch(() => {})
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
      // writes first, always: flushing the outbox is a no-op when it's empty and
      // must never wait behind the read throttle (a logged set could get stuck).
      syncOutbox(t).catch(() => {})
      if (Date.now() - lastReadAt < READ_THROTTLE_MS) return
      lastReadAt = Date.now()
      fetchRoutine(t).then(setRoutine).catch(() => {})
      fetchRecords(t).then(runRivalWatch).catch(() => {})
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

  // during an event window, expose its accent as a CSS var so the chrome (nav
  // hairline, active tab) picks it up. Falls back to brand gold on ordinary days.
  const eventTheme = currentEventTheme()
  // Only SET the var during an event. Left unset, every `var(--event-accent, …)`
  // falls back to the theme's own readable gold — and the light theme can darken
  // event accents (celeste is ≈2:1 on paper) without touching ordinary days.
  const eventAccent = eventTheme?.accent

  // Suggested day = the plan advancing ONE day at a time, in sequence:
  //  • already trained today → keep THAT day highlighted (it's still "hoy")
  //  • otherwise → the day AFTER your most recent session (wraps around; skip-aware,
  //    so missing a day never strands you — you just continue from where you were)
  //  • first run (nothing logged) → the day you chose on launch, else Día 1
  // The old logic ("first day not trained in the last 7 days") ignored order and, for
  // a 5–6×/week plan, would jump to whatever single day was still "undone" (e.g. Día 6)
  // instead of the next day in your rotation.
  const sessions = getSessions()
  const dayIndexOf = (id: string) => routine.days.findIndex((d) => d.id === id)
  const byDateDesc = [...sessions]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .reverse()
  const doneToday = byDateDesc.find((s) => s.date === localDate() && dayIndexOf(s.dayId) >= 0)
  const mostRecent = byDateDesc.find((s) => dayIndexOf(s.dayId) >= 0)
  let suggestedDay = 0
  if (doneToday) suggestedDay = dayIndexOf(doneToday.dayId)
  else if (mostRecent) suggestedDay = (dayIndexOf(mostRecent.dayId) + 1) % routine.days.length
  // The day the member told us they're starting on wins until they log a session
  // AFTER telling us. That covers first run AND a brand-new routine: their sessions
  // on the finished plan must not decide where the new plan starts.
  const startDayId = getStartDay()
  const chosenAfter = getStartDayAfter()
  const chosenStillFresh = sessions.length === 0 || (chosenAfter >= 0 && sessions.length <= chosenAfter)
  if (startDayId && chosenStillFresh) {
    const idx = dayIndexOf(startDayId)
    if (idx >= 0) suggestedDay = idx
  }

  return (
    <div data-event={eventTheme?.id} className="fixed inset-x-0 top-0 max-w-[448px] mx-auto overflow-hidden flex flex-col"
      style={{ height: 'var(--app-vh, 100vh)', background: 'var(--grad-dark-stage)', ...(eventAccent ? { ['--event-accent' as string]: eventAccent } : {}) }}>
      {/* The app's OWN full-screen container paints the brand gradient edge-to-edge —
          incl. UNDER the Dynamic Island, since the status bar is black-translucent. */}
      {/* iOS PWA layout. black-translucent boots a SHORT, STALE viewport that clips the
          bottom nav until a rotation; main.tsx counters it with a viewport-meta re-parse
          (mimics a rotation) + `--app-vh` = window.innerHeight, so the shell fills the full
          screen. The shell is a FLEX COLUMN: scroll area (flex-1) + bottom nav (shrink-0),
          so the nav is a real flex child pinned to the shell's true bottom; the nav clears
          the home indicator via pb-[env(safe-area-inset-bottom)]. html/body are locked in
          index.css so the only scrolling element is `.app-scroll`. */}
      {/* ambient mesh: a slow event-accent blob drifting behind everything (reads
          --event-accent from this container → blue on 9 de Julio, gold otherwise) */}
      <div className="aurora-mesh" aria-hidden />
      {prefs.simple ? (
        <SimpleShell routine={routine} week={wk} suggestedDay={suggestedDay}
          onTrain={(dayIdx, w) => setTraining({ dayIdx, week: w })} />
      ) : (
        <>
      <div className="app-scroll relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <EventDecor />
        <RestTimerHost showPill={training == null} />
        {isDemo() && (
          <div className="text-center text-[0.6rem] uppercase tracking-micro font-bold text-gold/80
            bg-gold/10 border-b border-gold/20 py-1">
            Modo demo · datos de ejemplo
          </div>
        )}

        <ErrorBoundary key={tab}>
          <div className={navDir === 0 ? 'screen-in' : navDir > 0 ? 'screen-in-right' : 'screen-in-left'}>
            {tab === 'inicio' && <Home routine={routine} week={wk} suggestedDay={suggestedDay} onTrain={(dayIdx, w) => setTraining({ dayIdx, week: w })} onGoRecords={() => go('records')} />}
            {tab === 'hoy' && <Hoy routine={routine} currentWk={currentWk} suggestedDay={suggestedDay}
              onPickWeek={(w) => { setStartWeek(w); setWeek(null) }}
              onTrain={(dayIdx, w) => setTraining({ dayIdx, week: w })} />}
            {tab === 'semana' && <Semana routine={routine} week={wk} currentWk={currentWk} setWeek={setWeek} />}
            {tab === 'panel' && <Dashboard routine={routine} />}
            {tab === 'records' && <Records />}
          </div>
        </ErrorBoundary>
      </div>

      {/* An unfinished session from earlier today: one tap back in, nothing lost.
          Sits above the nav so it reads as a temporary state of the app, not a screen. */}
      {resume && training == null && (
        <div className="shrink-0 relative z-30 px-3 pb-2">
          <div className="flex items-center gap-3 rounded-card border border-gold/30 bg-gold/[0.10] backdrop-blur px-3 py-2.5">
            <span className="grid place-items-center h-9 w-9 shrink-0 rounded-full bg-gold-fill text-ink"><Play size={16} /></span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">Seguí tu entrenamiento</div>
              <div className="text-white/50 text-[0.68rem] truncate">{resume.label.replace('DÍA', 'Día')} · lo dejaste a medias</div>
            </div>
            <button onClick={() => { setTraining({ dayIdx: resume.dayIdx, week: resume.week }); setResume(null) }}
              className="shrink-0 rounded-full bg-gold-fill text-ink font-black uppercase text-xs tracking-wide px-4 min-h-[44px]">
              Seguir
            </button>
            <button onClick={() => setResume(null)} aria-label="Descartar"
              className="shrink-0 grid place-items-center h-11 w-11 -mr-1 text-white/40"><XIcon size={16} /></button>
          </div>
        </div>
      )}

      {/* bottom nav — a flex child pinned to the shell's real bottom (not fixed).
          During an event, a hairline in the event accent sits on its top edge. */}
      <nav className="shrink-0 z-30 relative
        bg-black/80 backdrop-blur border-t border-white/10
        pb-[env(safe-area-inset-bottom)]">
        {eventTheme && <div className="absolute inset-x-0 -top-px h-0.5" style={{ background: eventAccent, opacity: 0.7 }} />}
        <div className="relative grid grid-cols-5">
          {/* hilo de oro: ONE indicator that springs to the active tab */}
          <span aria-hidden className="nav-thread"
            style={{ transform: `translateX(${TAB_ORDER.indexOf(tab) * 100}%)` }} />
          <NavBtn active={tab === 'inicio'} onClick={() => go('inicio')} icon={<House size={19} />} label="Inicio" />
          <NavBtn active={tab === 'hoy'} onClick={() => go('hoy')} icon={<CalendarDays size={19} />} label="Hoy" />
          <NavBtn active={tab === 'semana'} onClick={() => go('semana')} icon={<LayoutGrid size={19} />} label="Plan" />
          <NavBtn active={tab === 'records'} onClick={() => go('records')} icon={<Trophy size={19} />} label="Récords" />
          <NavBtn active={tab === 'panel'} onClick={() => go('panel')} icon={<BarChart3 size={19} />} label="Panel" />
        </div>
      </nav>
        </>
      )}

      {training != null && routine.days[training.dayIdx] && (
        <ErrorBoundary onReset={() => setTraining(null)}>
          <Entrenar
            day={routine.days[training.dayIdx]}
            week={training.week}
            lastWeek={routine.totalWeeks > 1 && training.week >= routine.totalWeeks}
            onClose={endTraining}
          />
        </ErrorBoundary>
      )}

      {showInstall && <InstallSheet onClose={() => setShowInstall(false)} />}

      {askGender && !intro && <GenderGate onPick={(g) => { setGender(g); setAskGender(false) }} />}
      {askStartDay && !askGender && !intro && routine.days.length > 1 && (
        <StartGate
          routine={routine}
          // a brand-new plan starts at week 1 — its sheet often carries the PREVIOUS
          // cycle's "Fecha de Inicio", which would otherwise open it on week 9.
          defaultWeek={newCycle ? 1 : currentWk}
          newCycle={newCycle}
          onPick={(dayId, startWeek) => {
            setStartDay(dayId)
            if (startWeek != null) { setStartWeek(startWeek); setWeek(null) }
            setAskStartDay(false); setNewCycle(false); go('inicio')
          }}
        />
      )}
      {intro && <Intro day={routine.days[suggestedDay]} week={wk} onStart={() => { setIntroSeen(); setIntro(false) }} />}
    </div>
  )
}

function GenderGate({ onPick }: { onPick: (g: Gender) => void }) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-6 bg-black/85 backdrop-blur-sm max-w-[448px] mx-auto">
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
function StartGate({ routine, defaultWeek, newCycle = false, onPick }: {
  routine: Routine; defaultWeek: number; newCycle?: boolean
  onPick: (dayId: string, startWeek: number | null) => void
}) {
  const weekly = routine.style === 'weekly' && routine.totalWeeks > 1
  const [day, setDay] = useState<string | null>(null)
  const [wk, setWk] = useState(defaultWeek)

  // step 1: choose the day
  if (!day) {
    return (
      <GateShell
        kicker={newCycle ? `Rutina nueva · ${routine.title}` : 'Para arrancar'}
        title={newCycle ? 'Tenés rutina nueva 💪' : '¿Con qué día arrancás hoy?'}
        sub={newCycle
          ? 'Tu coach te cargó un plan nuevo. Elegí con qué día arrancás y seguimos.'
          : 'Después la app te va guiando sola, día a día.'}>
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
    <GateShell title="¿En qué semana estás?"
      sub={newCycle
        ? 'Arrancás un ciclo nuevo: normalmente es la semana 1. Si no, elegí la tuya.'
        : 'Si arrancás el ciclo a mitad de camino, elegí tu semana. Va a avanzar sola cada semana.'}>
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

function GateShell({ title, sub, kicker = 'Para arrancar', children }: {
  title: string; sub: string; kicker?: string; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-6 bg-black/85 backdrop-blur-sm max-w-[448px] mx-auto">
      <div className="w-full max-h-full overflow-y-auto py-6 text-center">
        <img src={emblem} alt="FORCE" className="h-12 w-12 object-contain mx-auto mb-3" />
        <div className="kicker">{kicker}</div>
        <h1 className="heading text-2xl text-white mt-1 mb-1">{title}</h1>
        <p className="text-white/45 text-xs mb-5">{sub}</p>
        {children}
      </div>
    </div>
  )
}

function NavBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button onClick={onClick}
      className="relative flex flex-col items-center gap-1 py-2.5 transition"
      style={{ color: active ? 'var(--nav-active-ink)' : 'rgb(var(--fg-rgb) / 0.62)' }}>
      {active ? <span className="nav-pop inline-flex">{icon}</span> : icon}
      <span className="text-[0.6rem] font-bold uppercase tracking-micro">{label}</span>
    </button>
  )
}

function Splash({ sub, onRetry, retryLabel = 'Reintentar', pulse = true }: {
  sub: string; onRetry?: () => void; retryLabel?: string; pulse?: boolean
}) {
  return (
    <div className="fixed inset-0 max-w-[448px] mx-auto overflow-y-auto flex flex-col items-center justify-center gap-4 px-8 py-8 text-center">
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
    <div className="fixed inset-0 max-w-[448px] mx-auto overflow-y-auto flex flex-col items-center justify-center gap-4 px-8 py-8 text-center">
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

// Loading: a shimmering skeleton of Home while the routine loads (feels like the
// app is assembling it, not stuck). After ~9s with no response, swap to a way out
// so a slow/stuck backend never traps the member on an endless screen.
function Loading({ slow, onRetry }: { slow: boolean; onRetry: () => void }) {
  if (!slow) return (
    <div className="fixed inset-x-0 top-0 max-w-[448px] mx-auto overflow-hidden" style={{ height: 'var(--app-vh, 100vh)', background: 'var(--grad-dark-stage)' }}>
      <div className="h-full overflow-y-auto"><HomeSkeleton /></div>
    </div>
  )
  return (
    <div className="fixed inset-0 max-w-[448px] mx-auto overflow-y-auto flex flex-col items-center justify-center gap-4 px-8 py-8 text-center">
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
    <div className="fixed inset-0 max-w-[448px] mx-auto overflow-y-auto flex flex-col items-center justify-center gap-4 px-8 py-8 text-center">
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
