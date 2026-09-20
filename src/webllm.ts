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
  'Reply with COMPACT JSON only (no prose): {"say":"<one short in-character sentence>","calls":[{"name":"...","input":{...}}]}. ' +
  'Tools — pick the RIGHT one for each concept:\n' +
  '- set_time_of_day{time:"day"|"dusk"|"night"}  (day/dusk/night/evening/morning/afternoon are TIMES)\n' +
  '- set_weather{weather:"clear"|"rain"|"snow"|"fog"}  (rain/snow/fog/clear/sunny are WEATHER)\n' +
  '- set_light{level:0..1}  (dim≈0.15, half≈0.5, bright≈1, off=0)\n' +
  '- spawn_object{type:"lantern"|"guitar"|"plant"|"candle"|"books"|"flowers"|"mug"|"rug"|"lamp"|"cushion"}\n' +
  '- set_window{open:boolean}, reset_room{}, clear_props{}\n' +
  'Never put a time value into set_weather. Use "calls":[] when nothing should change.';

// Few-shot examples steer the small model toward correct, well-typed tool calls.
const SHOTS: { role: "user" | "assistant"; content: string }[] = [
  { role: "user", content: "[Room right now: Time: day. Weather: clear. Lights: 100%.] make it night and rainy" },
  { role: "assistant", content: '{"say":"Night falls, and the rain begins.","calls":[{"name":"set_time_of_day","input":{"time":"night"}},{"name":"set_weather","input":{"weather":"rain"}}]}' },
  { role: "user", content: "[Room right now: Time: night. Weather: rain. Lights: 100%.] dim the lights and add a candle" },
  { role: "assistant", content: '{"say":"Dimming the lights and lighting a candle.","calls":[{"name":"set_light","input":{"level":0.15}},{"name":"spawn_object","input":{"type":"candle"}}]}' },
  { role: "user", content: "[Room right now: Time: day. Weather: clear. Lights: 100%.] make it dusk and open the window" },
  { role: "assistant", content: '{"say":"Easing into dusk, and opening the window.","calls":[{"name":"set_time_of_day","input":{"time":"dusk"}},{"name":"set_window","input":{"open":true}}]}' },
];

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
        ...SHOTS,
        { role: "user", content: `[Room right now: ${perceive()}] ${raw}` },
      ],
      temperature: 0.2,
      max_tokens: 320,
    });
    const data = parseJSON(res?.choices?.[0]?.message?.content || "{}");
    for (const c of data.calls || []) executeTool(c?.name, c?.input || {});
    const reply = (data.say || "").trim() || "Done.";
    say(reply);
    speak(reply);
  } catch (err) {
    console.error("on-device brain error:", err);
    say("My on-device mind stumbled there — try again, or switch to the offline brain.");
  } finally {
    setBusy(false);
  }
}
