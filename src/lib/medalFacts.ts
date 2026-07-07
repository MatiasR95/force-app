// Per-medal facts + motivational lines for the medal detail sheet. One fact
// (something true and interesting about the lift or the habit) + one quote in
// FORCE voice: warm, humble, rioplatense — never gym-bro.

export interface MedalStory { fact: string; quote: string }

const LIFT_STORY: Record<string, MedalStory> = {
  sentadilla: {
    fact: 'La sentadilla recluta más de 200 músculos a la vez — es el ejercicio que más fuerza total construye del cuerpo entero.',
    quote: 'Cada vez que te levantás del punto más bajo, practicás algo más grande que la fuerza.',
  },
  'peso-muerto': {
    fact: 'El peso muerto es el levantamiento donde el ser humano mueve más carga: el récord mundial pasa los 500 kg.',
    quote: 'Levantar del piso lo que antes no podías: de eso se trata todo esto.',
  },
  'peso-muerto-hex': {
    fact: 'La barra hexagonal reparte la carga más cerca de tu eje: por eso casi todos levantan más con ella — y la espalda lo agradece.',
    quote: 'La técnica primero, el peso después. Vos ya entendiste el orden.',
  },
  'peso-muerto-sumo': {
    fact: 'El sumo acorta el recorrido de la barra hasta un 20%: menos distancia, más piernas, misma valentía.',
    quote: 'Encontraste tu manera de levantar. Eso también es progreso.',
  },
  'press-banca': {
    fact: 'En el press de banca los pies importan tanto como los brazos: el empuje de piernas (leg drive) es parte del levantamiento.',
    quote: 'Serie a serie, kilo a kilo. Así se construye un press — y una constancia.',
  },
  'press-banca-db': {
    fact: 'Con mancuernas, cada brazo trabaja solo: no hay lado fuerte que ayude al otro. Esta medalla es doblemente tuya.',
    quote: 'Sin barra que equilibre: esto lo sostuviste vos, de los dos lados.',
  },
  dominadas: {
    fact: 'La dominada es levantar tu propio cuerpo completo — el ejercicio de tracción más honesto que existe.',
    quote: 'Subir tu propio peso ya es fuerte. Subirlo con lastre es otra categoría — la tuya.',
  },
  'press-militar': {
    fact: 'El press militar fue LA medida de fuerza olímpica hasta 1972. Poner peso sobre la cabeza sigue siendo el gesto más antiguo de la fuerza.',
    quote: 'Peso sobre la cabeza, cuerpo firme abajo. Pocos gestos dicen tanto de tu entrenamiento.',
  },
}

const STREAK_STORY: MedalStory = {
  fact: 'Los hábitos se consolidan alrededor de las 8–10 semanas de repetición: cada semana seguida cablea un poco más el "yo entreno".',
  quote: 'No es la semana brava la que te define: es volver la semana siguiente.',
}
const SESSIONS_STORY: MedalStory = {
  fact: 'La fuerza responde al total acumulado: cada sesión suma al mismo pozo, aunque ese día no se sienta.',
  quote: 'Nadie te regaló ninguno de estos entrenamientos. Los viniste a buscar uno por uno.',
}

export function medalStory(kind: 'lift' | 'streak' | 'sessions', lift?: string): MedalStory {
  if (kind === 'streak') return STREAK_STORY
  if (kind === 'sessions') return SESSIONS_STORY
  return LIFT_STORY[lift ?? ''] ?? {
    fact: 'Cada medalla de fuerza compara tu marca contra tu propia categoría de peso — competís en tu liga.',
    quote: 'Tu única comparación justa: vos, hace un tiempo.',
  }
}
