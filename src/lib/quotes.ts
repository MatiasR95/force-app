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
  'La disciplina es acordarte de lo que querés cuando no tenés ganas.',
  'No se trata de tener tiempo, se trata de hacerte el tiempo. Y hoy te lo hiciste.',
  'La barra no sabe cómo te sentís. Solo sube si vos empujás.',
  'Un día no entrenás por vago, otro por ocupado. Vos hoy rompiste esa cadena.',
  'El músculo crece en el silencio de las repeticiones que nadie ve.',
  'Fuerte no es un destino, es una forma de aparecer todos los días.',
  'Cada kilo que hoy te cuesta, mañana es tu calentamiento.',
  'No compitas con el de al lado. Competí con el que fuiste ayer.',
  'La motivación te trae a la puerta. El hábito te hace entrar.',
  'Levantar pesado también es levantar la autoestima.',
  'El progreso no es una línea recta: es aparecer aunque el gráfico esté plano.',
  'Lo que empieza como esfuerzo, con el tiempo se vuelve identidad.',
  'No hay series mágicas. Hay series repetidas. Esa es toda la magia.',
  'Tu cuerpo puede casi todo. Es tu cabeza la que tenés que convencer.',
  'Hoy pesado, mañana liviano. Así se construye la fuerza.',
  'El que se banca los días difíciles, disfruta los días fuertes.',
  'Nadie llegó lejos entrenando solo cuando tenía ganas.',
  'La repetición número 10, la que cuesta, es la que te cambia.',
  'Entrenar es la conversación más honesta que vas a tener en el día.',
  'Elegí el cansancio de entrenar, no el cansancio de no haberlo hecho.',
  'La fuerza es una habilidad. Se practica, no se espera.',
  'Cada vez que venís, votás por la persona que querés ser.',
  'Descansar es parte del plan, no una excusa. Pero hoy tocaba mover.',
  'El hierro es paciente: te devuelve exactamente lo que le pusiste.',
  'No busques ganas. Buscá razones. Y después empezá.',
  'Los resultados aman a los aburridos: los que hacen lo mismo, bien, muchas veces.',
  'Vos contra la gravedad. Spoiler: te estás haciendo más fuerte.',
  'Sé más fuerte que tu mejor excusa.',
  'El progreso se cocina a fuego lento. Seguí poniendo leña.',
  'Terminar la serie que querías cortar: ahí es donde crecés.',
  'La constancia no es glamurosa. Es lo único que funciona.',
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
