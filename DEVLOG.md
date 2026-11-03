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

## Cycle 5 — 2026-11-03 — World-aware Director (the Grand Tour)
**Problem:** the generalizability proof (3 worlds) existed, but showing it in the video meant manual
world-switching mid-demo — fragile under pressure and easy to fumble. The #1 backlog item.
**Built:** Director Mode is now world-aware. New default **Grand Tour** (press `D`) drives the *same*
engine across all three domains live in one keypress — interiors → retail → workspace — switching
worlds on stage with narration ("same engine, a new domain"). Added dedicated single-domain scripts
(`living` / `showroom` / `studio`) reachable from a per-world **Demo** button on each World card. Scripts
carry an optional `hold` so the camera dwells after a world switch while the new scene materializes.
The Director header reads "One engine, three worlds — live" during the tour.
**Tested:** tsc + build clean (337 KB gz, +0.5 KB). Live in-browser: `D` ran the 9-step tour —
verified it rendered the interior, **switched to Showroom** (pedestal + product + spotlights on the
stage), then **switched to Studio** (desk + monitor + chair), ending on the closing line; the
per-world Demo button launched the 10-step Living script; **zero console errors** throughout.
**Score:** Impact 22/30 · Generalizability 22/25 · Technical 17/20 · Demo **23/25** (was 21) → **~84/100**.
The generalizability beat is now one keypress and demo-proof.

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
1. **Impact evidence, shown in-product** — a concrete, measurable framing (e.g. a live "built in N
   seconds / M sentences vs. hours in a DCC tool" counter) so Impact is demonstrated, not asserted.
2. **On-device reliability** — evaluate Qwen2.5-1.5B and tighten the few-shot for cross-world tool
   selection, so the on-device brain is safe to show live.
3. **Per-world mood presets** — moods are living-room flavored; give Showroom/Studio their own so every
   world feels authored end-to-end.
