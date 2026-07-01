// Event-aware theming. The active theme is decided ON THE DEVICE from the local
// date, so once a member has this build every event lights up automatically — no
// redeploy, no refresh. Each window opens 7 DAYS BEFORE the date and runs through
// the day itself. Ranges are month-day (year-agnostic) so they repeat every year.
// Only Argentine PATRIOTIC dates (plus Navidad / fin de año and the Malvinas
// remembrance) — never Pascuas/Carnaval.

export type ThemeTone = 'patria' | 'festivo' | 'solemne'
export type ThemeEffect = 'flags' | 'fireworks' | 'snow' | 'map'

export interface EventTheme {
  id: string
  tone: ThemeTone
  title: string       // kicker line
  greeting: string    // main line
  blurb: string       // supporting line
  quote: string       // short rioplatense motivational line (shown with the banner)
  emoji: string
  effect: ThemeEffect
}

interface ThemeWindow extends EventTheme { from: string; to: string } // 'MM-DD'

// Ordered; first matching window wins (windows don't overlap). Each opens 7 days
// before the date and closes on the date.
const WINDOWS: ThemeWindow[] = [
  {
    id: 'malvinas', tone: 'solemne', from: '03-26', to: '04-02', effect: 'map', emoji: '🇦🇷',
    title: '2 de Abril', greeting: 'Día del Veterano y de los Caídos en Malvinas',
    blurb: 'Honramos a quienes dieron todo. Las Malvinas son argentinas.',
    quote: 'Su entrega nos recuerda lo que es no rendirse jamás.',
  },
  {
    id: 'revolucion-mayo', tone: 'patria', from: '05-18', to: '05-25', effect: 'flags', emoji: '🇦🇷',
    title: '25 de Mayo', greeting: '¡Feliz 25 de Mayo!', blurb: 'Revolución de Mayo · donde todo empezó.',
    quote: 'Como en 1810: lo que arranca con decisión, no para más. A darle.',
  },
  {
    id: 'bandera', tone: 'patria', from: '06-13', to: '06-20', effect: 'flags', emoji: '🇦🇷',
    title: 'Día de la Bandera', greeting: '¡Feliz Día de la Bandera!', blurb: 'Por Belgrano y los colores que nos unen.',
    quote: 'Llevá tus colores con orgullo, adentro y afuera del gym.',
  },
  {
    id: 'independencia', tone: 'patria', from: '07-01', to: '07-10', effect: 'flags', emoji: '🇦🇷',
    title: '9 de Julio', greeting: '¡Feliz Día de la Independencia!', blurb: 'Libres desde 1816. A entrenar con orgullo.',
    quote: 'Ser libre también es elegir ser tu mejor versión. Hoy te toca a vos.',
  },
  {
    id: 'san-martin', tone: 'patria', from: '08-10', to: '08-17', effect: 'flags', emoji: '⚔️',
    title: 'Gral. San Martín', greeting: 'Honramos al Libertador', blurb: 'Paso a la inmortalidad del Padre de la Patria.',
    quote: 'Disciplina sanmartiniana: hacé lo que hay que hacer, aunque cueste.',
  },
  {
    id: 'soberania', tone: 'patria', from: '11-13', to: '11-20', effect: 'flags', emoji: '🇦🇷',
    title: 'Soberanía Nacional', greeting: 'Día de la Soberanía Nacional', blurb: 'Vuelta de Obligado · de pie, siempre.',
    quote: 'De pie y firme. Tu esfuerzo no se negocia con nadie.',
  },
  {
    id: 'navidad', tone: 'festivo', from: '12-18', to: '12-25', effect: 'snow', emoji: '🎄',
    title: 'Felices fiestas', greeting: '¡Feliz Navidad, familia FORCE!', blurb: 'Que cierres el año más fuerte que nunca.',
    quote: 'El mejor regalo es lo que construís cada día. Seguí firme.',
  },
  {
    id: 'fin-de-anio', tone: 'festivo', from: '12-26', to: '01-01', effect: 'fireworks', emoji: '🎆',
    title: 'Fin de año', greeting: '¡Feliz Año Nuevo!', blurb: 'Nuevo año, nuevos récords.',
    quote: 'Año nuevo, misma promesa: no aflojar. #TrustTheProcess',
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
