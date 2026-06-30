// Event-aware theming. The active theme is decided ON THE DEVICE from the local
// date, so once a member has this build every event lights up automatically on its
// dates — no redeploy, no refresh. Ranges are month-day (year-agnostic) so they
// repeat every year. Only Argentine PATRIOTIC dates (plus Navidad / fin de año and
// the Malvinas remembrance) — never Pascuas/Carnaval.

export type ThemeTone = 'patria' | 'festivo' | 'solemne'
export type ThemeEffect = 'flags' | 'fireworks' | 'star' | 'map'

export interface EventTheme {
  id: string
  tone: ThemeTone
  title: string       // gold kicker line
  greeting: string    // main line
  blurb: string       // supporting line
  emoji: string
  effect: ThemeEffect
}

interface ThemeWindow extends EventTheme { from: string; to: string } // from/to = 'MM-DD'

// Ordered; the first matching window wins (windows don't overlap).
const WINDOWS: ThemeWindow[] = [
  {
    id: 'malvinas', tone: 'solemne', from: '04-01', to: '04-03', effect: 'map', emoji: '🇦🇷',
    title: '2 de Abril', greeting: 'Día del Veterano y de los Caídos en Malvinas',
    blurb: 'Honramos a quienes dieron todo. Las Malvinas son argentinas.',
  },
  {
    id: 'revolucion-mayo', tone: 'patria', from: '05-23', to: '05-26', effect: 'flags', emoji: '🇦🇷',
    title: '25 de Mayo', greeting: '¡Feliz 25 de Mayo!', blurb: 'Revolución de Mayo · donde todo empezó.',
  },
  {
    id: 'bandera', tone: 'patria', from: '06-18', to: '06-21', effect: 'flags', emoji: '🇦🇷',
    title: 'Día de la Bandera', greeting: '¡Feliz Día de la Bandera!', blurb: 'Por Belgrano y los colores que nos unen.',
  },
  {
    id: 'independencia', tone: 'patria', from: '07-07', to: '07-10', effect: 'flags', emoji: '🇦🇷',
    title: '9 de Julio', greeting: '¡Feliz Día de la Independencia!', blurb: 'Libres desde 1816. A entrenar con orgullo.',
  },
  {
    id: 'san-martin', tone: 'patria', from: '08-15', to: '08-18', effect: 'flags', emoji: '⚔️',
    title: 'Gral. San Martín', greeting: 'Honramos al Libertador', blurb: 'Paso a la inmortalidad del Padre de la Patria.',
  },
  {
    id: 'soberania', tone: 'patria', from: '11-19', to: '11-21', effect: 'flags', emoji: '🇦🇷',
    title: 'Soberanía Nacional', greeting: 'Día de la Soberanía Nacional', blurb: 'Vuelta de Obligado · de pie, siempre.',
  },
  {
    id: 'navidad', tone: 'festivo', from: '12-18', to: '12-26', effect: 'star', emoji: '🎄',
    title: 'Felices fiestas', greeting: '¡Feliz Navidad, familia FORCE!', blurb: 'Que cierres el año más fuerte que nunca.',
  },
  {
    id: 'fin-de-anio', tone: 'festivo', from: '12-29', to: '01-01', effect: 'fireworks', emoji: '🎆',
    title: 'Fin de año', greeting: '¡Feliz Año Nuevo!', blurb: 'Nuevo año, nuevos récords. #TrustTheProcess',
  },
]

const mmdd = (d: Date): string =>
  `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function inWindow(today: string, from: string, to: string): boolean {
  return from <= to ? today >= from && today <= to : today >= from || today <= to // wraps year-end
}

/** The active event theme for a given local date, or null on an ordinary day. */
export function currentEventTheme(date = new Date()): EventTheme | null {
  const today = mmdd(date)
  const w = WINDOWS.find((x) => inWindow(today, x.from, x.to))
  if (!w) return null
  const { from: _f, to: _t, ...theme } = w
  void _f; void _t
  return theme
}
