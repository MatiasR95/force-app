// Short, evidence-based "¿Sabías que…?" facts on how strength & resistance
// training supports health and wellbeing. Brand voice: NSCA/ACSM-aligned, no
// bro-science, kept short so they never overwhelm after a session.

export const FACTS: string[] = [
  'La fuerza es la única capacidad física que, bien entrenada, mejora casi todas las demás.',
  'El músculo es metabólicamente activo: más masa muscular ayuda a regular mejor la glucosa en reposo.',
  'Entrenar fuerza 2+ veces por semana se asocia con menor mortalidad por todas las causas.',
  'La sobrecarga progresiva fortalece huesos y tendones, no solo músculos. Tu esqueleto también se adapta.',
  'La fuerza de agarre es uno de los mejores predictores de longevidad y salud general.',
  'El entrenamiento de fuerza mejora el descanso: muchas personas duermen mejor las noches que entrenan.',
  'Levantar pesado libera endorfinas: la fuerza también es salud mental.',
  'Después de los 30 perdemos masa muscular cada año… salvo que la entrenemos. Vos hoy hiciste justo eso.',
  'Más fuerza = mejor postura y menos dolor de espalda en la vida diaria.',
  'El tejido muscular ayuda a sostener el metabolismo: entrenás hoy, gastás un poco más incluso en reposo.',
  'La constancia gana: los progresos en fuerza vienen de repetir, no de un día perfecto. #TrustTheProcess',
  'El entrenamiento de resistencia mejora la sensibilidad a la insulina, clave para la salud a largo plazo.',
  'Tendones y ligamentos se adaptan más lento que el músculo: por eso la progresión gradual cuida tus articulaciones.',
  'La fuerza mejora el equilibrio y la coordinación, reduciendo el riesgo de caídas con los años.',
  'Entrenar fuerza eleva el ánimo y baja la ansiedad tanto como muchas intervenciones para el estrés.',
]

const SEEN_KEY = 'force.lastFact'

/** Pick a fact, avoiding the immediately previous one. */
export function nextFact(): string {
  let last = -1
  try { last = parseInt(localStorage.getItem(SEEN_KEY) || '-1', 10) } catch { /* ignore */ }
  let i = last
  // vary by index away from the last shown (no Math.random needed for "new each time")
  if (FACTS.length > 1) {
    i = (last + 1 + Math.floor((Date.now() / 1000) % (FACTS.length - 1))) % FACTS.length
    if (i === last) i = (i + 1) % FACTS.length
  } else {
    i = 0
  }
  try { localStorage.setItem(SEEN_KEY, String(i)) } catch { /* quota */ }
  return FACTS[i]
}
