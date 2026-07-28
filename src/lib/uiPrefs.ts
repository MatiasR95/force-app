// Appearance preferences, applied to the document. Single source of truth for
// HOW the three stored prefs (font scale, theme, simple mode) reach the page —
// no React here on purpose, so `main.tsx` can apply them BEFORE the first paint
// and nothing flashes at the wrong size or in the wrong theme.
//
// Font scale works because the app's type is 100% rem-relative: one write to
// documentElement.style.fontSize scales every screen. `--app-vh` (main.tsx) is
// computed in px and is deliberately NOT affected — but taller chrome can change
// the effective viewport, so main.tsx re-runs its geometry sync on every change.

import {
  getFontScale, setFontScale, getThemePref, setThemePref, getSimpleMode, setSimpleMode,
  type ThemePref,
} from './store'

export interface UiPrefs {
  fontScale: number
  theme: ThemePref
  simple: boolean
}
export type ResolvedTheme = 'dark' | 'light'

const BASE_FONT_PX = 16
const subs = new Set<(p: UiPrefs) => void>()

export const readUiPrefs = (): UiPrefs => ({
  fontScale: getFontScale(),
  theme: getThemePref(),
  simple: getSimpleMode(),
})

const prefersLight = (): boolean => {
  try { return window.matchMedia?.('(prefers-color-scheme: light)').matches === true } catch { return false }
}

/** What `theme` actually paints as right now ('auto' follows the OS). */
export const resolveTheme = (t: ThemePref = getThemePref()): ResolvedTheme =>
  t === 'auto' ? (prefersLight() ? 'light' : 'dark') : t

/**
 * The colour iOS/Android paint the browser chrome with. Read from CSS so it
 * always matches what the page is actually painting: the light palette lands in
 * brand-tokens.css and this follows it, no second list to keep in sync.
 */
function themeColor(): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim()
    if (v) return v
  } catch { /* no-op */ }
  return '#000000'
}

export function applyUiPrefs(p: UiPrefs = readUiPrefs()): void {
  const root = document.documentElement
  root.style.fontSize = `${BASE_FONT_PX * p.fontScale}px`
  root.dataset.theme = resolveTheme(p.theme)
  root.dataset.simple = p.simple ? '1' : '0'
  try {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', themeColor())
  } catch { /* no-op */ }
}

/** Change one or more prefs: persists, applies, then notifies subscribers. */
export function setUiPref(patch: Partial<UiPrefs>): UiPrefs {
  if (patch.fontScale != null) setFontScale(patch.fontScale)
  if (patch.theme != null) setThemePref(patch.theme)
  if (patch.simple != null) setSimpleMode(patch.simple)
  const next = readUiPrefs()
  applyUiPrefs(next)
  subs.forEach((f) => f(next))
  return next
}

export function subscribeUiPrefs(fn: (p: UiPrefs) => void): () => void {
  subs.add(fn)
  return () => { subs.delete(fn) }
}

// While the member is on "Automático", follow the OS switching light/dark live —
// no reload, no app restart.
try {
  const mq = window.matchMedia?.('(prefers-color-scheme: light)')
  const onSystemTheme = () => {
    if (getThemePref() !== 'auto') return
    const next = readUiPrefs()
    applyUiPrefs(next)
    subs.forEach((f) => f(next))
  }
  mq?.addEventListener?.('change', onSystemTheme)
} catch { /* SSR / unsupported */ }
