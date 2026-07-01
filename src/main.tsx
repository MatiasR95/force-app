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

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
