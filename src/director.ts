// ─────────────────────────────────────────────────────────────────────────────
// DIRECTOR MODE — Anima's signature self-running cinematic.
// A scripted story that flows through the REAL pipeline (natural language →
// the mock brain → tool calls → live world change), so judges watch the actual
// product work, hands-free. Doubles as a bulletproof demo safety net.
// Fully cancellable: any user interaction stops it instantly.
// ─────────────────────────────────────────────────────────────────────────────
import { runCommand } from "./brain";
import { resetWorld, say } from "./world";
import { cam } from "./camera";

export interface DirectorStep {
  caption: string;
  cmd?: string; // the natural-language line Anima "speaks to herself" and runs
  run: () => void;
}

// A cozy-evening arc that shows breadth: time, light, weather, props, perception.
const STEPS: DirectorStep[] = [
  { caption: "Anima turns plain language into a living space. Watch.", run: () => resetWorld() },
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

export const directorStepCount = STEPS.length;

export interface DirectorCallbacks {
  onStep: (index: number, step: DirectorStep) => void;
  onDone: () => void;
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

export async function startDirector(cb: DirectorCallbacks, stepMs = 2500) {
  const myToken = ++token;
  running = true;
  try {
    cam.reset();
    await sleep(500, myToken);
    for (let i = 0; i < STEPS.length; i++) {
      if (myToken !== token) return;
      cb.onStep(i, STEPS[i]);
      STEPS[i].run();
      cam.orbitRight(); // subtle cinematic drift (doesn't touch the auto-rotate toggle)
      await sleep(stepMs, myToken);
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
