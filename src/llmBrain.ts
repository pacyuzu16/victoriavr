// THROWAWAY R&D — the REAL brain. Replaces the mock parser with Claude tool-calling.
// Flow: user text + grounded perception -> /api/anima (proxy) -> Claude emits tool calls +
// speech -> we execute the tool calls against the live world and speak the reply.
import { tools, perceive, say, youSaid, lastEntityId, setBusy, pushHistory, type PropType } from "./world";
import { speak } from "./speech";

// Conversation memory — this is what makes Anima "remember you" across turns.
const history: { role: "user" | "assistant"; content: string }[] = [];

const DIRS: Record<string, [number, number, number]> = {
  left: [-0.6, 0, 0], right: [0.6, 0, 0], forward: [0, 0, -0.6], back: [0, 0, 0.6],
};

export function executeTool(name: string, input: any) {
  switch (name) {
    case "set_light": return tools.setLight(Number(input?.level ?? 1));
    case "set_time_of_day": return tools.setTimeOfDay(input?.time);
    case "set_weather": return tools.setWeather(input?.weather);
    case "spawn_object": return tools.spawnObject(input?.type as PropType);
    case "set_window": return tools.setWindow(!!input?.open);
    case "clear_props": return tools.clearProps();
    case "reset_room": return tools.reset();
    case "remove_last_object": {
      const id = lastEntityId();
      return id ? tools.removeObject(id) : undefined;
    }
    case "move_last_object": {
      const id = lastEntityId();
      const d = DIRS[input?.direction] ?? [0, 0, 0];
      return id ? tools.moveObject(id, d) : undefined;
    }
    default: return undefined;
  }
}

export async function runCommandLLM(raw: string) {
  const text = raw.trim();
  if (!text) return;
  youSaid(raw);
  pushHistory();

  history.push({ role: "user", content: `[Room right now: ${perceive()}]\n${raw}` });

  let data: { text?: string; toolCalls?: { name: string; input: any }[] };
  setBusy(true);
  try {
    const res = await fetch("/api/anima", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({} as any));
      say(e.error || `Brain error (${res.status}).`);
      return;
    }
    data = await res.json();
  } catch {
    say("I couldn't reach my brain — is the proxy running? (npm run server)");
    return;
  } finally {
    setBusy(false);
  }

  for (const call of data.toolCalls ?? []) executeTool(call.name, call.input);

  const reply = (data.text || "").trim() || "Done.";
  history.push({ role: "assistant", content: reply });
  say(reply);
  speak(reply);
}
