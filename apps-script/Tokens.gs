/**
 * One-time / occasional admin helpers — run from the Apps Script editor on the
 * gym account. They build the per-client access tokens + magic links + QR codes,
 * WITHOUT changing how coaches organize Clientes/<name>/.
 */

var APP_URL = 'https://matiasr95.github.io/force-app/' // the deployed PWA

/**
 * Scan Clientes/ and (re)build TWO tabs from one pass:
 *   • `clientes`  (machine-readable, the backend reads this): token | nombre | folderId | link | qr
 *   • `compartir` (staff-facing, pretty): NOMBRE | QR | LINK DE ACCESO | COMPARTIR
 * Existing tokens are preserved so links stay valid; new clients get a fresh token.
 * Run this whenever you add/rename a member. Day-to-day, employees only ever open the
 * `compartir` tab — the QR shows as an image and "Enviar por WhatsApp" opens a chat with
 * the personal link + install tip already written.
 */
function rebuildClientConfig() {
  var clientes = DriveApp.getFolderById(CLIENTES_FOLDER_ID)
  var config = SpreadsheetApp.openById(CONFIG_SHEET_ID)
  var sheet = config.getSheetByName('clientes') || config.insertSheet('clientes')

  // index existing tokens by folderId so we don't regenerate them (links stay valid)
  var existing = {}
  var cur = sheet.getDataRange().getValues()
  for (var i = 1; i < cur.length; i++) existing[cur[i][2]] = cur[i][0]

  // collect + sort by name so both tabs are easy to scan
  var clients = []
  var folders = clientes.getFolders()
  while (folders.hasNext()) {
    var f = folders.next()
    clients.push({ id: f.getId(), name: f.getName() })
  }
  clients.sort(function (a, b) { return a.name.localeCompare(b.name, 'es') })

  var dataRows = [['token', 'nombre', 'folderId', 'link', 'qr']]
  for (var k = 0; k < clients.length; k++) {
    var c = clients[k]
    var token = existing[c.id] || newToken_()
    var link = APP_URL + '?t=' + encodeURIComponent(token)
    var qr = qrUrl_(link)
    dataRows.push([token, c.name, c.id, link, qr])
  }
  sheet.clearContents()
  sheet.getRange(1, 1, dataRows.length, 5).setValues(dataRows)

  buildCompartirTab_(config, dataRows)
  Logger.log('Config actualizada: ' + (dataRows.length - 1) + ' clientes (tabs: clientes + compartir)')
}

/** Build/refresh the staff-facing `compartir` tab: rendered QR + one-tap WhatsApp share. */
function buildCompartirTab_(config, dataRows) {
  var sh = config.getSheetByName('compartir') || config.insertSheet('compartir')
  sh.clear()

  var out = [['NOMBRE', 'QR', 'LINK DE ACCESO', 'COMPARTIR']]
  for (var i = 1; i < dataRows.length; i++) {
    var nombre = dataRows[i][1]
    var link = dataRows[i][3]
    var qr = dataRows[i][4]
    out.push([
      nombre,
      '=IMAGE("' + qr + '")',
      link,
      '=HYPERLINK("' + waShareUrl_(nombre, link) + '","Enviar por WhatsApp")',
    ])
  }
  sh.getRange(1, 1, out.length, 4).setValues(out)

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
