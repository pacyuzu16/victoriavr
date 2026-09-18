# Capturing your own hero scene

Anima's environment is a **3D Gaussian splat**. The default is a stock object; replacing it with a
real space you captured makes the demo original and memorable. Here's the whole workflow.

## 1. Film the space (phone is fine)
- Pick a characterful spot: a cozy desk, a corner of a room, a workshop, a plant shelf.
- Walk a **slow orbit** around/through it, ~1–3 minutes, keeping heavy overlap between frames.
- Good, even lighting; avoid fast motion, reflections, and empty blank walls.

## 2. Turn the video into a splat
Use any of these (free tiers available):
- **Polycam** (mobile/web) — Gaussian Splat mode
- **Luma AI** (mobile/web)
- **Postshot** (Windows desktop)
- Free online: **FreeGaussian.ai**, **vid2scene**

Export as **`.splat`** (preferred) or `.ply` / `.ksplat`.

## 3. Load it into Anima
Three ways:
- **In-app:** click the **Upload** button (top-left toolbar) and pick your `.splat`/`.ply`. Instant, session-only.
- **Bundled:** drop the file in `public/` and set the default in `src/world.ts` (`heroSplat: "/your-scene.splat"`).
- **Hosted / shareable:** host the file (GitHub Pages, Netlify, Vercel, any static URL) and open
  Anima with `?splat=<url>` — e.g. `https://your-app/?splat=https://.../room.splat`.

## 4. Tune placement
In `src/Scene.tsx`, the splat is wrapped in a `<group position scale rotation>`. Adjust those so your
scene sits nicely around the table and camera. Capture-tools' coordinate frames vary, so expect to
tweak `scale` (try 0.3–1.5) and `rotation`.

## Tips
- Smaller splats (≤ ~1–2M points / a few MB) load faster and run smoother on judges' machines.
- Keep a **pre-baked hero scene bundled** so the live demo never depends on an upload working.
