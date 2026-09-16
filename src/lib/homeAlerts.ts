// Un solo slot de atención en Inicio.
//
// Inicio acumula bloques dorados que piden lo mismo: mirame. El 1 de octubre, un
// socio que debe la cuota podía abrir la app y encontrar recap del mes + cuota
// vencida + le pasaron un récord + su cumpleaños, los cuatro con borde dorado
// compitiendo entre sí. Cuando gritan todos, no se lee ninguno.
//
// Regla: de estos cuatro se muestra UNO, el de mayor prioridad. Los otros esperan.
// Ninguno se pierde: el recap sigue ofrecido hasta que lo descarta, el récord
// robado queda pendiente hasta que lo ve, y la cuota no se paga sola.
//
// Los avisos del gym (`NewsBanner`) quedan afuera a propósito: que el martes está
// cerrado no es una alerta personal que pueda esperar al día siguiente.

export type AlertKind =
  | 'cumple'  // es tu cumpleaños
  | 'cuota'   // día 10 o cuota vencida
  | 'rival'   // te pasaron un récord
  | 'recap'   // tu resumen del mes pasado está listo

/** De mayor a menor. El cumpleaños va primero a propósito: cobrarle a alguien el
 *  día que cumple años es exactamente lo que FORCE no hace. */
export const ALERT_PRIORITY: AlertKind[] = ['cumple', 'cuota', 'rival', 'recap']

/** El único bloque de atención que Inicio va a pintar hoy. */
export function topAlert(disponibles: AlertKind[]): AlertKind | null {
  for (const k of ALERT_PRIORITY) if (disponibles.includes(k)) return k
  return null
}
