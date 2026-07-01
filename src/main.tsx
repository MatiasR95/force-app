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
// forces WebKit to re-measure. `window.innerHeight` is correct even while the layout
// viewport lags, so we pin it to a CSS var `--app-vh` and re-apply it across the first
// second and on every geometry/visibility event. That reproduces what the rotation does
// — the app self-corrects to the true height immediately, no user rotation needed.
function syncAppHeight() {
  const h = window.innerHeight
  if (h > 0) document.documentElement.style.setProperty('--app-vh', h + 'px')
}
syncAppHeight()
;[0, 50, 150, 300, 600, 1000].forEach((ms) => window.setTimeout(syncAppHeight, ms))
requestAnimationFrame(syncAppHeight)
window.addEventListener('resize', syncAppHeight)
window.addEventListener('orientationchange', syncAppHeight)
window.addEventListener('pageshow', syncAppHeight)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncAppHeight()
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
