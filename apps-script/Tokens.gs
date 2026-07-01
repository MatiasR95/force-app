/**
 * One-time / occasional admin helpers — run from the Apps Script editor on the
 * gym account. They build the per-client access tokens + magic links + QR codes,
 * WITHOUT changing how coaches organize Clientes/<name>/.
 */

var APP_URL = 'https://matiasr95.github.io/force-app/' // the deployed PWA

/**
 * Scan Clientes/ and (re)build the config "clientes" tab:
 * token | nombre | folderId | link | qr.
 * Existing tokens are preserved so links stay valid; new clients get a fresh token.
 * `link` and `qr` are filled in directly so day-to-day sharing never needs the
 * script editor — just open the Config sheet and copy/paste from the row.
 */
function rebuildClientConfig() {
  var clientes = DriveApp.getFolderById(CLIENTES_FOLDER_ID)
  var config = SpreadsheetApp.openById(CONFIG_SHEET_ID)
  var sheet = config.getSheetByName('clientes') || config.insertSheet('clientes')

  // index existing tokens by folderId so we don't regenerate them
  var existing = {}
  var cur = sheet.getDataRange().getValues()
  for (var i = 1; i < cur.length; i++) existing[cur[i][2]] = cur[i][0]

  var rows = [['token', 'nombre', 'folderId', 'link', 'qr']]
  var folders = clientes.getFolders()
  while (folders.hasNext()) {
    var f = folders.next()
    var token = existing[f.getId()] || newToken_()
    var link = APP_URL + '?t=' + encodeURIComponent(token)
    var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=' + encodeURIComponent(link)
    rows.push([token, f.getName(), f.getId(), link, qr])
  }
  sheet.clearContents()
  sheet.getRange(1, 1, rows.length, 5).setValues(rows)
  Logger.log('Config actualizada: ' + (rows.length - 1) + ' clientes')
}

/** Print each client's magic link + a QR image URL (paste into a doc to share). */
function listMagicLinks() {
  var rows = SpreadsheetApp.openById(CONFIG_SHEET_ID).getSheetByName('clientes').getDataRange().getValues()
  for (var i = 1; i < rows.length; i++) {
    var token = rows[i][0]
    var nombre = rows[i][1]
    var link = APP_URL + '?t=' + encodeURIComponent(token)
    var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=' + encodeURIComponent(link)
    Logger.log(nombre + '\n  link: ' + link + '\n  qr:   ' + qr + '\n')
  }
}

function newToken_() {
  // short, URL-safe, hard to guess
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16)
}
