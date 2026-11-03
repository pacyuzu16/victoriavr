# ANIMA — Submission Writeup

**AI Builder Hackathon 2026 · Victoria VR**
*Speak a world into being — a browser-native AI copilot for 3D creation.*

- **Live demo:** https://victoriavr-liard.vercel.app/
- **Repository (public, open-source):** https://github.com/pacyuzu16/victoriavr
- **Demo video:** `<url — record with the beat sheet below>`

---

## One-liner
Anima is a **browser-native AI copilot for building 3D worlds by conversation.** Describe a space in
plain language and it appears; keep talking and Anima acts on the live 3D scene through **validated
tool-use** — lighting, time of day, weather, objects, layout, the window, the camera. You speak, the
world changes, in real time, in the browser, with no install and no server required.

It directly answers the hackathon's challenge — *"turn natural language into living, interactive
systems"* — and the stated thesis that *"the browser is evolving into a real-time AI operating system
for creation."*

---

## Aligned with the hackathon's problem statements
The brief names the project types it's looking for. Anima is squarely three of them at once:
- **AI copilot for 3D creation** — the core loop *is* a conversational copilot that edits a live scene.
- **Prompt-to-world system** — plain language → a photoreal, interactive 3D environment.
- **Browser-based AI editor** — direct manipulation, undo/redo, save, and share, all client-side.
It also touches *real-time generative environments* and *collaborative AI workflows* (shareable scenes).

---

# How Anima scores on the official criteria

## 1 · Impact — 30%
**The problem.** Building and editing 3D worlds is slow, technical, and gatekept behind heavy tools
(Blender, Unity, game engines) and specialist skills. That bottleneck is exactly what stands between
Victoria VR's vision — a browser-native, AI-native metaverse anyone can shape — and the millions of
people who could create in it but can't use pro 3D software.

**The solution & who benefits.** Anima removes the tooling barrier: if you can *describe* a space, you
can *build and edit* it. Concrete beneficiaries:
- **Non-technical creators** — furnish, light, and stage a 3D scene by talking, not by learning a DCC tool.
- **Victoria VR's own users** — a drop-in, voice-first authoring layer for their metaverse (the
  collaboration prize's natural fit — this is a copilot for *their* product).
- **Educators & students** — build a diorama, a historical room, or a physics-lit scene in seconds.
- **Retail / real-estate / events** — stage a product showroom, a property walkthrough, or an event
  space from a sentence, shareable by link.
- **Accessibility** — voice-first authoring opens 3D creation to people who can't operate
  mouse-and-menu DCC tools.

**Practical adoption.** It runs today, in any modern browser, on desktop *and* phone, free (the offline
and on-device brains need no API key or server). A scene is one shareable URL. There is nothing to
install and no barrier to trying it — the adoption cost is a link.

## 2 · Generalizability beyond the demo — 25%
**We don't just claim this — we ship it.** Anima includes **three live domains you switch in one
click**, all driven by the *identical* engine (same AI, same tools, same perception, same direct
manipulation): **Living Space** (interior design / staging), **Showroom** (retail / e-commerce —
pedestals, products, spotlights, signage on a stage), and **Studio** (workspace / productivity —
desks, monitors, chairs, shelving). Switching a "World" only swaps the object catalog, scaffold and
suggestions; nothing in the language→action loop changes. That is the thesis, demonstrated.

**The room is not the product — the engine is.** Anima is a general pattern: **natural language →
schema-validated tool calls → mutation of an authoritative world state → render.** Every part of that
pipeline is swappable, which is what makes it generalize:

- **Renderer-agnostic world state.** The scene lives in a small ECS-style store (`world.ts`); the
  renderer just reads it. Swap the renderer and the same language/tool layer drives any WebGL/WebGPU
  stack.
- **Domain-agnostic tool schema.** Tools are a plain, validated API (`setLight`, `spawnObject`,
  `setWeather`, …). Change the tool set and the *same* engine becomes a level editor, a retail-showroom
  stager, a data-viz scene builder, a digital-twin / IoT controller, or an NPC director — no change to
  the language loop.
- **Model-agnostic "brain."** The AI layer is one interface with **three interchangeable
  implementations** — offline parser, cloud Claude, and an **on-device WebGPU LLM** — proving the
  approach isn't tied to any one model or vendor.
- **Environment-agnostic input.** Load **any** real place: drag in your own Gaussian-splat capture, or
  pass `?splat=<url>`. The language/tool layer works over whatever world you bring.

Adjacent products that fall out of the same engine with only a new tool schema + renderer binding:
game-level blocking, architectural/retail staging, classroom simulations, generative set design,
and conversational control of a 3D digital twin. The generalizable asset is a **safe, grounded,
model-agnostic natural-language action layer for interactive 3D** — not a room decorator.

## 3 · Technical depth & execution — 20%
- **Grounded tool-use loop.** User text + a **grounded perception** string (built from real world
  state, not pixels) → the model emits tool calls → each tool **validates its input** and returns a
  result the model sees → the renderer reflects the change. This closes the loop safely (bad calls are
  rejected, not crashed).
- **Three swappable brains behind one interface** — Mock (offline regex intent parser), Claude
  (tool-calling via a key-holding proxy so the browser never sees the key), and **on-device Qwen2.5 via
  WebLLM/WebGPU** (lazy-loaded ~6 MB chunk, feature-detected, few-shot-steered, graceful fallback).
- **Robust 3D.** Photoreal Gaussian splats composited with interactive PBR props and post-processing
  (bloom). The hero splat loads via a **blob URL** so it works on hosts that omit `Content-Length`
  (a real bug we found and fixed on Vercel), with a **bounded retry** and a graceful no-hero fallback
  wrapped in an in-Canvas **error boundary** — one bad asset never blanks the app.
- **Real editor features.** Click-to-select + direct manipulation (move/rotate/duplicate/delete),
  **undo/redo** history, **save/name/reload** scenes, **share** a whole world as a compact URL,
  auto-persist across refreshes, an on-screen camera rig.
- **Craft & accessibility.** Tokenized design system (light/dark, mobile-first), `aria-live` regions,
  visible focus, `prefers-reduced-motion`, keyboard shortcuts. TypeScript throughout; clean build;
  zero console errors in testing. Honest, in-window git history as the build record.

## 4 · Demo quality & presentation — 25%
- **Intuitive.** A cinematic intro states the value in one line; you act by typing, **talking**, tapping
  a mood, or a context-aware suggestion chip. The perception HUD shows, at a glance, what Anima senses.
- **Responsive & reliable.** The core task — *say something, see the world change* — completes in one
  step, every time. The **Mock brain works fully offline**, so the demo never depends on a network or a
  key. **Director Mode** is a one-keypress self-running cinematic that drives the real pipeline — a
  bulletproof safety net and a clear user-journey walkthrough for the video.
- **Works everywhere.** Desktop, tablet, phone; light and dark; one shareable link per scene.

---

## The 3-minute demo video (beat sheet)
Backbone: **Director Mode** (press `D` / "Watch Anima build") runs the real pipeline hands-free, so the
video can't stall; then you take over live. The default **Grand Tour** switches across all three worlds
on its own, so the generalizability beat needs no manual world-switching under pressure.

| Time | Beat | What you do / say | Criterion it lands |
|------|------|-------------------|--------------------|
| 0:00–0:15 | **Frame the problem** | Open the live URL. Intro: "Speak a world into being." Say: *"Building 3D worlds normally needs pro tools and skills. Anima makes it a conversation — in the browser."* | Impact |
| 0:15–0:50 | **Engine, hands-free** | Click **Watch Anima build**. Narrate as it runs: *"Each line is plain language → a validated tool call → a live 3D change."* | Technical depth · Demo |
| 0:50–1:35 | **The unfakeable beat** | Take over. Invite an on-the-spot request and **speak it** (mic) — e.g. "make it a rainy jazz bar." Point at the perception HUD updating + Anima's grounded reply. | Demo · Technical depth |
| 1:35–2:05 | **Generalize it — live** | Press **D** for the **Grand Tour** (or click each World's Demo): the *same* engine runs itself across **Showroom** (pedestal + product + spotlights) and **Studio** (desk + monitor + chair), switching domains on stage. *"One engine; interiors, retail, workspaces — swap the schema for level editors or digital twins."* | Generalizability |
| 2:00–2:25 | **No server, no vendor lock** | Switch to **On-device**: a real LLM in the browser via WebGPU, no server. *"Model-agnostic — three brains behind one interface."* | Generalizability · Technical depth |
| 2:25–2:45 | **Real & shareable** | Direct-manipulate an object; undo. **Save** the scene; **Share** → open the link; the world restores. | Demo · Impact |
| 2:45–3:00 | **Who it's for** | *"If you can describe it, you can build it — free, on a phone, one link to share. That's 3D creation for everyone."* Resize to mobile. | Impact |

---

## Architecture
React + React-Three-Fiber + Three.js (WebGL2 Gaussian splats) · ECS-style world store (`world.ts`) ·
schema-validated world-mutation tool API · grounded perception (state → NL) · three swappable brains
(offline parser / Claude via key-holding proxy / on-device WebLLM on WebGPU) · Web Speech voice ·
lucide icons · tokenized design system. Runs entirely in the browser; the optional Claude proxy is the
only server piece and is not needed for the core demo.

## Positioning (one-liners for judges)
- vs. **prompt-to-mesh generators**: they output static content; Anima gives you a *system you keep
  editing by conversation*.
- vs. **world models (Genie-style)**: they hallucinate and forget; Anima is controllable, persistent,
  editable, and client-side.
- vs. **Victoria VR's own builder**: that's manual authoring; Anima is the *conversational copilot layer*
  on top — voice-first, photoreal, in the browser.

## Try it
Open the live demo, press <kbd>D</kbd> to watch Anima build a world hands-free, then take over —
type or speak a change and watch the 3D scene respond. No install, no key, works on your phone.
