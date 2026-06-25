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
    if (action === 'getRecords') return json(getRecords_(e.parameter.token))
    if (action === 'getStreaks') return json(getStreaks_(e.parameter.token))
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
    if (body.action === 'postRecord') return json(postRecord_(body.token, body.entry))
    if (body.action === 'postStreak') return json(postStreak_(body.token, body.entry))
    if (body.action === 'updateCells') return json(updateCells_(body.token, body.cells))
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
  var file = currentRoutineFile_(folder)
  if (!file) return { title: 'Sin rutina', values: [] }
  var r = allTabRows_(file.getId())
  return { title: file.getName(), values: r.values }
}

/**
 * Concatenate EVERY tab of the routine spreadsheet into one 2D array. Many plans
 * (especially powerlifting) put one training day per tab, so reading only the
 * first tab would show just Día 1.
 *
 * A day tab may carry its "DÍA N" marker in a cell (column A) OR only in its TAB
 * NAME ("Día 1", "Lunes", "Push") with no in-cell marker — and the first tab is
 * often a summary with no exercises at all. To make every shape render, for any
 * tab that has real exercise rows but NO in-cell "DÍA N" marker we PREPEND a
 * synthetic "DÍA N" row (N from the tab name, else a running counter). Tabs with
 * no exercises (a summary) are left untouched so their meta still flows through.
 *
 * Returns per-tab row counts (`sizes`, INCLUDING any synthetic row) so writeback
 * can map an absolute stitched row back to its tab, and `injected[i]` = how many
 * synthetic rows tab i got, so the local row can be shifted back to the real cell.
 */
function allTabRows_(fileId) {
  var sheets = SpreadsheetApp.openById(fileId).getSheets()
  var values = [], sizes = [], injected = []
  var counter = 0
  for (var i = 0; i < sheets.length; i++) {
    var v = sheets[i].getLastRow() ? sheets[i].getDataRange().getValues() : []
    var inj = 0
    if (v.length && !hasInCellDayMarker_(v) && hasExerciseRow_(v)) {
      counter++
      var n = tabDayNumber_(sheets[i].getName(), counter)
      v = [['DÍA ' + n, '', '', '', '']].concat(v)
      inj = 1
    } else if (hasInCellDayMarker_(v)) {
      counter++ // keep the running counter aligned with day tabs
    }
    injected.push(inj)
    sizes.push(v.length)
    for (var j = 0; j < v.length; j++) values.push(v[j])
  }
  return { values: values, sizes: sizes, sheets: sheets, injected: injected }
}

/** True if any row carries an in-cell "DÍA N" marker in column A. */
function hasInCellDayMarker_(rows) {
  for (var i = 0; i < rows.length; i++) {
    if (/^\s*d[ií]a\s*\d+/i.test(String(rows[i][0] || ''))) return true
  }
  return false
}

/** True if the tab has at least one exercise-like row (col B filled, not the header). */
function hasExerciseRow_(rows) {
  for (var i = 0; i < rows.length; i++) {
    var b = String(rows[i][1] || '').trim()
    if (b && b.toLowerCase() !== 'ejercicio') return true
  }
  return false
}

/** Day number for a tab: a number in the tab name, else the running fallback. */
function tabDayNumber_(name, fallback) {
  var m = String(name || '').toLowerCase().match(/d[ií]a\s*(\d+)|d[ií]a(\d+)|\bd(\d+)\b|(\d+)/)
  if (m) return parseInt(m[1] || m[2] || m[3] || m[4], 10)
  return fallback
}

/**
 * The "current" routine = the single spreadsheet directly inside the client
 * folder (NOT inside Historial/). If several exist, the most recently modified.
 *
 * CRITICAL: the per-client "Seguimiento — …" log sheet lives in this same folder
 * and is re-written every time the member trains, so by modified-date it would
 * outrank the routine and get served as the plan (member then sees the raw log:
 * rows like "set | d1-1 | …"). Skip it — and the gym-wide records/rachas sheets
 * if they ever land here — so only an actual routine can be chosen.
 */
function currentRoutineFile_(folder) {
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS)
  var best = null
  while (files.hasNext()) {
    var f = files.next()
    if (isNonRoutineFile_(f.getName())) continue
    if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f
  }
  return best
}

/** App-managed sheets that must never be mistaken for a routine. */
function isNonRoutineFile_(name) {
  var n = String(name || '').trim().toLowerCase()
  return n.indexOf('seguimiento') === 0 || n === 'records' || n === 'rachas'
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

// ---- updateCells: overwrite prescription cells in the routine sheet -------
// The member edits what they actually did; per the product decision these
// OVERWRITE the matching cell in their current routine sheet. We log the prior
// value to Seguimiento first so the coach's original number stays recoverable.
// cells = [ { row, col, value } ]  (0-based row/col, matching the parsed array).
function updateCells_(token, cells) {
  var c = clientFor_(token)
  var folder = DriveApp.getFolderById(c.folderId)
  var file = currentRoutineFile_(folder)
  if (!file) return { error: 'sin rutina' }
  var r = allTabRows_(file.getId())
  var sheets = r.sheets, sizes = r.sizes, injected = r.injected || []
  var log = []
  var written = 0
  ;(cells || []).forEach(function (w) {
    if (w == null || w.row == null || w.col == null) return
    // the app sends an absolute row across the stitched tabs — map it back to
    // its tab + local row so we overwrite the right cell.
    var abs = w.row, ti = 0
    while (ti < sizes.length && abs >= sizes[ti]) { abs -= sizes[ti]; ti++ }
    if (ti >= sheets.length) return
    // shift back over any synthetic "DÍA N" row we prepended to this tab; a write
    // that lands on the synthetic row itself isn't a real cell — skip it.
    abs -= (injected[ti] || 0)
    if (abs < 0) return
    var cell = sheets[ti].getRange(abs + 1, w.col + 1) // Apps Script is 1-based
    var prev = cell.getValue()
    if (String(prev) === String(w.value)) return
    cell.setValue(w.value)
    written++
    log.push([new Date(), 'cell', '', 't' + ti + 'r' + abs + 'c' + w.col, '', '', '', 'antes: "' + prev + '" → "' + w.value + '"'])
  })
  if (log.length) {
    try {
      var ss = seguimientoSheet_(folder, c.nombre)
      var sh = ss.getSheets()[0]
      sh.getRange(sh.getLastRow() + 1, 1, log.length, log[0].length).setValues(log)
    } catch (err) { /* logging is best-effort */ }
  }
  return { ok: true, written: written }
}

// ---- records (gym-wide PRs) -----------------------------------------------
// Stored in a "records" tab of the CONFIG spreadsheet: id | client | gender |
// lift | kg | reps | ts. Members submit only after hitting the mark.
function recordsSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID)
  var sh = ss.getSheetByName('records')
  if (!sh) {
    sh = ss.insertSheet('records')
    sh.appendRow(['id', 'client', 'gender', 'lift', 'kg', 'reps', 'ts', 'wc'])
  }
  return sh
}

function getRecords_(token) {
  clientFor_(token) // authorize
  var rows = recordsSheet_().getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[0]) continue
    out.push({ id: String(r[0]), client: r[1], gender: r[2], lift: r[3], kg: Number(r[4]), reps: Number(r[5]), ts: String(r[6]), wc: r[7] ? String(r[7]) : '' })
  }
  return out
}

function postRecord_(token, entry) {
  clientFor_(token)
  if (!entry || !entry.lift) return { error: 'invalid entry' }
  recordsSheet_().appendRow([
    entry.id || Utilities.getUuid(), entry.client, entry.gender, entry.lift,
    entry.kg, entry.reps, entry.ts || new Date().toISOString(), entry.wc || '',
  ])
  return { ok: true }
}

// ---- streak board (gym-wide, weeks) ---------------------------------------
// Stored in a "rachas" tab of CONFIG: client | weeks | max | ts (one row/client).
function streaksSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID)
  var sh = ss.getSheetByName('rachas')
  if (!sh) { sh = ss.insertSheet('rachas'); sh.appendRow(['client', 'weeks', 'max', 'ts']) }
  return sh
}

function getStreaks_(token) {
  clientFor_(token)
  var rows = streaksSheet_().getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue
    out.push({ client: rows[i][0], weeks: Number(rows[i][1]), max: Number(rows[i][2]) })
  }
  return out
}

function postStreak_(token, entry) {
  clientFor_(token)
  if (!entry) return { error: 'invalid' }
  var sh = streaksSheet_()
  var rows = sh.getDataRange().getValues()
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === entry.client) { // upsert: keep the best historical max
      sh.getRange(i + 1, 2, 1, 3).setValues([[entry.weeks, Math.max(Number(rows[i][2]) || 0, entry.max), new Date().toISOString()]])
      return { ok: true }
    }
  }
  sh.appendRow([entry.client, entry.weeks, entry.max, new Date().toISOString()])
  return { ok: true }
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
