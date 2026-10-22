import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import Scene from "./Scene";
import {
  useWorld, perceive, resetWorld, undo, redo, selectObject,
  nudgeSelected, rotateSelected, duplicateSelected, deleteSelected,
  serializeWorld, restoreWorld, persistScene, loadPersisted, setHeroSplat, say, pushHistory,
  type TimeOfDay, type Weather,
} from "./world";
import { runCommand } from "./brain";
import { runCommandLLM } from "./llmBrain";
import { createRecognition, speechSupported } from "./speech";
import { cam } from "./camera";
import { applyMood, type MoodName } from "./presets";
import { toggleAmbience, setAmbienceWeather } from "./sound";
import { webgpuAvailable, initOnDevice, runCommandOnDevice } from "./webllm";
import {
  startDirector, stopDirector, directorRunning, directorStepCount, type DirectorStep,
} from "./director";
import {
  listScenes, saveScene, deleteScene, loadScene, sceneSummary, sceneSwatch, type SavedScene,
} from "./gallery";
import Intro from "./Intro";
import {
  Sun, Moon, RotateCcw, Mic, Send, ZoomIn, ZoomOut, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Home, Orbit, Camera, Maximize, Minimize, Info, X,
  Flame, CloudRain, Sunrise, BookOpen, Sparkles, Undo2, Redo2, Share2, Trash2, Copy, RotateCw,
  PanelRightClose, PanelRightOpen, Gamepad2, Upload, Volume2, VolumeX,
  Clapperboard, Library, Square, Lightbulb, Clock, Snowflake, CloudFog, DoorOpen, DoorClosed,
  Move, PlusCircle, Boxes, Wrench, Plus,
} from "lucide-react";

type Brain = "mock" | "claude" | "device";
const BRAIN_LABEL: Record<Brain, string> = { mock: "Mock", claude: "Claude", device: "On-device" };

const MOODS: { name: MoodName; Icon: typeof Flame }[] = [
  { name: "Cozy", Icon: Flame }, { name: "Storm", Icon: CloudRain }, { name: "Morning", Icon: Sunrise },
  { name: "Focus", Icon: BookOpen }, { name: "Surprise", Icon: Sparkles },
];

// Aurora tint per time-of-day — keeps the ambient frame alive with the scene.
const TINT: Record<TimeOfDay, [string, string]> = {
  day: ["#5b7cff", "#ffcf8a"],
  dusk: ["#8a4fd0", "#ff8a4e"],
  night: ["#2b3a8f", "#5a3f8f"],
};

// Suggestions that read the room — they change with world state so they always
// propose something useful (context-aware recommendations, not a static list).
function suggestChips(s: ReturnType<typeof useWorld.getState>): string[] {
  return [
    s.lightLevel > 0.55 ? "dim the lights" : "brighten the room",
    s.timeOfDay !== "night" ? "make it night" : "bring back the morning",
    s.weather === "clear" ? "let it rain" : "clear the skies",
    s.windowOpen ? "close the window" : "open the window",
    s.entities.length === 0 ? "add a candle and books" : "add a plant",
    "make it cozy",
  ];
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (document.documentElement.dataset.theme as "light" | "dark") || "dark"
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("anima-theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

const TOOL_ICON: Record<string, typeof Wrench> = {
  setLight: Lightbulb, setTimeOfDay: Clock, setWeather: CloudRain, spawnObject: PlusCircle,
  setWindow: DoorOpen, moveObject: Move, removeObject: Trash2, clearProps: Trash2, reset: RotateCcw,
};

function Log() {
  const log = useWorld((s) => s.log);
  const busy = useWorld((s) => s.busy);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [log.length, busy]);
  return (
    <div className="log" ref={ref} role="log" aria-live="polite" aria-label="Conversation with Anima">
      {log.map((l, i) => {
        if (l.role === "tool") {
          const [call, result] = l.text.split(" → ");
          const fn = call.split("(")[0];
          const Icon = TOOL_ICON[fn] || Wrench;
          return (
            <div key={i} className="msg msg--tool">
              <span className="receipt"><Icon size={13} /><b>{call}</b>{result && <><span className="receipt__arrow">→</span>{result}</>}</span>
            </div>
          );
        }
        return (
          <div key={i} className={`msg msg--${l.role}`}>
            <span className="msg__role">{l.role}</span>
            <span className="msg__body">{l.text}</span>
          </div>
        );
      })}
      {busy && (
        <div className="msg msg--anima">
          <span className="msg__role">anima</span>
          <span className="typing"><span /><span /><span /></span>
        </div>
      )}
    </div>
  );
}

const TIME_ICON: Record<TimeOfDay, typeof Sun> = { day: Sun, dusk: Sunrise, night: Moon };
const WX_ICON: Record<Weather, typeof Sun> = { clear: Sun, rain: CloudRain, snow: Snowflake, fog: CloudFog };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Hud() {
  const { timeOfDay, weather, lightLevel, windowOpen, entities } = useWorld();
  const TIcon = TIME_ICON[timeOfDay];
  const WIcon = WX_ICON[weather];
  const lightLow = lightLevel < 0.4;
  return (
    <div className="hud">
      <div className="hud__label">
        what anima perceives
        <span className="vital__k" style={{ textTransform: "none", letterSpacing: 0 }}>
          {entities.length ? `${entities.length} object${entities.length > 1 ? "s" : ""}` : "empty room"}
        </span>
      </div>
      <div className="vitals">
        <div className={`vital${timeOfDay === "dusk" ? " vital--warm" : ""}`}>
          <span className="vital__ic"><TIcon size={14} /></span>
          <span className="vital__txt"><span className="vital__k">Time</span><span className="vital__v">{cap(timeOfDay)}</span></span>
        </div>
        <div className={`vital${weather !== "clear" ? " vital--good" : ""}`}>
          <span className="vital__ic"><WIcon size={14} /></span>
          <span className="vital__txt"><span className="vital__k">Weather</span><span className="vital__v">{cap(weather)}</span></span>
        </div>
        <div className={`vital${lightLow ? " vital--warm" : ""}`}>
          <span className="vital__ic"><Lightbulb size={14} /></span>
          <span className="vital__txt"><span className="vital__k">Lights</span><span className="vital__v vital__v--count">{Math.round(lightLevel * 100)}%</span></span>
        </div>
        <div className="vital">
          <span className="vital__ic">{windowOpen ? <DoorOpen size={14} /> : <DoorClosed size={14} />}</span>
          <span className="vital__txt"><span className="vital__k">Window</span><span className="vital__v">{windowOpen ? "Open" : "Closed"}</span></span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  const [text, setText] = useState("");
  const [brain, setBrain] = useState<Brain>("mock");
  const [listening, setListening] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [camOpen, setCamOpen] = useState(true);
  const [auto, setAuto] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(() => !localStorage.getItem("anima-hint"));
  const [dragOver, setDragOver] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem("anima-seen"));
  const [director, setDirector] = useState<{ i: number; step: DirectorStep } | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [scenes, setScenes] = useState<SavedScene[]>(() => listScenes());
  const [sceneName, setSceneName] = useState("");
  const [speakPulse, setSpeakPulse] = useState(false);

  const weather = useWorld((s) => s.weather);
  const timeOfDay = useWorld((s) => s.timeOfDay);
  const busy = useWorld((s) => s.busy);
  const lastMsg = useWorld((s) => s.log[s.log.length - 1]);
  const recRef = useRef<ReturnType<typeof createRecognition>>(null);
  const splatInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUndo = useWorld((s) => s._undo.length > 0);
  const canRedo = useWorld((s) => s._redo.length > 0);
  const selectedId = useWorld((s) => s.selectedId);
  const selType = useWorld((s) => s.entities.find((x) => x.id === s.selectedId)?.type);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1800); };
  const dismissHint = () => { setHint(false); localStorage.setItem("anima-hint", "1"); };

  // Anima's presence orb reflects her state: thinking while busy, a warm pulse when she replies.
  useEffect(() => {
    if (lastMsg?.role === "anima") {
      setSpeakPulse(true);
      const t = window.setTimeout(() => setSpeakPulse(false), 1500);
      return () => window.clearTimeout(t);
    }
  }, [lastMsg]);
  const orbClass = busy ? "orb orb--think" : speakPulse ? "orb orb--speak" : "orb";

  // Keep the aurora tint in step with the time of day.
  useEffect(() => {
    const [a, b] = TINT[timeOfDay];
    document.documentElement.style.setProperty("--tod-a", a);
    document.documentElement.style.setProperty("--tod-b", b);
  }, [timeOfDay]);

  const cancelDirector = () => { if (directorRunning()) { stopDirector(); setDirector(null); } };

  const loadSplatFile = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(splat|ply|ksplat)$/i.test(f.name)) { flash("Please drop a .splat, .ply, or .ksplat file"); return; }
    setHeroSplat(URL.createObjectURL(f));
    flash(`Loaded scene: ${f.name}`);
  };
  const onPickSplat = (e: React.ChangeEvent<HTMLInputElement>) => {
    loadSplatFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const submit = (v: string) => {
    if (!v.trim()) return;
    cancelDirector();
    if (hint) dismissHint();
    if (brain === "claude") runCommandLLM(v);
    else if (brain === "device") runCommandOnDevice(v);
    else runCommand(v);
    setText("");
  };

  const mood = (name: MoodName) => { cancelDirector(); applyMood(name); };

  const chooseBrain = (b: Brain) => {
    setBrain(b);
    if (b === "device" && !engineReady) {
      if (!webgpuAvailable()) {
        setBrain("mock");
        flash("On-device AI needs WebGPU (Chrome/Edge on a modern GPU). Using the offline brain.");
        return;
      }
      setDeviceStatus("Preparing on-device AI… (first run downloads a small model)");
      initOnDevice((m) => setDeviceStatus(m)).then((ok) => {
        setDeviceStatus(null);
        if (ok) { setEngineReady(true); say("On-device AI ready — talk to me."); }
        else { setBrain("mock"); flash("Couldn't start on-device AI. Using the offline brain."); }
      });
    }
  };

  const toggleMic = () => {
    cancelDirector();
    if (listening) return recRef.current?.stop();
    const rec = createRecognition((t) => submit(t), () => setListening(false));
    if (!rec) return;
    recRef.current = rec; setListening(true); rec.start();
  };

  const capture = () => {
    const c = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = `anima-${Date.now()}.png`; a.click();
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${serializeWorld()}`;
    history.replaceState(null, "", url);
    try { await navigator.clipboard.writeText(url); flash("Scene link copied to clipboard"); }
    catch { flash("Scene saved to the URL — copy it from the address bar"); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().then(() => setIsFull(true)).catch(() => {});
    else document.exitFullscreen?.().then(() => setIsFull(false)).catch(() => {});
  };

  // ── Director Mode ──
  const startDemo = () => {
    setGalleryOpen(false); setShowHelp(false);
    startDirector({
      onStep: (i, step) => setDirector({ i, step }),
      onDone: () => window.setTimeout(() => setDirector(null), 3400),
    });
  };
  const endDemo = () => { stopDirector(); setDirector(null); };

  // ── Scene gallery ──
  const doSave = () => {
    const s = saveScene(sceneName);
    setScenes(listScenes()); setSceneName("");
    flash(`Saved "${s.name}"`);
  };
  const doLoad = (sc: SavedScene) => {
    cancelDirector(); pushHistory();
    if (loadScene(sc)) { flash(`Loaded "${sc.name}"`); setGalleryOpen(false); }
  };
  const doDelete = (id: string) => { deleteScene(id); setScenes(listScenes()); };

  // intro actions
  const seenIntro = () => localStorage.setItem("anima-seen", "1");
  const introBegin = () => { seenIntro(); setShowIntro(false); };
  const introWatch = () => { seenIntro(); setShowIntro(false); startDemo(); };

  // restore a shared scene from the URL, else the last local scene, on first load
  useEffect(() => {
    const sp = new URLSearchParams(location.search).get("splat");
    if (sp) setHeroSplat(sp);
    const m = location.hash.match(/^#s=(.+)$/);
    if (m && restoreWorld(m[1])) { flash("Loaded a shared scene"); setShowIntro(false); }
    else loadPersisted();
  }, []);

  useEffect(() => { if (soundOn) setAmbienceWeather(weather); }, [weather, soundOn]);

  useEffect(() => {
    let t: number;
    const unsub = useWorld.subscribe(() => { clearTimeout(t); t = window.setTimeout(persistScene, 400); });
    return () => { clearTimeout(t); unsub(); };
  }, []);

  useEffect(() => {
    const fs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fs);
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "INPUT";
      if (typing) return;
      if (e.key === "Escape" && directorRunning()) { endDemo(); return; }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      else if (e.key === "Escape") selectObject(null);
      else if (!mod && e.key >= "1" && e.key <= "5") mood(MOODS[+e.key - 1].name);
      else if (!mod && e.key.toLowerCase() === "c") capture();
      else if (!mod && e.key.toLowerCase() === "f") toggleFullscreen();
      else if (!mod && e.key.toLowerCase() === "r") resetWorld();
      else if (!mod && e.key.toLowerCase() === "d") (directorRunning() ? endDemo() : startDemo());
      else if (!mod && e.key === "?") setShowHelp((v) => !v);
      else if (!mod && e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("fullscreenchange", fs); window.removeEventListener("keydown", key); };
  }, []);

  const chips = suggestChips(useWorld.getState());
  const devicePct = deviceStatus?.match(/(\d+)%/)?.[1];

  return (
    <div
      className="app"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.target === e.currentTarget) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); loadSplatFile(e.dataTransfer.files?.[0]); }}
    >
      {dragOver && <div className="dropzone">Drop a .splat / .ply to load your space</div>}
      <div className="stage">
        <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ position: [2.6, 1.6, 3.2], fov: 45 }} onPointerMissed={() => selectObject(null)}>
          <Scene />
        </Canvas>
      </div>
      <div className="aurora" aria-hidden />
      <div className="scrim" aria-hidden />

      <div className="toolbar">
        <button className="iconbtn" aria-label="Watch Anima build (demo)" title="Watch Anima build — press D" onClick={() => (director ? endDemo() : startDemo())}><Clapperboard size={17} /></button>
        <button className="iconbtn" aria-label="Scenes" title="Saved scenes" onClick={() => setGalleryOpen((o) => !o)}><Library size={17} /></button>
        <button className="iconbtn" aria-label="Capture photo" title="Capture photo (C)" onClick={capture}><Camera size={17} /></button>
        <button className="iconbtn" aria-label="Share scene" title="Share this scene" onClick={share}><Share2 size={17} /></button>
        <button className="iconbtn" aria-label="Load your own scene" title="Load a .splat/.ply scene" onClick={() => splatInputRef.current?.click()}><Upload size={17} /></button>
        <input ref={splatInputRef} type="file" accept=".splat,.ply,.ksplat" onChange={onPickSplat} className="hidden" />
        <button className="iconbtn" aria-label="Fullscreen" title="Fullscreen (F)" onClick={toggleFullscreen}>{isFull ? <Minimize size={17} /> : <Maximize size={17} />}</button>
        <button className="iconbtn" aria-label="Ambient sound" title="Ambient sound" onClick={() => setSoundOn(toggleAmbience(!soundOn, weather))}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        <button className="iconbtn" aria-label="Help" title="What can Anima do? (?)" onClick={() => setShowHelp((v) => !v)}><Info size={17} /></button>
      </div>

      <div className="camctl">
        <button className={`cambtn${camOpen ? " cambtn--on" : ""}`} aria-label="Camera controls" title="Camera controls" onClick={() => setCamOpen((o) => !o)}><Gamepad2 size={17} /></button>
        {camOpen && (
          <>
            <button className="cambtn" aria-label="Zoom in" title="Zoom in" onClick={cam.zoomIn}><ZoomIn size={17} /></button>
            <button className="cambtn" aria-label="Zoom out" title="Zoom out" onClick={cam.zoomOut}><ZoomOut size={17} /></button>
            <div className="dpad">
              <span />
              <button className="cambtn" aria-label="Orbit up" onClick={cam.orbitUp}><ChevronUp size={17} /></button>
              <span />
              <button className="cambtn" aria-label="Orbit left" onClick={cam.orbitLeft}><ChevronLeft size={17} /></button>
              <button className="cambtn" aria-label="Reset view" title="Reset view" onClick={cam.reset}><Home size={15} /></button>
              <button className="cambtn" aria-label="Orbit right" onClick={cam.orbitRight}><ChevronRight size={17} /></button>
              <span />
              <button className="cambtn" aria-label="Orbit down" onClick={cam.orbitDown}><ChevronDown size={17} /></button>
              <span />
            </div>
            <button className={`cambtn${auto ? " cambtn--on" : ""}`} aria-label="Auto-rotate" title="Auto-rotate" onClick={() => setAuto(cam.toggleAuto())}><Orbit size={17} /></button>
          </>
        )}
      </div>

      {selectedId && (
        <div className="objbar">
          <span className="objbar__label">{selType || "object"}</span>
          <button className="cambtn" aria-label="Move forward" onClick={() => nudgeSelected(0, -0.25)}><ChevronUp size={16} /></button>
          <button className="cambtn" aria-label="Move back" onClick={() => nudgeSelected(0, 0.25)}><ChevronDown size={16} /></button>
          <button className="cambtn" aria-label="Move left" onClick={() => nudgeSelected(-0.25, 0)}><ChevronLeft size={16} /></button>
          <button className="cambtn" aria-label="Move right" onClick={() => nudgeSelected(0.25, 0)}><ChevronRight size={16} /></button>
          <button className="cambtn" aria-label="Rotate" title="Rotate" onClick={() => rotateSelected()}><RotateCw size={16} /></button>
          <button className="cambtn" aria-label="Duplicate" title="Duplicate" onClick={duplicateSelected}><Copy size={16} /></button>
          <button className="cambtn cambtn--danger" aria-label="Delete" title="Delete" onClick={deleteSelected}><Trash2 size={16} /></button>
          <button className="cambtn" aria-label="Deselect" onClick={() => selectObject(null)}><X size={16} /></button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
      {deviceStatus && (
        <div className="toast toast--status">
          <span>{deviceStatus}</span>
          <span className={`progress${devicePct ? "" : " progress--indet"}`}>
            <span className="progress__bar" style={devicePct ? { width: `${devicePct}%` } : undefined} />
          </span>
        </div>
      )}

      {hint && !selectedId && !director && (
        <div className="hintbar">
          <span>Tell Anima what to do — try a mood, tap the mic, or press <kbd>D</kbd> to watch her build.</span>
          <button className="iconbtn" aria-label="Dismiss hint" onClick={dismissHint}><X size={15} /></button>
        </div>
      )}

      {director && (
        <div className="director" role="status" aria-live="polite">
          <div className="director__head">
            <span className="orb orb--think" style={{ ["--s" as any]: "20px" }} aria-hidden />
            <span className="director__tag">Director</span>
            <span className="director__title">Anima is building your world</span>
            <button className="iconbtn" aria-label="Stop demo" title="Stop (Esc)" onClick={endDemo}><Square size={14} /></button>
          </div>
          <div className="director__caption">
            {director.step.cmd && <span className="cmd">“{director.step.cmd}” </span>}
            {director.step.caption}
          </div>
          <div className="director__steps">
            {Array.from({ length: directorStepCount }).map((_, i) => (
              <span key={i} className={`director__step${i < director.i ? " director__step--done" : i === director.i ? " director__step--active" : ""}`} />
            ))}
          </div>
        </div>
      )}

      {showHelp && (
        <div className="help" role="dialog" aria-label="What Anima can do">
          <div className="help__head"><span>What Anima can do</span><button className="iconbtn" aria-label="Close" onClick={() => setShowHelp(false)}><X size={16} /></button></div>
          <ul className="help__list">
            <li>Change <b>lighting</b>, <b>time of day</b> (day/dusk/night), <b>weather</b> (rain/snow/fog/clear)</li>
            <li>Open/close the <b>window</b>, or <b>reset</b> the room</li>
            <li>Add: lantern, guitar, plant, candle, books, flowers, mug, rug — say a <b>count</b> too ("add three plants")</li>
            <li>Say a <b>vibe</b>: "make it spooky / cozy / romantic / dramatic"</li>
            <li><b>Click any object</b> to move, rotate, duplicate or delete it</li>
            <li><b>Save scenes</b> to your gallery · <b>Share</b> a link to your exact world · <b>Load</b> your own .splat</li>
            <li>Brains: <b>Mock</b> (offline), <b>Claude</b> (needs a key), <b>On-device</b> (a real LLM in your browser via WebGPU)</li>
            <li><b>Keyboard:</b> <kbd>D</kbd> demo · <kbd>1</kbd>–<kbd>5</kbd> moods · <kbd>C</kbd> capture · <kbd>F</kbd> fullscreen · <kbd>R</kbd> reset · <kbd>/</kbd> focus · <kbd>?</kbd> help · <kbd>⌘Z</kbd> undo</li>
          </ul>
          <button className="btn btn--ghost" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => { setShowHelp(false); startDemo(); }}>
            <Clapperboard size={15} /> Watch Anima build
          </button>
        </div>
      )}

      {galleryOpen && (
        <div className="gallery" role="dialog" aria-label="Saved scenes">
          <div className="gallery__head"><span>Scenes</span><button className="iconbtn" aria-label="Close" onClick={() => setGalleryOpen(false)}><X size={16} /></button></div>
          <div className="gallery__save">
            <input className="field" placeholder="Name this world…" value={sceneName} onChange={(e) => setSceneName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSave()} />
            <button className="send" aria-label="Save scene" title="Save current world" onClick={doSave}><Plus size={18} /></button>
          </div>
          <div className="gallery__list">
            {scenes.length === 0 && <div className="gallery__empty">No saved worlds yet.<br />Craft a scene, then save it here to revisit or compare.</div>}
            {scenes.map((sc) => (
              <div key={sc.id} className="scene" role="button" tabIndex={0} onClick={() => doLoad(sc)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && doLoad(sc)}>
                <span className="scene__swatch" style={{ background: sceneSwatch(sc) }} />
                <span className="scene__meta">
                  <span className="scene__name">{sc.name}</span>
                  <span className="scene__desc">{sceneSummary(sc)}</span>
                </span>
                <button className="scene__del" aria-label={`Delete ${sc.name}`} onClick={(e) => { e.stopPropagation(); doDelete(sc.id); }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!panelOpen && (
        <button className="fab" aria-label="Open Anima panel" onClick={() => setPanelOpen(true)}>
          <span className="orb" style={{ ["--s" as any]: "20px" }} aria-hidden /> Anima
        </button>
      )}

      <div className={`panel${panelOpen ? "" : " panel--hidden"}`}>
        <button className="grip" aria-label="Close panel" onClick={() => setPanelOpen(false)} />

        <div className="top">
          <div className="brand">
            <span className={orbClass} aria-hidden />
            <span className="brand__col">
              <span className="brand__name">Anima</span>
              <span className="brand__sub">living worlds</span>
            </span>
          </div>
          <div className="spacer" />
          <button className="iconbtn" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={() => undo()}><Undo2 size={17} /></button>
          <button className="iconbtn" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={() => redo()}><Redo2 size={17} /></button>
          <button className="iconbtn" aria-label="Reset room" title="Reset room (R)" onClick={() => resetWorld()}><RotateCcw size={17} /></button>
          <button className="iconbtn" aria-label="Toggle theme" title="Light / dark" onClick={toggle}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button className="iconbtn" aria-label="Collapse panel" title="Collapse panel" onClick={() => setPanelOpen(false)}><PanelRightClose size={17} /></button>
        </div>

        <div className="sub"><Sparkles size={13} /> natural language → tool calls → live world change</div>

        <div className="segmented" role="tablist" aria-label="AI brain">
          {(["mock", "claude", "device"] as Brain[]).map((b) => (
            <button key={b} role="tab" aria-selected={brain === b} className={`seg${brain === b ? " seg--on" : ""}`} onClick={() => chooseBrain(b)}>
              {b === "device" && engineReady && <span className="seg__dot" />}
              {BRAIN_LABEL[b]}
            </button>
          ))}
        </div>

        <div className="moods">
          {MOODS.map(({ name, Icon }) => (
            <button key={name} className="mood" onClick={() => mood(name)}><Icon size={13} /> {name}</button>
          ))}
        </div>

        <Hud />
        <Log />

        <div className="chips">
          {chips.map((c) => (<button key={c} className="chip" onClick={() => submit(c)}>{c}</button>))}
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
          {speechSupported() && (
            <button type="button" className={`mic${listening ? " mic--on" : ""}`} onClick={toggleMic} aria-label="Speak to Anima" title="Speak to Anima"><Mic size={18} /></button>
          )}
          <input ref={inputRef} className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={brain === "claude" ? "talk to Anima…" : "tell Anima what to do…"} />
          <button className="send" type="submit" aria-label="Send"><Send size={18} /></button>
        </form>
      </div>

      {showIntro && <Intro onBegin={introBegin} onWatch={introWatch} />}
    </div>
  );
}
