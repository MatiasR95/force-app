# FORCE · Mi Rutina — Handoff

Living handoff for continuing this project in a new session. Updated 2026-07-01.

---

## 1. What this is

FORCE "Mi Rutina" is a free, installable **PWA** for a real gym (FORCE, La Plata). It renders the
routines coaches plan in **Google Sheets**, guides members set-by-set, calculates plates, and
auto-captures records, medals and progress. Coaches keep planning in Sheets unchanged; members
just train.

- **Frontend:** React + Vite + TypeScript + Tailwind, PWA (vite-plugin-pwa, `registerType: autoUpdate`).
  Deployed to GitHub Pages: `github.com/MatiasR95/force-app` → https://matiasr95.github.io/force-app/
  CI: `.github/workflows/deploy.yml` (runs tests + build; needs `VITE_FORCE_API` Actions secret).
- **Backend:** Google Apps Script on the gym account `forcebyaurus@gmail.com` (owns `Clientes/`).
  Code in `apps-script/` (`Code.gs`, `Tokens.gs`). Config spreadsheet `CONFIG_SHEET_ID` has a
  `clientes` tab (`token | nombre | folderId`) plus `records` and `rachas` tabs (gym-wide boards).
- **Brand:** Spanish rioplatense (vos). Gold `#C6AE78` on dark, Montserrat, winged emblem. Never
  say "gym/box" → "entrenar/fuerza". Logo assets in `src/assets/logo/` (use `lockup_white_t.png`
  = gold emblem + white FORCE on dark; `emblem_gold_t.png` = emblem only).

## 2. Run / test / build (portable Node — NOT on system PATH)

Node lives at `C:\Users\Matia\node-portable\node-v24.16.0-win-x64`. Preview via
`C:\Users\Matia\run-force-dev.cmd` (sets PATH, `npm run dev` on :5173). For terminal:
```
$env:Path = "C:\Users\Matia\node-portable\node-v24.16.0-win-x64;" + $env:Path
npm run dev      # demo mode (bundled sample routine, no backend)
npm test         # Vitest — 106 tests (parser, week, records, medals, features, events…)
npm run build    # typecheck (tsc, includes tests) + production build
```
Verify UI changes with the **preview MCP** (`preview_start` → `run-force-dev.cmd`, then
`preview_eval`/`preview_screenshot`). Demo mode has no backend, so records/medals need seeding
via `localStorage` in `preview_eval`. To preview an event theme off-season, temporarily force the
date in `currentEventTheme(date=…)` then revert.

## 3. Architecture / key files

- **Parser** `src/lib/parser.ts` — Sheet 2D values → `Routine`. Tolerant, never throws. Handles
  DÍA/DAY/weekday markers (cols A–C), per-side loads, `Semana N` columns (+ reversed), empty-cell =
  repeat-previous, HIIT carry-forward, day sorting/dedup, `parseSeriesPlan` (non-linear `4X1+3X3` /
  `10-10-8-8`). `looksLikeLogSheet` rejects a misrouted Seguimiento sheet.
- **Weeks** `src/lib/week.ts` — `resolveWeek` (per-week resolution + per-side inheritance +
  hanging-load override + week-1 column), `parseStartDate` (ISO + rioplatense), `memberCurrentWeek`.
- **Records** `src/lib/records.ts` — `matchRecordLift`, `recordKg`, `WEIGHT_CLASSES`/`weightClass`
  (**4 categories/gender**), `RECORD_LIFTS`.
- **Medals** `src/lib/medals.ts` — coach-vetted strength tiers (Bronce/Plata/Oro) per lift × gender
  × 4 categories (Oro already final), endless Bronce→Platino ladders (streak weeks, sessions),
  `earnedMedalIds`. See memory [[force-medals-categories]].
- **Rest timer** `src/lib/restTimer.ts` (global wall-clock store) + `components/RestTimer.tsx`
  (Entrenar control) + `components/RestTimerHost.tsx` (app-wide watcher + floating pill + alert).
- **Events** `src/lib/eventTheme.ts` (date windows, 7-days-before; 9-Julio = Jul 1–10) +
  `components/EventThemeBanner.tsx` (Inicio banner+quote) + `components/EventDecor.tsx` (app-wide
  guirnalda/escarapelas/snow/fireworks/solemn drift).
- **Rival watch** `src/lib/rivalWatch.ts` — notify + Inicio banner when someone in your
  gender+category takes a record; wired in `App.tsx` load/refresh.
- **Share** `components/ShareCard.tsx` — finish + medal-unlock cards, 1080×1920 PNG via canvas +
  `navigator.share`/download. Uses `lockup_white_t.png`, handle `@force.ok`.
- **Screens** `src/App.tsx` (shell, tabs, gates, load/refresh, EventDecor + RestTimerHost mounts),
  `screens/Home.tsx` (Inicio: weather bundle, event banner, rival banner, refresh, rachas),
  `screens/Hoy.tsx`, `screens/Semana.tsx` (Plan), `screens/Entrenar.tsx` (full-screen lifting:
  warm-up step, overview sheet, progress persistence, PR capture, Finish→celebrate→share→medals),
  `screens/Records.tsx` (gym boards), `screens/Dashboard.tsx` (Panel + `components/Medallero.tsx`).
- **Store** `src/lib/store.ts` — all localStorage (token, gender, bodyweight, sessions, checkins,
  actuals, lastDone, seenMedals, session progress, intro-seen, etc.).
- **S&C coach agent** `.claude/agents/sc-coach.md` — owns exercise accuracy. **Standing rule from
  Matias: always vet exercise/medal thresholds with this agent before shipping.**

## 4. Feature state (all implemented + committed)

Onboard to Inicio; iOS PWA token paste-recovery; intro-once; warm-up as Entrenar step 1;
"ver toda la sesión" overview + **progress persistence** (leaving never wipes it); "la vez pasada";
per-side/hanging-load/deadlift number fixes; non-linear progression; weather reworked (Inicio-only,
detailed today, one fetch); auto-attendance on finish; RPE "Saltar" saves (no data loss);
records + medals (Panel) with **4 weight categories/gender**; share cards (finish + medal-unlock,
gold lockup); **global background rest timer** + notification; event theming (patrias + Navidad +
fin de año + Malvinas, banner+quote+animations, 7-days-before, 9-Julio = Jul 1–10); Home refresh
button; rival-record notifications; real-name sync (needs backend redeploy — see §5).

## 5. ⚠️ Pending to go fully live (do these)

1. **Push:** `git push origin main` → wait for green GitHub Actions run.
2. **Backend redeploy** (Apps Script, gym account): paste current `apps-script/Code.gs` → Save →
   **Deploy → Manage deployments → Edit → New version**. Needed for: real names in `getRoutine`
   (kills the "Vos" fallback on the boards/cards). Without it the app still works.
3. **Run admin cleanup once** (Apps Script editor → pick function → Run):
   - `resetBoardsExceptAlexis()` — clears `records` + `rachas`, keeping only clients named "Alexis".
   - (`clearRecords`, `clearRecordsFor`, `deleteRecordsById` also exist for finer cleanup.)
4. **On the phone:** grant the **notification permission** (rest timer + rival alerts); set your
   category in **Perfil**.

## 6. Known limitations / gotchas

- **iOS PWA push:** true background delivery while the app is fully closed is restricted; the rest
  timer/rival notifications fire reliably in foreground / on return. Wall-clock keeps the time
  correct on resume.
- **Old-category records:** records captured under the old 3-category `wc` keys (`m66-80`, etc.)
  won't match the new 4-category filters, so they won't appear in the new brackets. `resetBoards…`
  clears them; new records use the 4 keys.
- **Movable holidays:** `feriados.ts` is a fixed 2026–27 table — refresh yearly.
- **Client tokens are secrets.** `scripts/audit-tokens.local.json` is gitignored — NEVER commit it.
  Don't commit `scratch-*.json` (real client data) either.
- Empty-folder clients (Felipe Suarez, Micaela Bessolo, a duplicate Joaquin Garayzabal, Matias
  Lafalce) correctly show "sin días cargados" — a data issue, not a bug.

## 7. Useful scripts / docs

- `scripts/audit-routines.ts` (`npm run audit`) — fetches getRoutine per token from
  `scripts/audit-tokens.local.json` (gitignored) and reports parse health across all clients.
- `scripts/make_guide_pdf.py` (`py scripts/make_guide_pdf.py`) — builds `docs/FORCE-Guia-Cliente.pdf`
  (3-page branded PDF; needs reportlab + PIL + `scripts/_fonts/`).
- `docs/GUIA-CLIENTE.md` (source guide), `docs/FORCE-Guia-Cliente.pdf` (branded PDF),
  `docs/linkedin-post.md` (LinkedIn draft).

## 8. Apps Script admin functions (run manually from the editor; not web endpoints)

`resetAllBoards()` (full wipe, records + rachas, everyone), `resetBoardsExceptAlexis()`,
`clearRecords()`, `clearRecordsFor()`, `deleteRecordsById()`.
Web endpoints (GET `?action=`): `getRoutine`, `getHistory`, `getRecords`, `getStreaks`, `ping`.
POST: `logInput`, `postRecord`, `postStreak`, `updateCells`.

## 9. Memory (auto-loaded each session)

`~/.claude/projects/.../memory/` — index in `MEMORY.md`. Notable:
[[force-routine-formats]] (parser/format variations), [[force-empty-cell-rule]],
[[force-empty-days-crash]], [[force-ios-pwa-access]], [[force-medals-categories]] (medals +
4 categories + the vet-with-sc-coach rule).

## 10. Next ideas (not started)

Real Web Push (VAPID + service worker) for true closed-app notifications; rival alert as a push;
more event decor; per-exercise history charts; coach-side view.
