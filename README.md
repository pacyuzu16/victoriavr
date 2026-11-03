# Anima

**The spirit of a world you speak into being.**

Anima is a browser-native AI *being* you talk to. Describe a space and it appears; then Anima —
an agent with a personality, perception, and memory — **acts on the 3D world through tool-use**.
You speak, and the world changes. Not a scene generator you watch, a world that responds.

Built for the **Victoria VR AI Builder Hackathon 2026**.

- **Live demo:** https://victoriavr-liard.vercel.app/
- **Repository:** https://github.com/pacyuzu16/victoriavr
- **Competition:** https://www.kaggle.com/competitions/ai-builder-hackathon-2026
- **Full writeup:** [SUBMISSION.md](SUBMISSION.md)

## Why it matters

**The problem.** Building and editing 3D worlds is slow, technical, and gatekept behind pro tools
(Blender, Unity, game engines). That barrier is exactly what stands between an AI-native metaverse and
the people who could create in it. **Anima removes it: if you can describe a space, you can build and
edit it** — by voice or text, in the browser, free, on desktop or phone, shareable as one link. It fits
the hackathon's brief as an *AI copilot for 3D creation / prompt-to-world system / browser-based AI
editor*.

**It generalizes — and we ship the proof.** Anima includes **three live domains you switch in one
click**, all driven by the *same* engine (same AI, tools, perception, editing): **Living Space**
(interiors), **Showroom** (retail — pedestals, products, spotlights), and **Studio** (workspaces —
desks, monitors, chairs). The room is the demo, not the product — the engine is: *natural language →
schema-validated tool calls → mutation of an authoritative world state → render.* Every layer is
swappable: the **renderer** (any WebGL/WebGPU stack reads the same store), the **tool schema / World**
(swap the catalog and the same engine becomes a game-level editor, a data-viz builder, or a digital-twin
controller), the **AI brain** (three interchangeable implementations — offline / Claude / on-device
WebGPU LLM), and the **environment** (load any real place via your own Gaussian-splat capture or
`?splat=`). The generalizable asset is a safe, grounded, model-agnostic natural-language action layer
for interactive 3D.

## Run it

```bash
npm install
npm run dev            # app on http://localhost:5183
npm run server         # optional: real Claude brain proxy (needs a key in .env)
```

Anima works fully offline with the built-in "Mock" brain — no API key required. To use the real
Claude brain, copy `.env.example` to `.env`, add a key, and run `npm run server`.

## Highlights
- Natural language → validated tool calls → live 3D change, with grounded perception
- **Worlds** — switch domains in one click (Living Space · Showroom · Studio): the *same* engine as
  an interior stager, a retail product showroom, and a workspace designer. Generalizability, shown
- Photoreal Gaussian-splat environment + interactive PBR props
- **Director Mode** — a signature, self-running cinematic that drives the *real* natural-language
  pipeline hands-free (press <kbd>D</kbd>, or "Watch Anima build"). The default **Grand Tour** proves
  generalizability in one keypress: the *same* engine driven live across all three worlds —
  interiors → retail → workspace — switching domains on stage. Each World also has its own one-click
  demo. The unfakeable wow — and a bulletproof live-demo safety net
- **Three switchable AI brains:** *On-device* (a real LLM in the browser via WebGPU/WebLLM — free,
  no server, private), *Claude* (best-quality tool-calling via a key-holding local proxy), and
  *Mock* (a fast offline parser, so the demo always works with zero setup)
- A living **presence** (Anima's orb reacts as she thinks/speaks) and a **perception HUD** that
  shows her grounded senses as live vitals — plus **context-aware suggestions** that read the room
- A live **build meter** — honest, real-time counts of the work done by conversation (validated tool
  calls, sentences, seconds to build), so the effort Anima saves is visible on screen as you create
- **Scene gallery** — save, name and reload whole worlds; **share** a link to your exact scene
- Browser-native voice (speech in and out), mood presets, undo/redo, click-to-select editing,
  auto-persist, light/dark, mobile-first, on-screen camera rig, cinematic onboarding

## Build timeline (integrity note)
This submission is developed within the official build window (Sep 11 – Nov 11, 2026), tracked in
this repository's commit history. Earlier throwaway prototypes were built during the permitted
"research and prepare" window to de-risk the hard parts (in-browser Gaussian splats, the
natural-language tool-use loop, voice); this project is the in-window build that reuses those
learnings. No timestamps have been altered.
