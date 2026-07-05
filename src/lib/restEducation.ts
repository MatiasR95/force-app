// Rest-time micro-education ("Descubrí tu cuerpo"): short, accurate physiology
// explainers shown while the rest timer runs — opt-in, one per pause, rotating.
// Content authored + fact-checked by the S&C coach agent (NSCA-level, simplified;
// no myths). The `sceneId` maps to an animated gold line-art SVG in
// RestExplainer.tsx (no faces, no baked-in text — brand rule).

export interface RestEducationEntry {
  id: string
  title: string
  text: string
  // Which animated line-art scene to show (see RestExplainer.tsx). Defaults to `id`
  // when omitted, so several entries can share one animation without redrawing it.
  scene?: string
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
  // ---- new scenes ----
  {
    id: 'riego-sanguineo',
    title: 'La "congestión" del músculo',
    text: 'Cuando entrenás, el músculo llama sangre: se abren más capilares y llega más oxígeno y nutrientes. Eso es la congestión (el "pump"). No es solo estética: ese riego trae combustible y se lleva desechos, y con el tiempo tu cuerpo construye más capilares para nutrir mejor las fibras que trabajás.',
  },
  {
    id: 'frecuencia-cardiaca',
    title: 'El corazón también se entrena',
    text: 'Entre series, tu pulso baja mientras el corazón repone lo gastado. Cuanto más entrenás, más rápido se recupera esa frecuencia: es una señal directa de que tu condición física mejora. Un corazón que vuelve rápido a la calma es un corazón más eficiente.',
  },
  {
    id: 'sueno-recuperacion',
    title: 'Crecés mientras dormís',
    text: 'Durante el sueño profundo, el cuerpo libera hormona de crecimiento y repara el músculo que estresaste hoy. Por eso una mala noche se siente en la barra al otro día. El entrenamiento es el estímulo; el sueño es donde ocurre casi toda la construcción.',
  },
  {
    id: 'hidratacion',
    title: 'El agua es rendimiento',
    text: 'El músculo es en gran parte agua, y hasta una deshidratación leve baja la fuerza, la potencia y la concentración. Tomar agua a lo largo del día no es un detalle: mantiene el volumen de sangre, la temperatura y la contracción funcionando como deben. Aprovechá la pausa y tomá un trago.',
  },
  // ---- reuse existing scenes ----
  {
    id: 'mente-musculo',
    scene: 'unidades-motoras',
    title: 'La conexión mente-músculo',
    text: 'Pensar en el músculo que trabaja no es un cliché: dirigir la atención al músculo objetivo aumenta cuánto lo activás en cada repetición. Tu cerebro recluta mejor lo que "mira". Por eso una serie concentrada rinde más que una hecha en piloto automático.',
  },
  {
    id: 'agarre-fuerza',
    scene: 'contraccion-muscular',
    title: 'La fuerza empieza en las manos',
    text: 'Apretar fuerte la barra activa un reflejo (la irradiación) que tensa todo el brazo y el hombro, y te vuelve más estable y fuerte al instante. Un buen agarre no solo sostiene el peso: le avisa a todo el cuerpo que es hora de generar tensión.',
  },
  {
    id: 'excentrica',
    scene: 'microdano-reparacion',
    title: 'La bajada también construye',
    text: 'La fase en la que bajás el peso (la excéntrica) genera un estímulo enorme de crecimiento y fuerza. Bajar con control, sin soltar la carga, es la mitad "gratis" de cada repetición que muchos desperdician. Frená el descenso y cobrala.',
  },
  {
    id: 'volumen-semanal',
    scene: 'sobrecarga-progresiva',
    title: 'El volumen manda',
    text: 'El crecimiento responde más al total de series efectivas de la semana que a un solo día heroico. Repartir el trabajo en varias sesiones te deja entrenar con calidad, recuperarte y sumar más volumen útil. Por eso el plan distribuye, no amontona.',
  },
  {
    id: 'rir-esfuerzo',
    scene: 'atp-pc-descanso',
    title: 'Cerca del fallo, no siempre al fallo',
    text: 'Dejar 1 o 2 repeticiones "en reserva" (RIR) estimula casi lo mismo que ir al fallo, pero te fatiga mucho menos y cuida la técnica. Entrenar fuerte no es terminar destruido cada serie: es acumular buen trabajo que puedas repetir mañana.',
  },
  {
    id: 'core-antimovimiento',
    scene: 'respiracion-bracing',
    title: 'El core frena, no flexiona',
    text: 'La función principal del core no es hacer abdominales: es resistir el movimiento para proteger la columna cuando cargás, girás o te agachás. Un core fuerte transfiere la fuerza de las piernas al resto del cuerpo sin fugas. Por eso la plancha enseña más que mil crunches apurados.',
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
