import { useEffect, useState } from "react";

// Signatur-Element: Die Trocknungslinie — ein Feuchte-Instrument.
// Zeigt den Trocknungsfortschritt (0 = nass, 1 = trocken) als Skala mit Nadel.
// Ladesequenz: Nadel + Readout fahren beim Einblenden von 0 („nass") auf den
// Messwert — wie ein Zeiger, der einschwingt. prefers-reduced-motion: sofort.
export function DryingLine({ value, label = "Trocknungsfortschritt", sub }: { value: number; label?: string; sub?: string }) {
  const ziel = Math.max(0, Math.min(1, value));
  const [anim, setAnim] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setAnim(ziel);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dauer = 950;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dauer);
      const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic — schnelles Anfahren, sanftes Einschwingen
      setAnim(ziel * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ziel]);

  const pct = Math.round(anim * 100);
  return (
    <div className="dryline" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ziel * 100)} aria-label={label}>
      <div className="dryline-top">
        <span className="dryline-cap">{label}</span>
        <span className="dryline-read">{pct}<span className="unit">% tr.</span></span>
      </div>
      <div className="dryline-track">
        <span className="dryline-needle" style={{ left: `${anim * 100}%`, transition: "none" }} />
      </div>
      <div className="dryline-ends"><span>Nass</span>{sub ? <span style={{ letterSpacing: 0, textTransform: "none", fontFamily: "var(--font)" }}>{sub}</span> : null}<span>Trocken</span></div>
    </div>
  );
}
