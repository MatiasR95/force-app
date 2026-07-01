// Global rest timer. Wall-clock based (stores the END time, not a ticking count)
// so it keeps "running" while the app is backgrounded or reloaded, and fires an
// alert — chime + vibration + system notification — when it finishes, no matter
// which screen (or app) the member is on. State is shared app-wide + persisted.

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
  } catch { /* no-op */ }
}
function requestNotify() {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}) } catch { /* no-op */ }
}

export function startRest(sec: number) { ensureAudio(); requestNotify(); set({ status: 'running', endsAt: Date.now() + sec * 1000, remaining: null }) }
export function pauseRest() { if (state.status !== 'running') return; set({ status: 'paused', remaining: restRemaining(), endsAt: null }) }
export function resumeRest() { if (state.status !== 'paused') return; ensureAudio(); set({ status: 'running', endsAt: Date.now() + (state.remaining ?? 0) * 1000, remaining: null }) }
export function resetRest() { set({ status: 'idle', endsAt: null, remaining: null }) }
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
  try {
    if (audio) {
      const tone = (f: number, at: number, d = 0.18) => {
        const o = audio!.createOscillator(), g = audio!.createGain()
        o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(audio!.destination)
        const s = audio!.currentTime + at
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.35, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + d)
        o.start(s); o.stop(s + d + 0.02)
      }
      tone(880, 0); tone(1318.5, 0.2); tone(1760, 0.42)
    }
  } catch { /* no-op */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FORCE · ¡Descanso terminado!', { body: 'A darle a la próxima serie 💪', tag: 'force-rest', silent: false })
    }
  } catch { /* no-op */ }
}
