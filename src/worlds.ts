// ─────────────────────────────────────────────────────────────────────────────
// WORLD TEMPLATES — the generalizability layer, made concrete.
// The engine (natural language → validated tools → world state → render) is
// identical across every template. A template only changes the *vocabulary*:
// which objects exist, what to suggest, and how Anima greets you. Swap this and
// the exact same product becomes a tool for a different industry.
// ─────────────────────────────────────────────────────────────────────────────
import type { WorldId, PropType } from "./world";

export interface WorldMeta {
  id: WorldId;
  name: string; // short switcher label
  tagline: string; // one line under the name
  useCase: string; // who it's for / what it does (shown on switch)
  catalog: PropType[]; // objects this domain spawns
  suggestions: string[]; // starter chips tuned to the domain
  greeting: string; // Anima's line when you enter this world
}

export const WORLDS: Record<WorldId, WorldMeta> = {
  living: {
    id: "living",
    name: "Living Space",
    tagline: "Interior design & staging",
    useCase: "Design and stage an interior by voice — for homes, rentals, or virtual spaces.",
    catalog: ["lantern", "guitar", "plant", "candle", "books", "flowers", "mug", "rug", "lamp", "cushion"],
    suggestions: ["make it cozy", "dim the lights and light a candle", "add flowers and a plant", "make it night and let it rain"],
    greeting: "Living space — tell me how to set the scene. Try “make it cozy for the evening.”",
  },
  showroom: {
    id: "showroom",
    name: "Showroom",
    tagline: "Retail & e-commerce",
    useCase: "Stage a product showroom by voice — for retail, e-commerce, and launches.",
    catalog: ["pedestal", "product", "spotlight", "sign", "plant", "rug"],
    suggestions: ["add a pedestal and a product", "add two spotlights", "dim the lights for drama", "add a sign"],
    greeting: "Showroom mode — let's stage a product. Try “add a pedestal and a product, then two spotlights.”",
  },
  studio: {
    id: "studio",
    name: "Studio",
    tagline: "Workspace & productivity",
    useCase: "Lay out a workspace by voice — for office design, coworking, and remote setups.",
    catalog: ["desk", "monitor", "chair", "shelf", "lamp", "plant", "books", "mug"],
    suggestions: ["add a desk, a monitor and a chair", "add a shelf and some books", "add a plant and a lamp", "brighten the room"],
    greeting: "Studio mode — let's lay out a workspace. Try “add a desk, a monitor and a chair.”",
  },
};

export const WORLD_ORDER: WorldId[] = ["living", "showroom", "studio"];

// Natural words → object type, so users can speak domain language
// ("add a sneaker on a plinth", "put a screen on the desk").
export const SYNONYMS: Record<string, PropType> = {
  // showroom
  plinth: "pedestal", podium: "pedestal", stand: "pedestal", pedestals: "pedestal",
  item: "product", sneaker: "product", shoe: "product", showcase: "product", exhibit: "product",
  "spot light": "spotlight", spotlights: "spotlight", "track light": "spotlight",
  signage: "sign", placard: "sign", label: "sign", poster: "sign",
  // studio
  workstation: "desk", desks: "desk",
  screen: "monitor", display: "monitor", monitors: "monitor",
  seat: "chair", stool: "chair", chairs: "chair",
  shelves: "shelf", shelving: "shelf", bookshelf: "shelf", bookcase: "shelf",
};
