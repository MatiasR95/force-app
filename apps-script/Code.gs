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
 *   token | nombre | folderId | link | qr | genero
 * Tokens are opaque per-client strings (also encoded in the magic link / QR).
 * `genero` (M/F) is set by staff and is the ONLY gender the records board trusts —
 * the client payload's self-declared gender is a fallback for rows not yet filled.
 */

// ---- CONFIG (fill these once on the gym account) --------------------------
var CONFIG_SHEET_ID = '1DFbuY-IHuyt61zK6RstqtBWvou28IlXFtRI2bsLqKQQ'
var CLIENTES_FOLDER_ID = '1-V8PAlzz4nmlPXB8IGiI1fM6ksX8D7aF' // optional; for name-based fallback
// The gym-news `novedades` tab lives in the CONFIG sheet by default. To instead
// manage it in another file (e.g. the staff "FORCE - Horarios" sheet), put that
// file's ID here AND share the file with the gym account so this script can read
// it. Leave '' to keep it in CONFIG_SHEET_ID.
var NOVEDADES_SHEET_ID = ''

// Where the coach-facing `Seguimiento` digest tab lives — ONE consolidated,
// human-readable log of every member comment/observation (client · fecha ·
// día · ejercicio · observación), so coaches don't have to open each client's
// per-client log and scroll past machine rows. Put the "FORCE - Horarios" file's
// ID here AND give the gym account EDIT access to that file. Leave '' to fall
// back to NOVEDADES_SHEET_ID, then to CONFIG_SHEET_ID.
var COACH_NOTES_SHEET_ID = ''

// ---- routing --------------------------------------------------------------
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || ''
  try {
    if (action === 'getRoutine') return json(getRoutine_(e.parameter.token))
    if (action === 'getHistory') return json(getHistory_(e.parameter.token))
    if (action === 'getRecords') return json(getRecords_(e.parameter.token))
    if (action === 'getStreaks') return json(getStreaks_(e.parameter.token))
    if (action === 'getNews') return json(getNews_(e.parameter.token))
    if (action === 'ping') return json({ ok: true })
    return json({ error: 'unknown action: ' + action }, 400)
  } catch (err) {
    return json({ error: errMsg_(err) }, 500)
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
    return json({ error: errMsg_(err) }, 500)
  }
}

// Errors we throw on purpose (bad/missing token) are meaningful to the member and
// safe to show. Anything else (Drive/Sheets internals) is logged server-side and
// replaced with a generic message so internals never reach the client.
var SAFE_ERRORS = ['missing token', 'token no reconocido']
function errMsg_(err) {
  var s = String((err && err.message) || err)
  for (var i = 0; i < SAFE_ERRORS.length; i++) {
    if (s.indexOf(SAFE_ERRORS[i]) >= 0) return s
  }
  try { console.error(s + ((err && err.stack) ? '\n' + err.stack : '')) } catch (e) { /* no-op */ }
  return 'No pudimos procesar el pedido. Probá de nuevo en unos minutos.'
}

function json(obj, code) {
  var out = ContentService.createTextOutput(JSON.stringify(obj))
  out.setMimeType(ContentService.MimeType.JSON)
  return out // Apps Script web apps can't set status codes; errors carry an `error` field
}

// ---- client resolution ----------------------------------------------------
// Positive lookups are cached 5 min so the config sheet isn't re-scanned on every
// call (every endpoint goes through here). Misses are NOT cached — a member added
// a minute ago must be able to open their fresh link right away.
function clientFor_(token) {
  if (!token) throw new Error('missing token')
  var cache = CacheService.getScriptCache()
  var key = 'client:' + token
  var hit = cache.get(key)
  if (hit) return JSON.parse(hit)
  var sh = SpreadsheetApp.openById(CONFIG_SHEET_ID).getSheetByName('clientes')
  var rows = sh.getDataRange().getValues()
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(token).trim()) {
      var c = { token: token, nombre: rows[i][1], folderId: rows[i][2], genero: normGender_(rows[i][5]) }
      try { cache.put(key, JSON.stringify(c), 300) } catch (e) { /* cache is best-effort */ }
      return c
    }
  }
  throw new Error('token no reconocido')
}

/** Normalize a staff-entered gender cell to 'M' / 'F' ('' if empty/unknown). */
function normGender_(v) {
  var s = String(v || '').trim().toUpperCase()
  if (s === 'M' || s === 'HOMBRE' || s === 'MASCULINO') return 'M'
  if (s === 'F' || s === 'MUJER' || s === 'FEMENINO') return 'F'
  return ''
}

// ---- getRoutine: find the current (loose) sheet in the client folder ------
function getRoutine_(token) {
  // Cached 90 s per member. Reading a routine costs 2–6 s (Drive scan + every tab);
  // at peak hour dozens of phones re-fetch within the same minute and would saturate
  // the 30-simultaneous-executions quota of the gym account. A cache hit is ~100 ms.
  var cache = CacheService.getScriptCache()
  var key = 'routine:' + token
  var hit = cache.get(key)
  if (hit) return JSON.parse(hit)
  var c = clientFor_(token)
  var folder = DriveApp.getFolderById(c.folderId)
  var file = currentRoutineFile_(folder)
  // include the client's canonical name so the app can greet them and attribute
  // their records to the real name (not the "Vos" fallback).
  var out
  if (!file) out = { title: 'Sin rutina', values: [], nombre: c.nombre }
  else {
    var r = allTabRows_(file.getId())
    out = { title: file.getName(), values: r.values, nombre: c.nombre }
  }
  try { cache.put(key, JSON.stringify(out), 90) } catch (e) { /* >100 KB: serve uncached */ }
  return out
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

/** True if any row carries an in-cell day marker in column A: "DÍA 1"/"DAY 1" or a
 *  weekday name ("SÁBADOS"/"LUNES"…) some coaches use instead. */
function hasInCellDayMarker_(rows) {
  var re = /^\s*(?:d[ií]a|day)\s*\d+|^\s*(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b/i
  for (var i = 0; i < rows.length; i++) {
    // marker is usually in col A but some coaches indent it into col B/C
    for (var col = 0; col < 3; col++) {
      if (re.test(String((rows[i] && rows[i][col]) || ''))) return true
    }
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

/** Day number for a tab: a number in the tab name ("Día 4", "Day 4", "D4", "4"), else fallback. */
function tabDayNumber_(name, fallback) {
  var m = String(name || '').toLowerCase().match(/d[ií]a\s*(\d+)|day\s*(\d+)|\bd(\d+)\b|(\d+)/)
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
  // Mirror the free-text comments into the gym-wide coach digest so coaches read
  // them all in one place. Best-effort: a digest hiccup must never fail the member's
  // sync (their input is already safely in the per-client sheet above).
  try { mirrorCoachNotes_(c.nombre, items) } catch (err) { /* digest is best-effort */ }
  return { ok: true, written: rows.length }
}

// ---- updateCells: overwrite prescription cells in the routine sheet -------
// The member edits what they actually did; per the product decision these
// OVERWRITE the matching cell in their current routine sheet. We log the prior
// value to Seguimiento first so the coach's original number stays recoverable.
// cells = [ { row, col, value, prev } ]  (0-based row/col, matching the parsed
// array). `prev` = the cell text the member's app parsed when it loaded: if the
// coach edited the sheet since (inserted a row, changed a number), the member's
// row index may now point at a DIFFERENT cell — the write is skipped and logged
// instead of silently corrupting the plan.
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
    if (w.prev != null && String(prev) !== String(w.prev)) {
      log.push([new Date(), 'cell-skip', '', 't' + ti + 'r' + abs + 'c' + w.col, '', '', '',
        'la celda cambió desde que el cliente cargó la rutina: la app esperaba "' + w.prev +
        '", hay "' + prev + '" — NO se escribió "' + w.value + '"'])
      return
    }
    cell.setValue(w.value)
    written++
    log.push([new Date(), 'cell', '', 't' + ti + 'r' + abs + 'c' + w.col, '', '', '', 'antes: "' + prev + '" → "' + w.value + '"'])
  })
  // the member should see their own edit on the next refresh, not a stale cache
  if (written) { try { CacheService.getScriptCache().remove('routine:' + token) } catch (e) { /* no-op */ } }
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
  // one shared 45 s cache for the whole gym — the board is identical for everyone
  // and the sheet only grows, so re-reading it per member per refresh is pure waste.
  var cache = CacheService.getScriptCache()
  var hit = cache.get('records')
  if (hit) return JSON.parse(hit)
  var rows = recordsSheet_().getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[0]) continue
    out.push({ id: String(r[0]), client: r[1], gender: r[2], lift: r[3], kg: Number(r[4]), reps: Number(r[5]), ts: String(r[6]), wc: r[7] ? String(r[7]) : '' })
  }
  try { cache.put('records', JSON.stringify(out), 45) } catch (e) { /* best-effort */ }
  return out
}

function postRecord_(token, entry) {
  // Identity comes from the TOKEN, never from the payload — otherwise any member
  // could plant records under someone else's name from devtools/localStorage.
  var c = clientFor_(token)
  if (!entry || !entry.lift) return { error: 'invalid entry' }
  var kg = Number(entry.kg), reps = Number(entry.reps)
  if (!isFinite(kg) || kg <= 0 || kg > 500) return { error: 'invalid entry' }
  if (!isFinite(reps) || reps < 1 || reps > 100) return { error: 'invalid entry' }
  // staff-set gender (clientes tab) wins; the device's self-declared gender is only
  // a fallback for rows staff hasn't filled yet.
  var gender = c.genero || normGender_(entry.gender)
  if (gender !== 'M' && gender !== 'F') return { error: 'invalid entry' }
  var id = String(entry.id || Utilities.getUuid())
  // Idempotent by id: the record also travels in the offline outbox and may be
  // retried — the same PR must never appear twice on the board. The lock keeps a
  // concurrent retry from appending between our duplicate check and the append.
  var lock = LockService.getScriptLock()
  try { lock.waitLock(5000) } catch (e) { return { error: 'ocupado, probá de nuevo' } }
  try {
    var sh = recordsSheet_()
    var last = sh.getLastRow()
    if (last > 1) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues()
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === id) return { ok: true, dup: true }
      }
    }
    sh.appendRow([id, c.nombre, gender, String(entry.lift), kg, reps,
      entry.ts || new Date().toISOString(), entry.wc ? String(entry.wc) : ''])
  } finally {
    lock.releaseLock()
  }
  try { CacheService.getScriptCache().remove('records') } catch (e) { /* no-op */ }
  return { ok: true }
}

// ---- admin: clear records (run manually from the Apps Script editor) -------
// Not exposed as a web endpoint on purpose (anyone could wipe the board). To use:
// open the Apps Script project on the gym account, pick the function in the editor
// toolbar and press Run.

/** Wipe ALL records, keeping the header row. Use to start fresh before launch. */
function clearRecords() {
  return 'records cleared (' + clearSheetRows_(recordsSheet_()) + ' rows)'
}

/** Wipe ALL records AND rachas (streaks), keeping header rows. Full clean slate for
 *  everyone -- e.g. after a weight-category change makes old records incompatible. */
function resetAllBoards() {
  var r = clearSheetRows_(recordsSheet_())
  var s = clearSheetRows_(streaksSheet_())
  return 'records cleared (' + r + '), rachas cleared (' + s + ')'
}
function clearSheetRows_(sh) {
  var last = sh.getLastRow()
  var n = last > 1 ? last - 1 : 0
  if (n > 0) sh.getRange(2, 1, n, sh.getLastColumn()).clearContent()
  return n
}

/** Delete records for specific client names (case-insensitive), keeping the rest.
 *  Edit the NAMES list below before running. Also catches the "Vos" default that a
 *  client gets if their name wasn't set on the device. */
function clearRecordsFor() {
  var NAMES = ['Matias Rossi', 'Belu', 'Princesa Franco', 'Yo', 'Vos']
  var want = NAMES.map(function (n) { return String(n).trim().toLowerCase() })
  var sh = recordsSheet_()
  var rows = sh.getDataRange().getValues()
  var kept = [rows[0]] // header
  var removed = 0
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue
    if (want.indexOf(String(rows[i][1]).trim().toLowerCase()) >= 0) { removed++; continue }
    kept.push(rows[i])
  }
  sh.clearContents()
  sh.getRange(1, 1, kept.length, kept[0].length).setValues(kept)
  return 'removed ' + removed + ' record(s)'
}

/** Delete specific records by their id (surgical). Edit IDS, then Run.
 *  Pre-filled with the accidental "Vos / Mujeres" test entries (Matías captured
 *  while the device had no name and gender set to Mujeres). The first is the
 *  women's-squat one; the other two are the same mistake (deadlift + press). */
function deleteRecordsById() {
  var IDS = [
    'r-mqzpfd5p-tab0', // Vos | F | sentadilla 72,5 — the women's-squat entry
    'r-mqvcx644-1eq13', // Vos | F | peso-muerto 30
    'r-mqvcx644-1eq14', // Vos | F | press-militar 36
  ]
  var sh = recordsSheet_()
  var rows = sh.getDataRange().getValues()
  var kept = [rows[0]]
  var removed = 0
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue
    if (IDS.indexOf(String(rows[i][0])) >= 0) { removed++; continue }
    kept.push(rows[i])
  }
  sh.clearContents()
  sh.getRange(1, 1, kept.length, kept[0].length).setValues(kept)
  return 'removed ' + removed + ' record(s)'
}

/** Reset the records AND rachas boards, keeping ONLY clients whose name contains
 *  "Alexis". Run once from the Apps Script editor to clean up test users. */
function resetBoardsExceptAlexis() {
  var keep = 'alexis'
  var r = keepRowsByClient_(recordsSheet_(), 1, keep)   // records: client in col B (index 1)
  var s = keepRowsByClient_(streaksSheet_(), 0, keep)    // rachas: client in col A (index 0)
  return 'records kept ' + r + ', rachas kept ' + s
}
function keepRowsByClient_(sh, clientCol, keepSubstr) {
  var rows = sh.getDataRange().getValues()
  var kept = [rows[0]]
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][clientCol]) continue
    if (String(rows[i][clientCol]).toLowerCase().indexOf(keepSubstr) >= 0) kept.push(rows[i])
  }
  sh.clearContents()
  sh.getRange(1, 1, kept.length, kept[0].length).setValues(kept)
  return kept.length - 1
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
  var cache = CacheService.getScriptCache()
  var hit = cache.get('streaks')
  if (hit) return JSON.parse(hit)
  var rows = streaksSheet_().getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue
    out.push({ client: rows[i][0], weeks: Number(rows[i][1]), max: Number(rows[i][2]) })
  }
  try { cache.put('streaks', JSON.stringify(out), 45) } catch (e) { /* best-effort */ }
  return out
}

function postStreak_(token, entry) {
  // The row is keyed by the TOKEN's canonical name — the payload's `client` is
  // ignored, so nobody can overwrite (or zero out) someone else's streak.
  var c = clientFor_(token)
  if (!entry) return { error: 'invalid' }
  var weeks = clampInt_(entry.weeks, 0, 520)
  var max = clampInt_(entry.max, 0, 520)
  var lock = LockService.getScriptLock()
  try { lock.waitLock(5000) } catch (e) { return { error: 'ocupado, probá de nuevo' } }
  try {
    var sh = streaksSheet_()
    var rows = sh.getDataRange().getValues()
    var done = false
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(c.nombre)) { // upsert: keep the best historical max
        sh.getRange(i + 1, 2, 1, 3).setValues([[weeks, Math.max(Number(rows[i][2]) || 0, max, weeks), new Date().toISOString()]])
        done = true
        break
      }
    }
    if (!done) sh.appendRow([c.nombre, weeks, Math.max(max, weeks), new Date().toISOString()])
  } finally {
    lock.releaseLock()
  }
  try { CacheService.getScriptCache().remove('streaks') } catch (e) { /* no-op */ }
  return { ok: true }
}

/** Whole number clamped to [lo, hi]; garbage becomes lo. */
function clampInt_(v, lo, hi) {
  var n = Math.round(Number(v))
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

// ---- gym news (novedades) -------------------------------------------------
// Staff-managed announcements shown on the app's Inicio — especially holiday
// hours ("cerramos el 9 de Julio", "sábado abrimos 9-13"). Stored in a
// `novedades` tab of the CONFIG sheet: desde | hasta | titulo | mensaje | tipo
//   desde/hasta = YYYY-MM-DD visibility window (blank = always/until further notice)
//   tipo = 'cerrado' | 'horario' | 'info' (drives the icon/tone in the app)
// Cached 5 min gym-wide (news changes rarely; everyone sees the same list).
function newsSheet_() {
  var ss = SpreadsheetApp.openById(NOVEDADES_SHEET_ID || CONFIG_SHEET_ID)
  var sh = ss.getSheetByName('novedades')
  if (!sh) { sh = ss.insertSheet('novedades'); sh.appendRow(['desde', 'hasta', 'titulo', 'mensaje', 'tipo']) }
  return sh
}

function getNews_(token) {
  clientFor_(token) // authorize
  var cache = CacheService.getScriptCache()
  var hit = cache.get('news')
  if (hit) return JSON.parse(hit)
  var rows = newsSheet_().getDataRange().getValues()
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd')
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    var titulo = String(r[2] || '').trim()
    if (!titulo) continue
    var desde = fmtDateCell_(r[0]), hasta = fmtDateCell_(r[1])
    if (desde && today < desde) continue        // not open yet
    if (hasta && today > hasta) continue         // expired
    out.push({ titulo: titulo, mensaje: String(r[3] || '').trim(), tipo: String(r[4] || 'info').trim().toLowerCase(), desde: desde, hasta: hasta })
  }
  try { cache.put('news', JSON.stringify(out), 300) } catch (e) { /* best-effort */ }
  return out
}

/** A date cell (a real Date or a YYYY-MM-DD string) → 'YYYY-MM-DD' or '' . */
function fmtDateCell_(v) {
  if (!v) return ''
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd')
  }
  var s = String(v).trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
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

// ---- coach comments digest (gym-wide, human-readable) ---------------------
// One `Seguimiento` tab (in the FORCE - Horarios file — see COACH_NOTES_SHEET_ID)
// that gathers only what a MEMBER actively did, each as its own row: Fecha | Cliente
// | Día | Ejercicio | Observación | Tipo, where Tipo is `Ejercicio` (a note on one
// lift), `Sesión` (an end-of-session note) or `Peso` (a weight/reps they logged as
// what they really did). Machine noise — check-ins, plain set completions, bodyweight
// /birthday meta, cell edits and any date-only rows — is deliberately left out.
// Written newest-first (each batch inserted right under the header) so coaches never
// scroll — the latest entry is always on top.
var COACH_NOTES_HEAD = ['Fecha', 'Cliente', 'Día', 'Ejercicio', 'Observación', 'Tipo']

/** The `Seguimiento` digest sheet, created + formatted on first use (staff-tab style). */
function coachNotesSheet_() {
  var ss = SpreadsheetApp.openById(COACH_NOTES_SHEET_ID || NOVEDADES_SHEET_ID || CONFIG_SHEET_ID)
  var sh = ss.getSheetByName('Seguimiento')
  if (sh) return sh
  sh = ss.insertSheet('Seguimiento', 0) // front of the file so coaches land on it
  sh.getRange(1, 1, 1, COACH_NOTES_HEAD.length).setValues([COACH_NOTES_HEAD])
    .setFontWeight('bold').setBackground('#111111').setFontColor('#C6AE78')
  sh.setFrozenRows(1)
  sh.setColumnWidth(1, 100) // Fecha
  sh.setColumnWidth(2, 160) // Cliente
  sh.setColumnWidth(3, 80)  // Día
  sh.setColumnWidth(4, 180) // Ejercicio
  sh.setColumnWidth(5, 420) // Observación
  sh.setColumnWidth(6, 90)  // Tipo
  sh.getRange('A2:A').setNumberFormat('yyyy-mm-dd')
  sh.getRange('E2:E').setWrap(true)
  // band only the data rows (showHeader=false) so the gold header above stays intact
  try {
    sh.getRange(2, 1, sh.getMaxRows() - 1, COACH_NOTES_HEAD.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
  } catch (e) { /* banding optional */ }
  return sh
}

/** Insert digest rows directly under the header so the newest comment stays on top. */
function prependCoachRows_(sh, rows) {
  if (!rows.length) return
  sh.insertRowsAfter(1, rows.length)
  sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows)
}

/**
 * Turn logInput items into digest rows and prepend them. Only two things a member
 * DID belong here:
 *   • a free-text comment  — an end-of-session note (`session`) or a per-exercise
 *     observación (`note`)  → Tipo "Sesión" / "Ejercicio"
 *   • a weight/reps they logged (`set` from adjusting what they really did) → Tipo "Peso"
 * Everything else (check-ins, set-completions with no weight, bodyweight/birthday meta,
 * cell edits) is skipped, and any "comment" that is really just a date is dropped.
 * Repeated weight logs for the same exercise in one flush collapse to the latest.
 */
function mirrorCoachNotes_(nombre, items) {
  var out = []
  var lastSet = {} // exerciseId → latest Peso row this flush (kills same-session repeats)
  ;(items || []).forEach(function (it) {
    var p = it.payload || {}
    if (it.kind === 'session' || it.kind === 'note') {
      var note = String(p.note || '').trim()
      if (!note || isDateLike_(note)) return
      var ej = it.kind === 'session' ? (p.bigOne || '—') : (p.exName || p.exerciseId || '—')
      out.push([dateCell_(p.date || it.ts), nombre, dayName_(p.dayLabel || p.dayId), ej, note,
        it.kind === 'session' ? 'Sesión' : 'Ejercicio'])
    } else if (it.kind === 'set') {
      var txt = pesoText_(p.actualKg, p.actualReps)
      if (!txt) return // a set completion with no logged weight — not a change, skip
      lastSet[String(p.exerciseId || '')] = [dateCell_(p.date || it.ts), nombre,
        dayName_(p.dayLabel || p.dayId), p.exName || p.exerciseId || '—', txt, 'Peso']
    }
  })
  Object.keys(lastSet).forEach(function (k) { out.push(lastSet[k]) })
  prependCoachRows_(coachNotesSheet_(), out)
}

/** A date/timestamp (Date, 'YYYY-MM-DD' or ISO) → a real Date so the column sorts &
 *  formats; anything unparseable passes through as text. */
function dateCell_(v) {
  if (!v) return ''
  if (Object.prototype.toString.call(v) === '[object Date]') return v
  var s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.length > 10 ? s : s + 'T00:00:00')
  return s
}

/** True if a value is really just a date/timestamp, NOT a member comment — so it
 *  never leaks into the digest as a fake observation. Catches a Date object, ISO
 *  ('2026-06-26'), a JS Date.toString() ('Fri Jun 26 2026 … GMT-0300 (…)') and
 *  d/m/yyyy. Real comments ("bajé a 25 kg", "molestó el hombro") never match. */
function isDateLike_(v) {
  if (!v) return false
  if (Object.prototype.toString.call(v) === '[object Date]') return true
  var s = String(v).trim()
  if (!s) return false
  if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(s)) return true                                   // ISO / 2026-06-26
  if (/\bGMT[+-]?\d{2,4}\b/i.test(s)) return true                                          // "…GMT-0300…"
  if (/^(mon|tue|wed|thu|fri|sat|sun|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[a-z]*\s+\w+\s+\d/i.test(s)) return true // "Fri Jun 26 2026"
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(s)) return true                                  // 26/6/2026
  return false
}

/** A logged weight/reps → a short human string ("45 kg × 8 reps"), or '' if neither
 *  is a real number. This is what a member actually did, shown as a `Peso` row. */
function pesoText_(kg, reps) {
  var k = Number(kg), r = Number(reps)
  var hasK = isFinite(k) && k > 0
  var hasR = isFinite(r) && r > 0
  if (hasK && hasR) return fmtNum_(k) + ' kg × ' + Math.round(r) + ' reps'
  if (hasK) return fmtNum_(k) + ' kg'
  if (hasR) return Math.round(r) + ' reps'
  return ''
}

/** Number with the rioplatense comma the sheets use (27.5 → "27,5"). */
function fmtNum_(n) {
  return (Math.round(Number(n) * 100) / 100).toString().replace('.', ',')
}

/** "DÍA 1" → "Día 1"; a dayId like "d1-3" → "Día 1"; blank → "—". */
function dayName_(v) {
  var s = String(v || '').trim()
  if (!s) return '—'
  var m = s.match(/^d(?:[ií]a)?\s*(\d+)/i)
  return m ? 'Día ' + m[1] : s
}

/**
 * Bootstrap the digest from what's already in every per-client "Seguimiento — …"
 * sheet: free-text comments (Sesión / Ejercicio) and logged weights (Peso), newest
 * first. Date-only rows and machine noise are filtered out; exact same-day repeats of
 * a weight collapse to one. PREPENDS, so run ONCE on an empty digest — use
 * `rebuildCoachDigest` if you need to redo it cleanly. Run from the Apps Script editor.
 */
function backfillCoachNotes() {
  var conf = SpreadsheetApp.openById(CONFIG_SHEET_ID).getSheetByName('clientes').getDataRange().getValues()
  var collected = []
  for (var i = 1; i < conf.length; i++) {
    var nombre = conf[i][1], folderId = conf[i][2]
    if (!folderId) continue
    try {
      var files = DriveApp.getFolderById(folderId).getFilesByName('Seguimiento — ' + (nombre || 'Cliente'))
      if (!files.hasNext()) continue
      var rows = SpreadsheetApp.openById(files.next().getId()).getSheets()[0].getDataRange().getValues()
      var seen = {} // per-client exact-dup guard (same day + día + ejercicio + obs + tipo)
      for (var r = 1; r < rows.length; r++) {
        var kind = String(rows[r][1] || '').toLowerCase() // per-client `tipo` = the outbox kind
        var obs, tipo
        if (kind === 'note' || kind === 'session') {
          if (isDateLike_(rows[r][7])) continue           // a date parked in the note column, not a comment
          obs = String(rows[r][7] || '').trim()
          if (!obs) continue
          tipo = kind === 'session' ? 'Sesión' : 'Ejercicio'
        } else if (kind === 'set') {
          obs = pesoText_(rows[r][4], rows[r][5])          // kg_real, reps_real
          if (!obs) continue
          tipo = 'Peso'
        } else {
          continue                                          // checkin / cell / etc. — not for coaches
        }
        var row = [dateCell_(rows[r][0]), nombre, dayName_(rows[r][2]), rows[r][3] || '—', obs, tipo]
        var sig = String(rows[r][0]).slice(0, 15) + '|' + row.slice(2).join('|') // day-granular
        if (seen[sig]) continue
        seen[sig] = true
        collected.push({ ts: rows[r][0], row: row })
      }
    } catch (e) { /* skip any client sheet we can't open */ }
  }
  collected.sort(function (a, b) { return new Date(b.ts) - new Date(a.ts) }) // newest first
  prependCoachRows_(coachNotesSheet_(), collected.map(function (x) { return x.row }))
  return 'backfill: ' + collected.length + ' fila(s) (comentarios + pesos) agregadas al digest'
}

/**
 * Wipe the digest's data rows (keeping the formatted header) and rebuild it from
 * scratch via backfill. Run this after updating the code to clear out any old junk
 * rows from an earlier backfill. Safe to run as many times as you like.
 */
function rebuildCoachDigest() {
  var sh = coachNotesSheet_()
  var last = sh.getLastRow()
  if (last > 1) sh.deleteRows(2, last - 1)
  return backfillCoachNotes()
}
