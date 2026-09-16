/**
 * One-time / occasional admin helpers — run from the Apps Script editor on the
 * gym account. They build the per-client access tokens + magic links + QR codes,
 * WITHOUT changing how coaches organize Clientes/<name>/.
 */

var APP_URL = 'https://matiasr95.github.io/force-app/' // the deployed PWA

/**
 * Scan Clientes/ and (re)build TWO tabs from one pass:
 *   • `clientes`  (machine-readable, the backend reads this): token | nombre | folderId | link | qr | genero | clientId
 *   • `compartir` (staff-facing, pretty): NOMBRE | QR | LINK DE ACCESO | COMPARTIR
 * Existing tokens AND the two staff-set columns are preserved so links stay valid and
 * hand-typed data survives: `genero` (M/F — the records board trusts only this) and
 * `clientId` (the join to `Clients.ClientID` in the payments sheet). New clients get a
 * fresh token and both columns empty for staff to fill in.
 * Run this whenever you add/rename a member. Day-to-day, employees only ever open the
 * `compartir` tab — the QR shows as an image and "Enviar por WhatsApp" opens a chat with
 * the personal link + install tip already written.
 */
function rebuildClientConfig() {
  var clientes = DriveApp.getFolderById(CLIENTES_FOLDER_ID)
  var config = SpreadsheetApp.openById(CONFIG_SHEET_ID)
  var sheet = config.getSheetByName('clientes') || config.insertSheet('clientes')

  // index existing token + genero + clientId by folderId so we don't regenerate/lose
  // them. `clientId` is the join to the payments sheet (`Clients.ClientID`) and is
  // typed in BY HAND: forgetting it here would wipe the whole mapping on the next
  // "agregué un socio" run, exactly like the genero column it sits next to.
  var existing = {}
  var cur = sheet.getDataRange().getValues()
  for (var i = 1; i < cur.length; i++) {
    existing[cur[i][2]] = { token: cur[i][0], genero: cur[i][5] || '', clientId: cur[i][6] || '' }
  }

  // collect + sort by name so both tabs are easy to scan
  var clients = []
  var folders = clientes.getFolders()
  while (folders.hasNext()) {
    var f = folders.next()
    clients.push({ id: f.getId(), name: f.getName() })
  }
  clients.sort(function (a, b) { return a.name.localeCompare(b.name, 'es') })

  var dataRows = [['token', 'nombre', 'folderId', 'link', 'qr', 'genero', 'clientId']]
  for (var k = 0; k < clients.length; k++) {
    var c = clients[k]
    var prev = existing[c.id] || {}
    var token = prev.token || newToken_()
    var link = APP_URL + '?t=' + encodeURIComponent(token)
    var qr = qrUrl_(link)
    dataRows.push([token, c.name, c.id, link, qr, prev.genero || '', prev.clientId || ''])
  }
  sheet.clearContents()
  sheet.getRange(1, 1, dataRows.length, 7).setValues(dataRows)

  buildCompartirTab_(config, dataRows)
  Logger.log('Config actualizada: ' + (dataRows.length - 1) + ' clientes (tabs: clientes + compartir)')
}

/** Build/refresh the staff-facing `compartir` tab: rendered QR + one-tap WhatsApp share. */
function buildCompartirTab_(config, dataRows) {
  var sh = config.getSheetByName('compartir') || config.insertSheet('compartir')
  sh.clear()

  // The QR is an =IMAGE formula (single argument — locale-safe). The WhatsApp
  // button is a RICH TEXT link, not a HYPERLINK formula: es-AR sheets expect ";"
  // as the formula separator and a comma-separated HYPERLINK written as a value
  // shows "Error de análisis de fórmula". A rich-text link needs no parsing at all.
  var out = [['NOMBRE', 'QR', 'LINK DE ACCESO', 'COMPARTIR']]
  var qrFormulas = []
  var waLinks = []
  for (var i = 1; i < dataRows.length; i++) {
    var nombre = dataRows[i][1]
    var link = dataRows[i][3]
    var qr = dataRows[i][4]
    out.push([nombre, '', link, ''])
    qrFormulas.push(['=IMAGE("' + qr + '")'])
    waLinks.push([
      SpreadsheetApp.newRichTextValue()
        .setText('Enviar por WhatsApp')
        .setLinkUrl(waShareUrl_(nombre, link))
        .build(),
    ])
  }
  sh.getRange(1, 1, out.length, 4).setValues(out)
  if (qrFormulas.length) {
    sh.getRange(2, 2, qrFormulas.length, 1).setFormulas(qrFormulas)
    sh.getRange(2, 4, waLinks.length, 1).setRichTextValues(waLinks)
  }

  // formatting: readable header, QR big enough to scan, frozen header
  sh.setFrozenRows(1)
  sh.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#111111').setFontColor('#C6AE78')
  sh.setColumnWidth(1, 190) // NOMBRE
  sh.setColumnWidth(2, 120) // QR
  sh.setColumnWidth(3, 360) // LINK
  sh.setColumnWidth(4, 190) // COMPARTIR
  if (out.length > 1) {
    sh.setRowHeights(2, out.length - 1, 110) // room for the QR image
    sh.getRange(2, 1, out.length - 1, 4).setVerticalAlignment('middle')
    sh.getRange(2, 1, out.length - 1, 1).setFontSize(12).setFontWeight('bold')
  }
  // move it to the front so employees land on it first
  config.setActiveSheet(sh)
  config.moveActiveSheet(1)
}

/** Print each client's magic link + QR URL to the log (optional bulk dump). */
function listMagicLinks() {
  var rows = SpreadsheetApp.openById(CONFIG_SHEET_ID).getSheetByName('clientes').getDataRange().getValues()
  for (var i = 1; i < rows.length; i++) {
    var nombre = rows[i][1]
    var link = APP_URL + '?t=' + encodeURIComponent(rows[i][0])
    Logger.log(nombre + '\n  link: ' + link + '\n  qr:   ' + qrUrl_(link) + '\n')
  }
}

function qrUrl_(link) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=8&data=' + encodeURIComponent(link)
}

/** A WhatsApp "click to share" link with a friendly, on-brand message pre-written.
 *  wa.me with no number lets the employee pick the client's chat, message ready to send. */
function waShareUrl_(nombre, link) {
  var msg =
    '¡Hola ' + nombre + '! 💪 Este es tu acceso personal a FORCE — Mi Rutina:\n' +
    link + '\n\n' +
    '📲 En iPhone: abrí el link en Safari, tocá Compartir y elegí "Agregar a inicio" para tenerlo como app.\n' +
    '¡A entrenar con fuerza!'
  return 'https://wa.me/?text=' + encodeURIComponent(msg)
}

function newToken_() {
  // short, URL-safe, hard to guess
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16)
}

// ---- pagos: llenar la columna `clientid` -----------------------------------
// El tab `clientes` se arma con el NOMBRE DE LA CARPETA de Drive, que son apodos y
// diminutivos, y la planilla de pagos usa el nombre completo, con erratas en los
// apellidos de los dos lados. Cruzar por nombre EN VIVO no se hace nunca: un match
// equivocado le dice a alguien que está al día que debe plata. Así que se cruza una
// sola vez, acá, y queda escrito el `ClientID` en el tab.
//
// Esta función solo propone lo que está fuera de duda y DEJA EN BLANCO lo ambiguo,
// que sale listado en el log para que lo cargues a mano. Es idempotente y nunca pisa
// una celda ya cargada: podés correrla las veces que quieras.

/** Apodos que no comparten prefijo con el nombre real. */
var APODOS = {
  nacho: 'ignacio', pepe: 'jose', pancho: 'francisco', lucho: 'luis',
  tincho: 'martin', charly: 'carlos', beto: 'alberto', cacho: 'carlos',
  coty: 'constanza', tato: 'roberto', pipa: 'felipe', chino: 'juan',
  colo: 'nicolas', moni: 'monica', tita: 'maria', kuki: 'maria',
}

function backfillClientIds() {
  var config = SpreadsheetApp.openById(CONFIG_SHEET_ID)
  var sh = config.getSheetByName('clientes')
  var rows = sh.getDataRange().getValues()
  var col = headerIndex_(rows[0], 'clientid')
  if (col < 0) throw new Error('Falta la columna `clientid` en el tab `clientes`.')

  // socios de la planilla de pagos (ClientID + nombre completo)
  var cl = SpreadsheetApp.openById(PAGOS_SHEET_ID).getSheetByName('Clients').getDataRange().getValues()
  var cId = headerIndex_(cl[0], 'clientid')
  var cName = headerIndex_(cl[0], 'nombreapellido')
  var socios = []
  for (var i = 1; i < cl.length; i++) {
    if (cl[i][cId] && cl[i][cName]) socios.push({ id: String(cl[i][cId]), nombre: String(cl[i][cName]) })
  }

  // Se puntúa TODO contra TODO y se asigna de mayor a menor puntaje, no en el orden
  // de la hoja. Asignando por filas, un match flojo que aparece antes le robaba el
  // ClientID al dueño real: un socio con nombre exacto se quedaba sin asignar porque
  // otra fila ya había reclamado su id. El que puntúa más alto se lo queda, siempre.
  var usados = {}, yaEstaban = 0
  for (var r = 1; r < rows.length; r++) {
    if (rows[r][col]) { usados[String(rows[r][col])] = true; yaEstaban++ }
  }

  var candidatos = []
  for (var r2 = 1; r2 < rows.length; r2++) {
    var nombreApp = String(rows[r2][1] || '')
    if (!nombreApp || rows[r2][col]) continue          // vacía o ya cargada: no se toca
    var m = mejorSocio_(nombreApp, socios)
    m.fila = r2 + 1
    m.nombreApp = nombreApp
    candidatos.push(m)
  }
  candidatos.sort(function (a, b) { return b.score - a.score })

  var escritos = 0, ambiguos = [], sinMatch = []
  for (var k = 0; k < candidatos.length; k++) {
    var c = candidatos[k]
    if (c.confianza === 'sin match') { sinMatch.push(c.nombreApp); continue }
    if (c.confianza === 'revisar') { ambiguos.push(c.nombreApp + ' → ' + c.nombre + ' (' + c.score.toFixed(2) + ')'); continue }
    if (usados[c.id]) { ambiguos.push(c.nombreApp + ' → ' + c.nombre + ' (ese socio ya quedó para otra cuenta)'); continue }
    sh.getRange(c.fila, col + 1).setValue(c.id)
    usados[c.id] = true
    escritos++
  }

  Logger.log('clientid escritos: ' + escritos + ' | ya estaban cargados: ' + yaEstaban)
  Logger.log('AMBIGUOS (cargalos a mano): ' + (ambiguos.length ? ambiguos.join('  ·  ') : 'ninguno'))
  Logger.log('SIN SOCIO en Clients (normal, quedan vacios): ' + sinMatch.length + '  ·  ' + sinMatch.join(', '))
}

/** Índice de una columna por nombre de encabezado, sin importar mayúsculas ni acentos. */
function headerIndex_(header, nombre) {
  for (var i = 0; i < header.length; i++) {
    if (normNombre_(String(header[i])).replace(/ /g, '') === nombre) return i
  }
  return -1
}

function normNombre_(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // saca acentos
    .replace(/[^A-Za-z ]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Similitud 0..1 por distancia de edición. */
function similitud_(a, b) {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  var prev = [], cur = []
  for (var j = 0; j <= b.length; j++) prev[j] = j
  for (var i = 1; i <= a.length; i++) {
    cur[0] = i
    for (var j2 = 1; j2 <= b.length; j2++) {
      var costo = a.charAt(i - 1) === b.charAt(j2 - 1) ? 0 : 1
      cur[j2] = Math.min(cur[j2 - 1] + 1, prev[j2] + 1, prev[j2 - 1] + costo)
    }
    prev = cur.slice()
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length)
}

/** ¿Es el mismo nombre de pila, contando el apodo que usan los coaches?
 *  Un prefijo alcanza (Ro/Rosario, Cande/Candela), más los apodos irregulares. */
function mismoNombre_(a, b) {
  a = APODOS[a] || a
  b = APODOS[b] || b
  if (a === b) return 1
  var comun = 0
  while (comun < a.length && comun < b.length && a.charAt(comun) === b.charAt(comun)) comun++
  var corto = Math.min(a.length, b.length)
  if (comun === corto && corto >= 2) return 0.9   // el corto es prefijo del largo
  if (comun >= 3) return 0.85                     // comparten las primeras 3 letras
  return similitud_(a, b)
}

/** El socio más parecido, con el nivel de confianza.
 *
 *  Decide con DOS factores separados, no con un puntaje mezclado: el apellido tiene
 *  piso propio. Un promedio ponderado llegó a cruzar dos apellidos que no se parecen
 *  en nada, solo porque no había ningún competidor cerca. Y un ClientID equivocado es justo el error que no podemos cometer: le
 *  muestra a un socio la cuota de otro. */
function mejorSocio_(nombreApp, socios) {
  var nt = normNombre_(nombreApp).split(' ')
  var mejor = { score: 0, sur: 0, pila: 0, id: '', nombre: '', confianza: 'sin match' }
  var segundo = 0
  for (var i = 0; i < socios.length; i++) {
    var ct = normNombre_(socios[i].nombre).split(' ')
    if (!ct.length || !nt.length) continue
    var sur, pila
    if (nt.length === 1 || ct.length === 1) {
      // solo nombre de pila de un lado ("Belu", "Nico"): nunca alcanza para decidir
      sur = 0
      pila = mismoNombre_(ct[0], nt[0])
    } else {
      // apellido tolerante a erratas: una letra doble de más, un espacio de menos
      sur = Math.max(
        similitud_(ct[ct.length - 1], nt[nt.length - 1]),
        similitud_(ct.slice(-2).join(''), nt.slice(-2).join(''))
      )
      pila = mismoNombre_(ct[0], nt[0])
    }
    var s = sur * 0.7 + pila * 0.3
    if (s > mejor.score) {
      segundo = mejor.score
      mejor = { score: s, sur: sur, pila: pila, id: socios[i].id, nombre: socios[i].nombre, confianza: '' }
    } else if (s > segundo) segundo = s
  }
  mejor.confianza =
    (mejor.sur >= 0.86 && mejor.pila >= 0.8) ? 'alta'
      : (mejor.sur >= 0.70 && mejor.pila >= 0.8 && mejor.score - segundo > 0.04) ? 'media'
        : mejor.score >= 0.62 ? 'revisar'
          : 'sin match'
  return mejor
}

/**
 * Prueba `getPago_` con socios reales SIN que ningún token salga de la planilla:
 * toma los tokens del tab `clientes` acá adentro y solo loguea el resultado.
 * Correla desde el editor y mirá Ver → Registro.
 */
function probarPagos() {
  var rows = SpreadsheetApp.openById(CONFIG_SHEET_ID).getSheetByName('clientes').getDataRange().getValues()
  var col = headerIndex_(rows[0], 'clientid')
  var probados = 0
  for (var i = 1; i < rows.length && probados < 8; i++) {
    if (!rows[i][col]) continue                     // sin clientid no hay nada que probar
    var r
    try { r = getPago_(rows[i][0]) } catch (e) { r = { error: String(e) } }
    // el nombre sí, el token NUNCA
    Logger.log(rows[i][1] + '  →  ' + JSON.stringify(r))
    probados++
  }
  if (!probados) Logger.log('Ningún socio tiene `clientid` cargado.')
}
