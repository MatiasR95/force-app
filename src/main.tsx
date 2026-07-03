import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

// Keep the installed PWA current. iOS keeps a home-screen PWA suspended on its OLD
// service worker for a long time, so a deployed fix (e.g. the bottom-nav layout) may
// never reach the phone — the member keeps seeing a stale build. We take explicit
// control and re-check for a new build every time the app regains focus (plus an
// hourly poll while open); the autoUpdate service worker then swaps in the new
// assets and reloads on its own, no reinstall needed.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    if (!r) return
    const check = () => { if (document.visibilityState === 'visible') r.update() }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    window.setInterval(check, 60 * 60 * 1000)
  },
})

// iOS standalone PWAs boot with a STALE layout viewport: the document lays out short
// (documentElement.clientHeight lags the real height) so the app paints ~top-inset px
// short and the bottom nav floats high — until a geometry change (a device rotation)
// forces WebKit to re-measure. Worse: on some cold starts even `window.innerHeight`
// stays stale past our early retries, so pinning to it alone can STILL leave the nav
// floating. The ground truth that can never be stale is the PHYSICAL SCREEN: in
// standalone (black-translucent, full-bleed) the app must occupy the entire screen,
// so we clamp `--app-vh` to `screen.height` (portrait; `screen.width` in landscape —
// iOS reports screen.* orientation-independent). In-browser we keep innerHeight (the
// screen would overshoot past Safari's chrome there).
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true

function targetHeight(): number {
  let h = window.innerHeight
  if (isStandalone()) {
    const portrait = !window.matchMedia || window.matchMedia('(orientation: portrait)').matches
    const full = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width)
    if (full > h) h = full
  }
  return h
}

function syncAppHeight() {
  const h = targetHeight()
  if (h > 0) document.documentElement.style.setProperty('--app-vh', h + 'px')
}
// Force iOS to recompute the standalone viewport geometry — the same thing a device
// rotation does, which is what "unsticks" the stale short viewport under a
// black-translucent status bar. Briefly flip viewport-fit cover→contain→cover so WebKit
// re-parses the meta and re-measures, then re-pin the height.
function nudgeViewport() {
  const vp = document.querySelector('meta[name="viewport"]')
  if (!vp) return
  const base = vp.getAttribute('content') || ''
  if (!base.includes('viewport-fit=cover')) return
  vp.setAttribute('content', base.replace('viewport-fit=cover', 'viewport-fit=contain'))
  requestAnimationFrame(() => {
    vp.setAttribute('content', base)
    requestAnimationFrame(syncAppHeight)
  })
}
syncAppHeight()
;[0, 50, 150, 300, 600, 1000].forEach((ms) => window.setTimeout(syncAppHeight, ms))
requestAnimationFrame(syncAppHeight)
// run the geometry nudge a couple of times on launch so a stale cold-start viewport
// settles to the full screen without the user having to rotate the phone
window.setTimeout(nudgeViewport, 120)
window.setTimeout(nudgeViewport, 500)
window.addEventListener('resize', syncAppHeight)
window.addEventListener('orientationchange', syncAppHeight)
window.visualViewport?.addEventListener('resize', syncAppHeight)
window.addEventListener('pageshow', () => { syncAppHeight(); nudgeViewport() })
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { syncAppHeight(); nudgeViewport() }
})
// Watchdog: for the first ~8s of a standalone launch, keep re-checking. If the layout
// viewport is still short of the pinned height (the stale-boot signature), fire the
// rotation-mimicking nudge again. Covers cold starts where the stale window outlives
// the fixed retry schedule above.
if (isStandalone()) {
  let ticks = 0
  const watchdog = window.setInterval(() => {
    syncAppHeight()
    if (document.documentElement.clientHeight < targetHeight() - 1) nudgeViewport()
    if (++ticks >= 16) window.clearInterval(watchdog)
  }, 500)
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
