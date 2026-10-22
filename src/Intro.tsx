import { useState } from "react";
import { Play, ArrowRight, Mic, Cpu, Boxes } from "lucide-react";

// The first impression: a cinematic curtain that tells Anima's story in seconds,
// then gets out of the way. Shown once (remembered in localStorage).
export default function Intro({ onBegin, onWatch }: { onBegin: () => void; onWatch: () => void }) {
  const [out, setOut] = useState(false);
  const leave = (then: () => void) => {
    setOut(true);
    window.setTimeout(then, 650);
  };

  return (
    <div className={`intro${out ? " intro--out" : ""}`} role="dialog" aria-label="Welcome to Anima">
      <div className="intro__card">
        <div className="orb intro__orb" aria-hidden />
        <div className="intro__kicker">Browser-native AI world-builder</div>
        <h1 className="intro__title">
          Speak a world<br /><em>into being.</em>
        </h1>
        <p className="intro__lede">
          Anima is a living presence you talk to. Describe a space and it appears —
          then she acts on your 3D world through tool-use. You speak, the world changes.
        </p>
        <div className="intro__cta">
          <button className="btn btn--primary" onClick={() => leave(onBegin)}>
            Start creating <ArrowRight size={17} />
          </button>
          <button className="btn btn--ghost" onClick={() => leave(onWatch)}>
            <Play size={16} /> Watch Anima build
          </button>
        </div>
        <div className="intro__foot">
          <span><Boxes size={13} /> <b>Photoreal</b> 3D in the browser</span>
          <span><Mic size={13} /> <b>Voice</b> in &amp; out</span>
          <span><Cpu size={13} /> <b>On-device</b> AI, no server</span>
        </div>
      </div>
    </div>
  );
}
