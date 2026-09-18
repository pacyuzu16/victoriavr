// Optional ambient soundscape — synthesized with the Web Audio API (no assets, no cost).
// Off by default; only created on a user gesture (the toggle click), so it never auto-plays.
// Adapts to weather: rain hiss, soft wind for snow/fog, and a faint warm pad underneath.
import type { Weather } from "./world";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseFilter: BiquadFilterNode | null = null;
let noiseGain: GainNode | null = null;
let enabled = false;

const WX: Record<Weather, { type: BiquadFilterType; freq: number; gain: number }> = {
  rain: { type: "bandpass", freq: 1600, gain: 0.1 },
  snow: { type: "lowpass", freq: 600, gain: 0.05 },
  fog: { type: "lowpass", freq: 380, gain: 0.045 },
  clear: { type: "lowpass", freq: 700, gain: 0.02 },
};

function ensure(): boolean {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // looping white noise → filter → gain
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 700;
    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;
    src.connect(noiseFilter).connect(noiseGain).connect(master);
    src.start();

    // faint warm pad (two detuned sines)
    [110, 164.81].forEach((f) => {
      const o = ctx!.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx!.createGain();
      g.gain.value = 0.012;
      o.connect(g).connect(master!);
      o.start();
    });
    return true;
  } catch {
    return false;
  }
}

export function setAmbienceWeather(w: Weather) {
  if (!ctx || !noiseFilter || !noiseGain) return;
  const m = WX[w] || WX.clear;
  const t = ctx.currentTime;
  noiseFilter.type = m.type;
  noiseFilter.frequency.exponentialRampToValueAtTime(Math.max(1, m.freq), t + 0.6);
  noiseGain.gain.linearRampToValueAtTime(m.gain, t + 0.6);
}

export function toggleAmbience(on: boolean, weather: Weather): boolean {
  if (!ensure() || !ctx || !master) return false;
  if (ctx.state === "suspended") ctx.resume();
  enabled = on;
  master.gain.linearRampToValueAtTime(on ? 0.85 : 0, ctx.currentTime + 0.5);
  if (on) setAmbienceWeather(weather);
  return enabled;
}
