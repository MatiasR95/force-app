---
name: safety-scale
description: >-
  Security/privacy hardening and scalability/sharing review for an app, tool, or
  code change. Use when the user asks "is this safe?", "is this safe to share?",
  "will this scale?", "review the security", "harden this", "am I leaking
  anything?", "can I open this to more users?", or before shipping / widening a
  build's audience. Runs quick inline checks for small changes and delegates a
  full audit to the safety-scale-reviewer agent for anything non-trivial.
---

# Safety & Share

Two lenses on every review — **GUARD** (security & privacy) and **SCALE**
(scalability & sharing). This skill decides *how deep* to go and routes the work.

## Step 1 — Scope it

Judge the surface area:

- **Small & contained** (a single function, one component, an obvious question)
  → do the inline quick check below yourself. Don't spin up the agent for a
  one-liner.
- **Non-trivial** (a whole feature, auth/data/network code, "review the app
  before I share it", a pre-launch pass, or the user wants a real report) →
  **delegate to the `safety-scale-reviewer` agent** via the Agent tool. It runs
  an isolated deep audit and returns a severity-ranked report. Pass it the scope
  (files, the branch diff, or "whole app") and which lens(es) to run.

When in doubt for anything touching secrets, auth, personal data, or "can I
share this with more people", delegate — that's exactly what the agent is for.

## Step 2 — Quick inline check (small changes only)

**GUARD — fast scan:**
- Any secret/API key/token in the client bundle, repo, or logs? (On a static
  front end, everything shipped to the browser is public.)
- Untrusted input (user, URL, sheet, network) reaching a dangerous sink —
  `innerHTML`/`dangerouslySetInnerHTML`, a query, a shell, `eval`, a fetch URL —
  without sanitization?
- A security rule enforced only in the UI that the server must re-check?
- Personal data in logs/analytics or sent to a third party that isn't needed?

**SCALE — fast scan:**
- A loop making one network/API/DB call per item where a batch call exists?
- Something recomputed/refetched every time that could be cached (client, HTTP,
  CDN, service worker, server)?
- A backend quota/limit this path will hit as users grow — and does it fail
  gracefully (backoff/degrade) or hard-crash?

Report findings severity-ranked (🔴/🟠/🟡/🔵) with a concrete fix each. Apply
the same false-positive discipline as the agent: skip generic-validation,
pure-DoS, and "could be more defensive" nits — list them as a footnote at most.

## Step 3 — Deliver

Give a one-line posture verdict first ("safe to share to ~N users; fix X and Y
before a wider launch"), then the ranked findings and fixes. If you delegated,
relay the agent's report and offer to apply the fixes.

---

## Reusing this elsewhere

Generic core above is portable. The FORCE-specific stack facts (public client
bundle, Apps Script per-developer quotas + `CacheService`, the access-token
model, never-write-the-routine-sheet, per-member data isolation) live in the
`safety-scale-reviewer` agent's project-context section — update that section
when dropping this pair into a different project.
