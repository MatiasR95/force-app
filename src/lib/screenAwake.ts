// Screen wake lock with an IDLE RELEASE. Entrenar used to hold a screen lock for
// the whole session, so a phone left in a pocket mid-workout kept its display on
// until the overlay closed — burning battery for nothing.
//
// Here the lock is held only while the member is actually using the app: any
// touch/key/scroll refreshes `lastActivity`, and once they've been idle for
// `idleSec` we release the sentinel and hand control back to the OS, which then
// runs its OWN auto-lock countdown. (Releasing does not black the screen; the
// phone's Auto-Lock setting decides when.) The next touch re-acquires it.
//
// Releasing mid-rest is safe: the end-of-rest alert does NOT depend on the screen
// being on. `restTimer.ts` pre-schedules the chime on the Web Audio clock, keeps a
// near-silent loop alive so audio keeps rendering under lock, and fires the
// notification through the service worker. The wake lock was belt-and-braces.
//
// No Idle Detection API here on purpose — it is permission-gated and Chromium-only;
// plain passive listeners need no prompt and expose nothing.

type WL = {
  release?: () => Promise<void>
  released?: boolean
  addEventListener?: (t: 'release', fn: () => void) => void
}

let lock: WL | null = null
let idleMs = 30_000   // 0 = never release (member chose "Siempre")
let lastActivity = Date.now()
let ticker = 0
let active = false
let wired = false

const supported = (): boolean =>
  typeof navigator !== 'undefined' && 'wakeLock' in navigator

async function acquire(): Promise<void> {
  if (!active || lock || !supported()) return
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  try {
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WL> } }
    const wl = await nav.wakeLock?.request('screen')
    if (!wl) return
    // the OS/browser releases the sentinel on its own when the page is hidden —
    // drop our reference so the next touch can request a fresh one
    wl.addEventListener?.('release', () => { if (lock === wl) lock = null })
    if (!active) { wl.release?.().catch(() => {}); return }
    lock = wl
  } catch { /* denied / unsupported — nothing to keep awake, the chime still fires */ }
}

function release(): void {
  const wl = lock
  lock = null
  try { wl?.release?.().catch(() => {}) } catch { /* already released */ }
}

/** Member touched the screen (or did something that counts as being present). */
export function touchAwake(): void {
  lastActivity = Date.now()
  if (active && !lock) void acquire()
}

function onActivity(): void { touchAwake() }
function onVisibility(): void {
  if (document.visibilityState !== 'visible') return
  // coming back from a locked screen counts as activity
  touchAwake()
}

// One passive, capturing listener set for the whole session — never a timer reset
// per pointer event, and never per-component listeners.
const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const
function wire(): void {
  if (wired || typeof document === 'undefined') return
  for (const e of EVENTS) document.addEventListener(e, onActivity, { passive: true, capture: true })
  document.addEventListener('visibilitychange', onVisibility)
  wired = true
}
function unwire(): void {
  if (!wired) return
  for (const e of EVENTS) document.removeEventListener(e, onActivity, { capture: true })
  document.removeEventListener('visibilitychange', onVisibility)
  wired = false
}

function check(): void {
  if (!active) return
  if (idleMs > 0 && Date.now() - lastActivity > idleMs) release()
  else if (!lock) void acquire()
}

/**
 * Hold the screen awake while the member is active, releasing after `idleSec`
 * of no interaction. `idleSec <= 0` keeps it awake for the whole session.
 */
export function keepAwake(idleSec: number): void {
  idleMs = idleSec > 0 ? idleSec * 1000 : 0
  lastActivity = Date.now()
  active = true
  wire()
  void acquire()
  if (!ticker) ticker = window.setInterval(check, 5_000)
}

/** Stop managing the screen (leaving Entrenar) and release any held lock. */
export function stopAwake(): void {
  active = false
  if (ticker) { window.clearInterval(ticker); ticker = 0 }
  unwire()
  release()
}
