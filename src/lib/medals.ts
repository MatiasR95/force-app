// Medal / achievement system. Three strength tiers (Bronce / Plata / Oro) per
// lift, split by gender + bodyweight category (coach-vetted, with Oro trimmed ~5%
// and re-rounded to 2.5 kg), plus endless Bronce→Platino "constancia" ladders
// (streak weeks, lifetime sessions) that never finish.

import type { Gender, RecordEntry } from './records'
import { RECORD_LIFTS } from './records'

export type Tier = 'bronce' | 'plata' | 'oro' | 'platino'
export const TIER_ORDER: Tier[] = ['bronce', 'plata', 'oro', 'platino']
export const TIER_LABEL: Record<Tier, string> = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro', platino: 'Platino' }

export type CatKey = 'm-65' | 'm66-80' | 'm80+' | 'f-50' | 'f51-65' | 'f65+'
interface Tri { bronce: number; plata: number; oro: number }

const round25 = (x: number) => Math.round(x / 2.5) * 2.5

// Raw coach thresholds (kg). Oro is reduced 5% + re-rounded at lookup time.
const STRENGTH: Record<string, Record<Gender, Partial<Record<CatKey, Tri>>>> = {
  sentadilla: {
    M: { 'm-65': { bronce: 60, plata: 90, oro: 120 }, 'm66-80': { bronce: 70, plata: 105, oro: 140 }, 'm80+': { bronce: 85, plata: 125, oro: 165 } },
    F: { 'f-50': { bronce: 35, plata: 55, oro: 75 }, 'f51-65': { bronce: 42.5, plata: 65, oro: 87.5 }, 'f65+': { bronce: 50, plata: 75, oro: 100 } },
  },
  'peso-muerto': {
    M: { 'm-65': { bronce: 70, plata: 105, oro: 140 }, 'm66-80': { bronce: 82.5, plata: 122.5, oro: 162.5 }, 'm80+': { bronce: 100, plata: 145, oro: 190 } },
    F: { 'f-50': { bronce: 45, plata: 67.5, oro: 90 }, 'f51-65': { bronce: 55, plata: 80, oro: 105 }, 'f65+': { bronce: 65, plata: 92.5, oro: 120 } },
  },
  'peso-muerto-hex': {
    M: { 'm-65': { bronce: 75, plata: 112.5, oro: 150 }, 'm66-80': { bronce: 87.5, plata: 130, oro: 172.5 }, 'm80+': { bronce: 107.5, plata: 155, oro: 200 } },
    F: { 'f-50': { bronce: 47.5, plata: 72.5, oro: 95 }, 'f51-65': { bronce: 57.5, plata: 85, oro: 112.5 }, 'f65+': { bronce: 70, plata: 100, oro: 127.5 } },
  },
  'peso-muerto-sumo': {
    M: { 'm-65': { bronce: 65, plata: 97.5, oro: 130 }, 'm66-80': { bronce: 77.5, plata: 115, oro: 152.5 }, 'm80+': { bronce: 92.5, plata: 135, oro: 177.5 } },
    F: { 'f-50': { bronce: 42.5, plata: 65, oro: 85 }, 'f51-65': { bronce: 52.5, plata: 75, oro: 100 }, 'f65+': { bronce: 62.5, plata: 87.5, oro: 112.5 } },
  },
  'press-banca': {
    M: { 'm-65': { bronce: 47.5, plata: 67.5, oro: 90 }, 'm66-80': { bronce: 57.5, plata: 82.5, oro: 110 }, 'm80+': { bronce: 70, plata: 100, oro: 132.5 } },
    F: { 'f-50': { bronce: 22.5, plata: 32.5, oro: 45 }, 'f51-65': { bronce: 27.5, plata: 40, oro: 55 }, 'f65+': { bronce: 32.5, plata: 47.5, oro: 65 } },
  },
  'press-banca-db': {
    M: { 'm-65': { bronce: 40, plata: 60, oro: 80 }, 'm66-80': { bronce: 50, plata: 72.5, oro: 97.5 }, 'm80+': { bronce: 60, plata: 87.5, oro: 117.5 } },
    F: { 'f-50': { bronce: 17.5, plata: 27.5, oro: 37.5 }, 'f51-65': { bronce: 22.5, plata: 32.5, oro: 45 }, 'f65+': { bronce: 27.5, plata: 40, oro: 55 } },
  },
  dominadas: {
    M: { 'm-65': { bronce: 0, plata: 10, oro: 25 }, 'm66-80': { bronce: 0, plata: 12.5, oro: 30 }, 'm80+': { bronce: 0, plata: 15, oro: 35 } },
    F: { 'f-50': { bronce: 0, plata: 2.5, oro: 10 }, 'f51-65': { bronce: 0, plata: 5, oro: 12.5 }, 'f65+': { bronce: 0, plata: 7.5, oro: 15 } },
  },
  'press-militar': {
    M: { 'm-65': { bronce: 30, plata: 45, oro: 60 }, 'm66-80': { bronce: 35, plata: 52.5, oro: 70 }, 'm80+': { bronce: 42.5, plata: 62.5, oro: 82.5 } },
    F: { 'f-50': { bronce: 15, plata: 22.5, oro: 30 }, 'f51-65': { bronce: 17.5, plata: 27.5, oro: 37.5 }, 'f65+': { bronce: 20, plata: 30, oro: 40 } },
  },
}

/** Default category when bodyweight is unknown (use a sensible middle bracket). */
export function defaultCat(gender: Gender): CatKey {
  return gender === 'M' ? 'm66-80' : 'f51-65'
}

/** Bronce/Plata/Oro thresholds (kg) for a lift, with Oro already trimmed ~5%. */
export function strengthThresholds(lift: string, gender: Gender, cat: CatKey): Tri | null {
  const raw = STRENGTH[lift]?.[gender]?.[cat]
  if (!raw) return null
  return { bronce: raw.bronce, plata: raw.plata, oro: round25(raw.oro * 0.95) }
}

/** Highest tier (bronce/plata/oro) reached for a value, or null. */
export function strengthTier(value: number, thr: Tri): Tier | null {
  if (value >= thr.oro) return 'oro'
  if (value >= thr.plata) return 'plata'
  if (value >= thr.bronce && thr.bronce > 0) return 'bronce'
  if (value > 0 && thr.bronce === 0) return 'bronce' // dominadas: bodyweight already counts
  return null
}

export interface LiftMedal {
  lift: string
  tier: Tier | null
  value: number          // member's best for this lift (kg / added kg)
  thr: Tri
  nextTier: Tier | null  // next strength tier to chase (null if at Oro)
  nextAt: number | null  // kg needed for the next tier
}

/** Member's best kg per record lift (for their gender). */
export function bestByLift(records: RecordEntry[], gender: Gender): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of records) {
    if (r.gender !== gender) continue
    m.set(r.lift, Math.max(m.get(r.lift) ?? 0, r.kg))
  }
  return m
}

/** Strength-medal state for every record lift. */
export function strengthMedals(records: RecordEntry[], gender: Gender, cat: CatKey): LiftMedal[] {
  const best = bestByLift(records, gender)
  return RECORD_LIFTS.map((l) => {
    const thr = strengthThresholds(l.key, gender, cat)!
    const value = best.get(l.key) ?? 0
    const tier = strengthTier(value, thr)
    const nextTier: Tier | null = tier === 'oro' ? null : tier === 'plata' ? 'oro' : tier === 'bronce' ? 'plata' : (thr.bronce > 0 ? 'bronce' : 'plata')
    const nextAt = nextTier ? thr[nextTier as 'bronce' | 'plata' | 'oro'] : null
    return { lift: l.key, tier, value, thr, nextTier, nextAt }
  })
}

// ---- endless constancia ladders -------------------------------------------
export interface LadderStep { n: number; tier: Tier }

export const STREAK_LADDER: LadderStep[] = [
  { n: 2, tier: 'bronce' }, { n: 4, tier: 'bronce' }, { n: 6, tier: 'bronce' },
  { n: 8, tier: 'plata' }, { n: 12, tier: 'plata' }, { n: 16, tier: 'plata' },
  { n: 24, tier: 'oro' }, { n: 36, tier: 'oro' }, { n: 52, tier: 'oro' },
  { n: 78, tier: 'platino' }, { n: 104, tier: 'platino' }, { n: 156, tier: 'platino' }, { n: 208, tier: 'platino' },
]
export const SESSION_LADDER: LadderStep[] = [
  { n: 5, tier: 'bronce' }, { n: 10, tier: 'bronce' }, { n: 25, tier: 'bronce' },
  { n: 50, tier: 'plata' }, { n: 100, tier: 'plata' }, { n: 150, tier: 'plata' },
  { n: 200, tier: 'oro' }, { n: 300, tier: 'oro' }, { n: 365, tier: 'oro' },
  { n: 500, tier: 'platino' }, { n: 750, tier: 'platino' }, { n: 1000, tier: 'platino' },
]

export interface LadderState { step: LadderStep | null; next: LadderStep | null }
export function ladderState(count: number, ladder: LadderStep[]): LadderState {
  let step: LadderStep | null = null
  for (const s of ladder) { if (count >= s.n) step = s; else break }
  const next = ladder.find((s) => s.n > count) ?? null
  return { step, next }
}

// ---- unlock detection (stable ids) ----------------------------------------
/** All medal ids the member currently holds — strength tiers + ladder steps. */
export function earnedMedalIds(records: RecordEntry[], gender: Gender, cat: CatKey, streakWeeks: number, sessions: number): string[] {
  const ids: string[] = []
  for (const m of strengthMedals(records, gender, cat)) {
    if (!m.tier) continue
    for (const t of TIER_ORDER) {
      if (t === 'platino') break
      ids.push(`str:${m.lift}:${t}`)
      if (t === m.tier) break
    }
  }
  for (const s of STREAK_LADDER) if (streakWeeks >= s.n) ids.push(`streak:${s.n}`)
  for (const s of SESSION_LADDER) if (sessions >= s.n) ids.push(`sessions:${s.n}`)
  return ids
}
