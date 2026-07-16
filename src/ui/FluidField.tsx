import { useEffect, useRef } from "react";

// „Feuchteschleier" — die flüssige Signatur-Fläche der App.
// Weiche Feuchte-Schwaden in Instrument-Teal treiben langsam durchs Bild;
// beim Scrollen wandert die Szene entlang der Trocknungslinie: die Tiefe
// kühlt Richtung Nachtblau ab, während von unten eine warme „Trocken"-Glut
// aufzieht (Brand-Token --dry). Bewusst reines Canvas-2D statt WebGL-Bibliothek
// (Offline-First, kleines Bundle). Pausiert bei verstecktem Tab; bei
// Reduced Motion steht das Bild und folgt nur dem Scroll.

type Schwade = {
  x: number; y: number;        // Anker (Anteil der Viewport-Größe)
  ax: number; ay: number;      // Drift-Amplitude
  vx: number; vy: number;      // Drift-Tempo (rad/s)
  ph: number;                  // Phase
  r: number;                   // Radius (Anteil der kleineren Kante)
  farbe: [number, number, number];
  a: number;                   // Grund-Deckkraft
  warm?: boolean;              // „Trocken"-Glut: gewinnt mit Scrolltiefe
};

const SCHWADEN: Schwade[] = [
  { x: 0.16, y: 0.20, ax: 0.10, ay: 0.08, vx: 0.11, vy: 0.13, ph: 0.0, r: 1.05, farbe: [6, 52, 59], a: 0.90 },
  { x: 0.80, y: 0.28, ax: 0.12, ay: 0.10, vx: 0.09, vy: 0.07, ph: 2.1, r: 0.85, farbe: [14, 124, 134], a: 0.50 },
  { x: 0.55, y: 0.72, ax: 0.14, ay: 0.09, vx: 0.07, vy: 0.10, ph: 4.2, r: 0.75, farbe: [42, 167, 176], a: 0.36 },
  { x: 0.28, y: 0.88, ax: 0.10, ay: 0.06, vx: 0.13, vy: 0.08, ph: 1.3, r: 0.55, farbe: [127, 216, 222], a: 0.16 },
  { x: 0.85, y: 1.08, ax: 0.08, ay: 0.05, vx: 0.06, vy: 0.09, ph: 3.3, r: 0.80, farbe: [224, 164, 59], a: 0.15, warm: true },
  { x: 0.15, y: 1.22, ax: 0.06, ay: 0.04, vx: 0.08, vy: 0.06, ph: 5.1, r: 0.60, farbe: [233, 180, 87], a: 0.10, warm: true },
];

function istDunkel(): boolean {
  const erzwungen = document.documentElement.dataset.theme;
  if (erzwungen) return erzwungen === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function FluidField({ variante = "ambient" }: { variante?: "hero" | "ambient" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stark = variante === "hero" ? 1 : 0.6;

    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    const zeichnen = (ms: number) => {
      const t = ruhig ? 0 : ms / 1000;
      const w = canvas.width, h = canvas.height;
      const dk = istDunkel();
      // Scrolltiefe 0..1 → Position auf der Trocknungslinie.
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));

      ctx.clearRect(0, 0, w, h);
      // Tiefen-Tint: je weiter unten, desto kühler der Grund.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = dk ? `rgba(7, 12, 24, ${0.45 * p})` : `rgba(21, 38, 66, ${0.05 * p})`;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = dk ? "lighter" : "source-over";
      const basis = Math.min(w, h);
      for (const s of SCHWADEN) {
        const x = (s.x + Math.sin(t * s.vx + s.ph) * s.ax) * w;
        let y = (s.y + Math.cos(t * s.vy + s.ph) * s.ay) * h;
        let a = s.a * stark * (dk ? 1 : 0.32);
        if (s.warm) { y -= p * 0.45 * h; a *= 0.35 + 2.6 * p; } // Glut steigt mit der Tiefe
        else { a *= 1 - 0.25 * p; }                            // Teal weicht leicht zurück
        const r = s.r * basis;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${s.farbe[0]}, ${s.farbe[1]}, ${s.farbe[2]}, ${a})`);
        g.addColorStop(1, `rgba(${s.farbe[0]}, ${s.farbe[1]}, ${s.farbe[2]}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };

    const schleife = (ms: number) => { zeichnen(ms); raf = requestAnimationFrame(schleife); };
    const start = () => { if (!raf && !ruhig) raf = requestAnimationFrame(schleife); };
    const halt = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    const sichtbarkeit = () => { if (document.hidden) halt(); else start(); };
    const scrollStill = () => zeichnen(0); // Reduced Motion: nur auf Scroll neu zeichnen

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sichtbarkeit);
    if (ruhig) { zeichnen(0); window.addEventListener("scroll", scrollStill, { passive: true }); }
    else start();

    return () => {
      halt();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sichtbarkeit);
      window.removeEventListener("scroll", scrollStill);
    };
  }, [variante]);

  return <canvas ref={ref} className="fluid-field" aria-hidden="true" />;
}
