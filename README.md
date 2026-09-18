# Anima

**The spirit of a world you speak into being.**

Anima is a browser-native AI *being* you talk to. Describe a space and it appears; then Anima —
an agent with a personality, perception, and memory — **acts on the 3D world through tool-use**.
You speak, and the world changes. Not a scene generator you watch, a world that responds.

Built for the **Victoria VR AI Builder Hackathon 2026**.

## Run it

```bash
npm install
npm run dev            # app on http://localhost:5182
npm run server         # optional: real Claude brain proxy (needs a key in .env)
```

Anima works fully offline with the built-in "Mock" brain — no API key required. To use the real
Claude brain, copy `.env.example` to `.env`, add a key, and run `npm run server`.

## Highlights
- Natural language → validated tool calls → live 3D change, with grounded perception
- Photoreal Gaussian-splat environment + interactive PBR props
- Browser-native voice (speech in and out), mood presets, undo/redo, click-to-select editing,
  shareable scene links, auto-persist, light/dark, mobile-first, on-screen camera rig

## Build timeline (integrity note)
This submission is developed within the official build window (Sep 11 – Nov 11, 2026), tracked in
this repository's commit history. Earlier throwaway prototypes were built during the permitted
"research and prepare" window to de-risk the hard parts (in-browser Gaussian splats, the
natural-language tool-use loop, voice); this project is the in-window build that reuses those
learnings. No timestamps have been altered.
