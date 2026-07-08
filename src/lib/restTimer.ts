// Global rest timer. Wall-clock based (stores the END time, not a ticking count)
// so it keeps "running" while the app is backgrounded or reloaded, and fires an
// alert — chime + vibration + system notification — when it finishes, no matter
// which screen (or app) the member is on. State is shared app-wide + persisted.
//
// Locked-phone alert: page JS is SUSPENDED while the phone is locked, so the
// chime is pre-scheduled on the Web Audio clock the moment the pause starts,
// with a near-silent looping buffer keeping the audio session alive — the audio
// pipeline keeps rendering under lock (like a music app) and the chime sounds
// on time. The end-of-rest notification goes through the service worker
// (registration.showNotification) so Android delivers it to the lock screen.

const KEY = 'force.restTimer'

export type RestStatus = 'idle' | 'running' | 'paused' | 'done'
interface RestState { status: RestStatus; endsAt: number | null; remaining: number | null }

function load(): RestState {
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && r.status) return r } catch { /* no-op */ }
  return { status: 'idle', endsAt: null, remaining: null }
}
let state: RestState = load()
const subs = new Set<() => void>()
let audio: AudioContext | null = null
let silence: AudioBufferSourceNode | null = null // keep-alive loop while the pause runs
let scheduled: OscillatorNode[] = []             // chime pre-scheduled at start
let chimeAt: number | null = null                // wall-clock ms the scheduled chime fires
let chimeGen = 0                                 // bumps per schedule — stale cleanups no-op

function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota */ } }
function set(p: Partial<RestState>) { state = { ...state, ...p }; persist(); subs.forEach((f) => f()) }

export const getRest = (): RestState => state
export function subscribeRest(fn: () => void): () => void { subs.add(fn); return () => { subs.delete(fn) } }

/** Seconds left right now (computed from the wall clock). */
export function restRemaining(now = Date.now()): number {
  if (state.status === 'running' && state.endsAt) return Math.max(0, Math.ceil((state.endsAt - now) / 1000))
  if (state.status === 'paused') return state.remaining ?? 0
  return 0
}

function ensureAudio() {
  try {
    type W = typeof window & { webkitAudioContext?: typeof AudioContext }
    const Ctx = window.AudioContext ?? (window as W).webkitAudioContext
    if (Ctx) { audio ??= new Ctx(); audio.resume?.() }
    // iOS 17+: declare a playback session so audio keeps running under lock and
    // ignores the hardware silent switch (like a timer/music app).
    const nav = navigator as unknown as { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
  } catch { /* no-op */ }
}
function requestNotify() {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}) } catch { /* no-op */ }
}

// iOS marks the context "interrupted" during a lock; kick it back on return.
try {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') audio?.resume?.().catch(() => {})
  })
} catch { /* SSR/no-op */ }

function tone(f: number, at: number, d = 0.18) {
  if (!audio) return
  const o = audio.createOscillator(), g = audio.createGain()
  o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(audio.destination)
  const s = audio.currentTime + at
  g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.35, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + d)
  o.start(s); o.stop(s + d + 0.02)
  return o
}

function clearScheduled() {
  scheduled.forEach((o) => { try { o.stop() } catch { /* already stopped */ } })
  scheduled = []
  if (silence) { try { silence.stop() } catch { /* already stopped */ } silence = null }
  chimeAt = null
}

/** Pre-schedule the end-of-rest chime `sec` seconds ahead on the audio clock. */
function scheduleChime(sec: number) {
  if (!audio) return
  clearScheduled()
  try {
    // near-silent loop: keeps the audio pipeline rendering while locked so the
    // scheduled chime below fires on time. Not gain 0 — a fully silent graph
    // can be optimized away.
    const buf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)
    const src = audio.createBufferSource(); src.buffer = buf; src.loop = true
    const g = audio.createGain(); g.gain.value = 0.001
    src.connect(g); g.connect(audio.destination)
    src.start()
    src.stop(audio.currentTime + sec + 2) // release the session shortly after the chime
    silence = src
    const os = [tone(880, sec), tone(1318.5, sec + 0.2), tone(1760, sec + 0.42)]
    scheduled = os.filter((o): o is OscillatorNode => !!o)
    chimeAt = Date.now() + sec * 1000
    chimeGen++
  } catch { /* no-op */ }
}

export function startRest(sec: number) {
  ensureAudio(); requestNotify(); scheduleChime(sec)
  set({ status: 'running', endsAt: Date.now() + sec * 1000, remaining: null })
}
export function pauseRest() {
  if (state.status !== 'running') return
  clearScheduled()
  set({ status: 'paused', remaining: restRemaining(), endsAt: null })
}
export function resumeRest() {
  if (state.status !== 'paused') return
  ensureAudio(); scheduleChime(state.remaining ?? 0)
  set({ status: 'running', endsAt: Date.now() + (state.remaining ?? 0) * 1000, remaining: null })
}
/** Add seconds to a RUNNING pause (coach busy, machine taken) — chime moves too. */
export function extendRest(sec = 30) {
  if (state.status !== 'running') return
  ensureAudio()
  const remaining = restRemaining() + sec
  scheduleChime(remaining)
  set({ endsAt: Date.now() + remaining * 1000 })
}
export function resetRest() { clearScheduled(); set({ status: 'idle', endsAt: null, remaining: null }) }
export function completeRest() { if (state.status === 'done') return; set({ status: 'done', endsAt: null, remaining: 0 }); fireAlert() }

/** Called by the app-wide watcher each tick / on focus. */
export function tickRest() {
  if (state.status !== 'running') return
  if (restRemaining() > 0) return
  // if the app was CLOSED for a long time, don't alert on reopen — clear silently.
  const overdue = Date.now() - (state.endsAt ?? 0)
  if (overdue > 120_000) resetRest()
  else completeRest()
}

function fireAlert() {
  try { navigator.vibrate?.([140, 70, 140, 70, 220]) } catch { /* no-op */ }
  // the scheduled chime is (or just was) sounding — don't double it; play live
  // only if there was no schedule (e.g. audio was blocked at start).
  const chimeHandled = chimeAt != null && Date.now() - chimeAt < 3_000
  if (!chimeHandled) {
    try { tone(880, 0); tone(1318.5, 0.2); tone(1760, 0.42) } catch { /* no-op */ }
  }
  // release the keep-alive after the chime rings out — but ONLY if the member
  // hasn't started a new pause meanwhile (a stale cleanup would kill its chime)
  const g = chimeGen
  window.setTimeout(() => { if (g === chimeGen) clearScheduled() }, 2_500)
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const title = 'FORCE · ¡Descanso terminado!'
      const opts = { body: 'Metele a la próxima serie 💪', tag: 'force-rest', silent: false }
      // service worker path delivers to the lock screen on Android; plain
      // `new Notification` is a fallback (and throws on some Chrome versions).
      navigator.serviceWorker?.getRegistration()
        .then((r) => { if (r?.showNotification) r.showNotification(title, opts); else new Notification(title, opts) })
        .catch(() => { try { new Notification(title, opts) } catch { /* no-op */ } })
    }
  } catch { /* no-op */ }
}
