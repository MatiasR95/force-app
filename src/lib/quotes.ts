// Short motivational lines shown on the welcome hero. Brand voice: firm, warm,
// no bro-science, rioplatense; the spirit of #TrustTheProcess.

export const QUOTES: string[] = [
  'La fuerza no se hereda, se construye. Hoy sumás un ladrillo más.',
  'No tenés que ser el más fuerte de la sala. Solo más fuerte que ayer.',
  'La constancia le gana al talento cuando el talento no es constante.',
  'Cada serie cuenta. Cada vuelta suma. Confiá en el proceso.',
  'El mejor entrenamiento es el que hacés. Ya estás acá: ganaste la parte difícil.',
  'La técnica primero, el peso después. La paciencia también es fuerza.',
  'Lo que entrenás hoy, lo agradecés en 10 años. Tu yo del futuro mira.',
  'No existe la motivación perfecta, existe presentarse. Y vos te presentaste.',
  'Levantá con intención. Cada repetición es una decisión.',
  'El progreso es silencioso: aparece cuando dejás de buscarlo y seguís apareciendo.',
  'Hoy es un buen día para mover hierro. Siempre lo es.',
  'Fuerte de cuerpo, claro de mente. Entrenar es las dos cosas.',
]

const KEY = 'force.lastQuote'

/** A quote, avoiding the immediately previous one. */
export function nextQuote(): string {
  let last = -1
  try { last = parseInt(localStorage.getItem(KEY) || '-1', 10) } catch { /* ignore */ }
  let i = (last + 1) % QUOTES.length
  if (i === last) i = (i + 1) % QUOTES.length
  try { localStorage.setItem(KEY, String(i)) } catch { /* quota */ }
  return QUOTES[i]
}
