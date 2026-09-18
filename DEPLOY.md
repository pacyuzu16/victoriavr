# Deploying Anima

`npm run build` outputs a **static site** to `dist/`. In offline (Mock brain) mode Anima needs **no
backend at all** — deploy `dist/` to any static host and the live demo works. The real Claude brain
(`server/`) is optional and deployed separately (see below).

Verified: production build succeeds (~308 KB gzipped JS).

## Static app (pick one)

**Vercel**
```bash
npm i -g vercel && vercel        # build command: npm run build · output dir: dist
```
Or connect the git repo in the Vercel dashboard (framework: Vite; it auto-detects `dist`).

**Netlify**
```bash
npm run build && npx netlify deploy --prod --dir=dist
```

**Cloudflare Pages** — connect the repo; build `npm run build`, output `dist`.

**GitHub Pages** — build, then publish `dist/`. If serving from a sub-path
(`user.github.io/anima/`), set `base: "/anima/"` in `vite.config.ts` first.

No SPA rewrite rules are needed (single `index.html`, no client routing).

## Optional: the real Claude brain (`server/index.mjs`)
Only needed for the "Claude · real" toggle. It's a tiny Node service holding your API key.
- Deploy to any Node host (Render, Railway, Fly.io, a small VM).
- Set `ANTHROPIC_API_KEY` as an environment variable there (never commit it).
- Point the app at it: either host both behind one origin so `/api` resolves, or set the proxy
  target / allow CORS from the app's origin.
- For the offline demo you can skip this entirely.

## Submission checklist
- [ ] Deploy `dist/` → get a public URL (works cross-browser, stays up through judging)
- [ ] Bundle a real captured hero scene (see `HERO-SCENE.md`) so it doesn't depend on an upload
- [ ] Record the 2–3 min demo (script in ../SUBMISSION.md)
- [ ] Public repo (open source encouraged)
