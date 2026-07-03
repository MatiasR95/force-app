import { useEffect, useState } from 'react'
import { markInstallNudgeSeen } from '../lib/store'
import { Share, SquarePlus, Download, X } from 'lucide-react'

// Branded "add to home screen" nudge, shown once at a moment of goodwill (after
// the first completed workout). iOS can't script install → show the 2-step
// Share→Add graphic. Android fires `beforeinstallprompt` → offer a gold CTA.

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

/** Global capture of the Android install event, so we can offer it later. */
let deferredPrompt: BIPEvent | null = null
export function armInstallCapture() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e as BIPEvent })
}

/** Should we show the nudge? Not if already installed or no way to install. */
export function canPromptInstall(): boolean {
  if (isStandalone()) return false
  return isIOS() || deferredPrompt != null
}

export function InstallSheet({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = useState(false)
  useEffect(() => { markInstallNudgeSeen() }, [])
  const close = () => { setClosing(true); window.setTimeout(onClose, 200) }

  const androidInstall = async () => {
    if (!deferredPrompt) return close()
    try { await deferredPrompt.prompt(); await deferredPrompt.userChoice } catch { /* no-op */ }
    deferredPrompt = null
    close()
  }

  const ios = isIOS()
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 max-w-md mx-auto" onClick={close}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-t-[22px] bg-surface-2 border-t border-gold/30 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] ${closing ? 'translate-y-full' : 'animate-[sheetup_.28s_cubic-bezier(.22,1,.36,1)]'}`}
        style={{ transition: 'transform .2s ease' }}>
        <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-icon bg-surface-3 border border-gold/40 grid place-items-center shrink-0">
            <Download size={22} className="text-gold" />
          </div>
          <div>
            <p className="font-black text-gold-pale text-base leading-tight">Llevá tu rutina como app</p>
            <p className="text-white/50 text-xs">un toque y la tenés siempre a mano</p>
          </div>
          <button onClick={close} className="ml-auto p-1.5 text-white/40"><X size={20} /></button>
        </div>

        {ios ? (
          <>
            <div className="space-y-2 mb-5">
              <Step n={1} icon={<Share size={17} className="text-gold" />}>Tocá <b className="text-white font-bold">Compartir</b> abajo en Safari</Step>
              <Step n={2} icon={<SquarePlus size={17} className="text-gold" />}>Elegí <b className="text-white font-bold">Agregar a inicio</b></Step>
            </div>
            <button onClick={close} className="w-full rounded-full bg-gold-fill text-ink font-black uppercase py-3.5 active:scale-[0.98]">Entendido</button>
          </>
        ) : (
          <>
            <p className="text-white/70 text-sm mb-4">Instalala en tu teléfono para abrirla al toque, sin buscar el link.</p>
            <button onClick={androidInstall} className="btn-glow w-full rounded-full bg-gold-fill text-ink font-black uppercase py-3.5 active:scale-[0.98] flex items-center justify-center gap-2">
              <Download size={18} /> Instalar FORCE
            </button>
            <button onClick={close} className="w-full mt-2 rounded-full bg-white/5 border border-white/10 text-white/60 font-bold py-3 active:scale-[0.98]">Ahora no</button>
          </>
        )}
      </div>
      <style>{`@keyframes sheetup { from { transform: translateY(100%) } to { transform: none } }`}</style>
    </div>
  )
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-3 px-3 py-2.5">
      <span className="text-gold-deep font-black text-sm w-4 shrink-0">{n}</span>
      {icon}
      <span className="text-white/85 text-sm">{children}</span>
    </div>
  )
}
