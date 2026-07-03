// Rest-time micro-education ("Descubrí tu cuerpo"): short, accurate physiology
// explainers shown while the rest timer runs — opt-in, one per pause, rotating.
// Content authored + fact-checked by the S&C coach agent (NSCA-level, simplified;
// no myths). The `sceneId` maps to an animated gold line-art SVG in
// RestExplainer.tsx (no faces, no baked-in text — brand rule).

export interface RestEducationEntry {
  id: string
  title: string
  text: string
}

export const REST_EDUCATION: RestEducationEntry[] = [
  {
    id: 'contraccion-muscular',
    title: 'Cómo se contrae el músculo',
    text: 'Adentro de cada fibra hay dos tipos de filamentos, finos y gruesos, acomodados en fila. Cuando el cerebro manda la señal, los filamentos gruesos "reman" y arrastran a los finos, acortando el músculo como un telescopio que se cierra. Ni se estiran ni se rompen: se deslizan uno sobre el otro.',
  },
  {
    id: 'unidades-motoras',
    title: 'El sistema nervioso primero',
    text: 'Antes de que el músculo crezca un solo milímetro, tu cuerpo aprende a reclutar más "unidades motoras": el combo de un nervio y las fibras que activa. Por eso en las primeras semanas de un plan te hacés más fuerte casi de un día para el otro — no ganaste músculo, ganaste coordinación. La fuerza arranca en el sistema nervioso.',
  },
  {
    id: 'atp-pc-descanso',
    title: 'Por qué esta pausa importa',
    text: 'Para levantar fuerte, tus músculos usan una reserva de energía ultra rápida llamada fosfocreatina, que se agota en pocos segundos de esfuerzo máximo. Esa reserva se recarga con el oxígeno que respirás en el descanso — y tarda entre 2 y 5 minutos en llenarse casi del todo. Cortala antes de tiempo y la próxima serie sale más floja: no por falta de ganas, sino de combustible.',
  },
  {
    id: 'microdano-reparacion',
    title: 'El músculo se repara, no se rompe',
    text: 'Entrenar fuerte genera microdaño real en las fibras — microroturas a nivel celular, no algo grave. Mientras dormís y comés, el cuerpo repara ese daño y arma la fibra un poco más gruesa que antes, como reforzando una pared. Por eso el sueño y la proteína no son un extra: son la mitad del trabajo que empezaste acá.',
  },
  {
    id: 'respiracion-bracing',
    title: 'Por qué apretás el aire',
    text: 'Cuando levantás pesado, llenás el abdomen de aire y lo apretás contra el cinturón de músculos del core antes de moverte. Eso crea presión intra-abdominal: un cilindro rígido que sostiene la columna desde adentro, como un cinturón de fuerza natural. Sin ese bracing, la espalda pierde estabilidad y absorbe fuerzas que debería absorber el core.',
  },
  {
    id: 'sobrecarga-progresiva',
    title: 'Por qué sube el peso',
    text: 'El cuerpo se adapta solo a lo que lo desafía: si siempre levantás lo mismo, ya aprendió a manejarlo y deja de cambiar. Por eso tu plan suma un poco de peso, de reps o de series semana a semana — un empujón apenas mayor al que ya podés tolerar. Ese aumento gradual y sostenido es la sobrecarga progresiva, el motor de todo progreso real.',
  },
]

const IDX_KEY = 'force.restEduIdx'

/** The next explainer, rotating through the pack across pauses. */
export function nextEducation(): RestEducationEntry {
  let i = 0
  try { i = Number(localStorage.getItem(IDX_KEY) || 0) % REST_EDUCATION.length } catch { /* no-op */ }
  try { localStorage.setItem(IDX_KEY, String((i + 1) % REST_EDUCATION.length)) } catch { /* no-op */ }
  return REST_EDUCATION[i]
}
