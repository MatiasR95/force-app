import { useEffect, useState } from 'react'

// TEMPORARY iOS layout diagnostic. Hidden from members: it only appears after you
// tap the very top-left corner of the screen 5 times within ~2.5s. It prints the
// real viewport / safe-area numbers from the device so we can see exactly why the
// bottom nav floats above the physical screen bottom. Remove once diagnosed.
export function IosDiag() {
  const [show, setShow] = useState(false)
  const [lines, setLines] = useState<string[]>([])

  // secret 5-tap gate on a tiny invisible top-left hotspot
  useEffect(() => {
    let taps = 0
    let t: number | undefined
    const onTap = (e: TouchEvent | MouseEvent) => {
      const x = 'touches' in e ? (e.changedTouches[0]?.clientX ?? 0) : (e as MouseEvent).clientX
      const y = 'touches' in e ? (e.changedTouches[0]?.clientY ?? 0) : (e as MouseEvent).clientY
      if (x > 60 || y > 120) { taps = 0; return } // only the top-left corner counts
      taps += 1
      window.clearTimeout(t)
      t = window.setTimeout(() => { taps = 0 }, 2500)
      if (taps >= 5) { taps = 0; setShow((s) => !s) }
    }
    window.addEventListener('touchend', onTap, true)
    window.addEventListener('click', onTap, true)
    return () => {
      window.removeEventListener('touchend', onTap, true)
      window.removeEventListener('click', onTap, true)
    }
  }, [])

  useEffect(() => {
    if (!show) return
    // read the live env(safe-area-inset-*) via a hidden probe
    const probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);'
    document.body.appendChild(probe)
    const cs = getComputedStyle(probe)
    const saTop = cs.paddingTop
    const saBottom = cs.paddingBottom
    document.body.removeChild(probe)

    // measure what candidate full-height rules actually resolve to on this device
    const measure = (h: string) => {
      const p = document.createElement('div')
      p.style.cssText = `position:fixed;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;height:${h};`
      document.body.appendChild(p)
      const px = Math.round(p.getBoundingClientRect().height)
      document.body.removeChild(p)
      return px
    }
    const hVh = measure('100vh')
    const hDvh = measure('100dvh')
    const hCalc = measure('calc(100% + env(safe-area-inset-top))')

    const shell = document.querySelector('.app-scroll')?.parentElement
    const nav = document.querySelector('nav')
    const sr = shell?.getBoundingClientRect()
    const nr = nav?.getBoundingClientRect()
    const vv = window.visualViewport
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone

    setLines([
      `standalone   ${standalone}`,
      `screen.h     ${window.screen.height}  avail ${window.screen.availHeight}`,
      `innerHeight  ${window.innerHeight}`,
      `docEl.client ${document.documentElement.clientHeight}`,
      `--app-vh     ${getComputedStyle(document.documentElement).getPropertyValue('--app-vh').trim() || '(unset)'}`,
      `visualVP.h   ${vv ? Math.round(vv.height) : '—'}  offTop ${vv ? Math.round(vv.offsetTop) : '—'}`,
      `sa-top       ${saTop}`,
      `sa-bottom    ${saBottom}`,
      `h 100vh ${hVh}  100dvh ${hDvh}  calc ${hCalc}`,
      `shell  top ${Math.round(sr?.top ?? -1)}  bot ${Math.round(sr?.bottom ?? -1)}`,
      `nav    top ${Math.round(nr?.top ?? -1)}  bot ${Math.round(nr?.bottom ?? -1)}`,
      `gap innerH-navBot  ${Math.round(window.innerHeight - (nr?.bottom ?? 0))}`,
      `gap screen-navBot  ${Math.round(window.screen.height - (nr?.bottom ?? 0))}`,
    ])
  }, [show])

  if (!show) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 4px)',
        left: 4,
        right: 4,
        zIndex: 99999,
        background: 'rgba(0,120,0,0.92)',
        color: '#fff',
        font: '600 11px/1.45 ui-monospace,Menlo,monospace',
        padding: '8px 10px',
        borderRadius: 8,
        whiteSpace: 'pre',
      }}
      onClick={() => setShow(false)}
    >
      {lines.join('\n')}
      {'\n(tap to close)'}
    </div>
  )
}
