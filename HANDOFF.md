# FORCE — Mi Rutina · Session Handoff

A free, installable **PWA** that renders the routines FORCE coaches plan in Google Sheets, lets
members train them, and tracks progress/records. This doc is the operational handoff to continue
the work in a new session. Read it first, then `CLAUDE.md`.

- **Repo:** https://github.com/MatiasR95/force-app · **Live:** https://matiasr95.github.io/force-app/
- **Owner:** Matias (gym FORCE, La Plata). Spanish rioplatense (vos). Brand = FORCE, gold `#C6AE78`
  on dark, Montserrat, emblem. Never say "gym"/"box" → entrenar/fuerza. No baked-in text / faces in imagery.

> **Open this folder as the project root.** Everything lives here. The earlier sessions ran from a
> sibling "LinkedIn Writer" project via absolute paths, but `force-app` is fully standalone now.

---

## 1. Run / build / test (portable Node — NOT on system PATH)

Node is at `C:\Users\Matia\node-portable\node-v24.16.0-win-x64`. Prefix PATH for any terminal cmd:

```powershell
$env:Path = "C:\Users\Matia\node-portable\node-v24.16.0-win-x64;" + $env:Path
npm install      # first time
npm run dev      # demo mode on :5173 (uses the bundled sample routine)
npm test         # Vitest — 39 tests (parser, metrics, records, plates, streaks)
npm run build    # tsc -b + vite build  (CI runs test + build)
```

Preview server is wired in `.claude/launch.json` → `C:\Users\Matia\run-force-dev.cmd` (sets PATH, runs dev).
Deploy is automatic: push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) runs tests+build and
publishes to GitHub Pages. CI needs the `VITE_FORCE_API` Actions secret for live (non-demo) mode.

**Always before committing:** `npx tsc -b` (clean), `npm test` (green), `npm run build` (clean). Commit
only when work is verified; CI re-checks.

---

## 2. Architecture

```
Member phone (PWA, installable, offline-first)        Google (gym account forcebyaurus@gmail.com)
  React + Vite + TS + Tailwind                         Apps Script Web App (apps-script/Code.gs)
  parses routine JSON client-side                       • getRoutine/getHistory  (reads Clientes/<name>/)
  optimistic writes + offline outbox  <-- HTTPS/JSON --> • logInput  -> Seguimiento sheet (coach reads)
  hosted free on GitHub Pages                           • getRecords/postRecord -> 'records' tab (config sheet)
                                                        • getStreaks/postStreak -> 'rachas' tab
```

- **Backend runs AS the gym account** (owns `Clientes/`, not shared to Matias's personal Drive). No API keys.
  Setup steps in `apps-script/SETUP.md`. Routine sheet is **never modified** by the app.
- **The "current" routine** = the loose sheet directly in `Clientes/<name>/` (newest, not in `Historial/`).
- **Access:** per-member magic link `?t=<token>` + QR via `apps-script/Tokens.gs`. Token→client→folderId in a
  config spreadsheet's `clientes` tab.
- **Demo mode** (no `VITE_FORCE_API`): uses `src/data/fixtureEnero2026.ts` (a real Eze routine, publicly
  authorized) and persists member inputs to localStorage only.

### Key files
- `src/lib/parser.ts` — Sheet 2D values → `Routine` JSON. **Tolerant**, always keeps raw fallback.
- `src/lib/week.ts` — `resolveWeek(ex, week)` (per-week overrides, "Mismo semana ant." inherit), `currentWeek`.
- `src/lib/types.ts` — domain model. `src/lib/normalize.ts` — exercise slug + movement pattern.
- `src/lib/metrics.ts` — e1RM (Epley), tonnage, weekly volume, attendance, `currentStreakWeeks`.
- `src/lib/records.ts` — record lifts, `matchRecordLift` (excludes bulgarian/incline/RDL), `recordKg`,
  `noteWeight`, `StreakEntry`.
- `src/lib/plates.ts` — plate calc; FORCE inventory (no 25kg except deadlifts; micro plates).
- `src/lib/store.ts` — localStorage + offline outbox (checkins, sets, sessions, notes, actuals, records,
  gender, restPref, maxStreak).
- `src/lib/api.ts` — demo/live switch, `fetchRoutine/fetchRecords/syncStreak/submitRecord/syncOutbox`.
- `src/screens/` — `Intro`, `Hoy`, `Semana` (Plan), `Records` (Récords/Rachas), `Dashboard` (Panel),
  `Entrenar` (full-screen lifting mode), `ExerciseSheet`.
- `src/components/` — `DayView`, `AnimatedExercise` (now **static** icons), `RestTimer`, `PlateCalc`,
  `Celebration`, `WeekBar`, `TechniqueChips`, `ui` (BottomSheet etc).
- `apps-script/` — `Code.gs`, `Tokens.gs`, `SETUP.md`.

---

## 3. What's built (all live)

- **Two routine archetypes** auto-detected (`routine.style`): `weekly` (powerlifting — per-week "Semana N"
  columns → week stepper shows) vs `daily` (changes day-by-day → stepper hidden).
- **Intro** launch screen (logo + rotating quote + "¿listo?" → Sí).
- **Hoy** — unmistakable "🔥 Hoy te toca · Día X" + focus; weather (Open-Meteo); "última vez" recap; last-week
  advice; inline Entrenar CTA (no longer floats/overlaps); day selector with HOY tag.
- **Plan** — all days, meta, history. **Panel** — attendance (month), **Semanas seguidas** streak, Big-3 e1RM,
  **Tu evolución** (per-lift e1RM trend over time), volume by pattern, RPE trend, tonnage.
- **Entrenar** — one always-gold "Marcar serie hecha" button that auto-advances; set dots; manual **RestTimer**
  (resets to ready on mark, never auto-starts); **AdjustField** (edit actual kg/reps/series → records+progress);
  per-exercise observación; circuits/superseries/triseries; **THE BIG ONE alternates** when multi-lift;
  **HIIT** = "pedile al entrenador… Finalizado" (single, time-based); plate calculator from `kg x lado`.
- **Records (Salón de la fama)** — Récords/Rachas toggle. Records auto-captured on completing a record-eligible
  lift (uses the **actual** weight, gender-split, leaderboard + comparison). Rachas = your streak + personal best
  + gym record + Top-10 active streaks.
- **Finish celebration** — confetti + rotating evidence-based "¿Sabías que…?" fact (30 facts).
- Reps × series order (reps first); "/lado" shown once; futuristic CSS polish (aurora, glass, glows).

---

## 4. KNOWN ISSUE — preview screenshot tool

The Claude **preview screenshot tool timed out for the entire latter half of the build** (it worked in early
rounds, then broke; times out even with all CSS animations cancelled and zero SMIL — a tooling fault, not the
app). **Verification was done via DOM/`preview_eval`, not pixels.** Two things were therefore NOT visually
confirmed and should be eyeballed on a real device:
1. The **"white line" fix** on Récords (changed `.hero-card` to a static gold border in `src/styles/index.css`).
2. How the **static exercise icons** actually look (`src/components/AnimatedExercise.tsx`) — especially
   `StirPot` (batir la olla). If an icon reads wrong, redraw that one `Mv` function.

A fresh session may have a working screenshot tool — do a real visual pass first thing.

---

## 5. OPEN DECISIONS (waiting on Matias)

1. **Exercise visuals.** Currently static line icons (license-clean, on-brand, minimalist). Options if he wants
   richer: (a) commission/AI-generate ~20 branded illustrations, (b) stylize gym photos he provides. Drop into
   the per-slug slot in `src/lib/media.ts` (`SLUG_MEDIA`) — `mediaFor()` already overrides the icon when present.
2. **Weight edits → Google Sheet.** Client edits currently flow to `Seguimiento` only. Matias may want them in
   the routine sheet. **Recommended:** append to the OBSERVACIONES cell (e.g. `(cliente 24/6: 10kg)`), do NOT
   overwrite the coach's prescription. Needs the parser to also return each value's cell coordinates so Apps
   Script can target the right cell (parser currently discards row/col indices) + an `updateExercise` endpoint.
3. **Gender source.** A one-time in-app prompt sets it (drives record categories; e.g. Alva=male). For real
   rollout, source gender from the gym's data (Pagos sheet has `Sexo`) via the config `clientes` tab + return it
   from the backend so the prompt isn't needed.

---

## 6. To activate for REAL members (needs Matias's gym Google login)

Per `apps-script/SETUP.md`: deploy `Code.gs`/`Tokens.gs` as a Web App on `forcebyaurus@gmail.com`, set
`CONFIG_SHEET_ID` + `CLIENTES_FOLDER_ID` (Clientes folder id = `1-V8PAlzz4nmlPXB8IGiI1fM6ksX8D7aF`), run
`rebuildClientConfig` + `listMagicLinks`, add the `/exec` URL as the `VITE_FORCE_API` GitHub Actions secret,
redeploy. The `records` and `rachas` tabs auto-create in the config spreadsheet on first use.

---

## 7. Suggested next steps (no particular order)

- Real visual pass once the screenshot tool works; fix any icon that reads wrong.
- Resolve the two open decisions above (visuals; sheet writeback).
- Coach view of the `Seguimiento` feedback (read the per-client log nicely).
- Per-week progression visible across more demo days is done; consider a richer powerlifting sample.
- Push notification when a coach publishes a new routine (PWA).
- Source gender from config; remove the in-app prompt for real members.

## Conventions
- Spanish rioplatense, FORCE voice. Keep `SKILL.md`-style brevity. Reuse existing utilities (check
  `src/lib/` before adding). Commit messages end with the Co-Authored-By line. Don't bypass hooks.
