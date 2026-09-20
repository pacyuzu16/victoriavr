import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import Scene from "./Scene";
import {
  useWorld, perceive, resetWorld, undo, redo, selectObject,
  nudgeSelected, rotateSelected, duplicateSelected, deleteSelected,
  serializeWorld, restoreWorld, persistScene, loadPersisted, setHeroSplat, say,
} from "./world";
import { runCommand } from "./brain";
import { runCommandLLM } from "./llmBrain";
import { createRecognition, speechSupported } from "./speech";
import { cam } from "./camera";
import { applyMood, type MoodName } from "./presets";
import { toggleAmbience, setAmbienceWeather } from "./sound";
import { webgpuAvailable, initOnDevice, runCommandOnDevice } from "./webllm";
import {
  Sun, Moon, RotateCcw, Mic, Send, Wrench, ZoomIn, ZoomOut, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Home, Orbit, Camera, Maximize, Minimize, Info, X,
  Flame, CloudRain, Sunrise, BookOpen, Sparkles, Undo2, Redo2, Share2, Trash2, Copy, RotateCw,
  PanelRightClose, PanelRightOpen, Gamepad2, Upload, Volume2, VolumeX,
} from "lucide-react";

type Brain = "mock" | "claude" | "device";
const BRAIN_LABEL: Record<Brain, string> = { mock: "Mock", claude: "Claude", device: "On-device" };

const CHIPS = [
  "dim the lights", "make it night and let it snow", "add a candle and books",
  "add flowers and a plant", "open the window", "reset the room",
];
const MOODS: { name: MoodName; Icon: typeof Flame }[] = [
  { name: "Cozy", Icon: Flame }, { name: "Storm", Icon: CloudRain }, { name: "Morning", Icon: Sunrise },
  { name: "Focus", Icon: BookOpen }, { name: "Surprise", Icon: Sparkles },
];

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

function Log() {
  const log = useWorld((s) => s.log);
  const busy = useWorld((s) => s.busy);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [log.length, busy]);
  return (
    <div className="log" ref={ref}>
      {log.map((l, i) => (
        <div key={i} className={`msg msg--${l.role}`}>
          <span className="msg__role">{l.role === "tool" ? <Wrench size={12} strokeWidth={2} /> : l.role}</span>
          <span className="msg__body">{l.text}</span>
        </div>
      ))}
      {busy && (
        <div className="msg msg--anima">
          <span className="msg__role">anima</span>
          <span className="typing"><span /><span /><span /></span>
        </div>
      )}
    </div>
  );
}

function Perception() {
  const s = useWorld();
  return (
    <div className="perceive">
      <div className="perceive__label">what anima perceives</div>
      <div className="perceive__text">{perceive(s)}</div>
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
  const weather = useWorld((s) => s.weather);
  const recRef = useRef<ReturnType<typeof createRecognition>>(null);
  const splatInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUndo = useWorld((s) => s._undo.length > 0);
  const canRedo = useWorld((s) => s._redo.length > 0);
  const selectedId = useWorld((s) => s.selectedId);
  const selType = useWorld((s) => s.entities.find((x) => x.id === s.selectedId)?.type);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1800); };
  const dismissHint = () => { setHint(false); localStorage.setItem("anima-hint", "1"); };

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
    if (hint) dismissHint();
    if (brain === "claude") runCommandLLM(v);
    else if (brain === "device") runCommandOnDevice(v);
    else runCommand(v);
    setText("");
  };

  const chooseBrain = (b: Brain) => {
    setBrain(b);
    if (b === "device" && !engineReady) {
      if (!webgpuAvailable()) {
        setBrain("mock");
        flash("On-device AI needs WebGPU (Chrome/Edge on a modern GPU). Using the offline brain.");
        return;
      }
      setDeviceStatus("Loading on-device AI… (first run downloads a small model)");
      initOnDevice((m) => setDeviceStatus(m)).then((ok) => {
        setDeviceStatus(null);
        if (ok) { setEngineReady(true); say("On-device AI ready — talk to me."); }
        else { setBrain("mock"); flash("Couldn't start on-device AI. Using the offline brain."); }
      });
    }
  };

  const toggleMic = () => {
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

  // restore a shared scene from the URL, else the last local scene, on first load
  useEffect(() => {
    const sp = new URLSearchParams(location.search).get("splat");
    if (sp) setHeroSplat(sp);
    const m = location.hash.match(/^#s=(.+)$/);
    if (m && restoreWorld(m[1])) flash("Loaded a shared scene");
    else loadPersisted();
  }, []);

  // keep ambience in sync with the weather while sound is on
  useEffect(() => { if (soundOn) setAmbienceWeather(weather); }, [weather, soundOn]);

  // auto-save the scene to localStorage (debounced) so a refresh keeps it
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
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      else if (e.key === "Escape") selectObject(null);
      else if (!mod && e.key >= "1" && e.key <= "5") applyMood(MOODS[+e.key - 1].name);
      else if (!mod && e.key.toLowerCase() === "c") capture();
      else if (!mod && e.key.toLowerCase() === "f") toggleFullscreen();
      else if (!mod && e.key.toLowerCase() === "r") resetWorld();
      else if (!mod && e.key === "?") setShowHelp((v) => !v);
      else if (!mod && e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("fullscreenchange", fs); window.removeEventListener("keydown", key); };
  }, []);

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

      <div className="toolbar">
        <button className="iconbtn" aria-label="Capture photo" title="Capture photo" onClick={capture}><Camera size={17} /></button>
        <button className="iconbtn" aria-label="Share scene" title="Share this scene" onClick={share}><Share2 size={17} /></button>
        <button className="iconbtn" aria-label="Load your own scene" title="Load a .splat/.ply scene" onClick={() => splatInputRef.current?.click()}><Upload size={17} /></button>
        <input ref={splatInputRef} type="file" accept=".splat,.ply,.ksplat" onChange={onPickSplat} className="hidden" />
        <button className="iconbtn" aria-label="Fullscreen" title="Fullscreen" onClick={toggleFullscreen}>{isFull ? <Minimize size={17} /> : <Maximize size={17} />}</button>
        <button className="iconbtn" aria-label="Ambient sound" title="Ambient sound" onClick={() => setSoundOn(toggleAmbience(!soundOn, weather))}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        <button className="iconbtn" aria-label="Help" title="What can Anima do?" onClick={() => setShowHelp((v) => !v)}><Info size={17} /></button>
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
      {deviceStatus && <div className="toast toast--status">{deviceStatus}</div>}

      {hint && !selectedId && (
        <div className="hintbar">
          <span>Tell Anima what to do — try a mood, tap the mic, or type "make it cozy".</span>
          <button className="iconbtn" aria-label="Dismiss hint" onClick={dismissHint}><X size={15} /></button>
        </div>
      )}

      {showHelp && (
        <div className="help" role="dialog">
          <div className="help__head"><b>What Anima can do</b><button className="iconbtn" aria-label="Close" onClick={() => setShowHelp(false)}><X size={16} /></button></div>
          <ul className="help__list">
            <li>Change <b>lighting</b>, <b>time of day</b> (day/dusk/night), <b>weather</b> (rain/snow/fog/clear)</li>
            <li>Open/close the <b>window</b>, or <b>reset</b> the room</li>
            <li>Add: lantern, guitar, plant, candle, books, flowers, mug, rug — say a <b>count</b> too ("add three plants")</li>
            <li>Say a <b>vibe</b>: "make it spooky / cozy / romantic / dramatic"</li>
            <li><b>Click any object</b> to move, rotate, duplicate or delete it</li>
            <li>Load your own space via <b>Upload</b> (top-left) — see HERO-SCENE.md</li>
            <li>Tap a <b>mood</b> for an instant scene · <b>Undo/redo</b> anything · <b>Share</b> a link to your exact world</li>
            <li><b>Mock</b> works offline; <b>Claude</b> is the real tool-calling brain</li>
            <li>Drag to orbit · scroll / pinch to zoom · or use the on-screen rig</li>
            <li><b>Keyboard:</b> 1–5 moods · C capture · F fullscreen · R reset · / focus · ? help · ⌘Z undo</li>
          </ul>
        </div>
      )}

      {!panelOpen && (
        <button className="fab" aria-label="Open Anima panel" onClick={() => setPanelOpen(true)}>
          <PanelRightOpen size={18} /> Anima
        </button>
      )}

      <div className={`panel${panelOpen ? "" : " panel--hidden"}`}>
        <button className="grip" aria-label="Close panel" onClick={() => setPanelOpen(false)} />

        <div className="top">
          <div className="brand">Anima <small>living worlds</small></div>
          <div className="spacer" />
          <button className="iconbtn" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={() => undo()}><Undo2 size={17} /></button>
          <button className="iconbtn" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={() => redo()}><Redo2 size={17} /></button>
          <button className="iconbtn" aria-label="Reset room" title="Reset room" onClick={() => resetWorld()}><RotateCcw size={17} /></button>
          <button className="iconbtn" aria-label="Toggle theme" title="Light / dark" onClick={toggle}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button className="iconbtn" aria-label="Collapse panel" title="Collapse panel" onClick={() => setPanelOpen(false)}><PanelRightClose size={17} /></button>
        </div>

        <div className="sub">natural language → tool calls → live world change</div>

        <div className="segmented">
          {(["mock", "claude", "device"] as Brain[]).map((b) => (
            <button key={b} className={`seg${brain === b ? " seg--on" : ""}`} onClick={() => chooseBrain(b)}>
              {BRAIN_LABEL[b]}
            </button>
          ))}
        </div>

        <div className="moods">
          {MOODS.map(({ name, Icon }) => (
            <button key={name} className="mood" onClick={() => applyMood(name)}><Icon size={13} /> {name}</button>
          ))}
        </div>

        <Perception />
        <Log />

        <div className="chips">
          {CHIPS.map((c) => (<button key={c} className="chip" onClick={() => submit(c)}>{c}</button>))}
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
          {speechSupported() && (
            <button type="button" className={`mic${listening ? " mic--on" : ""}`} onClick={toggleMic} aria-label="Speak to Anima" title="Speak to Anima"><Mic size={18} /></button>
          )}
          <input ref={inputRef} className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={brain === "claude" ? "talk to Anima…" : "tell Anima what to do…"} />
          <button className="send" type="submit" aria-label="Send"><Send size={18} /></button>
        </form>
      </div>
    </div>
  );
}
