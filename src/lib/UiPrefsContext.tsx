// React access to the appearance prefs. Thin wrapper over `uiPrefs.ts` — that
// module still owns applying them to the document; this only makes components
// re-render when they change (icon sizes, the simple-shell branch, live previews).

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { readUiPrefs, setUiPref, subscribeUiPrefs, resolveTheme, type UiPrefs, type ResolvedTheme } from './uiPrefs'

interface UiPrefsApi {
  prefs: UiPrefs
  theme: ResolvedTheme      // what's actually painted ('auto' already resolved)
  setPref: (p: Partial<UiPrefs>) => void
}

const Ctx = createContext<UiPrefsApi>({
  prefs: { fontScale: 1, theme: 'auto', simple: false },
  theme: 'dark',
  setPref: () => {},
})

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UiPrefs>(readUiPrefs)
  useEffect(() => subscribeUiPrefs(setPrefs), [])
  // setUiPref notifies the subscription above — don't also setPrefs here, or every
  // change would render twice.
  return (
    <Ctx.Provider value={{ prefs, theme: resolveTheme(prefs.theme), setPref: (p) => { setUiPref(p) } }}>
      {children}
    </Ctx.Provider>
  )
}

export const useUiPrefs = (): UiPrefsApi => useContext(Ctx)
