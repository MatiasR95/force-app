import { describe, it, expect } from 'vitest'
import {
  estadoDePago, diasVencida, diasParaVencer, mesDe, visibilidadEnInicio, grupoCubierto,
  recargoAcumulado, semanasDeAtraso, DIA_LIMITE,
} from '../src/lib/pagos'

const d = (dia: number) => new Date(2026, 8, dia) // septiembre 2026

describe('estado de cuota', () => {
  it('un pago cargado gana sobre cualquier fecha', () => {
    expect(estadoDePago(true, d(1))).toBe('al_dia')
    expect(estadoDePago(true, d(28))).toBe('al_dia') // pagó tarde, pero pagó
  })

  it('del 1 al 9 está por vencer', () => {
    expect(estadoDePago(false, d(1))).toBe('por_vencer')
    expect(estadoDePago(false, d(9))).toBe('por_vencer')
  })

  it('el 10 es el último día sin recargo, no un atraso', () => {
    expect(estadoDePago(false, d(DIA_LIMITE))).toBe('ultimo_dia')
    expect(diasVencida(d(DIA_LIMITE))).toBe(0)
  })

  it('del 11 en adelante está vencida, y cuenta los días', () => {
    expect(estadoDePago(false, d(11))).toBe('vencida')
    expect(diasVencida(d(11))).toBe(1)
    expect(diasVencida(d(30))).toBe(20)
  })

  it('cuenta los días que faltan para el límite', () => {
    expect(diasParaVencer(d(1))).toBe(9)
    expect(diasParaVencer(d(10))).toBe(0)
    expect(diasParaVencer(d(12))).toBe(-2)
  })

  it('el mes sale en minúscula: va en medio de una oración', () => {
    expect(mesDe('2026-09')).toBe('septiembre')
    expect(mesDe('2026-01')).toBe('enero')
    expect(mesDe('2026-12')).toBe('diciembre')
  })
})

describe('cuánto lugar ocupa la cuota en Inicio', () => {
  it('al día no aparece en Inicio: vive en Perfil', () => {
    expect(visibilidadEnInicio('al_dia', d(3))).toBe('oculta')
    expect(visibilidadEnInicio('al_dia', d(20))).toBe('oculta')
  })

  it('del 1 al 4 no molesta a quien siempre paga el 3', () => {
    expect(visibilidadEnInicio('por_vencer', d(1))).toBe('oculta')
    expect(visibilidadEnInicio('por_vencer', d(4))).toBe('oculta')
  })

  it('del 5 al 9 es una línea fina, no una tarjeta', () => {
    expect(visibilidadEnInicio('por_vencer', d(5))).toBe('linea')
    expect(visibilidadEnInicio('por_vencer', d(9))).toBe('linea')
  })

  it('el 10 y el atraso sí se ganan la tarjeta', () => {
    expect(visibilidadEnInicio('ultimo_dia', d(10))).toBe('tarjeta')
    expect(visibilidadEnInicio('vencida', d(11))).toBe('tarjeta')
  })
})

const grupo = (soyPagador: boolean) => ({
  pagador: 'Beatriz', soyPagador,
  miembros: ['Beatriz', 'Mica', 'Cintia'],
  cuotasRegistradas: 0, cuotasTotales: 3,
})

describe('grupos familiares', () => {
  it('a quien le pagan la cuota nunca se le reclama en Inicio', () => {
    // No puede pagar lo que paga otro: ni tarjeta, ni línea, ni aviso del día 10.
    expect(visibilidadEnInicio('vencida', d(25), grupo(false))).toBe('oculta')
    expect(visibilidadEnInicio('ultimo_dia', d(10), grupo(false))).toBe('oculta')
    expect(visibilidadEnInicio('por_vencer', d(7), grupo(false))).toBe('oculta')
  })

  it('el pagador sí recibe el aviso, porque es quien puede resolverlo', () => {
    expect(visibilidadEnInicio('vencida', d(25), grupo(true))).toBe('tarjeta')
    expect(visibilidadEnInicio('ultimo_dia', d(10), grupo(true))).toBe('tarjeta')
    expect(visibilidadEnInicio('por_vencer', d(7), grupo(true))).toBe('linea')
  })

  it('alcanza una fila de cualquiera del grupo, no necesariamente la de quien paga', () => {
    expect(grupoCubierto({ ...grupo(false), cuotasRegistradas: 1 })).toBe(true)
    expect(grupoCubierto({ ...grupo(false), cuotasRegistradas: 0 })).toBe(false)
  })

  it('sin grupo, la regla de siempre', () => {
    expect(visibilidadEnInicio('vencida', d(25), null)).toBe('tarjeta')
    expect(visibilidadEnInicio('al_dia', d(25), null)).toBe('oculta')
  })
})

describe('recargo por atraso', () => {
  const cfg = { alias: 'x', recargoSemanal: 5000 }

  it('no hay recargo hasta pasado el 10', () => {
    expect(recargoAcumulado(cfg, d(9))).toBe(0)
    expect(recargoAcumulado(cfg, d(10))).toBe(0)
  })

  it('la primera semana corre del 11 al 17', () => {
    expect(semanasDeAtraso(d(11))).toBe(1)
    expect(semanasDeAtraso(d(17))).toBe(1)
    expect(recargoAcumulado(cfg, d(11))).toBe(5000)
    expect(recargoAcumulado(cfg, d(17))).toBe(5000)
  })

  it('el 18 arranca la segunda', () => {
    expect(semanasDeAtraso(d(18))).toBe(2)
    expect(recargoAcumulado(cfg, d(18))).toBe(10000)
    expect(recargoAcumulado(cfg, d(25))).toBe(15000)
  })

  it('sin recargo configurado no se inventa ninguno', () => {
    expect(recargoAcumulado({ alias: 'x' }, d(25))).toBe(0)
  })
})
