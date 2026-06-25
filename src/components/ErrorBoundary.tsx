import { Component, type ReactNode } from 'react'
import emblem from '../assets/logo/emblem_gold_t.png'
import { RefreshCw, RotateCcw } from 'lucide-react'

// App-wide safety net. A render/parse error in ANY screen or any client's routine
// must never leave a blank screen — it lands here with a branded, recoverable UI.
// Used at the root (whole app) and around each screen (so one screen's crash
// doesn't take down the nav).

interface Props { children: ReactNode; fallbackTitle?: string; onReset?: () => void }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // surface for debugging; never throws
    // eslint-disable-next-line no-console
    console.error('[FORCE] render error:', error, info)
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  hardReload = async () => {
    // dodge a stale PWA cache: drop caches + service workers, then reload
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch { /* best effort */ }
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 px-8 py-16 text-center max-w-md mx-auto">
        <img src={emblem} alt="FORCE" className="h-14 w-14 object-contain opacity-90" />
        <div className="heading text-xl text-white">{this.props.fallbackTitle ?? 'Algo no cargó bien'}</div>
        <p className="text-white/55 text-sm leading-relaxed">
          Tu rutina sigue guardada. Probá de nuevo; si sigue pasando, recargá la app
          o avisale a tu coach.
        </p>
        <div className="flex flex-col gap-2.5 w-full mt-2">
          <button onClick={this.reset}
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-3.5 active:scale-[0.98]">
            <RefreshCw size={18} /> Reintentar
          </button>
          <button onClick={this.hardReload}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/10 text-white/80 font-bold py-3 active:scale-[0.98]">
            <RotateCcw size={16} /> Recargar la app
          </button>
        </div>
        <details className="mt-2 w-full text-left">
          <summary className="text-white/30 text-[0.62rem] uppercase tracking-micro font-bold cursor-pointer">Detalle técnico</summary>
          <p className="text-white/35 text-[0.66rem] mt-1.5 break-words font-mono">{String(this.state.error?.message || this.state.error)}</p>
        </details>
      </div>
    )
  }
}
