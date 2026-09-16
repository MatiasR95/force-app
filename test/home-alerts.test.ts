import { describe, it, expect } from 'vitest'
import { topAlert } from '../src/lib/homeAlerts'

describe('slot único de atención en Inicio', () => {
  it('sin nada pendiente no pinta ningún bloque dorado', () => {
    expect(topAlert([])).toBe(null)
  })

  it('el cumpleaños le gana a la cuota: no se cobra el día que cumplís años', () => {
    expect(topAlert(['cuota', 'cumple'])).toBe('cumple')
  })

  it('con cuatro pendientes juntos sale uno solo', () => {
    expect(topAlert(['recap', 'rival', 'cuota'])).toBe('cuota')
    expect(topAlert(['recap', 'rival'])).toBe('rival')
    expect(topAlert(['recap'])).toBe('recap')
  })

  it('no inventa prioridad: el orden de la lista de entrada da igual', () => {
    expect(topAlert(['recap', 'cuota', 'rival'])).toBe('cuota')
    expect(topAlert(['rival', 'cuota', 'recap'])).toBe('cuota')
  })
})
