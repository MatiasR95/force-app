import { describe, it, expect } from 'vitest'
import type { RecordEntry } from '../src/lib/records'
import {
  strengthThresholds, strengthTier, ladderState, earnedMedalIds,
  STREAK_LADDER, SESSION_LADDER,
} from '../src/lib/medals'

describe('strengthThresholds — Oro trimmed 5%, re-rounded to 2.5kg', () => {
  it('keeps Bronce/Plata and lowers Oro', () => {
    const t = strengthThresholds('sentadilla', 'F', 'f51-65')!
    expect(t.bronce).toBe(42.5)
    expect(t.plata).toBe(65)
    expect(t.oro).toBe(82.5) // 87.5 * 0.95 = 83.125 → 82.5
  })
  it('men squat 66-80 Oro 140 → 132.5', () => {
    expect(strengthThresholds('sentadilla', 'M', 'm66-80')!.oro).toBe(132.5)
  })
})

describe('strengthTier', () => {
  const thr = { bronce: 42.5, plata: 65, oro: 82.5 }
  it('maps a value to the highest tier reached', () => {
    expect(strengthTier(30, thr)).toBeNull()
    expect(strengthTier(50, thr)).toBe('bronce')
    expect(strengthTier(70, thr)).toBe('plata')
    expect(strengthTier(85, thr)).toBe('oro')
  })
  it('dominadas: bodyweight (bronce 0) counts once there is any record', () => {
    expect(strengthTier(1, { bronce: 0, plata: 5, oro: 12.5 })).toBe('bronce')
  })
})

describe('ladderState — endless tiers', () => {
  it('finds current step + next for a streak count', () => {
    const s = ladderState(5, STREAK_LADDER)
    expect(s.step?.n).toBe(4)
    expect(s.step?.tier).toBe('bronce')
    expect(s.next?.n).toBe(6)
  })
  it('past the top step stays at max with no next', () => {
    const s = ladderState(9999, SESSION_LADDER)
    expect(s.step?.tier).toBe('platino')
    expect(s.next).toBeNull()
  })
})

describe('earnedMedalIds', () => {
  const rec = (lift: string, kg: number): RecordEntry => ({ id: lift, client: 'x', gender: 'F', lift, kg, reps: 3, ts: '' })
  it('includes every tier up to the one reached, plus ladder steps', () => {
    const ids = earnedMedalIds([rec('sentadilla', 70)], 'F', 'f51-65', 4, 12)
    expect(ids).toContain('str:sentadilla:bronce')
    expect(ids).toContain('str:sentadilla:plata')
    expect(ids).not.toContain('str:sentadilla:oro') // 70 < 82.5
    expect(ids).toContain('streak:2')
    expect(ids).toContain('streak:4')
    expect(ids).toContain('sessions:5')
    expect(ids).toContain('sessions:10')
  })
})
