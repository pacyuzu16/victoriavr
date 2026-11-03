// ─────────────────────────────────────────────────────────────────────────────
// DIRECTOR MODE — Anima's signature self-running cinematic.
// Scripted stories that flow through the REAL pipeline (natural language →
// the mock brain → tool calls → live world change), so judges watch the actual
// product work, hands-free. Doubles as a bulletproof demo safety net.
//
// Scripts are world-aware. The default "tour" is the generalizability beat in a
// single keypress: it drives the SAME engine across three domains live —
// interiors, retail, workspace — switching worlds on stage.
// Fully cancellable: any user interaction stops it instantly.
// ─────────────────────────────────────────────────────────────────────────────
import { runCommand } from "./brain";
import { setWorld, say, type WorldId } from "./world";
import { cam } from "./camera";

export interface DirectorStep {
  caption: string;
  cmd?: string; // the natural-language line Anima "speaks to herself" and runs
  run: () => void;
  hold?: number; // optional extra dwell (ms) for this step — e.g. after a world switch
}

export type DirectorScript = "tour" | "living" | "showroom" | "studio";

// A cozy-evening arc that shows breadth in one domain: time, light, weather, props.
const LIVING: DirectorStep[] = [
  { caption: "Anima turns plain language into a living space. Watch.", run: () => setWorld("living") },
  { caption: "Easing the room into evening…", cmd: "make it dusk", run: () => runCommand("make it dusk") },
  { caption: "Softening the light for the hour.", cmd: "dim the lights", run: () => runCommand("dim the lights") },
  { caption: "A little warmth on the table.", cmd: "light a candle", run: () => runCommand("add a candle") },
  { caption: "Something to read, something to drink.", cmd: "add books and a mug", run: () => runCommand("add books and a mug") },
  { caption: "Grounding the space underfoot.", cmd: "add a rug and a cushion", run: () => runCommand("add a rug and a cushion") },
  { caption: "Letting the weather turn — and cracking the window.", cmd: "make it rain and open the window", run: () => runCommand("make it rain and open the window") },
  { caption: "Night settles in.", cmd: "make it night", run: () => runCommand("make it night") },
  { caption: "One warm light to hold it all together.", cmd: "add a lantern", run: () => runCommand("add a lantern") },
  { caption: "Every change came from a sentence — live, in your browser. Your turn.", run: () => say("That's me. Now tell me what you'd like — type, or tap the mic.") },
];

// Retail: stage a product showroom by voice.
const SHOWROOM: DirectorStep[] = [
  { caption: "Same engine, a new domain: a retail showroom.", run: () => setWorld("showroom"), hold: 1200 },
  { caption: "Raising the hero display.", cmd: "add a pedestal and a product", run: () => runCommand("add a pedestal and a product") },
  { caption: "Lighting the product to sell it.", cmd: "add two spotlights", run: () => runCommand("add two spotlights") },
  { caption: "Branding the stand.", cmd: "add a sign", run: () => runCommand("add a sign") },
  { caption: "Setting the mood for a launch.", cmd: "make it dusk and dim the lights", run: () => runCommand("make it dusk and dim the lights") },
  { caption: "A product showroom — staged from sentences, no 3D tools.", run: () => say("A retail display, built by talking. Same engine as the room.") },
];

// Workspace: lay out a studio, no hero splat — purely procedural.
const STUDIO: DirectorStep[] = [
  { caption: "Same engine again: a workspace studio.", run: () => setWorld("studio"), hold: 1200 },
  { caption: "A desk to work at.", cmd: "add a desk", run: () => runCommand("add a desk") },
  { caption: "A monitor, lit and on.", cmd: "add a monitor", run: () => runCommand("add a monitor") },
  { caption: "Somewhere to sit, somewhere to shelve.", cmd: "add a chair and a shelf", run: () => runCommand("add a chair and a shelf") },
  { caption: "Warming the room for a late session.", cmd: "make it evening and add a lamp", run: () => runCommand("make it evening and add a lamp") },
  { caption: "Interiors, retail, workspaces — one AI, one tool API.", run: () => say("Three domains, one engine. Swap the schema and it goes further.") },
];

// THE GRAND TOUR — the generalizability beat in one keypress. The same
// language→tool→state→render loop, driven live across all three domains.
const TOUR: DirectorStep[] = [
  { caption: "Anima turns plain language into a living 3D world. One engine, any domain.", run: () => setWorld("living") },
  { caption: "An interior, first. Easing it into evening…", cmd: "make it dusk and dim the lights", run: () => runCommand("make it dusk and dim the lights") },
  { caption: "Furnishing it by sentence.", cmd: "add a candle, books and a rug", run: () => runCommand("add a candle, books and a rug") },
  { caption: "Now the same engine, a new domain — retail.", run: () => setWorld("showroom"), hold: 1400 },
  { caption: "Staging a product showroom by voice.", cmd: "add a pedestal and a product", run: () => runCommand("add a pedestal and a product") },
  { caption: "Lighting it to sell.", cmd: "add two spotlights", run: () => runCommand("add two spotlights") },
  { caption: "Once more — a workspace. Nothing in the engine changed.", run: () => setWorld("studio"), hold: 1400 },
  { caption: "Laying out a studio.", cmd: "add a desk, a monitor and a chair", run: () => runCommand("add a desk, a monitor and a chair") },
  { caption: "Interiors, retail, workspaces — one AI, one validated tool API, in your browser.", run: () => say("Same engine, three worlds. Swap the schema and it goes anywhere. Your turn.") },
];

const SCRIPTS: Record<DirectorScript, DirectorStep[]> = {
  tour: TOUR,
  living: LIVING,
  showroom: SHOWROOM,
  studio: STUDIO,
};

// Map a live WorldId to its single-domain script (for a world-local demo).
export const scriptForWorld = (w: WorldId): DirectorScript => w;

export const directorStepCount = (script: DirectorScript = "tour") => SCRIPTS[script].length;

export interface DirectorCallbacks {
  onStep: (index: number, step: DirectorStep, total: number) => void;
  onDone: () => void;
}

export interface DirectorOptions {
  script?: DirectorScript;
  stepMs?: number;
}

let token = 0; // bump to cancel any in-flight run
let running = false;

const sleep = (ms: number, myToken: number) =>
  new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(() => (myToken === token ? resolve() : reject()), ms);
    // if cancelled, the timeout still fires but myToken !== token → reject (ignored)
    void id;
  });

export const directorRunning = () => running;

export async function startDirector(cb: DirectorCallbacks, opts: DirectorOptions = {}) {
  const steps = SCRIPTS[opts.script ?? "tour"];
  const stepMs = opts.stepMs ?? 2600;
  const myToken = ++token;
  running = true;
  try {
    cam.reset();
    await sleep(500, myToken);
    for (let i = 0; i < steps.length; i++) {
      if (myToken !== token) return;
      cb.onStep(i, steps[i], steps.length);
      steps[i].run();
      cam.orbitRight(); // subtle cinematic drift (doesn't touch the auto-rotate toggle)
      await sleep(stepMs + (steps[i].hold ?? 0), myToken);
    }
  } catch {
    /* cancelled — swallow */
  } finally {
    if (myToken === token) {
      running = false;
      cb.onDone();
    }
  }
}

export function stopDirector() {
  token++; // invalidate the in-flight sequence
  running = false;
}
