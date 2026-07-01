# LinkedIn post — draft (sketch, edit to taste)

---

I shipped a full production app for a real gym — training routines, auto-tracked
PRs, medals, shareable cards — mostly by turning **Claude Code into a small
engineering team**, not just an autocomplete.

As a data analyst & AI-automation specialist, the lesson wasn't "AI writes code."
It was: **the leverage comes from the system you build *around* the model.**

**The project — FORCE · Mi Rutina**
An installable PWA that reads the routines coaches already plan in Google Sheets,
guides members set-by-set, calculates the plates, captures records automatically,
and now hands out tiered medals and Instagram-ready share cards. Members just train.

**The stack**
• React + Vite + TypeScript + Tailwind (PWA, offline-first) → GitHub Pages
• Google Apps Script + Sheets as a zero-cost backend
• Open-Meteo, Web Share / Notifications, Canvas image generation
• Vitest for the parsing/records/medal logic (100+ tests)

**How I set up Claude Code to actually multiply the work**
🧠 **Persistent memory** — project rules (brand voice, the "empty week = repeat
last" gym rule, past bugs) survive across sessions, so I stop re-explaining.
🎯 **Skills (slash commands)** — repeatable playbooks for review, verification and
release instead of re-typing prompts.
🤝 **Sub-agents with real roles** — I built a certified S&C "coach" agent that
*owns exercise accuracy*: it set the strength-medal thresholds by gender and
bodyweight category, grounded in strength standards and tuned to be fair. Domain
expertise on tap, separated from the app logic.
🔁 **Background agents + a self-paced loop** — long hardening passes run while I do
other things; results come back for review.
✅ **A verification loop** — it runs the app in a headless browser, takes
screenshots, and checks its own changes *before* I look. Fewer "looks done, isn't"
moments.

**The takeaway for anyone doing AI automation:** treat the model like a team you
manage — give it memory, specialized roles, guardrails, and a way to verify itself.
That's where the real productivity is, not in the raw generation.

Happy to share the setup if you're building something similar. 👇

#AI #ClaudeCode #AIAutomation #DataAnalytics #AIAgents #SoftwareEngineering #BuildInPublic
