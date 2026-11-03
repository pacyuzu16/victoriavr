# Anima — development log

A running record of engineering cycles so work continues without repeating itself.
Newest first. Scores are self-assessed against the official rubric (Impact 30 ·
Generalizability 25 · Technical 20 · Demo 25).

## Architecture (stable)
- **Engine:** natural language → grounded perception → **schema-validated tool calls** →
  mutation of an authoritative ECS-style store (`world.ts`) → React-Three-Fiber render.
  Renderer-, schema-, and model-agnostic by design.
- **Brains (swappable, one interface):** `brain.ts` (offline parser), `llmBrain.ts` (Claude via a
  key-holding proxy `server/index.mjs`), `webllm.ts` (on-device Qwen2.5 on WebGPU).
- **Worlds (domain templates):** `worlds.ts` defines catalogs/synonyms/suggestions/greetings;
  `world.ts` holds the active `world` + `setWorld`. Same engine, different industry.
- **UI:** `App.tsx` (panel, world switcher, HUD, Director, gallery), `Scene.tsx` (3D, props,
  scaffolds, splat, window), tokenized design system in `styles.css`.

## Cycle 4 — 2026-11-03 — Generalizability made visible (Worlds)
**Problem:** Generalizability + Impact were asserted in the writeup but the product only showed one
domain (a cozy room) — "told, not shown," capping the two heaviest criteria.
**Built:** a pluggable **Worlds** system with three live domains — Living Space (interiors),
Showroom (retail), Studio (workspace) — switchable in one click, all on the identical engine. 8 new
prop types + procedural meshes, per-world scaffold (table / stage / none), per-world hero (showroom
reuses the splat as the featured product; studio has none), catalog-driven spawning with domain
synonyms, world-aware suggestions, world persisted + shareable.
**Tested:** tsc + build clean; in-browser across all three worlds (props render, switching resets
cleanly, no console errors).
**Score:** Impact 22/30 · Generalizability **21/25** (was ~13) · Technical 17/20 · Demo 21/25 → **~81/100**.

## Cycle 3 — Submission alignment to official criteria
Rewrote `SUBMISSION.md` + README around Impact / Generalizability / Technical / Demo; mapped to the
hackathon's stated problem statements (AI copilot for 3D creation / prompt-to-world / browser-based
editor). Added `FORM-ANSWERS.md` (local; has PII) for the submission form.

## Cycle 2 — Polish + reliability
Branded splat-loading state; rotating composer hints; Open Graph + favicon; **blob-URL splat load**
(fixes hosts without Content-Length) + bounded retry + in-Canvas error boundary; reactive 3D window.

## Cycle 1 — World-class redesign
Design system (dual accent, display type, aurora, micro-interactions); cinematic intro; **Director
Mode** (self-running cinematic over the real pipeline); presence orb; perception HUD; tool receipts;
context-aware chips; scene gallery.

## Known limitations / backlog
- On-device 0.5B model: bounded tool-calling accuracy (few-shot-steered); Claude or a larger model is
  more reliable for a judged live run.
- Hero splats are the bundled shoe or user-uploaded; a captured room/showroom scene would raise realism.
- Moods are living-room flavored; could add per-world mood presets.
- Possible next: per-world Director scripts; a 4th domain (e.g. classroom/STEM); multi-select editing.

## Next 3 priorities
1. **Per-world demo moments** — a Showroom and a Studio Director script (or a world-aware one) so the
   generalizability beat is one keypress in the video.
2. **Impact evidence** — a concrete "before/after" or a measurable framing (time-to-build vs. a DCC
   tool) surfaced in the UI/writeup.
3. **On-device reliability** — evaluate Qwen2.5-1.5B and tighten the few-shot for cross-world tool
   selection.
