// Dezente UI-Sounds, direkt über Web Audio synthetisiert — keine Audiodateien,
// offline-fähig, zusammen unter 1 kB. Abschaltbar unter „Mehr → Soundeffekte".
// Autoplay-Sperren (z. B. iOS vor der ersten Berührung) werden still geschluckt.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx.state === "closed" ? null : ctx;
  } catch {
    return null;
  }
}

export function soundAn(): boolean {
  return localStorage.getItem("torrek.sound") !== "aus";
}

export function setSoundAn(an: boolean) {
  localStorage.setItem("torrek.sound", an ? "an" : "aus");
}

/** Ein Ton mit Frequenzverlauf und weicher Hüllkurve. */
function ton(c: AudioContext, f0: number, f1: number, dauer: number, typ: OscillatorType, lautstaerke: number, start = 0) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = typ;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dauer);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(lautstaerke, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dauer + 0.02);
}

export type SoundName = "tick" | "plopp" | "erfolg";

export function spiele(name: SoundName) {
  if (!soundAn()) return;
  const c = audio();
  if (!c || c.state !== "running") return;
  switch (name) {
    case "tick": // kurzer Instrumenten-Klick (Speichern, Abhaken)
      ton(c, 1250, 900, 0.05, "triangle", 0.08);
      break;
    case "plopp": // Wassertropfen (Intro-Aufprall)
      ton(c, 520, 170, 0.2, "sine", 0.14);
      break;
    case "erfolg": // zwei aufsteigende Töne (Trocken-Moment)
      ton(c, 660, 660, 0.14, "triangle", 0.1);
      ton(c, 880, 880, 0.22, "triangle", 0.1, 0.12);
      break;
  }
}
