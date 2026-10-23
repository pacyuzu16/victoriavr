import { create } from "zustand";

// ─────────────────────────────────────────────────────────────────────────────
// THE WORLD  (our "ECS" for the spike: one authoritative store that the renderer
// reads and the agent's TOOLS write. Perception reads from it too.)
// ─────────────────────────────────────────────────────────────────────────────

export type PropType = "lantern" | "guitar" | "plant" | "candle" | "books" | "flowers" | "mug" | "rug" | "lamp" | "cushion";
export type TimeOfDay = "day" | "dusk" | "night";
export type Weather = "clear" | "rain" | "snow" | "fog";

export const PROP_TYPES: PropType[] = ["lantern", "guitar", "plant", "candle", "books", "flowers", "mug", "rug", "lamp", "cushion"];

export interface Entity {
  id: string;
  type: PropType;
  position: [number, number, number];
  rot?: number; // y-rotation (radians)
  lit?: boolean; // lanterns / candles glow
}

interface Snapshot {
  lightLevel: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
  entities: Entity[];
  windowOpen: boolean;
}

export type LogRole = "you" | "anima" | "tool";
export interface LogLine {
  role: LogRole;
  text: string;
}

interface WorldState {
  lightLevel: number; // 0..1
  timeOfDay: TimeOfDay;
  weather: Weather;
  entities: Entity[];
  log: LogLine[];
  windowOpen: boolean;
  busy: boolean; // agent is thinking
  selectedId: string | null;
  heroSplat: string; // URL of the photoreal Gaussian-splat environment
  splatLoading: boolean; // the hero environment is still downloading
  _undo: Snapshot[];
  _redo: Snapshot[];
}

const DEFAULTS = {
  lightLevel: 1,
  timeOfDay: "day" as TimeOfDay,
  weather: "clear" as Weather,
  entities: [] as Entity[],
  windowOpen: false,
  busy: false,
};

let idc = 0;
const nid = (t: string) => `${t}-${++idc}`;

const PROP_LABEL: Record<PropType, string> = {
  lantern: "a glowing lantern",
  guitar: "a red guitar",
  plant: "a potted plant",
  candle: "a lit candle",
  books: "a stack of books",
  flowers: "a vase of flowers",
  mug: "a steaming mug",
  rug: "a woven rug",
  lamp: "a warm lamp",
  cushion: "a soft cushion",
};

const GLOWING: PropType[] = ["lantern", "candle", "lamp"];

export const useWorld = create<WorldState>(() => ({
  ...DEFAULTS,
  selectedId: null,
  heroSplat: "/nike.splat",
  splatLoading: true,
  _undo: [],
  _redo: [],
  log: [{ role: "anima", text: "Hi — I'm Anima. Tell me what to do with this room." }],
}));

export const setHeroSplat = (url: string) => useWorld.setState({ heroSplat: url });
export const setSplatLoading = (v: boolean) => useWorld.setState({ splatLoading: v });

function log(role: LogRole, text: string) {
  useWorld.setState((s) => ({ log: [...s.log, { role, text }] }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLS — the world-mutation API the agent calls. Each validates, logs itself,
// and returns a short result string (what the LLM sees).
// ─────────────────────────────────────────────────────────────────────────────

function toolLog(call: string, result: string) {
  log("tool", `${call} → ${result}`);
  return result;
}

export const tools = {
  setLight(level: number) {
    const v = Math.max(0, Math.min(1, level));
    useWorld.setState({ lightLevel: v });
    return toolLog(`setLight(${v.toFixed(2)})`, `lights at ${Math.round(v * 100)}%`);
  },

  setTimeOfDay(t: TimeOfDay) {
    if (!["day", "dusk", "night"].includes(t)) return toolLog(`setTimeOfDay(${t})`, "invalid time");
    useWorld.setState({ timeOfDay: t });
    return toolLog(`setTimeOfDay("${t}")`, `it is now ${t}`);
  },

  setWeather(w: Weather) {
    if (!["clear", "rain", "snow", "fog"].includes(w)) return toolLog(`setWeather(${w})`, "invalid weather");
    useWorld.setState({ weather: w });
    return toolLog(`setWeather("${w}")`, `weather is ${w}`);
  },

  spawnObject(type: PropType) {
    if (!PROP_TYPES.includes(type)) return toolLog(`spawnObject(${type})`, `I don't have a "${type}"`);
    const angle = Math.random() * Math.PI * 2;
    const r = 0.9 + Math.random() * 0.6;
    const e: Entity = {
      id: nid(type),
      type,
      position: [Math.cos(angle) * r, type === "guitar" ? 0.5 : 0.18, Math.sin(angle) * r],
      rot: Math.random() * Math.PI * 2,
      lit: GLOWING.includes(type) ? true : undefined,
    };
    useWorld.setState((s) => ({ entities: [...s.entities, e] }));
    return toolLog(`spawnObject("${type}")`, `placed ${PROP_LABEL[type]} (${e.id})`);
  },

  moveObject(id: string, delta: [number, number, number]) {
    let moved = false;
    useWorld.setState((s) => ({
      entities: s.entities.map((e) => {
        if (e.id !== id) return e;
        moved = true;
        return { ...e, position: [e.position[0] + delta[0], e.position[1] + delta[1], e.position[2] + delta[2]] };
      }),
    }));
    return toolLog(`moveObject("${id}", …)`, moved ? `moved ${id}` : `no entity ${id}`);
  },

  removeObject(id: string) {
    let existed = false;
    useWorld.setState((s) => ({
      entities: s.entities.filter((e) => {
        if (e.id === id) existed = true;
        return e.id !== id;
      }),
    }));
    return toolLog(`removeObject("${id}")`, existed ? `removed ${id}` : `no entity ${id}`);
  },

  clearProps() {
    const n = useWorld.getState().entities.length;
    useWorld.setState({ entities: [] });
    return toolLog(`clearProps()`, `removed ${n} object(s)`);
  },

  setWindow(open: boolean) {
    useWorld.setState({ windowOpen: open });
    return toolLog(`setWindow(${open})`, open ? "window opened" : "window closed");
  },

  reset() {
    useWorld.setState({ ...DEFAULTS, selectedId: null });
    return toolLog(`reset()`, "room reset to a calm, empty daytime state");
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY (undo/redo) — one snapshot per user action. Callers invoke pushHistory()
// before mutating (command / mood / direct edit).
// ─────────────────────────────────────────────────────────────────────────────

const snap = (s: WorldState): Snapshot => ({
  lightLevel: s.lightLevel,
  timeOfDay: s.timeOfDay,
  weather: s.weather,
  entities: s.entities.map((e) => ({ ...e })),
  windowOpen: s.windowOpen,
});

export function pushHistory() {
  useWorld.setState((s) => ({ _undo: [...s._undo, snap(s)].slice(-60), _redo: [] }));
}
export function undo() {
  const s = useWorld.getState();
  if (!s._undo.length) return;
  const prev = s._undo[s._undo.length - 1];
  useWorld.setState({ ...prev, _undo: s._undo.slice(0, -1), _redo: [...s._redo, snap(s)].slice(-60), selectedId: null });
}
export function redo() {
  const s = useWorld.getState();
  if (!s._redo.length) return;
  const next = s._redo[s._redo.length - 1];
  useWorld.setState({ ...next, _redo: s._redo.slice(0, -1), _undo: [...s._undo, snap(s)].slice(-60), selectedId: null });
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION + direct manipulation
// ─────────────────────────────────────────────────────────────────────────────

export const selectObject = (id: string | null) => useWorld.setState({ selectedId: id });

const mutSelected = (fn: (e: Entity) => Entity) =>
  useWorld.setState((s) => ({
    entities: s.entities.map((e) => (e.id === s.selectedId ? fn(e) : e)),
  }));

export const nudgeSelected = (dx: number, dz: number) => {
  pushHistory();
  mutSelected((e) => ({ ...e, position: [e.position[0] + dx, e.position[1], e.position[2] + dz] }));
};
export const rotateSelected = (d = Math.PI / 6) => {
  pushHistory();
  mutSelected((e) => ({ ...e, rot: (e.rot || 0) + d }));
};
export const deleteSelected = () => {
  const id = useWorld.getState().selectedId;
  if (!id) return;
  pushHistory();
  useWorld.setState((s) => ({ entities: s.entities.filter((e) => e.id !== id), selectedId: null }));
};
export const duplicateSelected = () => {
  const s = useWorld.getState();
  const e = s.entities.find((x) => x.id === s.selectedId);
  if (!e) return;
  pushHistory();
  const copy: Entity = { ...e, id: nid(e.type), position: [e.position[0] + 0.35, e.position[1], e.position[2] + 0.35] };
  useWorld.setState((st) => ({ entities: [...st.entities, copy], selectedId: copy.id }));
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARE — encode/restore the whole scene as a compact URL-safe string.
// ─────────────────────────────────────────────────────────────────────────────

export function serializeWorld(): string {
  const s = useWorld.getState();
  const data = {
    l: +s.lightLevel.toFixed(2), t: s.timeOfDay, w: s.weather, o: s.windowOpen ? 1 : 0,
    e: s.entities.map((e) => ({ t: e.type, p: e.position.map((n) => +n.toFixed(2)), r: +(e.rot || 0).toFixed(2), li: e.lit ? 1 : 0 })),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function restoreWorld(code: string): boolean {
  try {
    const json = decodeURIComponent(escape(atob(code.replace(/-/g, "+").replace(/_/g, "/"))));
    const d = JSON.parse(json);
    const entities: Entity[] = (d.e || []).map((e: any) => ({
      id: nid(e.t), type: e.t, position: e.p, rot: e.r || 0, lit: e.li ? true : undefined,
    }));
    useWorld.setState({ lightLevel: d.l ?? 1, timeOfDay: d.t ?? "day", weather: d.w ?? "clear", windowOpen: !!d.o, entities, selectedId: null });
    return true;
  } catch {
    return false;
  }
}

// Auto-persistence: keep the current scene across refreshes.
const SCENE_KEY = "anima-scene";
export function persistScene() {
  try { localStorage.setItem(SCENE_KEY, serializeWorld()); } catch { /* ignore */ }
}
export function loadPersisted(): boolean {
  const c = localStorage.getItem(SCENE_KEY);
  return c ? restoreWorld(c) : false;
}

export const say = (text: string) => log("anima", text);
export const youSaid = (text: string) => log("you", text);
export const setBusy = (busy: boolean) => useWorld.setState({ busy });
export const resetWorld = () => {
  pushHistory();
  tools.reset();
};

// ─────────────────────────────────────────────────────────────────────────────
// PERCEPTION — grounded in world state (NOT pixels). The natural-language context
// the agent "sees" each turn. Robust + cheap; VLM is a stretch.
// ─────────────────────────────────────────────────────────────────────────────

export function perceive(s: WorldState = useWorld.getState()): string {
  const parts: string[] = [];
  parts.push(`Time: ${s.timeOfDay}. Weather: ${s.weather}. Lights: ${Math.round(s.lightLevel * 100)}%.`);
  parts.push(`Window is ${s.windowOpen ? "open" : "closed"}.`);
  if (s.entities.length === 0) parts.push("The room is empty apart from the table and the display object on it.");
  else parts.push(`On/near the table: ${s.entities.map((e) => `${PROP_LABEL[e.type]} (${e.id})`).join(", ")}.`);
  return parts.join(" ");
}

export const lastEntityId = (): string | null => {
  const es = useWorld.getState().entities;
  return es.length ? es[es.length - 1].id : null;
};
