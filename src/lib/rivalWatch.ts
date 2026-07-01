// "Te pasaron un récord" watcher. When someone in the member's OWN gender +
// weight category takes the top spot on a lift they compete in, we nudge them to
// go for the revancha — with a system notification (if allowed) and an in-app
// banner. Fires once per new leader (deduped), and never on the very first run.

import type { RecordEntry } from './records'
import { rank, RECORD_LIFTS, liftLabel, weightClass } from './records'
import { getGender, getBodyweight, getClientName } from './store'
import { defaultCat } from './medals'

const SEEN = 'force.rivalSeen'
const PENDING = 'force.rivalPending'

function read<T>(k: string, f: T): T { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : f } catch { return f } }
function write<T>(k: string, v: T): void { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota */ } }

export interface RivalMsg { lift: string; holder: string; kg: number; text: string }
export const getRivalPending = (): RivalMsg[] => read<RivalMsg[]>(PENDING, [])
export const clearRivalPending = (): void => write(PENDING, [])

/** Check the gym board for new rivals in my category; notify + queue banners. */
export function runRivalWatch(records: RecordEntry[]): RivalMsg[] {
  const gender = getGender()
  if (!gender || !Array.isArray(records)) return []
  const me = getClientName() ?? 'Vos'
  const cat = weightClass(gender, getBodyweight())?.key ?? defaultCat(gender)
  const stored = read<Record<string, string> | null>(SEEN, null)
  const firstRun = stored === null
  const seen = stored ?? {}
  const next: Record<string, string> = {}
  const fresh: RivalMsg[] = []

  for (const l of RECORD_LIFTS) {
    const board = rank(records.filter((e) => e.lift === l.key && e.gender === gender && e.wc === cat))
    const top = board[0]
    if (!top) continue
    next[l.key] = top.id
    const iCompete = board.some((e) => e.client === me)
    if (!firstRun && iCompete && top.client !== me && seen[l.key] !== top.id) {
      fresh.push({
        lift: l.key, holder: String(top.client), kg: top.kg,
        text: `${top.client} te pasó en ${liftLabel(l.key)} (${top.kg} kg). ¡Andá por la revancha!`,
      })
    }
  }
  write(SEEN, next)
  if (fresh.length) {
    write(PENDING, [...getRivalPending(), ...fresh].slice(-5))
    fireNotifs(fresh)
  }
  return fresh
}

function fireNotifs(msgs: RivalMsg[]): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      for (const m of msgs.slice(0, 2)) {
        new Notification('FORCE · ¡Te pasaron un récord!', {
          body: `${m.text} Entrená inteligente y seguí al coach — la revancha se gana con constancia. 💪`,
          tag: `force-rival-${m.lift}`,
        })
      }
    }
  } catch { /* no-op */ }
}
