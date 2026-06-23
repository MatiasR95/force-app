# FORCE — Mi Rutina (member routine app)

A free, installable mobile app (PWA) that lets FORCE members **see and train their
routine** — the same routines coaches plan in Google Sheets, now rendered in a fast,
on-brand, modern interface, with exercise demos, effort logging and an S&C dashboard.

**Coaches change nothing.** They keep editing/creating each client's routine sheet in
`Clientes/<name>/<Month Year>` exactly as today. The app reads that sheet; member inputs
flow into a separate `Seguimiento` log they can review.

## What it does (v1)
- **Hoy** — today's session: warm-up, ramp sets, *The Big One*, accessories, finishers, core.
- **Plan** — navigate every day/week, objetivo & duration, history of past cycles.
- **Entrenar** — one-exercise-at-a-time lifting mode: set check-offs, rest timer, and a
  **plate calculator** that reads the coach's `kg x lado` notation.
- **Panel** — attendance & streak, estimated 1RM on the Big 3 (Epley), volume by movement
  pattern, effort (RPE) trend, plan tonnage.
- Brand-safe exercise media (curated Force gifs drop-in later), Spanish (rioplatense),
  offline-first, installable to the home screen.

## Architecture
- **Frontend:** React + Vite + TypeScript + Tailwind, PWA. Hosted free on GitHub Pages.
- **Backend:** Google Apps Script on the gym account (`apps-script/`). Parses the routine
  sheet to JSON, serves it, and appends member inputs to `Seguimiento`. No servers, no cost.
- **Parser:** `src/lib/parser.ts` — tolerant; understands ramp sets, `x lado`, tempos,
  pauses, Myo-reps, clusters, bands, and always keeps raw text as a fallback.
- **Access:** per-member magic link + QR (`apps-script/Tokens.gs`). No passwords.

## Develop
```bash
npm install
npm run dev      # runs in DEMO mode with the real "Enero 2026" routine as sample data
npm test         # parser + metrics unit tests
npm run build
```
Set `VITE_FORCE_API` (see `.env.example`) to the deployed Apps Script URL to leave demo mode.

## Connect to the real routines
See [`apps-script/SETUP.md`](apps-script/SETUP.md) — deploy the backend on the gym account,
build client tokens, hand out the QR codes.
