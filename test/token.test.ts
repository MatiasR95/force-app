import { describe, it, expect } from 'vitest'
import { extractToken } from '../src/lib/store'

describe('extractToken — recover access from a pasted link', () => {
  it('pulls the token from a full access URL', () => {
    expect(extractToken('https://matiasr95.github.io/force-app/?t=abc123XYZ')).toBe('abc123XYZ')
  })
  it('handles extra query params and whitespace', () => {
    expect(extractToken('  https://x/?foo=1&t=tok_9-8_7&bar=2  ')).toBe('tok_9-8_7')
  })
  it('accepts a bare token', () => {
    expect(extractToken('a0c7dd1L0ncS')).toBe('a0c7dd1L0ncS')
  })
  it('rejects junk', () => {
    expect(extractToken('')).toBeNull()
    expect(extractToken('hola que tal')).toBeNull()
  })
})
