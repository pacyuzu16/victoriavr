// Browser-native voice — no API keys, no cost. STT via Web Speech API, TTS via SpeechSynthesis.
// Degrades gracefully: if unavailable, callers keep using the text input.

export function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1.05;
    synth.speak(u);
  } catch {
    /* ignore */
  }
}

type SR = { start: () => void; stop: () => void; abort: () => void; onresult: (e: any) => void; onend: () => void; onerror: (e: any) => void; lang: string; interimResults: boolean; maxAlternatives: number };

export function createRecognition(onResult: (text: string) => void, onEnd: () => void): SR | null {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r: SR = new Ctor();
  r.lang = "en-US";
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e: any) => {
    const t = e?.results?.[0]?.[0]?.transcript ?? "";
    if (t) onResult(t);
  };
  r.onend = onEnd;
  r.onerror = onEnd;
  return r;
}

export const speechSupported = () =>
  typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
