/**
 * One-time / occasional admin helpers — run from the Apps Script editor on the
 * gym account. They build the per-client access tokens + magic links + QR codes,
 * WITHOUT changing how coaches organize Clientes/<name>/.
 */

var APP_URL = 'https://matiasr95.github.io/force-app/' // the deployed PWA

/**
 * Scan Clientes/ and (re)build the config "clientes" tab: token | nombre | folderId.
 * Existing tokens are preserved so links stay valid; new clients get a fresh token.
 */
function rebuildClientConfig() {
  var clientes = DriveApp.getFolderById(CLIENTES_FOLDER_ID)
  var config = SpreadsheetApp.openById(CONFIG_SHEET_ID)
  var sheet = config.getSheetByName('clientes') || config.insertSheet('clientes')

  // index existing tokens by folderId so we don't regenerate them
  var existing = {}
  var cur = sheet.getDataRange().getValues()
  for (var i = 1; i < cur.length; i++) existing[cur[i][2]] = cur[i][0]

  var rows = [['token', 'nombre', 'folderId']]
  var folders = clientes.getFolders()
  while (folders.hasNext()) {
    var f = folders.next()
    var token = existing[f.getId()] || newToken_()
    rows.push([token, f.getName(), f.getId()])
  }
  sheet.clearContents()
  sheet.getRange(1, 1, rows.length, 3).setValues(rows)
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
