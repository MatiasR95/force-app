// Estado de cuota — SOLO LECTURA.
//
// La app lee la planilla `Pagos FORCE 2026` y le dice al socio si está al día.
// Nunca escribe ahí, nunca cobra, nunca marca un pago: las filas las cargan
// Matías y Fer a mano, igual que siempre (docs/PLAN-PAGOS.md).
//
// La planilla se carga a mano, así que alguien que transfirió ayer puede leer
// todavía "pendiente". Por eso ningún estado acusa, todos ofrecen
// "ya la pagué → avisanos", y la tarjeta siempre muestra hasta qué día está
// actualizada la planilla.

export type PagoEstado =
  | 'al_dia'      // hay pago cargado para el mes en curso
  | 'por_vencer'  // días 1 a 9, sin pago
  | 'ultimo_dia'  // día 10: último día sin recargo
  | 'vencida'     // día 11 en adelante, sin pago

/** Grupo familiar: una persona paga las cuotas de varias.
 *
 *  Sale de la columna `PagaPor` de `Clients` (el ClientID de quien paga; vacío =
 *  paga lo suyo). El grupo es el pagador más todos los que lo apuntan.
 *
 *  Por qué existe: hay meses en que el pagador carga dos o tres cuotas en UNA sola
 *  fila y el resto del grupo no tiene fila propia. Sin grupos, esa gente abre la app
 *  el 11 y lee que debe una cuota que ya le pagaron. */
export interface PagoGrupo {
  pagador: string            // nombre de quien paga
  soyPagador: boolean
  miembros: string[]         // todo el grupo, pagador incluido
  cuotasRegistradas: number  // cuántos del grupo tienen fila este mes
  cuotasTotales: number
}

/** Lo que el backend devuelve en `getPago`. Todo derivado de la planilla. */
export interface PagoInfo {
  periodo: string          // 'YYYY-MM'
  estado: PagoEstado
  monto: number | null     // esperado (Pricing × DaysPerWeek); null si no se pudo calcular
  pagadoEl?: string        // 'YYYY-MM-DD' — solo cuando está al día
  medio?: string           // 'Transferencia' | 'Efectivo'
  actualizadoAl: string    // 'YYYY-MM-DD': último pago cargado en la planilla del mes
  grupo?: PagoGrupo | null // null / ausente = paga lo suyo
  config?: PagoConfig      // alias/CVU/recargo, del tab `pagos_config`
}

/** ¿El grupo tiene el mes cubierto?
 *
 *  Alcanza con que CUALQUIERA del grupo tenga fila, no específicamente el pagador.
 *  Hay un grupo donde paga la madre pero la fila del mes está cargada a nombre de
 *  una hija. Una regla que mirara solo al pagador dejaría a los tres marcados como
 *  deudores. */
export function grupoCubierto(g: PagoGrupo): boolean {
  return g.cuotasRegistradas > 0
}

/** Datos de transferencia. Salen de la pestaña `pagos_config` del Config sheet,
 *  así Matías los cambia sin tocar código ni volver a publicar.
 *
 *  Los valores REALES (alias, CVU, teléfono) viven solo en esa planilla y nunca en
 *  este repo: `MatiasR95/force-app` es público y un CVU publicado se raspa solo. */
export interface PagoConfig {
  alias: string
  cvu?: string
  titular?: string
  whatsapp?: string           // para "ya la pagué, avisanos"
  recargoSemanal?: number     // $ por cada semana de atraso pasado el día 10
}

/** Último día para abonar sin recargo. */
export const DIA_LIMITE = 10

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** 'septiembre' a partir de un período 'YYYY-MM'. */
export function mesDe(periodo: string): string {
  const m = Number(periodo.slice(5, 7))
  return MESES[m - 1] ?? ''
}

/** Días que faltan para el 10 (0 = hoy es el 10). Negativo = ya pasó. */
export function diasParaVencer(hoy: Date, limite = DIA_LIMITE): number {
  return limite - hoy.getDate()
}

/** El estado, a partir del día del mes y de si hay pago cargado.
 *  Vive en el front Y en el backend: acá manda la fecha del teléfono, así el
 *  socio ve el 10 en SU día aunque la respuesta esté cacheada 10 minutos. */
export function estadoDePago(pagado: boolean, hoy = new Date(), limite = DIA_LIMITE): PagoEstado {
  if (pagado) return 'al_dia'
  const faltan = diasParaVencer(hoy, limite)
  if (faltan > 0) return 'por_vencer'
  if (faltan === 0) return 'ultimo_dia'
  return 'vencida'
}

/** Días de atraso (1 = el día 11). 0 cuando todavía no venció. */
export function diasVencida(hoy = new Date(), limite = DIA_LIMITE): number {
  return Math.max(0, hoy.getDate() - limite)
}

/** Cuánto lugar merece la cuota en Inicio.
 *
 *  En septiembre los 95 pagos entraron entre el 31/8 y el 9/9: nadie pagó tarde.
 *  O sea que, tres semanas de cada cuatro, casi todos están al día y una tarjeta
 *  que diga "todo bien" es un bloque menos para lo que importa. Así que al día no
 *  ocupa lugar en Inicio (vive en Perfil), y los primeros días del mes tampoco:
 *  avisarle el día 2 a alguien que siempre paga el 3 es hincharle las pelotas.
 *
 *   - `oculta`  → no va a Inicio
 *   - `linea`   → una línea fina abajo, al peso del recordatorio de peso corporal
 *   - `tarjeta` → tarjeta entera, y compite por el slot de atención
 */
export type PagoVisibilidad = 'oculta' | 'linea' | 'tarjeta'

/** Desde qué día del mes se empieza a avisar. */
export const DIA_PRIMER_AVISO = 5

export function visibilidadEnInicio(
  estado: PagoEstado, hoy = new Date(), grupo?: PagoGrupo | null,
): PagoVisibilidad {
  // A quien no paga nunca se le reclama: no puede pagar una cuota que paga otro, así
  // que ponerle un cartel de deuda es pasarle un problema ajeno. Su estado
  // vive en Perfil, en tono neutro, y el aviso del 10 le llega al pagador.
  if (grupo && !grupo.soyPagador) return 'oculta'
  if (estado === 'al_dia') return 'oculta'
  if (estado === 'ultimo_dia' || estado === 'vencida') return 'tarjeta'
  return hoy.getDate() >= DIA_PRIMER_AVISO ? 'linea' : 'oculta'
}

/** Semanas de atraso pasado el día 10. La primera arranca el día 11: del 11 al 17
 *  es una semana, del 18 al 24 son dos. */
export function semanasDeAtraso(hoy = new Date(), limite = DIA_LIMITE): number {
  return Math.ceil(diasVencida(hoy, limite) / 7)
}

/** Recargo acumulado hoy. 0 mientras no haya atraso o si no hay recargo cargado. */
export function recargoAcumulado(config: PagoConfig, hoy = new Date(), limite = DIA_LIMITE): number {
  if (!config.recargoSemanal) return 0
  return semanasDeAtraso(hoy, limite) * config.recargoSemanal
}

export function formatARS(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

/** 'lunes 8 de septiembre' — para el pie "actualizado al …". */
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

// ---- muestra (solo demo) ---------------------------------------------------
// Con `npm run dev` no hay backend: esto alimenta la tarjeta para poder mirarla.

// Valores de ejemplo a propósito: los reales se cargan en `pagos_config` y no
// entran nunca al repo, que es público.
export const DEMO_CONFIG: PagoConfig = {
  alias: 'alias.de.ejemplo',
  cvu: '0000000000000000000000',
  titular: 'Titular de ejemplo',
  whatsapp: '5490000000000',
  recargoSemanal: 5000,
}

export type DemoRol = 'sola' | 'pagadora' | 'me_pagan'

export function demoPago(estado: PagoEstado, rol: DemoRol = 'sola', hoy = new Date()): PagoInfo {
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const pagado = estado === 'al_dia'
  const grupo: PagoGrupo | null =
    rol === 'pagadora'
      ? {
        pagador: 'Beatriz', soyPagador: true,
        miembros: ['Beatriz', 'Mica', 'Cintia'],
        cuotasRegistradas: pagado ? 3 : 0, cuotasTotales: 3,
      }
      : rol === 'me_pagan'
        ? {
          pagador: 'Beatriz', soyPagador: false,
          miembros: ['Beatriz', 'Mica', 'Cintia'],
          cuotasRegistradas: pagado ? 3 : 0, cuotasTotales: 3,
        }
        : null
  const monto = rol === 'pagadora' ? 141000 : 49000
  const base: PagoInfo = { periodo, estado, monto, actualizadoAl: '2026-09-13', grupo }
  if (pagado) return { ...base, pagadoEl: '2026-09-02', medio: 'Transferencia' }
  return base
}
