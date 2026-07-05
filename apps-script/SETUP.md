# Backend setup (one-time, on the gym Google account)

The backend runs as **Google Apps Script** under `forcebyaurus@gmail.com` — the account
that owns the `Clientes/` folder. No API keys, no billing.

## 1. Create the config spreadsheet
1. On the gym account, create a new Google Sheet, e.g. **"FORCE App — Config"**.
2. Add a tab named **`clientes`**. Leave it empty — step 4 (`rebuildClientConfig`) fills it
   automatically, including a `link` and `qr` column per client.
3. Copy its ID from the URL (`/spreadsheets/d/<ID>/edit`).

## 2. Get the Clientes folder ID
Open the `Clientes` folder in Drive; copy the ID from the URL
(`/drive/folders/<ID>`).

## 3. Create the Apps Script project
1. Go to <https://script.google.com> (signed in as the gym account) → **New project**.
2. Paste `Code.gs` and `Tokens.gs` from this folder into the editor (two files).
3. At the top of `Code.gs`, set `CONFIG_SHEET_ID` and `CLIENTES_FOLDER_ID`.
   In `Tokens.gs`, confirm `APP_URL` (the deployed PWA URL).
4. Run `rebuildClientConfig` once and authorize the scopes when prompted.

## 4. Build client tokens + links
- Run **`rebuildClientConfig`** — scans `Clientes/` and fills **two** tabs (existing tokens
  are preserved, new clients get a fresh one): `clientes` (the backend reads this) and
  **`compartir`** (for staff). Re-run whenever you add/rename a member; the manual coach
  workflow is untouched. This is the **only** time you need the script editor.
- **Staff sharing — use the `compartir` tab.** It opens first and shows, per member:
  **NOMBRE · QR (rendered as an image) · LINK DE ACCESO · COMPARTIR**. To share:
  - Find the person (`Ctrl/⌘+F` by name — the tab is sorted alphabetically).
  - **WhatsApp:** click **"Enviar por WhatsApp"** → their chat opens with the personal link
    and the iPhone install tip already written; just pick the contact and send.
  - **QR:** the QR shows inline — screenshot it, or open the `qr` URL (in the `clientes`
    tab) for a print-ready 600×600 PNG to hand to that member (a printed card).
    ⚠️ The QR **is** the member's personal access — never post it on a wall or anywhere
    public: anyone who scans it sees their routine and can write as them.
- **`genero` column (in `clientes`):** after adding a member, set their `genero` to **M**
  or **F**. The records board (split by gender) trusts ONLY this column; until it's filled
  the app falls back to what the member chose on their phone. `rebuildClientConfig`
  preserves the column on re-runs.
- `listMagicLinks` (Run → View → Logs) still dumps everything to the log for bulk printing.

## 5. Deploy the Web App
1. **Deploy → New deployment → Web app.**
2. *Execute as:* **Me** (gym account). *Who has access:* **Anyone**.
3. Copy the `/exec` URL.
4. In the GitHub repo, add it as the `VITE_FORCE_API` Actions secret (the deploy workflow
   injects it), or put it in a local `.env` for testing. Redeploy the app.

## How it reads a routine
For a given token → client folder, the **current** routine is the spreadsheet sitting
directly in the folder (the most recently modified, ignoring `Historial/`). Coaches keep
creating a new monthly sheet and moving the old one into `Historial/` exactly as before.

## Member inputs
`logInput` appends rows (timestamp, type, day, exercise, real kg/reps, RPE, note) to a
**`Seguimiento — <name>`** sheet created beside the routine. That per-client sheet is the
machine log (one row per set/edit) — handy for recovery, but noisy to read. See the coach
digest below for the human-friendly view.

## Coach comments digest (read what clients did, in one place)
Only what a member **actively did** is mirrored into a single **`Seguimiento`** tab, so coaches
never open each client's log and scroll past machine rows. Columns:
**Fecha · Cliente · Día · Ejercicio · Observación · Tipo**, where **Tipo** is one of:
- `Ejercicio` — a note the member wrote on one lift (e.g. *"el curl lo hago con banda + pesa rusa amarilla"*).
- `Sesión` — an end-of-session note (e.g. *"17 repes en amrap"*).
- `Peso` — a weight/reps the member logged as what they really did (e.g. *"45 kg × 8 reps"*).

Everything else — check-ins, plain set completions, bodyweight/birthday entries, cell edits and
any date-only rows — is deliberately **left out**. New entries are inserted at the **top**, so the
latest is always the first row.

- **Where it lives:** set **`COACH_NOTES_SHEET_ID`** at the top of `Code.gs` to the
  **"FORCE - Horarios"** file's ID, and give the gym account **Edit** access to that file.
  Leave it `''` to fall back to `NOVEDADES_SHEET_ID`, then to the config sheet. The tab is
  created + formatted automatically on the first entry (or on backfill).
- **Bring existing history in (optional, one time):** run **`backfillCoachNotes`** once from
  the Apps Script editor — it pulls the comments and logged weights already in every per-client
  `Seguimiento — <name>` sheet into the digest, newest first (date-only junk and same-day repeats
  are filtered out). It **prepends**, so run it once; to redo it cleanly use `rebuildCoachDigest`.
- **`rebuildCoachDigest`** — wipes the digest's data rows (keeping the header) and rebuilds from
  scratch. Run this after updating the code to clear out old junk rows from an earlier backfill.
  Safe to run repeatedly.
- Historical `Peso`/`Ejercicio` rows may show the exercise *id*; entries made after the frontend
  update show the exercise *name*.
- No re-deploy needed to read the tab — coaches can sort/filter it like any sheet.

`updateCells` (since Jun 2026) **overwrites** the matching cell in the routine sheet when a member
edits what they really did (kg / reps / series). The prior value is logged to `Seguimiento` first, so
the coach's original number stays recoverable. It targets the *current* routine sheet only and only
the cell for the field/week the member changed. Since Jul 2026 each write carries the cell text the
member's app parsed: if a coach edited the sheet in between (so the member's row would land on the
wrong cell), the write is **skipped** and logged to `Seguimiento` as `cell-skip` instead.

Since Jul 2026 the backend also: derives the member's name (and gender, from `genero`) from the
**token** on every record/streak write — the app can't claim someone else's identity; caches routine
and board reads (~90 s / ~45 s) so peak-hour traffic doesn't hit Apps Script quotas; and dedupes
records by id so offline retries never double-post a PR.

`records` tab gains a `wc` column (bodyweight category). Both auto-handle existing data.

## Gym news / novedades (holiday hours, closures)
Add a tab named **`novedades`** to the config sheet with columns:
`desde | hasta | titulo | mensaje | tipo`
- `desde` / `hasta` — visibility window as `YYYY-MM-DD` (leave blank for "always" / "until
  further notice"). The announcement only shows on the app's Inicio between those dates.
- `titulo` — short headline (e.g. "Feriado 9 de Julio").
- `mensaje` — one or two lines (e.g. "El martes 9 permanecemos cerrados. ¡Volvemos el miércoles!").
- `tipo` — `cerrado` (closed, amber door icon), `horario` (special hours, gold clock) or `info`
  (default megaphone).

To announce a holiday closure, add a row a few days before with `hasta` = the holiday date;
it disappears on its own afterwards. The list is cached ~5 min gym-wide, so edits show within
minutes. No re-deploy needed — just edit the sheet.

## Updating to a new app version (re-deploy)
When you pull new backend code (`Code.gs`), the Web App must be re-published for it to take effect:
**Deploy → Manage deployments → (edit ✏️ the existing Web App) → Version: New version → Deploy.**
Editing the *existing* deployment keeps the **same `/exec` URL**, so `VITE_FORCE_API` doesn't change.
(Creating a brand-new deployment instead would mint a new URL and you'd have to update the secret.)
