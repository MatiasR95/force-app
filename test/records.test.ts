import { describe, it, expect } from 'vitest'
import { matchRecordLift, recordKg, noteWeight, rankUnique, bestOf, sameClient } from '../src/lib/records'
import type { RecordEntry } from '../src/lib/records'
import { planPlates, groupPlates, DEFAULT_PLATES_KG, DEADLIFT_PLATES_KG, isDeadliftName } from '../src/lib/plates'

describe('matchRecordLift', () => {
  it('matches headline lifts', () => {
    expect(matchRecordLift('Press Plano')).toBe('press-banca')
    expect(matchRecordLift('Sentadillas Low Bar')).toBe('sentadilla')
    expect(matchRecordLift('Peso Muerto')).toBe('peso-muerto')
    expect(matchRecordLift('Peso Muerto Hexagonal')).toBe('peso-muerto-hex')
    expect(matchRecordLift('Peso Muerto Sumo')).toBe('peso-muerto-sumo')
    expect(matchRecordLift('Press Banca con Mancuernas')).toBe('press-banca-db')
    expect(matchRecordLift('Dominadas Pronadas')).toBe('dominadas')
    expect(matchRecordLift('Press Militar')).toBe('press-militar')
  })
  it('excludes non-record variations', () => {
    expect(matchRecordLift('Sentadilla Bulgara')).toBeNull()
    expect(matchRecordLift('Press Inclinado')).toBeNull()
    expect(matchRecordLift('Peso Muerto Rumano')).toBeNull()
    expect(matchRecordLift('Face Pull')).toBeNull()
  })
  it('excludes front squats and accessory overhead presses (real-sheet false records)', () => {
    expect(matchRecordLift('Front Squats')).toBeNull()
    expect(matchRecordLift('Sentadillas Frontales')).toBeNull()
    expect(matchRecordLift('Alternated Overhead press')).toBeNull()
    expect(matchRecordLift('Press Arnold Arrodillado')).toBeNull()
    expect(matchRecordLift('Press Hombros Sentado')).toBeNull()
    // the real records still match
    expect(matchRecordLift('Militar Press')).toBe('press-militar')
    expect(matchRecordLift('Sentadillas')).toBe('sentadilla')
  })
  it('maps "Press Hombros" to the military press but excludes KB/DB variants', () => {
    expect(matchRecordLift('Press Hombros')).toBe('press-militar')
    expect(matchRecordLift('Press de Hombros')).toBe('press-militar')
    expect(matchRecordLift('Press Hombros KB Sentado')).toBeNull()
    expect(matchRecordLift('Press Hombros KB')).toBeNull()
  })
  // The gym-wide audit: matchRecordLift run over the 192 exercise names the coaches
  // actually write. Three ways a name earned an exclusion (see the doc comment):
  // a different lift, a bar the app can't weigh, or resistance that isn't the bar.
  it('rejects single-limb work — doubling one arm invents a mark', () => {
    expect(matchRecordLift('Press Plano 1 Brazo')).toBeNull()
    expect(matchRecordLift('Press 1 Brazo')).toBeNull()
    expect(matchRecordLift('Peso Muerto hex split')).toBeNull()
    expect(matchRecordLift('Alternated Overhead press')).toBeNull()
    expect(matchRecordLift('Sentadilla 1 pie')).toBeNull()
  })

  it('rejects machines and specialty bars — the 20 kg bar is a fiction there', () => {
    // plate-loaded machine: detectImpl reads it as a barbell and adds a bar it hasn't got
    expect(matchRecordLift('Militar Hammer')).toBeNull()
    expect(matchRecordLift('Press Hombro Barra Suiza')).toBeNull()
    expect(matchRecordLift('Bench Press Barra Suiza')).toBeNull()
    // safety squat bar is 25-32 kg, not 20
    expect(matchRecordLift('Sentadillas SSB')).toBeNull()
    expect(matchRecordLift('Sentadillas SSB + 2"')).toBeNull()
  })

  it('rejects chains and bands — the logged weight is not the resistance', () => {
    expect(matchRecordLift('Press Plano + Cadenas')).toBeNull()
    expect(matchRecordLift('Peso Muerto + Bandas 5" Final')).toBeNull()
    expect(matchRecordLift('Peso Muerto +bandas')).toBeNull()
    expect(matchRecordLift('Peso Muerto Hex + Banda')).toBeNull()
    // a band on a pull-up ASSISTS: the member moved less than bodyweight, not more
    expect(matchRecordLift('Dominadas Pronas Banda')).toBeNull()
    expect(matchRecordLift('Dominadas Supinas c/banda')).toBeNull()
  })

  it('rejects squat variants that move the range or the loading axis', () => {
    expect(matchRecordLift('Sentadilla Hadfield')).toBeNull()   // the coach's spelling of Hatfield
    expect(matchRecordLift('Sentadilla Zecher')).toBeNull()
    expect(matchRecordLift('Sentadilla Ladmine')).toBeNull()
    expect(matchRecordLift('Sentadillas al banco 30 cm')).toBeNull()
    expect(matchRecordLift('Sentadilla cajon (40)')).toBeNull()
    expect(matchRecordLift('Sentadillas desde pines (n°21)')).toBeNull()
    expect(matchRecordLift('Sentadilla Abierta KB + Deficit')).toBeNull()
  })

  it('rejects pulls and presses with a different range or grip', () => {
    expect(matchRecordLift('Rack Pull debajo de rodilla')).toBeNull()
    expect(matchRecordLift('Peso Muerto Hex +Déficit')).toBeNull()
    expect(matchRecordLift('Peso Muerto Hex. + ROM')).toBeNull()
    expect(matchRecordLift('Press Plano Supinado')).toBeNull()
    expect(matchRecordLift('Press Cerrado')).toBeNull()
    expect(matchRecordLift('Press Plano Caos')).toBeNull()
    expect(matchRecordLift('Floor Press')).toBeNull()
  })

  it('KEEPS paused and tempo work — the lift and the kilos are real', () => {
    // 18 members train their big lifts with pauses; excluding them empties the board
    expect(matchRecordLift('Sentadillas + 1"')).toBe('sentadilla')
    expect(matchRecordLift('Sentadilla + 1¨')).toBe('sentadilla')
    expect(matchRecordLift('Press Plano TEMPO 3:2:0')).toBe('press-banca')
    expect(matchRecordLift('Peso Muerto + 1"')).toBe('peso-muerto')
    expect(matchRecordLift('Dominadas Supinas + 2"')).toBe('dominadas')
    // and high-bar is still a back squat, rings are still a pull-up
    expect(matchRecordLift('Sentadillas Barra Alta')).toBe('sentadilla')
    expect(matchRecordLift('Dominadas Anillas')).toBe('dominadas')
  })

  it("excludes English 'Romanian Deadlift' and dumbbell/wall squats (Matias's accessories)", () => {
    // Día 1 accessory — the exclusion listed only the Spanish "rumano", so the
    // English name slipped through and fired a false peso-muerto PR.
    expect(matchRecordLift('Romanian Deadlift')).toBeNull()
    expect(matchRecordLift('Romanian Deadlift')).not.toBe('peso-muerto')
    // Día 1 finisher — no dumbbell/wall exclusion existed in the squat branch.
    expect(matchRecordLift('Open Squat over Wall with DB')).toBeNull()
    expect(matchRecordLift('Sentadilla con Mancuernas')).toBeNull()
    // the real conventional lifts still capture
    expect(matchRecordLift('Deadlift')).toBe('peso-muerto')
    expect(matchRecordLift('Sentadillas')).toBe('sentadilla')
  })
})

describe('recordKg', () => {
  it('adds the bar for per-side barbell lifts', () => {
    expect(recordKg(27.5, true, true)).toBe(75)   // 27.5×2 + 20
    expect(recordKg(30, true, false)).toBe(60)     // dumbbells: 30×2, no bar
    expect(recordKg(100, false, false)).toBe(100)  // single total
  })
})

describe('noteWeight', () => {
  it('reads the actual weight from an observación', () => {
    expect(noteWeight('bajé a 25kg')).toBe(25)
    expect(noteWeight('subí a 30 kg')).toBe(30)
    expect(noteWeight('lo hice con 27,5kg')).toBe(27.5)
    expect(noteWeight('me molestó el hombro')).toBeNull()
    expect(noteWeight('')).toBeNull()
  })
})

// Salón de la fama: the board is a hall of fame, not a log — one row per person.
describe('rankUnique (one best mark per member)', () => {
  let n = 0
  const rec = (client: string, kg: number, reps: number, wc?: string): RecordEntry =>
    ({ id: `r${++n}`, client, gender: 'M', lift: 'sentadilla', kg, reps, ts: '2026-07-01T10:00:00Z', wc })

  it('collapses a member with several marks to their heaviest', () => {
    const board = rankUnique([rec('Juan', 100, 5), rec('Juan', 120, 3), rec('Juan', 110, 4)])
    expect(board).toHaveLength(1)
    expect(board[0].kg).toBe(120)
  })

  it('breaks a tie on kg by reps', () => {
    const board = rankUnique([rec('Juan', 120, 3), rec('Juan', 120, 6)])
    expect(board).toHaveLength(1)
    expect(board[0].reps).toBe(6)
  })

  it('treats accent/case/spacing variants as the same person', () => {
    const board = rankUnique([rec('Ana Gómez', 70, 5), rec('ana gomez', 80, 5), rec('ANA  GOMEZ', 75, 5)])
    expect(board).toHaveLength(1)
    expect(board[0].kg).toBe(80)
    expect(sameClient('Ana Gómez', 'ana  gomez')).toBe(true)
  })

  it('dedupes within a category, not across it', () => {
    const all = [rec('Juan', 100, 5, 'm71-83'), rec('Juan', 105, 5, 'm84-95'), rec('Pedro', 90, 5, 'm71-83')]
    // "Todas las categorías": Juan appears once, with his overall best
    const todas = rankUnique(all)
    expect(todas).toHaveLength(2)
    expect(todas[0].kg).toBe(105)
    // the -83 board still shows the mark he set in that category
    const cat = rankUnique(all.filter((e) => e.wc === 'm71-83'))
    expect(cat.map((e) => e.kg)).toEqual([100, 90])
  })

  it('ranks the member by people above them, not by their own duplicate marks', () => {
    const all = [
      rec('Juan', 140, 3), rec('Juan', 135, 4), rec('Juan', 130, 5),
      rec('Pedro', 120, 5), rec('Luis', 110, 5), rec('Nico', 100, 5),
    ]
    const board = rankUnique(all)
    const mine = bestOf(board, 'juan')
    expect(mine?.kg).toBe(140)
    expect(board.findIndex((e) => e.id === mine!.id) + 1).toBe(1)
    expect(board.map((e) => e.client)).toEqual(['Juan', 'Pedro', 'Luis', 'Nico'])
  })
})

describe('plate inventory (Jul 2026: full 20·15·10·5 + micros; no 25s)', () => {
  it('stocks 20 and 15 kg discs, never 25s', () => {
    expect(DEFAULT_PLATES_KG).toContain(20)
    expect(DEFAULT_PLATES_KG).toContain(15)
    expect(DEFAULT_PLATES_KG).not.toContain(25)
    const p = planPlates(27.5, 20, DEFAULT_PLATES_KG)
    expect(p.plates).toEqual([20, 5, 2.5]) // fewest discs
    expect(p.achievable).toBe(true)
  })
  it('loads a heavy deadlift with the fewest discs', () => {
    expect(DEADLIFT_PLATES_KG).toContain(20)
    expect(DEADLIFT_PLATES_KG).not.toContain(25)
    const p = planPlates(60, 20, DEADLIFT_PLATES_KG)
    expect(groupPlates(p.plates)).toEqual([{ kg: 20, count: 3 }])
  })
  it('supports micro plates for fine jumps', () => {
    const p = planPlates(0.5, 20, DEFAULT_PLATES_KG)
    expect(p.plates).toEqual([0.5])
  })
  it('detects deadlift names', () => {
    expect(isDeadliftName('Peso Muerto + 1"')).toBe(true)
    expect(isDeadliftName('Press Plano')).toBe(false)
  })
})

// Sweep of every exercise name the gym's coaches wrote (161 live routines, Sep 2026):
// these used to reach the board as the barbell lift.
describe('matchRecordLift — false records found in the Sep 2026 sweep', () => {
  it('reads the coaches\' dumbbell abbreviations as dumbbells', () => {
    expect(matchRecordLift('Press Plano MC')).toBe('press-banca-db')
    expect(matchRecordLift('Press Plano Manc')).toBe('press-banca-db')
    expect(matchRecordLift('Press Plano Macuernas + 2"')).toBe('press-banca-db')
    expect(matchRecordLift('Press Militar MC')).toBeNull()
    expect(matchRecordLift('Press Hombros Manc')).toBeNull()
  })
  it('"alt" at the end of a name is still alternating (one arm at a time)', () => {
    expect(matchRecordLift('Press Plano Mancuerna alt.')).toBeNull()
    expect(matchRecordLift('Press Plano Mancuernas ALT')).toBeNull()
    expect(matchRecordLift('Press militar alt')).toBeNull()
    expect(matchRecordLift('Sentadillas Barra Alta')).toBe('sentadilla') // "alta" is not "alt"
  })
  it('squat variants that are not the back squat', () => {
    for (const n of ['Sentadilla Copa', 'Sentadilla en copa+1¨', 'Sentadilla cosaco carrito', 'Sentadilla Bombero',
      'Sentadilla Skater', 'Sentadilla con salto', 'Sentadilla lateral', 'Sentadilla Española', 'Sentadilla sobre FB',
      'Sentadilla Def', 'Pin Squat mas bajo', 'Swing + Squat', 'Swing+sentadilla'])
      expect(matchRecordLift(n), n).toBeNull()
    expect(matchRecordLift('Sentadilla TEMPO 3:2:0')).toBe('sentadilla') // tempo is kept on purpose
    expect(matchRecordLift('Sentadillas + 1"')).toBe('sentadilla')       // and so are pauses
  })
  it('bench, deadlift, pull-up and overhead variants', () => {
    for (const n of ['Press Plano + ⛓️‍💥', 'Press Plano Larsen', 'Press Plano Excentrico', 'Press Plano Neutro',
      'Peso Muerto KB Sumo', 'Peso Muerto Piernas Rigidas', 'Peso Muerto Hex.+défcit', 'Peso Muerto Hex. (Negra)',
      'Peso muerto sumo con despegue elevado.', 'Peso Muerto c/Kb', 'Dominada Supina Desde CAJON', 'Dominadas Asimetricas',
      'Dominadas Iso', 'Curl Martillo + Press Militar', 'Press hombro arodillado', 'Press hombro landmine', 'Press Militar Neutro'])
      expect(matchRecordLift(n), n).toBeNull()
    expect(matchRecordLift('Peso Muerto Hex.+1"')).toBe('peso-muerto-hex')
    expect(matchRecordLift('Peso Muerto c/pausa')).toBe('peso-muerto')
    expect(matchRecordLift('Dominadas Anillas Clusters')).toBe('dominadas')
  })
})
