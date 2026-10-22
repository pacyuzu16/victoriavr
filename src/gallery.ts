// ─────────────────────────────────────────────────────────────────────────────
// SCENE GALLERY — save, name, and reload whole worlds. Builds on the same
// compact serialization used for share links, persisted in localStorage.
// ─────────────────────────────────────────────────────────────────────────────
import { serializeWorld, restoreWorld, useWorld } from "./world";

export interface SavedScene {
  id: string;
  name: string;
  code: string; // serialized world (same format as share links)
  time: string;
  weather: string;
  light: number; // 0..1
  count: number; // objects
  savedAt: number;
}

const KEY = "anima-gallery";

export function listScenes(): SavedScene[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedScene[]) : [];
  } catch {
    return [];
  }
}

function write(scenes: SavedScene[]) {
  try { localStorage.setItem(KEY, JSON.stringify(scenes.slice(0, 24))); } catch { /* ignore */ }
}

export function saveScene(name: string): SavedScene {
  const s = useWorld.getState();
  const scene: SavedScene = {
    id: `sc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: name.trim() || `Scene ${listScenes().length + 1}`,
    code: serializeWorld(),
    time: s.timeOfDay,
    weather: s.weather,
    light: s.lightLevel,
    count: s.entities.length,
    savedAt: Date.now(),
  };
  write([scene, ...listScenes()]);
  return scene;
}

export function deleteScene(id: string) {
  write(listScenes().filter((x) => x.id !== id));
}

export function loadScene(scene: SavedScene): boolean {
  return restoreWorld(scene.code);
}

export function sceneSummary(s: SavedScene): string {
  const bits = [s.time, s.weather !== "clear" ? s.weather : null, `${Math.round(s.light * 100)}% light`];
  if (s.count) bits.push(`${s.count} object${s.count > 1 ? "s" : ""}`);
  return bits.filter(Boolean).join(" · ");
}

// A little gradient swatch that evokes the scene's time + weather.
const SKY: Record<string, [string, string]> = {
  day: ["#8fb7e6", "#cfe4ff"],
  dusk: ["#e88a4e", "#7a4a86"],
  night: ["#0c1330", "#26326b"],
};
export function sceneSwatch(s: SavedScene): string {
  const [a, b] = SKY[s.time] || SKY.day;
  const warm = s.weather === "clear" && s.light < 0.4 ? ", #ffb86b 120%" : "";
  return `linear-gradient(140deg, ${a}, ${b}${warm})`;
}
