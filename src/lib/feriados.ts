// Argentina national holidays (feriados nacionales). Dates are the officially
// published 2026 calendar (Ley 27.399) plus 2027 so the "próximo feriado" never
// runs dry. Refresh yearly — the Poder Ejecutivo fixes trasladables/puentes by
// decree. Source: argentina.gob.ar/jefatura/feriados-nacionales-2026.

export interface Feriado { date: string; name: string; emoji: string }

export const FERIADOS: Feriado[] = [
  // ---- 2026 ----
  { date: '2026-01-01', name: 'Año Nuevo', emoji: '🎉' },
  { date: '2026-02-16', name: 'Carnaval', emoji: '🎭' },
  { date: '2026-02-17', name: 'Carnaval', emoji: '🎭' },
  { date: '2026-03-24', name: 'Día de la Memoria', emoji: '🕊️' },
  { date: '2026-04-02', name: 'Día del Veterano y Caídos en Malvinas', emoji: '🇦🇷' },
  { date: '2026-04-03', name: 'Viernes Santo', emoji: '✝️' },
  { date: '2026-05-01', name: 'Día del Trabajador', emoji: '🛠️' },
  { date: '2026-05-25', name: 'Revolución de Mayo', emoji: '🇦🇷' },
  { date: '2026-06-15', name: 'Paso a la Inmortalidad del Gral. Güemes', emoji: '🐎' },
  { date: '2026-06-20', name: 'Día de la Bandera', emoji: '🇦🇷' },
  { date: '2026-07-09', name: 'Día de la Independencia', emoji: '🇦🇷' },
  { date: '2026-08-17', name: 'Paso a la Inmortalidad del Gral. San Martín', emoji: '⚔️' },
  { date: '2026-10-12', name: 'Día del Respeto a la Diversidad Cultural', emoji: '🌎' },
  { date: '2026-11-20', name: 'Día de la Soberanía Nacional', emoji: '🇦🇷' },
  { date: '2026-12-08', name: 'Inmaculada Concepción', emoji: '⛪' },
  { date: '2026-12-25', name: 'Navidad', emoji: '🎄' },
  // ---- 2027 (fixed/known dates; verify trasladables when the decree is out) ----
  { date: '2027-01-01', name: 'Año Nuevo', emoji: '🎉' },
  { date: '2027-02-08', name: 'Carnaval', emoji: '🎭' },
  { date: '2027-02-09', name: 'Carnaval', emoji: '🎭' },
  { date: '2027-03-24', name: 'Día de la Memoria', emoji: '🕊️' },
  { date: '2027-03-26', name: 'Viernes Santo', emoji: '✝️' },
  { date: '2027-04-02', name: 'Día del Veterano y Caídos en Malvinas', emoji: '🇦🇷' },
  { date: '2027-05-01', name: 'Día del Trabajador', emoji: '🛠️' },
  { date: '2027-05-25', name: 'Revolución de Mayo', emoji: '🇦🇷' },
  { date: '2027-06-20', name: 'Día de la Bandera', emoji: '🇦🇷' },
  { date: '2027-07-09', name: 'Día de la Independencia', emoji: '🇦🇷' },
  { date: '2027-08-17', name: 'Paso a la Inmortalidad del Gral. San Martín', emoji: '⚔️' },
  { date: '2027-12-08', name: 'Inmaculada Concepción', emoji: '⛪' },
  { date: '2027-12-25', name: 'Navidad', emoji: '🎄' },
]

export interface NextFeriado extends Feriado { daysLeft: number }

/** The next feriado on or after `today` (local YYYY-MM-DD), or null if none left. */
export function nextFeriado(today: string): NextFeriado | null {
  const t = new Date(today + 'T00:00:00').getTime()
  for (const f of FERIADOS) {
    const d = new Date(f.date + 'T00:00:00').getTime()
    if (d >= t) return { ...f, daysLeft: Math.round((d - t) / 86_400_000) }
  }
  return null
}
