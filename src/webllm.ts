// On-device AI brain — runs a small LLM fully in the browser via WebGPU (WebLLM).
// Free, no server, private: the "browser as a real-time AI OS" thesis. Lazy-loaded so it
// never bloats the main bundle; degrades gracefully when WebGPU isn't available.
import { perceive, say, youSaid, setBusy, pushHistory } from "./world";
import { speak } from "./speech";
import { executeTool } from "./llmBrain";

// Small + fast; downloads once, then cached by the browser.
const MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

let engine: any = null;
let enginePromise: Promise<any> | null = null;

export const webgpuAvailable = () => typeof navigator !== "undefined" && !!(navigator as any).gpu;

export async function initOnDevice(onProgress: (msg: string) => void): Promise<boolean> {
  if (engine) return true;
  if (!webgpuAvailable()) return false;
  if (!enginePromise) {
    enginePromise = (async () => {
      const webllm = await import("@mlc-ai/web-llm");
      return webllm.CreateMLCEngine(MODEL, {
        initProgressCallback: (r: any) => onProgress(r?.text || "Loading on-device AI…"),
      });
    })();
  }
  try {
    engine = await enginePromise;
    return true;
  } catch {
    enginePromise = null;
    return false;
  }
}

const SYSTEM =
  'You are Anima, the friendly spirit of a room. You change the room ONLY by calling tools. ' +
  'Reply with COMPACT JSON exactly like: {"say":"<one short in-character sentence>","calls":[{"name":"spawn_object","input":{"type":"candle"}}]}. ' +
  'Available tools and inputs: ' +
  'set_light{level: number 0..1}, set_time_of_day{time: "day"|"dusk"|"night"}, ' +
  'set_weather{weather: "clear"|"rain"|"snow"|"fog"}, ' +
  'spawn_object{type: "lantern"|"guitar"|"plant"|"candle"|"books"|"flowers"|"mug"|"rug"|"lamp"|"cushion"}, ' +
  'set_window{open: boolean}, reset_room{}, clear_props{}. ' +
  'Use "calls":[] when nothing should change. Output JSON only, no prose.';

function parseJSON(s: string): any {
  try { return JSON.parse(s); } catch { /* try to salvage */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* give up */ } }
  return {};
}

export async function runCommandOnDevice(raw: string) {
  const text = raw.trim();
  if (!text) return;
  youSaid(raw);
  pushHistory();

  if (!engine) { say("On-device AI is still loading — one moment."); return; }

  setBusy(true);
  try {
    const res = await engine.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `[Room right now: ${perceive()}] ${raw}` },
      ],
      temperature: 0.4,
      max_tokens: 320,
      response_format: { type: "json_object" },
    });
    const data = parseJSON(res?.choices?.[0]?.message?.content || "{}");
    for (const c of data.calls || []) executeTool(c?.name, c?.input || {});
    const reply = (data.say || "").trim() || "Done.";
    say(reply);
    speak(reply);
  } catch {
    say("My on-device mind stumbled there — try again, or switch to the offline brain.");
  } finally {
    setBusy(false);
  }
}
