import { useState } from 'react'
import { X, Share2, Download } from 'lucide-react'
import logoUrl from '../assets/logo/force_logo.png'
import { Medal } from './Medal'
import { Dumbbell, Trophy } from 'lucide-react'
import type { Tier } from '../lib/medals'
import { TIER_LABEL } from '../lib/medals'

export interface ShareData {
  kind: 'finish' | 'medal'
  name: string
  // finish
  dayLabel?: string
  week?: number
  totalKg?: number
  series?: number
  streak?: number
  bigOnes?: Array<{ name: string; detail: string; record?: boolean }>
  quote?: string
  // medal
  tier?: Tier
  lift?: string
  thresholdText?: string
  category?: string
  nextText?: string
}

const HANDLE = '@force.ok'

// Full-screen, on-brand share card. The member sees it, then shares it as an
// image (Instagram story) or saves it. The shared PNG is drawn on a 1080×1920
// canvas so it looks right off-app.
export function ShareCard({ data, onClose }: { data: ShareData; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const go = async (mode: 'share' | 'save') => {
    setBusy(true)
    try {
      const blob = await buildBlob(data)
      if (blob) await (mode === 'share' ? shareBlob(blob) : saveBlob(blob))
    } catch { /* no-op */ }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-5 bg-black/85 backdrop-blur-sm max-w-md mx-auto">
      <button onClick={onClose} className="absolute top-3 right-3 p-2 text-white/50"><X size={22} /></button>

      <div className="w-full max-w-[300px] aspect-[9/16] rounded-[22px] overflow-hidden relative shrink"
        style={{ background: 'radial-gradient(125% 80% at 70% 6%, #1b190f 0%, #000 68%)', border: '1px solid rgba(198,174,120,.22)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'linear-gradient(180deg,#8A6A38,#C6AE78 18%,#C6AE78 82%,#8A6A38)' }} />
        <div className="absolute inset-0 flex flex-col items-center px-4 py-4 text-center">
          <img src={logoUrl} alt="FORCE" className="h-12 object-contain" />
          <div className="text-[0.55rem] tracking-[0.14em] uppercase text-white/40 font-bold -mt-1">{HANDLE}</div>
          {data.kind === 'medal' ? <MedalBody data={data} /> : <FinishBody data={data} />}
          <div className="mt-auto text-[0.6rem] tracking-[0.24em] uppercase text-white/40 font-bold">#TrustTheProcess</div>
        </div>
      </div>

      <div className="w-full max-w-[300px] flex gap-2 mt-4">
        <button disabled={busy} onClick={() => go('share')}
          className="btn-glow flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase text-sm py-3 active:scale-[0.98] disabled:opacity-60">
          <Share2 size={16} /> {busy ? '…' : 'Compartir'}
        </button>
        <button disabled={busy} onClick={() => go('save')}
          className="inline-flex items-center justify-center rounded-full bg-white/8 border border-white/12 text-white/80 px-4 py-3 active:scale-95 disabled:opacity-60">
          <Download size={18} />
        </button>
      </div>
    </div>
  )
}

function FinishBody({ data }: { data: ShareData }) {
  return (
    <>
      <div className="mt-3 kicker">{data.dayLabel} · Sem {data.week} · completado</div>
      <h1 className="heading text-2xl text-white mt-1">¡Bien ahí, <span className="text-gold">{data.name.split(' ')[0]}</span>!</h1>
      <div className="grid grid-cols-3 gap-1.5 w-full mt-3">
        <Stat v={data.totalKg?.toLocaleString('es-AR') ?? '—'} l="kg totales" />
        <Stat v={String(data.series ?? '—')} l="series" />
        <Stat v={String(data.streak ?? 0)} l="semanas" />
      </div>
      <div className="w-full mt-3 space-y-1.5">
        {(data.bigOnes ?? []).slice(0, 3).map((b, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left"
            style={{ background: b.record ? 'rgba(198,174,120,.12)' : 'rgba(255,255,255,.04)', border: `1px solid ${b.record ? 'rgba(198,174,120,.3)' : 'rgba(255,255,255,.08)'}` }}>
            <Dumbbell size={15} className="text-gold shrink-0" />
            <span className="flex-1 text-white text-xs font-bold truncate">{b.name} · {b.detail}</span>
            {b.record && <Trophy size={13} className="text-gold shrink-0" />}
          </div>
        ))}
      </div>
      {data.quote && <p className="text-white/80 text-[0.72rem] italic leading-snug mt-3 px-2">“{data.quote}”</p>}
    </>
  )
}

function MedalBody({ data }: { data: ShareData }) {
  return (
    <>
      <div className="mt-3 text-[0.6rem] tracking-[0.3em] uppercase text-white/70 font-bold">Nueva medalla</div>
      <div className="my-3"><Medal tier={data.tier ?? null} icon={<Dumbbell size={40} />} size={120} /></div>
      <div className="text-[0.62rem] tracking-[0.16em] uppercase font-black" style={{ color: tierColor(data.tier) }}>{data.tier ? TIER_LABEL[data.tier] : ''}</div>
      <h1 className="heading text-2xl text-white mt-1 uppercase">{data.lift}</h1>
      <div className="text-white/70 text-sm font-bold mt-1">{data.thresholdText}</div>
      {data.category && <div className="inline-block mt-2 rounded-full bg-white/6 border border-white/12 px-3 py-1 text-white/80 text-[0.7rem] font-bold">{data.name.split(' ')[0]} · {data.category}</div>}
      {data.nextText && <div className="text-white/50 text-xs mt-3">Próxima: <b className="text-gold">{data.nextText}</b></div>}
    </>
  )
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-lg py-2 px-1" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
      <div className="text-gold font-black text-base leading-none">{v}</div>
      <div className="text-[0.5rem] tracking-[0.06em] uppercase text-white/45 font-bold mt-1">{l}</div>
    </div>
  )
}

const tierColor = (t?: Tier) => (t === 'bronce' ? '#e0a06a' : t === 'plata' ? '#cfd2d8' : t === 'platino' ? '#cfe0ea' : '#C6AE78')

// ---- image export (1080×1920 PNG) -----------------------------------------
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}

async function buildBlob(d: ShareData): Promise<Blob | null> {
  const W = 1080, H = 1920
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d'); if (!x) return null
  try { await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready } catch { /* no-op */ }

  const bg = x.createRadialGradient(W * 0.7, H * 0.06, 60, W * 0.7, H * 0.06, H)
  bg.addColorStop(0, '#1b190f'); bg.addColorStop(0.7, '#000000')
  x.fillStyle = bg; x.fillRect(0, 0, W, H)
  const sp = x.createLinearGradient(0, 0, 0, H)
  sp.addColorStop(0, '#8A6A38'); sp.addColorStop(0.18, '#C6AE78'); sp.addColorStop(0.82, '#C6AE78'); sp.addColorStop(1, '#8A6A38')
  x.fillStyle = sp; x.fillRect(0, 0, 14, H)

  try {
    const img = await loadImg(logoUrl)
    const lw = 340, lh = lw * (img.height / img.width)
    x.drawImage(img, (W - lw) / 2, 70, lw, lh)
  } catch { /* logo optional */ }
  const cx = (t: string, y: number, font: string, color: string) => { x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.fillText(t, W / 2, y) }
  cx(HANDLE, 470, '600 30px Montserrat, sans-serif', 'rgba(255,255,255,.4)')

  if (d.kind === 'medal') {
    cx('NUEVA MEDALLA', 560, '700 34px Montserrat, sans-serif', 'rgba(255,255,255,.7)')
    drawMedal(x, W / 2, 760, 180, d.tier)
    cx((d.tier ? TIER_LABEL[d.tier] : '').toUpperCase(), 990, '900 40px Montserrat, sans-serif', tierColor(d.tier))
    cx((d.lift ?? '').toUpperCase(), 1070, '900 72px Montserrat, sans-serif', '#fff')
    cx(d.thresholdText ?? '', 1140, '700 40px Montserrat, sans-serif', 'rgba(255,255,255,.75)')
    if (d.category) cx(`${d.name.split(' ')[0]} · ${d.category}`, 1230, '700 34px Montserrat, sans-serif', 'rgba(255,255,255,.7)')
    if (d.nextText) cx(`Próxima: ${d.nextText}`, 1320, '600 32px Montserrat, sans-serif', '#C6AE78')
  } else {
    cx(`${d.dayLabel ?? ''} · SEM ${d.week ?? ''} · COMPLETADO`, 560, '700 30px Montserrat, sans-serif', '#C6AE78')
    cx(`¡BIEN AHÍ, ${(d.name.split(' ')[0] ?? '').toUpperCase()}!`, 660, '900 76px Montserrat, sans-serif', '#fff')
    const stats: Array<[string, string]> = [[d.totalKg?.toLocaleString('es-AR') ?? '—', 'KG TOTALES'], [String(d.series ?? '—'), 'SERIES'], [String(d.streak ?? 0), 'SEMANAS']]
    stats.forEach(([v, l], i) => {
      const bx = 120 + i * 290
      roundRect(x, bx, 740, 250, 150, 18, 'rgba(255,255,255,.05)')
      x.fillStyle = '#C6AE78'; x.font = '900 58px Montserrat, sans-serif'; x.textAlign = 'center'; x.fillText(v, bx + 125, 815)
      x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '700 22px Montserrat, sans-serif'; x.fillText(l, bx + 125, 855)
    })
    let y = 960
    for (const b of (d.bigOnes ?? []).slice(0, 3)) {
      roundRect(x, 120, y, 840, 92, 16, b.record ? 'rgba(198,174,120,.12)' : 'rgba(255,255,255,.04)')
      x.fillStyle = '#fff'; x.font = '700 34px Montserrat, sans-serif'; x.textAlign = 'left'
      x.fillText(`${b.name} · ${b.detail}${b.record ? '  🏆' : ''}`, 160, y + 56)
      y += 110
    }
    if (d.quote) {
      x.fillStyle = 'rgba(255,255,255,.8)'; x.font = 'italic 600 34px Montserrat, sans-serif'; x.textAlign = 'center'
      wrap(x, `“${d.quote}”`, W / 2, y + 40, 860, 46)
    }
  }
  cx('#TRUSTTHEPROCESS', H - 90, '700 30px Montserrat, sans-serif', 'rgba(255,255,255,.4)')
  return await new Promise<Blob | null>((res) => c.toBlob((b) => res(b), 'image/png'))
}

function roundRect(x: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, r: number, fill: string) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r)
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); x.fillStyle = fill; x.fill()
}
function wrap(x: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lh: number) {
  const words = text.split(' '); let line = ''
  for (const w of words) {
    if (x.measureText(line + w).width > maxW && line) { x.fillText(line.trim(), cx, y); line = ''; y += lh }
    line += w + ' '
  }
  x.fillText(line.trim(), cx, y)
}
function drawMedal(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, tier?: Tier) {
  const ring = tier === 'bronce' ? '#c77b3e' : tier === 'plata' ? '#c9ccd2' : tier === 'platino' ? '#bcd2de' : '#C6AE78'
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = ring; x.fill()
  x.beginPath(); x.arc(cx, cy, r * 0.82, 0, Math.PI * 2); x.fillStyle = '#161616'; x.fill()
  x.fillStyle = tierColor(tier); x.font = `900 ${Math.round(r * 0.9)}px Montserrat, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillText('🏅', cx, cy + 4); x.textBaseline = 'alphabetic'
}

async function shareBlob(blob: Blob): Promise<void> {
  const file = new File([blob], 'force.png', { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  const payload = { files: [file], text: 'Mi entrenamiento de hoy con FORCE 💪 #TrustTheProcess' }
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share(payload as unknown as Parameters<Navigator['share']>[0]); return } catch { /* fallthrough */ }
  }
  await saveBlob(blob)
}
async function saveBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'force.png'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
