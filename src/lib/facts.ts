// Short, evidence-based "¿Sabías que…?" facts on how strength & resistance
// training supports health and wellbeing. Brand voice: NSCA/ACSM-aligned, no
// bro-science, kept short so they never overwhelm after a session. Rotated so a
// member rarely sees the same one twice in a row.

export const FACTS: string[] = [
  'La fuerza es la única capacidad física que, bien entrenada, mejora casi todas las demás.',
  'El músculo es metabólicamente activo: más masa muscular ayuda a regular mejor la glucosa en reposo.',
  'Entrenar fuerza 2+ veces por semana se asocia con menor mortalidad por todas las causas.',
  'La sobrecarga progresiva fortalece huesos y tendones, no solo músculos. Tu esqueleto también se adapta.',
  'La fuerza de agarre es uno de los mejores predictores de longevidad y salud general.',
  'Muchas personas duermen mejor las noches que entrenan fuerza.',
  'Levantar pesado libera endorfinas: la fuerza también es salud mental.',
  'Después de los 30 perdemos masa muscular cada año… salvo que la entrenemos. Hoy hiciste justo eso.',
  'Más fuerza = mejor postura y menos dolor de espalda en la vida diaria.',
  'El tejido muscular sostiene el metabolismo: entrenás hoy, gastás un poco más incluso en reposo.',
  'La constancia gana: los progresos vienen de repetir, no de un día perfecto. #TrustTheProcess',
  'El entrenamiento de resistencia mejora la sensibilidad a la insulina, clave para la salud a largo plazo.',
  'Tendones y ligamentos se adaptan más lento que el músculo: por eso la progresión gradual cuida tus articulaciones.',
  'La fuerza mejora el equilibrio y la coordinación, reduciendo el riesgo de caídas con los años.',
  'Entrenar fuerza baja la ansiedad de forma comparable a muchas intervenciones contra el estrés.',
  'El entrenamiento de fuerza aumenta la densidad mineral ósea: es de lo mejor que existe contra la osteoporosis.',
  'Dos a tres sesiones de fuerza por semana mejoran la presión arterial en reposo.',
  'La masa muscular es un "órgano de reserva": ayuda a recuperarte mejor de enfermedades y cirugías.',
  'El RIR (repeticiones en reserva) te deja entrenar fuerte sin llegar siempre al fallo. Calidad > ego.',
  'La hipertrofia responde al volumen: series efectivas a lo largo de la semana, no a un solo día heroico.',
  'Más fuerza en piernas se asocia con más autonomía y movilidad en la tercera edad.',
  'El entrenamiento de fuerza mejora el perfil de colesterol y la salud cardiovascular, no solo el cardio.',
  'La técnica es una habilidad: cada serie bien hecha "graba" el patrón motor. Por eso practicamos los básicos.',
  'Descansar entre series no es perder tiempo: permite mover más carga y mejor técnica en la siguiente.',
  'El músculo que entrenás hoy te protege las articulaciones mañana. La fuerza es prevención.',
  'Entrenar fuerza mejora la memoria de trabajo y la función ejecutiva. El cerebro también levanta.',
  'Una buena entrada en calor sube el rendimiento y baja el riesgo de lesión. Nunca te la saltees.',
  'El progreso no es lineal: semanas planas son parte del proceso. Seguí apareciendo.',
  'La fuerza relativa (fuerza por kilo de peso) es clave para moverte mejor en la vida y el deporte.',
  'Levantar con intención y control hace cada repetición más efectiva que apurarla. Manda el músculo, no la inercia.',
]

const KEY = 'force.factHist'
const RECENT = 6

/** A fact avoiding the last RECENT shown (cycles the whole list before repeating). */
export function nextFact(): string {
  let hist: number[] = []
  try { hist = JSON.parse(localStorage.getItem(KEY) || '[]') } catch { hist = [] }
  const avoid = new Set(hist.slice(-Math.min(RECENT, FACTS.length - 1)))
  const pool = FACTS.map((_, i) => i).filter((i) => !avoid.has(i))
  // deterministic-but-varying pick (no Math.random): step by a changing offset
  const i = pool[(hist.length + Math.floor(Date.now() / 60000)) % pool.length]
  try { localStorage.setItem(KEY, JSON.stringify([...hist, i].slice(-RECENT))) } catch { /* quota */ }
  return FACTS[i]
}
