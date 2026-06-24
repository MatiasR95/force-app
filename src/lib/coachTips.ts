// Coach tips — lift-specific cues shown on the Home screen, tied to today's Big
// One. Maintained by the FORCE S&C coach agent (.claude/agents/sc-coach.md):
// each tip is one biomechanically sound, actionable idea, rioplatense, high
// variability. The Big One's name is classified with `pickMove` (same mapping the
// animator uses) so the tip always matches the movement on screen.

import { pickMove } from '../components/AnimatedExercise'

export interface CoachTip { title: string; tip: string }

// move-key → { title, tips[] }. Several move keys collapse onto a shared pool.
const POOLS: Record<string, { title: string; tips: string[] }> = {
  squat: {
    title: 'Tip de sentadilla',
    tips: [
      'Antes de bajar, llená el abdomen de aire y apretá como si fueras a recibir un golpe: ese bracing protege la columna y te hace más fuerte.',
      'Empujá las rodillas hacia afuera, en línea con la punta de los pies. Que no se vayan para adentro cuando subís.',
      'El peso va sobre el mediopié, ni en la punta ni en el talón. Sentí los tres puntos del pie clavados.',
      'Bajá con control hasta romper la paralela si tu movilidad lo permite. Profundidad real, no rebote.',
      'Pecho arriba y mirada al frente. Si el pecho cae, la barra se va para adelante.',
      'Pensá "abrir el piso con los pies" al subir: activa glúteos y caderas desde el arranque.',
    ],
  },
  bench: {
    title: 'Tip de press de banca',
    tips: [
      'Juntá los omóplatos y "metelos en el bolsillo de atrás": pecho firme, hombros estables, más potencia y menos riesgo.',
      'Clavá los pies en el piso y empujá: el leg drive es parte del press, no solo brazos.',
      'La barra baja a la parte baja del pecho, no al cuello. Codos a ~45°, no abiertos del todo.',
      'Tocá el pecho con control y frená un instante: dominás el peso, no al revés.',
      'Mantené una curva natural en la zona lumbar, glúteos siempre en el banco.',
      'Apretá la barra como si quisieras "doblarla": activás más la espalda y estabilizás el press.',
    ],
  },
  deadlift: {
    title: 'Tip de peso muerto',
    tips: [
      'La barra arranca sobre el mediopié y sube pegada a las piernas. Cuanto más cerca del cuerpo, más fuerte y seguro.',
      'Antes de tirar, "sacá el aire del codo": activá los dorsales para fijar la barra y proteger la espalda.',
      'Pensá en empujar el piso con los pies, no en tirar con la espalda. Las piernas inician el movimiento.',
      'Cadera y hombros suben juntos. Si la cadera dispara primero, baja un poco el peso y reordená.',
      'Llená el abdomen de aire y apretá fuerte antes de despegar: el bracing es tu cinturón natural.',
      'Terminá parado, glúteos apretados, sin hiperextender la espalda. Bloqueo limpio, no latigazo.',
    ],
  },
  overhead: {
    title: 'Tip de press militar',
    tips: [
      'Apretá glúteos y abdomen para no arquear la lumbar: el press parado se sostiene desde el core.',
      'La barra pasa cerca de la cara y termina sobre la mitad del pie, no adelante. Sacá un poco el mentón al subir.',
      'Arriba, "encogé los hombros hacia las orejas" para bloquear: hombros activos, codos extendidos.',
      'Codos un poco adelante en la posición de inicio, muñecas firmes sobre el antebrazo.',
      'Subí con intención y bajá con control hasta la clavícula. Nada de rebotes con las piernas.',
    ],
  },
  row: {
    title: 'Tip de remo',
    tips: [
      'Llevá los codos hacia atrás y juntá los omóplatos al final: tirás con la espalda, no con los brazos.',
      'Mantené el torso firme y la lumbar neutra. Si te balanceás para mover el peso, bajá la carga.',
      'Pausá un instante con la carga cerca del cuerpo y sentí la contracción de la espalda.',
      'Cuello largo y relajado: que los trapecios no roben el trabajo de los dorsales.',
      'Bajá la carga con control en toda la fase excéntrica, no la sueltes.',
    ],
  },
  pulldown: {
    title: 'Tip de dominadas / jalón',
    tips: [
      'Iniciá el movimiento bajando los hombros y juntando los omóplatos, después tirá con los codos al torso.',
      'Pecho arriba y mirada a la barra: llevá el esternón hacia la barra, no la pera.',
      'Evitá el balanceo: subí y bajá con control, sin patadas ni impulso.',
      'En la dominada con lastre, hacé recorrido completo: de brazos extendidos a mentón sobre la barra.',
      'Apretá los dorsales abajo del todo, como si quisieras "meter los codos en el bolsillo".',
    ],
  },
  hipthrust: {
    title: 'Tip de hip thrust / glúteo',
    tips: [
      'Mentón metido y costillas abajo: extendé desde la cadera, no arqueando la lumbar.',
      'Arriba, apretá los glúteos un segundo hasta que el cuerpo quede en línea de hombros a rodillas.',
      'Empujá con los talones y mantené las tibias verticales en el bloqueo.',
      'Buscá el rango completo: glúteo bien estirado abajo y máxima contracción arriba.',
    ],
  },
  lunge: {
    title: 'Tip de zancadas / unilateral',
    tips: [
      'Bajá vertical: la rodilla de adelante sobre el pie, el torso erguido. No te vayas hacia adelante.',
      'Empujá con el talón de la pierna delantera para subir y activar más el glúteo.',
      'Controlá el descenso: el trabajo unilateral pule desequilibrios, no es una carrera.',
      'Apretá el abdomen para no perder el equilibrio; mirá un punto fijo al frente.',
    ],
  },
  curl: {
    title: 'Tip de bíceps',
    tips: [
      'Codos pegados al cuerpo y quietos: si se van para adelante, entran los hombros y roban el trabajo.',
      'Subí con intención y bajá lento contando hasta dos: la fase negativa es donde más crece.',
      'No balancees el torso para levantar más kilos; mejor menos peso y técnica limpia.',
      'Apretá arriba un instante y estirá del todo abajo: rango completo, mejores resultados.',
    ],
  },
  core: {
    title: 'Tip de zona media',
    tips: [
      'El core se entrena resistiendo el movimiento, no haciendo fuerza con el cuello. Respirá y mantené.',
      'En la plancha, apretá glúteos y abdomen y formá una línea recta de la cabeza a los talones.',
      'Calidad sobre cantidad: 20 segundos perfectos valen más que un minuto temblando mal.',
      'Mantené las costillas abajo y la pelvis neutra; nada de panza para afuera.',
    ],
  },
  general: {
    title: 'Tip del coach',
    tips: [
      'La técnica primero, el peso después. La paciencia también es fuerza.',
      'Calentá lo justo y necesario: subí de a poco hasta el peso de trabajo, sin gastarte.',
      'Llevá registro de lo que hacés: lo que se mide, mejora. Anotá tus kilos y reps.',
      'Descansá entre series lo que pida el ejercicio: en fuerza, no tengas apuro.',
      'Dormir y comer bien entrenan tanto como la sala. La recuperación es parte del plan.',
      'Concentrate en el músculo que trabaja: la conexión mente-músculo hace la diferencia.',
    ],
  },
}

// move-key → pool key
const POOL_FOR: Record<string, keyof typeof POOLS> = {
  squat: 'squat', bench: 'bench', deadlift: 'deadlift', overhead: 'overhead', row: 'row',
  pulldown: 'pulldown', hipthrust: 'hipthrust', lunge: 'lunge', curl: 'curl',
  plank: 'core', crunch: 'core', rollout: 'core', stirpot: 'core',
  pushdown: 'general', generic: 'general',
}

const KEY = 'force.lastTip'

/** A coaching tip matched to today's Big One (by name), avoiding a repeat. */
export function coachTip(bigOneName?: string | null): CoachTip {
  const move = bigOneName ? pickMove(bigOneName, 'other') : 'generic'
  const pool = POOLS[POOL_FOR[move] ?? 'general']
  let last = -1
  try { last = parseInt(localStorage.getItem(KEY) || '-1', 10) } catch { /* ignore */ }
  let i = Math.floor((last + 1) % pool.tips.length)
  if (pool.tips.length > 1 && i === last) i = (i + 1) % pool.tips.length
  try { localStorage.setItem(KEY, String(i)) } catch { /* quota */ }
  return { title: pool.title, tip: pool.tips[i] }
}
