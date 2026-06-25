# FORCE — Mi Rutina · Session Handoff

A free, installable **PWA** that renders the routines FORCE coaches plan in Google Sheets, lets
members train them, and tracks progress/records. Read this first, then `CLAUDE.md`.

- **Repo:** https://github.com/MatiasR95/force-app · **Live:** https://matiasr95.github.io/force-app/
- **Owner:** Matias (gym FORCE, La Plata). Spanish rioplatense (vos). Brand = FORCE, gold `#C6AE78`
  on dark, Montserrat, emblem. Never say "gym"/"box" → entrenar/fuerza. No baked-in text / faces in imagery.
- **Status (Jun 2026):** deployed and live; last commit `a756471`. Being rolled out to first real clients.
- **Open this folder as the project root.** Everything lives here.

---

## 1. Run / build / test (portable Node — NOT on system PATH)

Node is at `C:\Users\Matia\node-portable\node-v24.16.0-win-x64`. Prefix PATH for any terminal cmd:

```powershell
$env:Path = "C:\Users\Matia\node-portable\node-v24.16.0-win-x64;" + $env:Path
npm install      # first time
npm run dev      # demo mode on :5173 (bundled sample routine)
npm test         # Vitest — 54 tests (parser, metrics, records, plates, streaks, features)
npm run build    # tsc -b + vite build  (CI runs test + build)
```

Preview server wired in `.claude/launch.json` → `C:\Users\Matia\run-force-dev.cmd`. Deploy is automatic:
push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) runs tests+build, publishes to Pages.
CI needs the `VITE_FORCE_API` Actions secret for live (non-demo) mode (already set).
**Before committing:** `npx tsc -b` clean, `npm test` green, `npm run build` clean.

> **Screenshot tool STILL times out** this machine (a tooling fault, not the app). Verify via
> `preview_eval` / `preview_snapshot` (DOM), not pixels. Eyeball real visuals on a device.

---

## 2. Architecture

```
Member phone (PWA, installable, offline-first)        Google (gym account forcebyaurus@gmail.com)
  React + Vite + TS + Tailwind                         Apps Script Web App (apps-script/Code.gs)
  parses routine JSON client-side                       • getRoutine (reads ALL tabs of Clientes/<name>/ sheet)
  optimistic writes + offline outbox  <-- HTTPS/JSON --> • logInput     -> Seguimiento sheet (coach reads)
  app-wide error boundary + self-heal                   • updateCells  -> OVERWRITES routine cells (+ logs prior)
  hosted free on GitHub Pages                           • getRecords/postRecord -> 'records' tab (+ wc column)
                                                        • getStreaks/postStreak -> 'rachas' tab
```

- **Backend runs AS the gym account** (owns `Clientes/`). No API keys. Setup in `apps-script/SETUP.md`.
- **The "current" routine** = the loose spreadsheet directly in `Clientes/<name>/` (newest, not in `Historial/`).
  `getRoutine` now stitches **every tab** of that spreadsheet (powerlifting plans often use one day per tab).
- **Routine sheet IS modified now** (Matias' decision): member kg/reps/series edits **overwrite** the matching
  cell. The prior value is logged to `Seguimiento` first (recoverable). See §4.
- **Access:** magic link `?t=<token>` + QR via `apps-script/Tokens.gs`. Token→client→folderId in the config
  spreadsheet `clientes` tab.
- **Demo mode** (no `VITE_FORCE_API` / no token): `src/data/fixtureEnero2026.ts`, inputs to localStorage only.
  Demo is a single array (one "tab") → the multi-tab path is backend-only, covered by a parser unit test.

### Key files
- `src/lib/parser.ts` — Sheet 2D values → `Routine`. Tolerant; **never throws** (per-row try/catch). Tracks
  each exercise's absolute sheet `row` and each `WeekCell.col` for writeback.
- `src/lib/week.ts` — `resolveWeek(ex, week)`, `currentWeek`. `src/lib/sheetWrite.ts` — `buildCellWrites`
  (mirrors `resolveWeek`; field-aware overwrite target). `src/lib/types.ts` — domain model.
- `src/lib/records.ts` — record lifts, `matchRecordLift`, `recordKg`, `noteWeight`, **`weightClass`/`WEIGHT_CLASSES`**.
- `src/lib/metrics.ts`, `src/lib/plates.ts`, `src/lib/normalize.ts`.
- `src/lib/store.ts` — localStorage + outbox (checkins, sets, sessions, notes, actuals, records, gender,
  restPref, maxStreak, **bodyweights, birthday**; `queueCellWrites`).
- `src/lib/api.ts` — demo/live switch; `fetchRoutine` (validates payload), `syncOutbox` (logs→logInput,
  `cell`→`updateCells`), records/streaks.
- `src/lib/weather.ts` (`getWeather` + `getForecast`), `src/lib/feriados.ts` (AR 2026–27), `src/lib/coachTips.ts`.
- `src/screens/` — `Home` (Inicio), `Intro`, `Hoy`, `Semana` (Plan), `Records`, `Dashboard` (Panel),
  `Entrenar`, `ExerciseSheet`.
- `src/components/` — `ErrorBoundary`, `Profile`, `ArgentinaFlag`, `AnimatedExercise` (**animated** icons),
  `DayView`, `RestTimer`, `PlateCalc`, `Celebration`, `WeekBar`, `TechniqueChips`, `ui`.
- `.claude/agents/sc-coach.md` — S&C coach subagent (icons, cues, plan audits).
- `apps-script/` — `Code.gs`, `Tokens.gs`, `SETUP.md`. `docs/` — guides (see §7). `scripts/` — PDF generator.

---

## 3. What's built (all live)

- **5-tab nav** (`src/App.tsx`): **Inicio · Hoy · Plan · Récords · Panel**; default `Inicio`. `Entrenar`
  is the full-screen lifting overlay. `Intro` splash on launch.
- **Inicio (Home)** — welcome + date, animated **Argentina flag** by the emblem, today's-session CTA,
  **4-day La Plata forecast**, **próximo feriado** + days left, **coach tip** tied to the day's Big One,
  rachas snapshot, today's-birthday board, monthly bodyweight nudge, **Perfil** sheet (name/gender/birthday/bw).
- **Hoy** — "🔥 Hoy te toca · Día X", weather, "última vez" recap, last-week advice, inline Entrenar CTA, day selector.
- **Plan** — all days (one pill per `routine.days` entry), meta, history. **Panel** — attendance, streak, Big-3
  e1RM, per-lift e1RM trend, volume by pattern, RPE, tonnage.
- **Entrenar** — "Marcar serie hecha" auto-advances; RestTimer; **AdjustField** (edit actual kg/reps/series →
  records + progress + **overwrites the routine cell**); observación; circuits/superseries; Big One alternates; HIIT.
- **Records (Salón de la fama)** — auto-captured PRs (actual weight, gender-split), **bodyweight-category filter**
  (M ≤65/66–80/+80 · F ≤50/51–65/+65), Top-10 rachas, gym record.
- **Animated exercise icons** — gold line-art, one looped rep via CSS translate keyframes (no SMIL), reduced-motion aware.
- **Crash-proof** — see §5.

---

## 4. Sheet writeback (OVERWRITE) + multi-tab — how it works

- Parser emits an **absolute `row`** per exercise (index across the stitched tabs) and `WeekCell.col`.
- `buildCellWrites(ex, week, edit)` (`sheetWrite.ts`) produces `{row, col, value}` overwrites, matching
  `resolveWeek`: writes the "Semana N" cell only for fields that cell owns, else the base reps/series/OBS cell.
  Inherited ("Mismo semana ant.") / un-splittable week cells are skipped (logged, not written).
- Queued via `store.queueCellWrites` → `api.syncOutbox` posts `cell` items to **`updateCells`**.
- Backend `updateCells_` re-reads all tabs (`allTabRows_`), maps the absolute `row` back to **(tab, localRow)**,
  overwrites that cell, and logs `antes/después` to `Seguimiento`. Frontend stays tab-agnostic.
- **Multi-tab read:** `getRoutine_` concatenates every tab so one-day-per-tab plans show all days. **Assumes each
  day-tab contains its own `DÍA N` text marker in column A.** If a coach relies on the *tab name* instead (no
  in-cell marker), that day won't appear → would need a tab-name fallback (not built).

---

## 5. Crash prevention (Jun 2026 — "never blank-screen")

A render/parse error used to unmount the whole app (black screen). Now hardened:
- **`src/components/ErrorBoundary.tsx`** at the root (`main.tsx`), around **each screen** and the Entrenar
  overlay (`App.tsx`). Shows a branded "Algo no cargó bien" + **Reintentar** / **Recargar la app** (clears
  SW+caches), keeps the **nav alive**, and has a **"Detalle técnico"** expander with the error message.
- Parser **never throws**; `fetchRoutine` validates the payload; Hoy/Semana **clamp** the day index.
- **`index.html` self-heal:** if an app asset fails to load (stale PWA SW after a deploy → React can't mount,
  so the boundary can't run), it clears SW+caches and reloads **once**. `vite.config.ts` → `cleanupOutdatedCaches`.
- Verified: forcing a render error shows the recovery UI with nav intact (no black screen).

---

## 6. Deploy / backend redeploy (IMPORTANT)

- **Frontend:** push `main` → Actions builds + publishes. Installed PWAs auto-update (`registerType:'autoUpdate'`);
  on iOS, fully close & reopen the app to pull a new version.
- **Backend:** when `apps-script/Code.gs` changes, re-publish: Apps Script → **Deploy → Manage deployments →
  edit (✏️) the Web App → Version: New version → Deploy** (keeps the **same `/exec`** so `VITE_FORCE_API` is unchanged).
  The current live code needs this redeploy for **`updateCells`** (writeback) and **multi-tab `getRoutine`** to work.
- First-time activation steps + `rebuildClientConfig`/`listMagicLinks` in `apps-script/SETUP.md`.
  Clientes folder id = `1-V8PAlzz4nmlPXB8IGiI1fM6ksX8D7aF`. `records`/`rachas` tabs auto-create.

---

## 7. Client-facing & owner docs
- `docs/FORCE-Guia-Cliente.pdf` — branded 2-page client manual. Regenerate: `py scripts/_mk_fonts.py` (once)
  then `py scripts/make_guide_pdf.py`. Needs `reportlab`, `pillow`, `fonttools`, `pymupdf` (preview) via the
  `py` launcher. `scripts/_fonts/` and `docs/_preview_*.png` are gitignored.
- `docs/GUIA-CLIENTE.md` (markdown source), `docs/GO-LIVE.md` (deploy checklist),
  `docs/COMO-COMPARTIR.md` (2-min onboarding flow + WhatsApp template).

---

## 8. OPEN / NEXT (priority order)

1. **Verify Belu (multi-tab client).** After the backend redeploy + frontend update, confirm her **5 days**
   render (Hoy + Plan) and a weight edit lands in the **correct tab/cell**. If she sees the recovery screen,
   read **"Detalle técnico"** — it names the exact crash to fix. (Her plan = one tab per day, powerlifting/weekly.)
2. **Real device visual pass** (screenshot tool broken): Inicio layout, animated icons (esp. `StirPot`/batir la
   olla — user noted icons still "have room to improve"), 5-tab spacing, flag, the white-line fix on Récords.
3. **Source gender / birthday / bodyweight from the gym config** for real rollout (currently local-first in
   `store.ts`). For a gym-wide birthday board + shared weight-class records, add columns to the config `clientes`
   tab (Pagos sheet has `Sexo`) and return them from the backend (`getBirthdays`, bodyweight).
4. Richer/curated exercise media can drop into `src/lib/media.ts` (`SLUG_MEDIA`); `mediaFor()` overrides the icon.
5. Coach view of `Seguimiento`; push notification when a coach publishes a new routine.

## Conventions
- Spanish rioplatense, FORCE voice. Reuse `src/lib/` utilities before adding. `npx tsc -b` + `npm test` +
  `npm run build` before committing. Commit messages end with the `Co-Authored-By: Claude …` line. Don't bypass hooks.
- Commit/push only when asked. The project deploys from `main`.
