/**
 * FORCE — Routine App backend (Google Apps Script).
 *
 * Deploy this on the GYM Google account (forcebyaurus@gmail.com), which owns the
 * `Clientes/` folder. No API keys needed — Apps Script runs as the account.
 *
 * Deploy → New deployment → Web app:
 *   - Execute as: Me (the gym account)
 *   - Who has access: Anyone
 * Copy the /exec URL into the app's VITE_FORCE_API env var.
 *
 * Endpoints (GET ?action=...):
 *   getRoutine&token=...   → { title, values }     (current sheet as 2D array)
 *   getHistory&token=...   → [ { id, title } ]      (past cycles in Historial/)
 * POST (JSON body):
 *   { action:'logInput', token, items:[...] }       → appends to Seguimiento
 *
 * Config: a spreadsheet (CONFIG_SHEET_ID) with a "clientes" tab:
 *   token | nombre | folderId
 * Tokens are opaque per-client strings (also encoded in the magic link / QR).
 */

// ---- CONFIG (fill these once on the gym account) --------------------------
var CONFIG_SHEET_ID = 'PUT_CONFIG_SPREADSHEET_ID_HERE'
var CLIENTES_FOLDER_ID = 'PUT_CLIENTES_FOLDER_ID_HERE' // optional; for name-based fallback

// ---- routing --------------------------------------------------------------
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || ''
  try {
    if (action === 'getRoutine') return json(getRoutine_(e.parameter.token))
    if (action === 'getHistory') return json(getHistory_(e.parameter.token))
    if (action === 'ping') return json({ ok: true })
    return json({ error: 'unknown action: ' + action }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    if (body.action === 'logInput') return json(logInput_(body.token, body.items))
    return json({ error: 'unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
}

function json(obj, code) {
  var out = ContentService.createTextOutput(JSON.stringify(obj))
  out.setMimeType(ContentService.MimeType.JSON)
  return out // Apps Script web apps can't set status codes; errors carry an `error` field
}

// ---- client resolution ----------------------------------------------------
function clientFor_(token) {
  if (!token) throw new Error('missing token')
  var sh = SpreadsheetApp.openById(CONFIG_SHEET_ID).getSheetByName('clientes')
  var rows = sh.getDataRange().getValues()
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(token).trim()) {
      return { token: token, nombre: rows[i][1], folderId: rows[i][2] }
    }
  }
  throw new Error('token no reconocido')
}

// ---- getRoutine: find the current (loose) sheet in the client folder ------
function getRoutine_(token) {
  var c = clientFor_(token)
  var folder = DriveApp.getFolderById(c.folderId)
  var sheet = currentRoutineFile_(folder)
  if (!sheet) return { title: 'Sin rutina', values: [] }
  var ss = SpreadsheetApp.openById(sheet.getId())
  var values = ss.getSheets()[0].getDataRange().getValues() // first tab
  return { title: sheet.getName(), values: values }
}

/**
 * The "current" routine = the single spreadsheet directly inside the client
 * folder (NOT inside Historial/). If several exist, the most recently modified.
 */
function currentRoutineFile_(folder) {
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS)
  var best = null
  while (files.hasNext()) {
    var f = files.next()
    if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f
  }
  return best
}

function getHistory_(token) {
  var c = clientFor_(token)
  var folder = DriveApp.getFolderById(c.folderId)
  var hist = folder.getFoldersByName('Historial')
  var out = []
  if (hist.hasNext()) {
    var files = hist.next().getFilesByType(MimeType.GOOGLE_SHEETS)
    while (files.hasNext()) {
      var f = files.next()
      out.push({ id: f.getId(), title: f.getName() })
    }
  }
  return out
}

// ---- logInput: append client inputs to a Seguimiento sheet ----------------
function logInput_(token, items) {
  var c = clientFor_(token)
  var folder = DriveApp.getFolderById(c.folderId)
  var ss = seguimientoSheet_(folder, c.nombre)
  var sheet = ss.getSheets()[0]
  var rows = (items || []).map(function (it) {
    var p = it.payload || {}
    return [
      it.ts || new Date(),
      it.kind,
      p.dayId || '',
      p.exerciseId || '',
      p.actualKg != null ? p.actualKg : '',
      p.actualReps != null ? p.actualReps : '',
      p.rpe != null ? p.rpe : '',
      p.note || p.date || '',
    ]
  })
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows)
  return { ok: true, written: rows.length }
}

/** A per-client "Seguimiento" spreadsheet (created once, kept beside the routine). */
function seguimientoSheet_(folder, nombre) {
  var name = 'Seguimiento — ' + (nombre || 'Cliente')
  var existing = folder.getFilesByName(name)
  if (existing.hasNext()) return SpreadsheetApp.openById(existing.next().getId())
  var ss = SpreadsheetApp.create(name)
  // move it into the client folder
  var file = DriveApp.getFileById(ss.getId())
  folder.addFile(file)
  DriveApp.getRootFolder().removeFile(file)
  ss.getSheets()[0].appendRow(['timestamp', 'tipo', 'dia', 'ejercicio', 'kg_real', 'reps_real', 'rpe', 'nota'])
  return ss
}
