import { useState } from 'react'
import { X, ChevronLeft, Share2, Download, Dumbbell, Trophy } from 'lucide-react'
import lockupUrl from '../assets/logo/lockup_white_t.png'
import { Medal } from './Medal'
import type { Tier } from '../lib/medals'
import { TIER_LABEL } from '../lib/medals'

export interface ShareData {
  kind: 'finish' | 'medal'
  name: string
  dayLabel?: string
  week?: number
  totalKg?: number
  series?: number
  streak?: number
  bigOnes?: Array<{ name: string; detail: string; record?: boolean }>
  quote?: string
  tier?: Tier
  lift?: string
  thresholdText?: string
  category?: string
  nextText?: string
}

const HANDLE = '@force.ok'

// Full-screen share sheet with a fixed top bar (always-reachable Volver + ✕) and a
// fixed bottom action bar; the card itself scrolls between them. The card is drawn
// to a 1080×1920 PNG for sharing as an Instagram story (fallback: download).
export function ShareCard({ data, onClose }: { data: ShareData; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const go = async (mode: 'share' | 'save') => {
    setBusy(true)
    try { const b = await buildBlob(data); if (b) await (mode === 'share' ? shareBlob(b) : saveBlob(b)) } catch { /* no-op */ }
    setBusy(false)
  }
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/92 backdrop-blur-md max-w-md mx-auto">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2 shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 text-white/75 text-sm font-bold active:scale-95"><ChevronLeft size={20} /> Volver</button>
        <span className="kicker text-white/50">Compartir</span>
        <button onClick={onClose} aria-label="Cerrar" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 text-white/80 active:scale-90"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 flex items-start justify-center py-2">
        <Card data={data} />
      </div>

      <div className="shrink-0 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex gap-2.5 border-t border-white/10 bg-black/40">
        <button disabled={busy} onClick={() => go('share')}
          className="btn-glow flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide text-sm py-3.5 active:scale-[0.98] disabled:opacity-60">
          <Share2 size={17} /> {busy ? 'Generando…' : 'Compartir'}
        </button>
        <button disabled={busy} onClick={() => go('save')} aria-label="Guardar imagen"
          className="inline-flex items-center justify-center rounded-full bg-white/8 border border-white/15 text-white/85 px-5 py-3.5 active:scale-95 disabled:opacity-60">
          <Download size={19} />
        </button>
      </div>
    </div>
  )
}

// The on-screen card (preview). Modern/elegant: thin gold frame, corner ticks, a
// hairline divider under the emblem, tabular figures.
function Card({ data }: { data: ShareData }) {
  return (
    <div className="w-full max-w-[300px] aspect-[9/16] rounded-[24px] overflow-hidden relative shrink-0"
      style={{ background: 'radial-gradient(130% 85% at 72% 4%, #17150e 0%, #000 70%)', boxShadow: '0 20px 60px rgba(0,0,0,.6), inset 0 0 0 1px rgba(198,174,120,.28)' }}>
      <Ticks />
      <div className="absolute inset-0 flex flex-col items-center px-5 py-5 text-center">
        <img src={lockupUrl} alt="FORCE" className="h-16 object-contain" />
        <div className="text-[0.52rem] tracking-[0.34em] uppercase text-white/40 font-bold mt-1">{HANDLE}</div>
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-gold/60 to-transparent my-3.5" />
        {data.kind === 'medal' ? <MedalBody data={data} /> : <FinishBody data={data} />}
        <div className="mt-auto text-[0.58rem] tracking-[0.28em] uppercase text-gold/70 font-bold">#TrustTheProcess</div>
      </div>
    </div>
  )
}

function Ticks() {
  const c = 'absolute w-4 h-4 border-gold/40'
  return (
    <>
      <span className={`${c} top-3 left-3 border-t border-l rounded-tl`} />
      <span className={`${c} top-3 right-3 border-t border-r rounded-tr`} />
      <span className={`${c} bottom-3 left-3 border-b border-l rounded-bl`} />
      <span className={`${c} bottom-3 right-3 border-b border-r rounded-br`} />
    </>
  )
}

function FinishBody({ data }: { data: ShareData }) {
  return (
    <>
      <div className="kicker text-gold/90 text-[0.6rem]">{data.dayLabel} · Sem {data.week} · completado</div>
      <h1 className="heading text-2xl text-white mt-1 leading-none">¡Bien ahí, <span className="text-gold">{data.name.split(' ')[0]}</span>!</h1>
      <div className="grid grid-cols-3 gap-2 w-full mt-4">
        <Stat v={data.totalKg?.toLocaleString('es-AR') ?? '—'} l="kg totales" />
        <Stat v={String(data.series ?? '—')} l="series" />
        <Stat v={String(data.streak ?? 0)} l="semanas" />
      </div>
      <div className="w-full mt-3.5 space-y-1.5">
        {(data.bigOnes ?? []).slice(0, 3).map((b, i) => (
          <div key={i} className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-left"
            style={{ background: b.record ? 'rgba(198,174,120,.12)' : 'rgba(255,255,255,.04)', border: `1px solid ${b.record ? 'rgba(198,174,120,.32)' : 'rgba(255,255,255,.08)'}` }}>
            <Dumbbell size={15} className="text-gold shrink-0" />
            <span className="flex-1 text-white text-xs font-bold truncate">{b.name} · {b.detail}</span>
            {b.record && <Trophy size={13} className="text-gold shrink-0" />}
          </div>
        ))}
      </div>
      {data.quote && <p className="text-white/80 text-[0.72rem] italic leading-snug mt-3.5 px-1">“{data.quote}”</p>}
    </>
  )
}

function MedalBody({ data }: { data: ShareData }) {
  return (
    <>
      <div className="text-[0.58rem] tracking-[0.32em] uppercase text-white/70 font-bold">Nueva medalla</div>
      <div className="my-3.5"><Medal tier={data.tier ?? null} icon={<Dumbbell size={40} />} size={122} /></div>
      <div className="text-[0.6rem] tracking-[0.18em] uppercase font-black" style={{ color: tierColor(data.tier) }}>{data.tier ? TIER_LABEL[data.tier] : ''}</div>
      <h1 className="heading text-2xl text-white mt-1 uppercase leading-none">{data.lift}</h1>
      <div className="text-gold text-lg font-black mt-1.5 tabular-nums">{data.thresholdText}</div>
      {data.category && <div className="inline-block mt-2.5 rounded-full bg-white/6 border border-white/12 px-3 py-1 text-white/80 text-[0.7rem] font-bold">{data.name.split(' ')[0]} · {data.category}</div>}
      {data.nextText && <div className="text-white/45 text-xs mt-3">Próxima: <b className="text-gold">{data.nextText}</b></div>}
    </>
  )
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-[10px] py-2.5 px-1" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
      <div className="text-gold font-black text-lg leading-none tabular-nums">{v}</div>
      <div className="text-[0.5rem] tracking-[0.08em] uppercase text-white/45 font-bold mt-1">{l}</div>
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

  const bg = x.createRadialGradient(W * 0.72, H * 0.04, 60, W * 0.72, H * 0.04, H)
  bg.addColorStop(0, '#17150e'); bg.addColorStop(0.7, '#000000')
  x.fillStyle = bg; x.fillRect(0, 0, W, H)
  // thin gold frame + corner ticks (tech/elegant)
  x.strokeStyle = 'rgba(198,174,120,.30)'; x.lineWidth = 2; x.strokeRect(24, 24, W - 48, H - 48)
  x.strokeStyle = '#C6AE78'; x.lineWidth = 5
  const tick = 60, m = 48
  const corner = (cx: number, cy: number, dx: number, dy: number) => { x.beginPath(); x.moveTo(cx, cy + dy * tick); x.lineTo(cx, cy); x.lineTo(cx + dx * tick, cy); x.stroke() }
  corner(m, m, 1, 1); corner(W - m, m, -1, 1); corner(m, H - m, 1, -1); corner(W - m, H - m, -1, -1)

  let afterLogo = 470
  try {
    const img = await loadImg(lockupUrl)
    const lw = 300, lh = lw * (img.height / img.width)
    x.drawImage(img, (W - lw) / 2, 110, lw, lh)
    afterLogo = 110 + lh + 40
  } catch { /* logo optional */ }
  const cx = (t: string, y: number, font: string, color: string) => { x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.fillText(t, W / 2, y) }
  cx(HANDLE, afterLogo, '700 28px Montserrat, sans-serif', 'rgba(255,255,255,.4)')
  // divider
  x.strokeStyle = 'rgba(198,174,120,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 90, afterLogo + 34); x.lineTo(W / 2 + 90, afterLogo + 34); x.stroke()
  let y = afterLogo + 120

  if (d.kind === 'medal') {
    cx('NUEVA MEDALLA', y, '700 34px Montserrat, sans-serif', 'rgba(255,255,255,.7)')
    drawMedal(x, W / 2, y + 220, 175, d.tier)
    cx((d.tier ? TIER_LABEL[d.tier] : '').toUpperCase(), y + 450, '900 40px Montserrat, sans-serif', tierColor(d.tier))
    cx((d.lift ?? '').toUpperCase(), y + 530, '900 76px Montserrat, sans-serif', '#fff')
    cx(d.thresholdText ?? '', y + 605, '900 44px Montserrat, sans-serif', '#C6AE78')
    if (d.category) cx(`${d.name.split(' ')[0]} · ${d.category}`, y + 680, '700 32px Montserrat, sans-serif', 'rgba(255,255,255,.7)')
    if (d.nextText) cx(`Próxima: ${d.nextText}`, y + 760, '600 32px Montserrat, sans-serif', '#C6AE78')
  } else {
    cx(`${d.dayLabel ?? ''} · SEM ${d.week ?? ''} · COMPLETADO`, y, '700 30px Montserrat, sans-serif', '#C6AE78')
    cx(`¡BIEN AHÍ, ${(d.name.split(' ')[0] ?? '').toUpperCase()}!`, y + 90, '900 72px Montserrat, sans-serif', '#fff')
    const stats: Array<[string, string]> = [[d.totalKg?.toLocaleString('es-AR') ?? '—', 'KG TOTALES'], [String(d.series ?? '—'), 'SERIES'], [String(d.streak ?? 0), 'SEMANAS']]
    const gy = y + 160
    stats.forEach(([v, l], i) => {
      const bx = 130 + i * 285
      roundRect(x, bx, gy, 245, 150, 16, 'rgba(255,255,255,.05)')
      x.fillStyle = '#C6AE78'; x.font = '900 56px Montserrat, sans-serif'; x.textAlign = 'center'; x.fillText(v, bx + 122, gy + 72)
      x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '700 22px Montserrat, sans-serif'; x.fillText(l, bx + 122, gy + 112)
    })
    let ry = gy + 200
    for (const b of (d.bigOnes ?? []).slice(0, 3)) {
      roundRect(x, 130, ry, 820, 90, 14, b.record ? 'rgba(198,174,120,.12)' : 'rgba(255,255,255,.04)')
      x.fillStyle = '#fff'; x.font = '700 32px Montserrat, sans-serif'; x.textAlign = 'left'
      x.fillText(`${b.name} · ${b.detail}${b.record ? '  🏆' : ''}`, 165, ry + 55)
      ry += 106
    }
    if (d.quote) { x.fillStyle = 'rgba(255,255,255,.8)'; x.font = 'italic 600 34px Montserrat, sans-serif'; x.textAlign = 'center'; wrap(x, `“${d.quote}”`, W / 2, ry + 46, 840, 46) }
  }
  cx('#TRUSTTHEPROCESS', H - 96, '700 30px Montserrat, sans-serif', 'rgba(198,174,120,.7)')
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
  x.beginPath(); x.arc(cx, cy, r * 0.82, 0, Math.PI * 2); x.fillStyle = '#141414'; x.fill()
  x.fillStyle = tierColor(tier); x.font = `900 ${Math.round(r * 0.85)}px Montserrat, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'
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
