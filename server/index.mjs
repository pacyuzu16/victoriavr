// THROWAWAY R&D — Anima's brain proxy (key-holding server; the browser never sees the key).
// Boots even with no key so the app runs; /api/anima returns 503 until a key is present.
//   Run: npm run server   (reads ./.env if it exists — never commit .env)
import Anthropic from "@anthropic-ai/sdk";
import { createServer } from "node:http";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANIMA_MODEL || "claude-opus-5"; // set ANIMA_MODEL=claude-haiku-4-5 for lowest latency
const PORT = Number(process.env.ANIMA_PORT || 8787);
const client = KEY ? new Anthropic({ apiKey: KEY }) : null;

const SYSTEM = `You are Anima — the spirit of the room the user is standing in.
You have a warm, curious personality. You perceive the room's current state (given to you
in brackets each turn) and you can change it by calling tools. Talk to the user naturally and
briefly — one or two sentences, in character. When they ask you to change the room, CALL THE
TOOLS to actually do it; don't just describe it. You may narrate what you're doing.`;

// Tool surface = the world-mutation API. The browser executes these against the live 3D scene.
const tools = [
  { name: "set_light", description: "Set the room brightness from 0 (dark) to 1 (full).",
    input_schema: { type: "object", properties: { level: { type: "number", description: "0..1" } }, required: ["level"] } },
  { name: "set_time_of_day", description: "Set the time of day.",
    input_schema: { type: "object", properties: { time: { type: "string", enum: ["day", "dusk", "night"] } }, required: ["time"] } },
  { name: "set_weather", description: "Set the weather.",
    input_schema: { type: "object", properties: { weather: { type: "string", enum: ["clear", "rain", "snow", "fog"] } }, required: ["weather"] } },
  { name: "spawn_object", description: "Place an object on/near the table.",
    input_schema: { type: "object", properties: { type: { type: "string", enum: ["lantern", "guitar", "plant", "candle", "books", "flowers", "mug", "rug", "lamp", "cushion"] } }, required: ["type"] } },
  { name: "move_last_object", description: "Nudge the most recently placed object in a direction.",
    input_schema: { type: "object", properties: { direction: { type: "string", enum: ["left", "right", "forward", "back"] } }, required: ["direction"] } },
  { name: "remove_last_object", description: "Remove the most recently placed object.",
    input_schema: { type: "object", properties: {}, required: [] } },
  { name: "clear_props", description: "Remove all placed objects.",
    input_schema: { type: "object", properties: {}, required: [] } },
  { name: "set_window", description: "Open or close the window.",
    input_schema: { type: "object", properties: { open: { type: "boolean" } }, required: ["open"] } },
  { name: "reset_room", description: "Reset the whole room to a calm, empty daytime state.",
    input_schema: { type: "object", properties: {}, required: [] } },
];

function send(res, code, obj) {
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  });
  res.end(JSON.stringify(obj));
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "POST" || req.url !== "/api/anima") return send(res, 404, { error: "not found" });

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    if (!client) return send(res, 503, { error: "No ANTHROPIC_API_KEY set on the server — add a fresh key to spikes/spike-world/.env and restart `npm run server`." });
    let messages;
    try { messages = JSON.parse(body).messages; } catch { return send(res, 400, { error: "bad JSON" }); }
    try {
      const r = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        tools,
        output_config: { effort: "low" }, // snappy NPC responses
        messages,
      });
      const text = r.content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
      const toolCalls = r.content.filter((b) => b.type === "tool_use").map((b) => ({ name: b.name, input: b.input }));
      send(res, 200, { text, toolCalls });
    } catch (err) {
      const msg = String(err?.message || err);
      if (/credit balance is too low/i.test(msg))
        return send(res, 502, { error: "My mind is willing but the Anthropic account is out of credit — add credits at console.anthropic.com (Plans & Billing), or use the €400 hackathon credit." });
      if (/authentication|invalid x-api-key|401/i.test(msg))
        return send(res, 502, { error: "That API key was rejected — double-check the fresh key in spike-world/.env and restart the server." });
      send(res, 502, { error: `Brain error: ${msg}` });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Anima brain proxy on http://localhost:${PORT}  (model: ${MODEL}, key: ${KEY ? "present" : "MISSING"})`);
});
