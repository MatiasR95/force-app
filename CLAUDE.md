# FORCE — Mi Rutina (member routine app)

This repo is the FORCE gym member app: a free, installable **PWA** that renders the
routines coaches plan in Google Sheets, lets members train them, and tracks progress.
**Open this folder as the project root** when working on the app.

## Run / test (portable Node — not on system PATH)
Node lives at `C:\Users\Matia\node-portable\node-v24.16.0-win-x64`. The preview server is
launched via `C:\Users\Matia\run-force-dev.cmd` (sets PATH, runs `npm run dev` on :5173) —
see `.claude/launch.json`. For terminal commands, prefix PATH:
`$env:Path = "C:\Users\Matia\node-portable\node-v24.16.0-win-x64;" + $env:Path` then `npm ...`.

- `npm run dev` — demo mode (uses the bundled sample routine)
- `npm test` — parser + metrics + records unit tests (Vitest)
- `npm run build` — typecheck + production build

## Architecture
- **Frontend:** React + Vite + TypeScript + Tailwind, PWA. GitHub Pages
  (`github.com/MatiasR95/force-app` → https://matiasr95.github.io/force-app/), CI in
  `.github/workflows/deploy.yml` (runs tests+build; needs `VITE_FORCE_API` Actions secret).
- **Backend:** Google Apps Script on the gym account `forcebyaurus@gmail.com` (owns `Clientes/`).
  Code in `apps-script/` (`Code.gs`, `Tokens.gs`); setup in `apps-script/SETUP.md`.
- **Parser** (`src/lib/parser.ts`): Sheet 2D values → structured Routine. Tolerant; keeps raw
  fallback. Handles ramp sets, `kg x lado`, tempos/pauses/myo/cluster/bands, per-week "Semana N"
  columns ("Mismo semana ant." inherits), HIIT seconds, circuits/supersets, day sorting.
- **Two archetypes** (`routine.style`): `weekly` (powerlifting — per-week columns, week stepper)
  vs `daily` (changes day by day, no stepper).

## Key product rules
- Spanish rioplatense (vos). Brand = FORCE; never say "gym"/"box" → entrenar/fuerza. Gold `#C6AE78`
  on dark, Montserrat, emblem. Brand kit originates in the sibling `force-ig` repo.
- Coaches keep planning in Sheets unchanged; the app reads the current (loose) sheet in
  `Clientes/<name>/`. Member inputs (RPE, notes, check-ins, records) flow to a `Seguimiento` sheet
  + a gym-wide `records` sheet — the routine sheet is never modified.
- **Records** are captured automatically when a record-eligible lift's set is completed, split by
  gender; members don't enter them manually.
- Photos/animations must have no baked-in text or faces (brand rule); exercise demos are generated
  animated SVGs (`AnimatedExercise.tsx`), implement-aware.

## Screens
`Hoy` (today's session, unmistakable), `Semana`/Plan, `Récords`, `Panel` (dashboard); `Entrenar`
is the full-screen lifting mode. Nav + week state in `src/App.tsx`.
