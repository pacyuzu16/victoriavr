import {
  tools,
  perceive,
  say,
  youSaid,
  lastEntityId,
  pushHistory,
  PROP_TYPES,
} from "./world";

// ─────────────────────────────────────────────────────────────────────────────
// THE BRAIN (mock).
//
// This stands in for the LLM. In the real build, `runCommand` becomes a single
// call to a tool-calling model: system prompt (Anima persona) + perceive() +
// memory + the `tools` schema -> the model emits tool calls we execute.
//
// Here we fake the model with a forgiving intent parser so we can prove the whole
// pipeline — command -> tool calls -> world mutation -> perception — with zero API
// keys. The wow beat ("say it, the world changes") is real; only the parser is mocked.
// ─────────────────────────────────────────────────────────────────────────────

const PROPS = PROP_TYPES;

const NUMS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, couple: 2, three: 3, few: 3, several: 4, four: 4, five: 5, six: 6,
};

// How many of a prop to spawn, from phrases like "two plants" / "a couple of candles" / "3 mugs".
function countFor(text: string, prop: string): number {
  const m = text.match(new RegExp(`(\\w+)\\s+(?:of\\s+)?${prop}s?\\b`));
  if (m) {
    const w = m[1];
    if (NUMS[w] != null) return Math.min(NUMS[w], 6);
    if (/^\d+$/.test(w)) return Math.min(parseInt(w, 10), 6);
  }
  return 1;
}

function pick<T>(text: string, table: Record<string, T>): T | null {
  for (const key of Object.keys(table)) if (text.includes(key)) return table[key];
  return null;
}

export function runCommand(raw: string) {
  const text = raw.toLowerCase().trim();
  if (!text) return;
  youSaid(raw);
  pushHistory();

  let acted = false;
  const did = (fn: () => void) => {
    fn();
    acted = true;
  };

  // — lighting —
  if (/\b(dim|darker|lower the lights?|too bright)\b/.test(text)) did(() => tools.setLight(0.15));
  else if (/\b(bright|lights? on|brighter|full light)\b/.test(text)) did(() => tools.setLight(1));
  else {
    const pct = text.match(/lights?\s*(?:to|at)?\s*(\d{1,3})\s*%/);
    if (pct) did(() => tools.setLight(parseInt(pct[1], 10) / 100));
  }

  // — time of day —
  const tod = pick(text, {
    night: "night",
    midnight: "night",
    dusk: "dusk",
    evening: "dusk",
    sunset: "dusk",
    day: "day",
    morning: "day",
    noon: "day",
    daytime: "day",
  } as const);
  if (tod) did(() => tools.setTimeOfDay(tod));

  // — reset —
  if (/\breset( the)?( room)?|start over|clean slate\b/.test(text)) {
    did(() => tools.reset());
  }

  // — weather —
  if (/\brain|storm|downpour\b/.test(text)) did(() => tools.setWeather("rain"));
  else if (/\bsnow|snowing|blizzard\b/.test(text)) did(() => tools.setWeather("snow"));
  else if (/\bfog|foggy|mist|misty\b/.test(text)) did(() => tools.setWeather("fog"));
  else if (/\bsunny|stop the (rain|snow)|clear (sky|skies|weather)|dry\b/.test(text)) did(() => tools.setWeather("clear"));

  // — window —
  if (/\bopen the window|window open\b/.test(text)) did(() => tools.setWindow(true));
  else if (/\bclose the window|window closed?\b/.test(text)) did(() => tools.setWindow(false));

  // — remove / clear —
  if (/\b(clear the (room|table|props)|remove everything|tidy up|empty the room)\b/.test(text)) {
    did(() => tools.clearProps());
  } else if (/\bremove|take away|delete\b/.test(text)) {
    const id = lastEntityId();
    if (id) did(() => tools.removeObject(id));
  }

  // — move (simple: nudge the most recent prop) —
  const dir = pick(text, {
    left: [-0.6, 0, 0],
    right: [0.6, 0, 0],
    forward: [0, 0, -0.6],
    back: [0, 0, 0.6],
    closer: [0, 0, 0.6],
    away: [0, 0, -0.6],
  } as Record<string, [number, number, number]>);
  if (dir && /\bmove|nudge|push|slide\b/.test(text)) {
    const id = lastEntityId();
    if (id) did(() => tools.moveObject(id, dir));
  }

  // — spawn (supports "add a lantern and a plant") —
  if (/\b(add|spawn|bring|place|put|give me|i want)\b/.test(text)) {
    for (const p of PROPS) if (text.includes(p)) did(() => tools.spawnObject(p));
  }

  // — Anima's spoken reply, grounded in what she now perceives —
  if (acted) {
    say(reply(text) + " " + perceptionAside());
  } else {
    say(
      "I can change the lights, time of day (day/dusk/night), weather (rain/snow/fog/clear), " +
        "open/close the window, reset the room, or add/move/remove a lantern, guitar, plant, candle, " +
        "books, or flowers. Try: “dim the lights and light a candle.”"
    );
  }
}

function reply(text: string): string {
  if (text.includes("dim")) return "Dimming the lights for you.";
  if (text.includes("night")) return "Bringing on the night.";
  if (text.includes("rain")) return "Letting the rain roll in.";
  if (/\bguitar\b/.test(text)) return "Here's the red guitar.";
  return "Done.";
}

// A tiny flourish so Anima feels like she's *perceiving*, not just executing.
function perceptionAside(): string {
  const s = perceive();
  if (s.includes("Window is open") && (s.includes("rain") || s.includes("night")))
    return "(By the way — the window's still open.)";
  return "";
}
