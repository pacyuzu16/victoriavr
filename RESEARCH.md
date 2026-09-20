# Research & gap analysis (Sep 20, 2026)

Deep-research pass to find gaps and refine Anima toward winning the Victoria VR AI Builder Hackathon 2026.

## 1. How the hackathon actually works (important)
It runs **through Kaggle** as a *community "Writeups" hackathon* — **not** an ML competition.
- **No dataset, no model to train, no evaluation metric.** (Tabs are Overview / Writeups / Code / Discussion / Rules — there is no Data tab.)
- To submit you must: **Accept Rules** on the Kaggle page (a terms acceptance — the participant must click it), then submit a **Writeup** and provide a **public repo + a browser demo** ("Public Repo + Browser Demo Required").
- Judged on: **originality, intelligent interaction, real browser-based functionality, extensible AI workflows, polished UX.**
- Track: **AI 3D Scene Generation** — plain-language prompts → 3D environments/objects/layouts/interactive scenes in the browser. Anima fits exactly.
- Field is light so far: **~62 entrants, 2 submissions.** A polished Anima is very competitive.
- €20,000 pool (€10k/5k/3k/1.5k/500). Winners Nov 25. Finalists get interviews/collaboration with Victoria VR.

Action items for the user (only they can do): accept rules on Kaggle; publish the repo; deploy the demo; post the Writeup (basis: `../SUBMISSION.md`).

## 2. The ML decision (delegated to me) — evidence-backed
**We do NOT train a model on Kaggle.** It's a Writeups hackathon with no dataset; a custom-trained model can't be reliably built unsupervised, can't be cleanly deployed into a browser 3D app, and wouldn't improve any judging axis. Training would burn time for negative value.

**The ML that matters here is the language brain**, and the best fit is an **on-device browser LLM (WebLLM / WebGPU)** — free, no server, private, and literally the hackathon's "browser as a real-time AI operating system" thesis. Implemented now as a third brain:
- **On-device** brain via `@mlc-ai/web-llm` (model `Qwen2.5-0.5B-Instruct`, ~Q4). Lazy-loaded (separate 6 MB chunk; main bundle unaffected), feature-detects WebGPU, degrades gracefully to the offline Mock brain when unavailable. Code: `src/webllm.ts`.
- Alternatives remain: **Mock** (offline, zero cost) and **Claude** (best quality, a few $ on Anthropic — the €400 credit was first-10 only, which we did not get).

Evidence: WebLLM runs Llama-3.2-1B / Qwen-2.5-0.5B at Q4 in 1–2 GB of GPU memory with OpenAI-style JSON/function calling, ~80% of native speed. Transformers.js could do a tiny intent classifier, but LLM tool-calling is more flexible for open-ended commands — and neither needs Kaggle.

## 3. Gaps found & refinements made
- **Robustness:** a corrupt/failed splat (e.g. a user upload) could crash the whole Canvas. Added an in-Canvas error boundary around the hero splat (keyed to the splat URL) so it degrades to "no hero object" instead of blanking the app. `src/ErrorBoundary.tsx` now takes a `fallback`.
- **On-device AI** added (above) — directly strengthens "intelligent interaction" + "extensible AI workflows" and is a genuine differentiator most entrants won't attempt.
- **Splat performance guidance** (for the real hero scene): keep **≤ 300–500K splats** for mobile/low-end (desktop can do 1–2M), export **compressed** (SPZ/SOG/KSPLAT, 5–10× smaller), and prefer a pre-baked bundled scene so the demo never depends on a live upload. Captured in `HERO-SCENE.md`.

## 4. Still the highest-leverage next steps (need the user)
1. Capture a real hero scene (`HERO-SCENE.md`).
2. Deploy for a public URL (`DEPLOY.md`).
3. Accept rules on Kaggle + post the Writeup + link repo & demo (`../SUBMISSION.md`).
4. Record the 3-min demo.

## Sources
- Kaggle competition: https://www.kaggle.com/competitions/ai-builder-hackathon-2026
- Hackathon page: https://www.victoriavr.com/news/ai-builder-hackathon-2026-build-the-future-of-ai-native-3d-experiences-5915194b
- WebLLM: https://github.com/mlc-ai/web-llm · https://webllm.mlc.ai/
- Transformers.js / browser ML: https://www.pkgpulse.com/guides/transformersjs-vs-onnx-runtime-web-2026
- Splat perf: https://www.utsubo.com/blog/gaussian-splatting-guide · https://w-m.github.io/3dgs-compression-survey/
