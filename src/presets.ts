import { tools, say, youSaid, pushHistory, type PropType } from "./world";

export type MoodName = "Cozy" | "Storm" | "Morning" | "Focus" | "Surprise";

const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function applyMood(name: MoodName) {
  youSaid(`set the mood: ${name}`);
  pushHistory();
  switch (name) {
    case "Cozy":
      tools.reset();
      tools.setTimeOfDay("dusk");
      tools.setLight(0.22);
      tools.setWindow(false);
      tools.spawnObject("candle");
      tools.spawnObject("books");
      tools.spawnObject("mug");
      tools.spawnObject("rug");
      say("Made it cozy — candlelight, a warm mug, and a good book for the evening.");
      break;
    case "Storm":
      tools.reset();
      tools.setTimeOfDay("night");
      tools.setWeather("rain");
      tools.setLight(0.35);
      tools.setWindow(true);
      tools.spawnObject("lantern");
      say("A storm rolls in. I left the window cracked so you can hear the rain.");
      break;
    case "Morning":
      tools.reset();
      tools.setTimeOfDay("day");
      tools.setLight(1);
      tools.setWeather("clear");
      tools.setWindow(true);
      tools.spawnObject("flowers");
      tools.spawnObject("plant");
      tools.spawnObject("mug");
      say("Good morning — fresh air, flowers, and coffee.");
      break;
    case "Focus":
      tools.reset();
      tools.setTimeOfDay("day");
      tools.setLight(0.9);
      tools.setWeather("clear");
      tools.setWindow(false);
      tools.spawnObject("books");
      tools.spawnObject("plant");
      say("Clean and bright — let's focus.");
      break;
    case "Surprise": {
      tools.reset();
      tools.setTimeOfDay(rand(["day", "dusk", "night"] as const));
      tools.setWeather(rand(["clear", "rain", "snow", "fog"] as const));
      tools.setLight(0.2 + Math.random() * 0.8);
      tools.setWindow(Math.random() > 0.5);
      const all: PropType[] = ["lantern", "guitar", "plant", "candle", "books", "flowers", "mug", "rug"];
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) tools.spawnObject(rand(all));
      say("Here's something unexpected.");
      break;
    }
  }
}
