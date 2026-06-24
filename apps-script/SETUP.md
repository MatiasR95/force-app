# Backend setup (one-time, on the gym Google account)

The backend runs as **Google Apps Script** under `forcebyaurus@gmail.com` — the account
that owns the `Clientes/` folder. No API keys, no billing.

## 1. Create the config spreadsheet
1. On the gym account, create a new Google Sheet, e.g. **"FORCE App — Config"**.
2. Add a tab named **`clientes`** with header row: `token | nombre | folderId`.
   (You can leave it empty; step 4 fills it automatically.)
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
- Run **`rebuildClientConfig`** — scans `Clientes/` and fills the `clientes` tab
  (existing tokens are preserved, new clients get a fresh one). Re-run whenever you add a
  member; the manual coach workflow is untouched.
- Run **`listMagicLinks`** → View → Logs: each member's personal link + a QR image URL.
  Share the QR (print at the gym / send by WhatsApp). One tap installs and remembers them.

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
**`Seguimiento — <name>`** sheet created beside the routine.

`updateCells` (since Jun 2026) **overwrites** the matching cell in the routine sheet when a member
edits what they really did (kg / reps / series). The prior value is logged to `Seguimiento` first, so
the coach's original number stays recoverable. It targets the *current* routine sheet only and only
the cell for the field/week the member changed.

`records` tab gains a `wc` column (bodyweight category). Both auto-handle existing data.

## Updating to a new app version (re-deploy)
When you pull new backend code (`Code.gs`), the Web App must be re-published for it to take effect:
**Deploy → Manage deployments → (edit ✏️ the existing Web App) → Version: New version → Deploy.**
Editing the *existing* deployment keeps the **same `/exec` URL**, so `VITE_FORCE_API` doesn't change.
(Creating a brand-new deployment instead would mint a new URL and you'd have to update the secret.)
